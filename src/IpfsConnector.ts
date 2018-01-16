/// <reference path="../typings/main.d.ts"/>
import { homedir } from 'os';
import { stat, unlink } from 'fs';
import * as Promise from 'bluebird';
import { IpfsBin, version as requiredVersion } from './IpfsBin';
import IpfsApiHelper from '@akashaproject/ipfs-connector-utils';
import * as ipfsApi from 'ipfs-api';
import { EventEmitter } from 'events';
import { events, options } from './constants';
import childProcess = require('child_process');
import path = require('path');

options.extra.env = Object.assign(process.env, { IPFS_PATH: path.join(homedir(), '.ipfs') });
const symbolEnforcer = Symbol();
const symbol = Symbol();
const ROOT_OPTION = 'Addresses';
const LOCK_FILE = 'repo.lock';
const API_FILE = 'api';

export enum ConnectorState {
    UNKNOW,
    NO_BINARY,
    DOWNLOADING,
    STOPPED,
    STARTING,
    STARTED,
    STOPPING,
    UPGRADING
}

export class IpfsConnector extends EventEmitter {
    private process: childProcess.ChildProcess;
    public downloadManager: IpfsBin = new IpfsBin();
    public options = options;
    public logger: any = console;
    public serviceStatus: {
        state: ConnectorState,
        api: boolean,
        process: boolean,
        version: string
    } = {
        state: ConnectorState.UNKNOW,
        process: false,
        api: false,
        version: ''
    };
    private _isRetry = false;
    private _callbacks = new Map();
    private _api: IpfsApiHelper;
    private _upgradeBin = true;
    private _downloadEventsEnabled = false;

    /**
     * @param enforcer
     */
    constructor(enforcer: any) {
        super();
        if (enforcer !== symbolEnforcer) {
            throw new Error('Use .getInstance() instead of constructing a new object');
        }
        this._callbacks.set('ipfs.stdout', (data: Buffer) => this._handleStdout(data));
        this._callbacks.set('ipfs.stderr', (data: Buffer) => this._handleStderr(data));
        this._callbacks.set('ipfs.init', (err: Error, stdout: Buffer, stderr: Buffer) => this._handleInit(err, stdout, stderr));
    }

    /**
     * Singleton constructor
     * @returns {IpfsConnector}
     */
    public static getInstance(): IpfsConnector {
        if (!this[symbol]) {
            this[symbol] = new IpfsConnector(symbolEnforcer);
        }
        return this[symbol];
    }

    /**
     *
     * @returns {IpfsApiHelper}
     */
    get api(): IpfsApiHelper {
        if (!this._api) {
            let api = ipfsApi(this.options.apiAddress);
            this._api = new IpfsApiHelper(api);
        }
        return this._api;
    }

    private _setState(state: ConnectorState) {
        const event = (this.serviceStatus.state !== state);
        this.serviceStatus.state = state;
        if (event) {
            /**
             * @event IpfsConnector#STATUS_UPDATE
             */
            this.emit(events.STATUS_UPDATE, state);
        }
    }

    /**
     * Set logging object, winston works great
     * @param logger
     */
    public setLogger(logger: {}): void {
        this.logger = logger;
    }

    /**
     * Set ipfs target folder
     * @param path
     */
    public setBinPath(path: string): void {
        this.downloadManager = new IpfsBin(path);
        this._downloadEventsEnabled = false;
    }

    /**
     * Modify spawn options for ipfs process
     * @param option
     * @param value
     */
    public setOption(option: string, value: any): void {
        this.options[option] = value;
    }

    /**
     * Set a daemon config value. The daemon has to be stopped.
     * @param config
     */
    public staticGetConfig(config: string) {
        return this.checkExecutable()
            .then((execPath) => {
                return new Promise((resolve, reject) => {
                    if (this.serviceStatus.state !== ConnectorState.STOPPED) {
                        return reject(new Error('The daemon need to be stopped'));
                    }
                    childProcess.exec(`"${execPath}" config ${config}`,
                        { env: this.options.extra.env },
                        (error, value, stderr) => {
                            if (error) {
                                this.logger.error(error);
                                return reject(error);
                            }
                            if (stderr) {
                                this.logger.warn(stderr);
                                return reject(new Error(stderr.toString()));
                            }
                            try {
                                return resolve(value.trim());
                            } catch (err) {
                                this.logger.error(err);
                                return reject(err);
                            }
                        });
                });
            });
    }

    /**
     * Set a daemon config value. The daemon has to be stopped.
     * @param config
     * @param value
     */
    public staticSetConfig(config: string, value: string) {
        return this.checkExecutable()
            .then((execPath) => {
                return new Promise((resolve, reject) => {
                    if (this.serviceStatus.state !== ConnectorState.STOPPED) {
                        return reject(new Error('The daemon needs to be stopped'));
                    }
                    childProcess.exec(`"${execPath}" config ${config} ${value}`,
                        { env: this.options.extra.env },
                        (error, done, stderr) => {
                            if (error) {
                                this.logger.error(error);
                                return reject(error);
                            }
                            if (stderr) {
                                this.logger.warn(stderr);
                            }
                            return resolve(done);
                        });
                });
            });
    }

    /**
     * Set ipfs init folder
     * @param target
     */
    public setIpfsFolder(target: string): void {
        this.options.extra.env.IPFS_PATH = target;
    }

    // this must be called 1 time after initializing IpfsBin object
    public enableDownloadEvents() {
        if (this._downloadEventsEnabled) {
            return;
        }
        this.downloadManager.wrapper.downloadProgress.on(events.DOWNLOAD_STARTED, () => {
            this._setState(ConnectorState.DOWNLOADING);
            this.emit(events.DOWNLOAD_STARTED);
        });

        this.downloadManager.wrapper.downloadProgress.on(events.DOWNLOAD_PROGRESS, (progress) => {
            this.emit(events.DOWNLOAD_PROGRESS, progress);
        });

        this.downloadManager.wrapper.downloadProgress.on(events.DOWNLOAD_ERROR, (error) => {
            this.emit(events.DOWNLOAD_ERROR, error);
        });
        this._downloadEventsEnabled = true;
    }

    /**
     * Check and download ipfs executable if needed.
     * Default target for executable
     * @returns {Bluebird<boolean>}
     */
    public checkExecutable(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.downloadManager.check(
                (err: Error, data: { binPath?: string }) => {
                    if (err) {
                        this.logger.error(err);
                        this.emit(events.BINARY_CORRUPTED, err);
                        this._setState(ConnectorState.NO_BINARY);
                        this.downloadManager.deleteBin().then(() => reject(err)).catch((err1) => reject(err));
                        return;
                    }

                    if (data.binPath) {
                        if (this.serviceStatus.state === ConnectorState.UNKNOW ||
                            this.serviceStatus.state === ConnectorState.DOWNLOADING) {
                            this._setState(ConnectorState.STOPPED);
                        }
                        return resolve(data.binPath);
                    }
                });
        });
    }

    /**
     * Start ipfs daemon process
     * @returns {Bluebird<boolean>}
     */
    public start() {
        switch (this.serviceStatus.state) {
            case ConnectorState.STARTING:
                return new Promise((resolve) => this.on(events.SERVICE_STARTED, () => resolve()));
            case ConnectorState.STARTED:
                return Promise.resolve(this.api);
            case ConnectorState.STOPPING:
                return Promise.reject(new Error('You can\'t start the daemon while stopping it.'));
        }

        this.emit(events.SERVICE_STARTING);
        this._setState(ConnectorState.STARTING);
        return this.checkExecutable().then(
            (binPath: string) => {
                if (!binPath) {
                    throw new Error('Could not download ipfs executable');
                }
                if (this._api) {
                    this._api = null;
                }
                return this._start(binPath);
            }
        );
    }

    /**
     *
     * @param status
     */
    public setAutoUpgrade(status: boolean) {
        this._upgradeBin = status;
    }

    /**
     *
     * @param binPath
     * @returns {Bluebird}
     * @private
     */
    private _start(binPath: string) {
        return new Promise((resolve, reject) => {
            const runDaemon = () => {
                this.process = childProcess.spawn(
                    binPath,
                    this.options.args,
                    this.options.extra
                );
            };
            const watchDaemon = () => {
                runDaemon();
                this._pipeStd();
                this._attachStartingEvents();
            };
            this.once(events.ERROR, (error: string) => {
                this._setState(ConnectorState.STOPPED);
                reject(error);
            });
            this.once(events.SERVICE_STARTED, () => {
                this._isRetry = false;
                this._flushStartingEvents();
                this.removeListener(events.ERROR, reject);
                resolve();
            });
            this.once(events.IPFS_INIT, () => {
                watchDaemon();
            });

            watchDaemon();
        }).then(() => {
            return this.checkVersion().then(() => {
                this.logger.info(`Started go-ipfs version ${this.serviceStatus.version}`);
                this._setState(ConnectorState.STARTED);
                return this.api;
            });
        });
    }

    /**
     *
     * @param filePath
     * @returns {Bluebird}
     * @private
     */
    private _cleanupFile(filePath: string) {
        return new Promise((resolve, reject) => {
            return stat(filePath, (err, stats) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        return resolve(true);
                    }
                    return reject(err);
                }

                if (stats.isFile()) {
                    return unlink(filePath, (error) => {
                        if (error) {
                            return reject(error);
                        }
                        return resolve(true);
                    });
                }
                return resolve(true);
            });
        });
    }

    /**
     * Filter daemon startup log
     * @private
     */
    private _attachStartingEvents() {
        this.process.stderr.on('data', this._callbacks.get('ipfs.stderr'));
        this.process.stdout.on('data', this._callbacks.get('ipfs.stdout'));
    }

    /**
     * Remove startup filters
     * @private
     */
    private _flushStartingEvents() {
        this.process.stderr.removeListener('data', this._callbacks.get('ipfs.stderr'));
        this.process.stdout.removeListener('data', this._callbacks.get('ipfs.stdout'));
    }

    /**
     *
     * @param data
     * @private
     */
    private _handleStdout(data: Buffer) {

        if (data.includes('API server')) {
            this.options.apiAddress = (data.toString().match(/API server listening on (.*)\n/))[1];
        }

        if (data.includes('Daemon is ready')) {
            this.serviceStatus.process = true;
            /**
             * @event IpfsConnector#SERVICE_STARTED
             */
            this.emit(events.SERVICE_STARTED);
        }

        if (data.includes('Run migrations')) {
            this.process.stdin.write('y');
            this.process.stdin.end();
        }
    }

    /**
     *
     * @param data
     * @returns {any}
     * @private
     */
    private _handleStderr(data: Buffer) {
        if (data.toString().includes('daemon is running')) {
            /**
             * @event IpfsConnector#SERVICE_STARTED
             */
            return this.emit(events.SERVICE_STARTED);
        }
        if (data.includes('ipfs init')) {
            setTimeout(() => this._init(), 500);
            return this.emit(events.IPFS_INITING);
        }

        if (data.includes('acquire lock') && !this._isRetry) {
            return this
                .stop()
                .then(() => this._cleanupFile(path.join(this.options.extra.env.IPFS_PATH, LOCK_FILE)))
                .then(() => {
                    this._isRetry = true;
                    return this.start();
                });
        }

        this.serviceStatus.process = false;
        this._setState(ConnectorState.STOPPED);
        /**
         * @event IpfsConnector#SERVICE_FAILED
         */
        return this.emit(events.SERVICE_FAILED, data);
    }

    /**
     * Log output from ipfs daemon
     * @private
     */
    private _pipeStd() {
        const logError = (data: Buffer) => this.logger.error(data.toString());
        const logInfo = (data: Buffer) => this.logger.info(data.toString());

        this.process.once('exit', (code: number, signal: string) => this._handleExit(code, signal));
        this.process.on('error', (err: Error) => this._handleError(err));

        this.process.stderr.on('data', logError);
        this.process.stdout.on('data', logInfo);
        this.once(events.SERVICE_STOPPED, () => {
            if (this.process) {
                this.process.stderr.removeListener('data', logError);
                this.process.stdout.removeListener('data', logInfo);
                this.process.removeListener('exit', (code: number, signal: string) => this._handleExit(code, signal));
                this.process.removeListener('error', (err: Error) => this._handleError(err));
                this.process = null;
            }
        });
    }

    /**
     *
     * @param code
     * @param signal
     * @private
     */
    private _handleExit(code: number, signal: string) {
        this.serviceStatus.process = false;
        this.serviceStatus.version = '';
        this.serviceStatus.process = false;
        this.logger.info(`ipfs exited with code: ${code}, signal: ${signal} `);
        this._setState(ConnectorState.STOPPED);
        this.emit(events.SERVICE_STOPPED);
    }

    /**
     *
     * @param err
     * @private
     */
    private _handleError(err: Error) {
        this.logger.error(err.message);
        this.emit(events.ERROR, err.message);
    }

    /**
     *
     * @param err
     * @param stdout
     * @param stderr
     * @returns {boolean}
     * @private
     */
    private _handleInit(err: Error, stdout: Buffer, stderr: Buffer) {
        if (err) {
            if (stderr.toString().includes('file already exists')) {
                /**
                 * @event IpfsConnector#IPFS_INIT
                 */
                return this.emit(events.IPFS_INIT);
            }
            this.serviceStatus.process = false;
            this.logger.error(stderr);
            // init exited with errors
            return this.emit(events.IPFS_INIT, stderr.toString());
        }
        this.logger.info(stdout);
        // everything works fine
        return this.emit(events.IPFS_INIT);
    }

    /**
     *
     * @returns {Bluebird<IpfsConnector>}
     */
    public stop() {
        switch (this.serviceStatus.state) {
            case ConnectorState.STOPPED:
                return Promise.resolve(this);
            case ConnectorState.STARTING:
                return Promise.reject(new Error('You can\'t stop the daemon while starting it.'));
            case ConnectorState.STOPPING:
                return new Promise((resolve) => this.on(events.SERVICE_STOPPED, () => resolve()));
        }

        this.emit(events.SERVICE_STOPPING);
        this._setState(ConnectorState.STOPPING);
        this._api = null;
        this.options.retry = true;
        this.serviceStatus.api = false;
        if (this.process) {
            return this._shutDown().delay(1000).then(() => this);
        }
        return Promise.resolve(this);
    }

    private _shutDown() {
        return Promise.fromCallback((cb) => {
            return childProcess.exec(
                `"${this.downloadManager.wrapper.path()}" shutdown`,
                { env: this.options.extra.env },
                cb
            );
        }).catch((err) => {
            // add fallback process.kill() for ipfs < v0.4.10
            if (this.process) {
                return this.process.kill();
            }
            throw err;
        });
    }

    /**
     * Runs `ipfs init`
     * @private
     */
    private _init() {

        let init = childProcess.exec(
            `"${this.downloadManager.wrapper.path()}" init`,
            { env: this.options.extra.env },
            this._callbacks.get('ipfs.init')
        );
        this.options.retry = false;
        if (this.process) {
            this._flushStartingEvents();
        }
        this.process = null;
    }

    /**
     *
     * @param retry
     * @returns {Bluebird<U>}
     */
    public staticGetPorts(retry = false): any {
        return this.checkExecutable()
            .then((execPath) => {
                return new Promise((resolve, reject) => {
                    childProcess.exec(`"${execPath}" config Addresses`,
                        { env: this.options.extra.env },
                        (error, addresses, stderr) => {
                            let config: {
                                API: string,
                                Gateway: string,
                                Swarm: string []
                            };
                            let apiFile: string;
                            if (error) {
                                this.logger.error(error);
                                if (!retry) {
                                    apiFile = path.join(this.options.extra.env.IPFS_PATH, API_FILE);
                                    return resolve(
                                        Promise.delay(10).then(() => this._cleanupFile(apiFile))
                                            .then(() => this.staticGetPorts(true))
                                    );
                                }
                                return reject(error);
                            }
                            if (stderr.includes('ipfs init')) {
                                if (!retry) {
                                    this._init();
                                    return resolve(Promise.delay(500).then(() => this.staticGetPorts(true)));
                                }
                                return reject(new Error(stderr.toString()));
                            }
                            try {
                                config = JSON.parse(addresses);
                            } catch (err) {
                                return reject(err);
                            }
                            options.apiAddress = config.API;
                            return resolve({
                                gateway: config.Gateway.split('/').pop(),
                                api: config.API.split('/').pop(),
                                swarm: config.Swarm[0].split('/').pop()
                            });
                        });
                });
            });
    }

    /**
     *
     * @param ports
     * @param start
     * @returns {Bluebird<U>}
     */
    public staticSetPorts(ports: { gateway?: string | number, api?: string | number, swarm?: string | number }, start = false) {
        return this.checkExecutable()
            .then((execPath) => {
                const req = [];
                if (ports.gateway) {
                    req.push({ option: `${ROOT_OPTION}.Gateway`, value: `/ip4/127.0.0.1/tcp/${ports.gateway}` });
                }

                if (ports.api) {
                    this.options.apiAddress = `/ip4/127.0.0.1/tcp/${ports.api}`;
                    req.push({ option: `${ROOT_OPTION}.API`, value: `/ip4/127.0.0.1/tcp/${ports.api}` });
                }

                if (ports.swarm) {
                    req.push({
                        option: `--json ${ROOT_OPTION}.Swarm`,
                        value: JSON.stringify([`/ip4/0.0.0.0/tcp/${ports.swarm}`, `/ip6/::/tcp/${ports.swarm}`])
                    });
                }
                const reqSetOptions = Promise.each(req, (el) => {
                    return this._setPort(el.option, el.value, execPath);
                });
                return reqSetOptions.then(() => {
                    if (start) {
                        return this.start();
                    }
                    return true;
                });
            });
    }

    /**
     *
     * @param service
     * @param port
     * @param execPath
     * @returns {Bluebird}
     * @private
     */
    private _setPort(service: string, port: string, execPath: string) {
        return new Promise((resolve, reject) => {
            const command = process.platform === 'win32' ?
                `"${execPath}" config ${service} ${port}` :
                `"${execPath}" config ${service} '${port}'`;

            childProcess.exec(command,
                { env: this.options.extra.env },
                (error, done, stderr) => {
                    if (error) {
                        this.logger.error(error);
                        return reject(error);
                    }
                    if (stderr) {
                        this.logger.warn(stderr);
                    }
                    return resolve(done);
                });
        });
    }

    /**
     *
     * @returns {Bluebird<R>|Bluebird<{gateway: T, api: T, swarm: T}>|Bluebird<U2|{gateway: T, api: T, swarm: T}>|Promise<{gateway: T, api: T, swarm: T}>|PromiseLike<{gateway: T, api: T, swarm: T}>|Promise<TResult|{gateway: T, api: T, swarm: T}>|any}
     */
    public rpcGetPorts(): Promise<{ gateway: string, api: string, swarm: string }> {
        return this.api.apiClient
            .config.getAsync('Addresses')
            .then((config: any) => {
                const { Swarm, API, Gateway } = config;
                const swarm = Swarm[0].split('/').pop();
                const api = API.split('/').pop();
                const gateway = Gateway.split('/').pop();
                return { gateway, api, swarm };
            });
    }

    /**
     * Set ports using ipfs-api
     * @param ports
     * @param restart
     * @returns {Bluebird<U>}
     */
    public rpcSetPorts(ports: { gateway?: string | number, api?: string | number, swarm?: string | number }, restart = false) {
        const setup: any[] = [];
        if (ports.hasOwnProperty('gateway')) {
            setup.push(
                this.api.apiClient
                    .config.set('Addresses.Gateway', `/ip4/127.0.0.1/tcp/${ports.gateway}`)
            );
        }

        if (ports.hasOwnProperty('api')) {
            this.options.apiAddress = `/ip4/127.0.0.1/tcp/${ports.api}`;
            setup.push(
                this.api.apiClient
                    .config.set('Addresses.API', this.options.apiAddress)
            );
        }

        if (ports.hasOwnProperty('swarm')) {
            setup.push(
                this.api.apiClient
                    .config.set('Addresses.Swarm', [`/ip4/0.0.0.0/tcp/${ports.swarm}`, `/ip6/::/tcp/${ports.swarm}`])
            );
        }
        return Promise.all(setup).then((set: any) => {
            if (restart) {
                return Promise.resolve(this.stop()).delay(2000)
                    .then(() => {
                        this.start();
                        return Promise.delay(3000).then(() => set);
                    });
            }
            return set;
        });
    }

    /**
     *
     * @returns {Promise<{gateway: number, api: number, swarm: number}>}
     */
    public getPorts(): Promise<{ gateway: string, api: string, swarm: string }> {
        if (this.process) {
            return this.rpcGetPorts();
        }
        return this.staticGetPorts();
    }

    /**
     *
     * @param ports
     * @param restart
     * @returns {Bluebird<U>}
     */
    public setPorts(ports: { gateway?: string | number, api?: string | number, swarm?: string | number }, restart = false) {
        if (this.process) {
            return this.rpcSetPorts(ports, restart);
        }
        return this.staticSetPorts(ports, restart);
    }

    /**
     *
     * @returns {Thenable<IpfsApiHelper>|Bluebird<IpfsApiHelper>|PromiseLike<TResult2|IpfsApiHelper>|Bluebird<R>|Bluebird<U2|IpfsApiHelper>|Promise<TResult2|IpfsApiHelper>}
     */
    public checkVersion() {
        return this.api.apiClient.versionAsync().then(
            (data: any) => {
                this.serviceStatus.api = true;
                this.serviceStatus.version = data.version;
                if (data.version === requiredVersion || !this._upgradeBin) {
                    return this.api;
                }

                this.emit(events.UPGRADING_BINARY);
                this._setState(ConnectorState.UPGRADING);
                return this.stop().delay(5000).then(() => {
                    return this.downloadManager
                        .deleteBin()
                        .then(() => {
                            this._setState(ConnectorState.NO_BINARY);
                        })
                        .delay(1000)
                        .then(() => IpfsConnector.getInstance().start())
                        .then(() => this.api);
                });
            }
        );
    }

    /**
     * Run a raw command through the command line on the local daemon.
     * @param args
     * @returns {Bluebird<U>}
     */
    public runCommand(args: string) {
        return this.checkExecutable()
            .then((execPath) => {
                return new Promise((resolve, reject) => {
                    let stdout = '';
                    let stderr = '';
                    const command = childProcess.spawn(execPath, [args],
                        { env: this.options.extra.env }
                    );
                    command.stdout.on('data', (data) => {
                        stdout += data;
                    });
                    command.stderr.on('data', (data) => {
                        stderr += data;
                    });
                    command.on('close', (code) => {
                        if (code !== 0) {
                            this.logger.error(stderr);
                            return reject(stderr);
                        }
                        if (stderr) {
                            this.logger.warn(stderr);
                        }
                        return resolve(stdout);
                    });
                });
            });
    }
}
