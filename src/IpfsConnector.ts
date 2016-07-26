/// <reference path="../typings/main.d.ts"/>

import * as Promise from 'bluebird';
import { IpfsBin } from './IpfsBin';
import { IpfsApiHelper } from './IpfsApiHelper';
import * as ipfsApi from 'ipfs-api';
import { EventEmitter } from 'events';
import { events, options } from './constants';

import childProcess = require('child_process');
import path = require('path');

const symbolEnforcer = Symbol();
const symbol = Symbol();

export class IpfsConnector extends EventEmitter {
    private process: childProcess.ChildProcess;
    private downloadManager = new IpfsBin();
    public options = options;
    public serviceStatus: { api: boolean, process: boolean } = {process: false, api: false};
    private _callbacks = new Map();
    private logger: any = console;
    private _api: IpfsApiHelper;

    /**
     * @param enforcer
     */
    constructor(enforcer: Symbol) {
        super();
        if (enforcer !== symbolEnforcer) {
            throw new Error('Use .getInstance() instead of constructing a new object');
        }
        this._callbacks.set('process.stderr.on', (data: string) => {
            if (data.toString().includes('daemon is running')) {
                /**
                 * @event IpfsConnector#SERVICE_STARTED
                 */
                return this.emit(events.SERVICE_STARTED);
            }
            this.serviceStatus.process = false;
            /**
             * @event IpfsConnector#SERVICE_FAILED
             */
            return this.emit(events.SERVICE_FAILED, data);
        });
        this._callbacks.set('process.stdout.on', (data: string) => {
            if (data.includes('Daemon is ready')) {
                this.serviceStatus.process = true;
                /**
                 * @event IpfsConnector#SERVICE_STARTED
                 */
                return this.emit(events.SERVICE_STARTED);
            }
        });
        this._callbacks.set('ipfs.init', (err: Error, stdout: string, stderr: string) => {
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
            // everything works fine
            return this.emit(events.IPFS_INIT);
        });
        this._callbacks.set('events.IPFS_INIT', (err: string) => {
            if (!err) {
                this._start();
            }
        });
        this._callbacks.set('events.SERVICE_FAILED', (message: string) => {
            if (message.includes('ipfs init')) {
                setTimeout(() => this._init(), 500);
            }
        });
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
            api.version()
                .then((data: any) => this.serviceStatus.api = true)
                .catch((err: Error) => {
                    this.serviceStatus.api = false;
                    this._api = null;
                    this.emit(events.ERROR, err.message);
                });
            api.object = Promise.promisifyAll(api.object);
            api = Promise.promisifyAll(api);
            this._api = new IpfsApiHelper(api);
        }
        return this._api;
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
    }

    /**
     * Modify spawn options for ipfs process
     * @param option
     * @param value
     */
    public setConfig(option: string, value: string): void {
        this.options[option] = value;
    }

    /**
     * Set ipfs init folder
     * @param target
     */
    public setIpfsFolder(target: string): void {
        this.options.extra.env.IPFS_PATH = target;
    }

    /**
     * Check and download ipfs executable if needed.
     * Default target for executable
     * @returns {Bluebird<boolean>}
     */
    public checkExecutable(): Promise<{}> {
        const timeOut = setTimeout(() => {
            /**
             * @event IpfsConnector#DOWNLOAD_STARTED
             */
            this.emit(events.DOWNLOAD_STARTED);
        }, 300);
        return this.downloadManager.check().then(data => {
            this.logger.info(`executing from ${data}`);
            return true;
        }).catch(err => {
            this.logger.error(err);
            this.emit(events.BINARY_CORRUPTED, err);
            return false;
        }).finally(() => clearTimeout(timeOut));
    }

    /**
     * Start ipfs daemon process
     * @returns {Bluebird<boolean>}
     */
    public start() {

        return this.checkExecutable().then(
            (binOk) => {
                if (!binOk) {
                    /**
                     * @event IpfsConnector#SERVICE_FAILED
                     */
                    return this.emit(events.SERVICE_FAILED);
                }
                this._start();
            }
        );
    }

    private _start() {
        this.process = childProcess.spawn(
            this.downloadManager.wrapper.path(),
            this.options.args,
            this.options.extra
        );
        this.once(events.SERVICE_STARTED, () => {
            this._flushStartingEvents();
        });
        this._pipeStd();
        this._attachStartingEvents();
    }

    /**
     * Filter daemon startup log
     * @private
     */
    private _attachStartingEvents() {
        this.process.stderr.on('data', this._callbacks.get('process.stderr.on'));
        this.process.stdout.on('data', this._callbacks.get('process.stdout.on'));
        this.on(events.IPFS_INIT, this._callbacks.get('events.IPFS_INIT'));
        this.on(events.SERVICE_FAILED, this._callbacks.get('events.SERVICE_FAILED'));
    }

    /**
     * Remove startup filters
     * @private
     */
    private _flushStartingEvents() {
        this.process.stderr.removeListener('data', this._callbacks.get('process.stderr.on'));
        this.process.stdout.removeListener('data', this._callbacks.get('process.stdout.on'));
        this.removeListener(events.IPFS_INIT, this._callbacks.get('events.IPFS_INIT'));
        this.removeListener(events.SERVICE_FAILED, this._callbacks.get('events.SERVICE_FAILED'));
    }

    /**
     * Log output from ipfs daemon
     * @private
     */
    private _pipeStd() {
        const logError = (data: Buffer) => this.logger.error(data.toString());
        const logInfo = (data: Buffer) => this.logger.info(data.toString());

        this.process.stderr.on('data', logError);
        this.process.stdout.on('data', logInfo);
        this.once(events.SERVICE_STOPPED, () => {
            if (this.process) {
                this.process.stderr.removeListener('data', logError);
                this.process.stdout.removeListener('data', logInfo);
            }
        });
    }

    /**
     * Stop ipfs daemon
     * @param signal
     * @returns {IpfsConnector}
     */
    public stop(signal = 'SIGINT') {
        this.emit(events.SERVICE_STOPPING);
        this._api = null;
        this.options.retry = true;
        this.serviceStatus.api = false;
        if (this.process) {
            this.process.once('exit', () => this.emit(events.SERVICE_STOPPED));
            this.process.kill(signal);
            this.process = null;
            this.serviceStatus.process = false;
            return this;
        }
        this.emit(events.SERVICE_STOPPED);
        return this;
    }

    /**
     * Runs `ipfs init`
     * @private
     */
    private _init() {
        let init = childProcess.exec(
            this.downloadManager.wrapper.path() + ' init',
            { env: this.options.extra.env },
            this._callbacks.get('ipfs.init')
        );
        this.options.retry = false;
        this.process = null;
    }
}
