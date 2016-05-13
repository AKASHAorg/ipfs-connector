/// <reference path="typings/main.d.ts"/>

import { homedir } from 'os';
import * as Promise from 'bluebird';
import { IpfsBin } from './IpfsBin';

import childProcess = require('child_process');
import path = require('path');
import ipfsApi = require('ipfs-api');

const symbolEnforcer = Symbol();
const symbol = Symbol();

export class IpfsConnector {
    private process: childProcess.ChildProcess;
    private downloadManager = new IpfsBin();
    private logger: any = console;
    public options = {
        retry: true,
        apiAddress: '/ip4/127.0.0.1/tcp/5001',
        args: ['daemon'],
        executable: '',
        extra: {
            env: Object.assign({}, process.env, { IPFS_PATH: path.join(homedir(), '.ipfsAkasha') }),
            detached: true
        }
    };

    /**
     * @param enforcer
     */
    constructor (enforcer: Symbol) {
        if (enforcer !== symbolEnforcer) {
            throw new Error('Use .getInstance() instead of new constructor');
        }
    }

    /**
     * Singleton constructor
     * @returns {IpfsConnector}
     */
    public static getInstance (): IpfsConnector {
        if (!this[symbol]) {
            this[symbol] = new IpfsConnector(symbolEnforcer);
        }
        return this[symbol];
    }

    /**
     * Set logging object, winston works great
     * @param logger
     */
    public setLogger (logger: {}): void {
        this.logger = logger;
    }

    /**
     * Modify spawn options for ipfs process
     * @param options
     */
    public setConfig (options: {}): void {
        Object.assign(this.options, options);
    }

    /**
     * Check and download ipfs executable if needed.
     * Default target for executable is `path.join(__dirname, 'bin')`
     * @returns {Bluebird<boolean>}
     */
    public checkExecutable (): Promise<{}> {
        return this.downloadManager.check().then(data => {
            this.logger.info(data);
            return true;
        }).catch(err => {
            this.logger.error(err);
            return false;
        });
    }

    /**
     * Start ipfs daemon process
     * @returns {Bluebird<U>}
     */
    public start (): Promise<{}> {
        return this._start().then(data => {
            return data;
        }).catch(err => {
            if (this.options.retry) {
                return this._init().then(
                    () => this.start()
                );
            }
            return err;
        });
    }

    /**
     * Stop ipfs daemon
     * @param signal
     */
    public stop (signal = 'SIGINT'): void {
        this.process.kill(signal);
        this.process = null;
        this.options.retry = true;
    }

    /**
     * Runs `ipfs init`
     * @returns {Bluebird}
     * @private
     */
    private _init (): Promise<{}> {
        return new Promise((resolve, reject) => {
            let init = childProcess.exec(
                this.downloadManager.wrapper.path() + ' init',
                { env: this.options.extra.env }
            );

            init.once('exit', (code: number, signal: any) => {
                if (code !== 0 && !signal) {
                    this.logger.warn(`ipfs:_init failed { code: ${code}, signal: ${signal} }`);
                    return reject(new Error('ipfs already init'));
                }
                return resolve('init successful');
            });

            this.options.retry = false;
            this.process = null;
        });
    }

    /**
     * Spawn child process for ipfs daemon
     * @returns {Bluebird}
     * @private
     */
    private _start (): Promise<{}> {
        return new Promise((resolve, reject) => {
            this.checkExecutable().then(
                () => {
                    this.process = childProcess.spawn(
                        this.downloadManager.wrapper.path(),
                        this.options.args,
                        this.options.extra
                    );
                    this.process.stderr.on('data', (data: string) => {
                        this.logger.error(`ipfs:_start:stderr: ${data}`);
                        reject(new Error('could not start ipfs'));
                    });

                    this.process.stdout.on('data', (data: string) => {
                        this.logger.info(`ipfs:_start:stdout: ${data}`);
                        if (data.includes('Daemon is ready')) {
                            resolve('all systems up');
                        }
                    });
                }
            ).catch(err => {
                this.logger.error(`ipfs:_start:err: ${err}`);
                reject(err);
            });
        });
    }
}
