"use strict";
const os_1 = require('os');
const Promise = require('bluebird');
const IpfsBin_1 = require('./IpfsBin');
const IpfsApiHelper_1 = require('./IpfsApiHelper');
const ipfsApi = require('ipfs-api');
const childProcess = require('child_process');
const path = require('path');
const symbolEnforcer = Symbol();
const symbol = Symbol();
class IpfsConnector {
    constructor(enforcer) {
        this.downloadManager = new IpfsBin_1.IpfsBin();
        this.logger = console;
        this.options = {
            retry: true,
            apiAddress: '/ip4/127.0.0.1/tcp/5001',
            args: ['daemon'],
            executable: '',
            extra: {
                env: Object.assign({}, process.env, { IPFS_PATH: path.join(os_1.homedir(), '.ipfs') }),
                detached: true
            }
        };
        if (enforcer !== symbolEnforcer) {
            throw new Error('Use .getInstance() instead of constructing a new object');
        }
    }
    static getInstance() {
        if (!this[symbol]) {
            this[symbol] = new IpfsConnector(symbolEnforcer);
        }
        return this[symbol];
    }
    get api() {
        if (!this._api) {
            let api = ipfsApi(this.options.apiAddress);
            this._api = new IpfsApiHelper_1.IpfsApiHelper(api);
        }
        return this._api;
    }
    setLogger(logger) {
        this.logger = logger;
    }
    setBinPath(path) {
        this.downloadManager = new IpfsBin_1.IpfsBin(path);
    }
    setConfig(option, value) {
        this.options[option] = value;
    }
    setIpfsFolder(target) {
        this.options.extra.env.IPFS_PATH = target;
    }
    checkExecutable() {
        return this.downloadManager.check().then(data => {
            this.logger.info(data);
            return true;
        }).catch(err => {
            this.logger.error(err);
            return false;
        });
    }
    start() {
        return this._start().then(data => {
            return data;
        }).catch(err => {
            if (this.options.retry) {
                return this._init().then(() => this.start());
            }
            return err;
        });
    }
    stop(signal = 'SIGINT') {
        this.process.kill(signal);
        this.process = null;
        this._api = null;
        this.options.retry = true;
    }
    _init() {
        return new Promise((resolve, reject) => {
            let init = childProcess.exec(this.downloadManager.wrapper.path() + ' init', { env: this.options.extra.env }, (err, stdout, stderr) => {
                if (err) {
                    if (stderr.toString().includes('file already exists')) {
                        return resolve('already init');
                    }
                    this.logger.error(stderr);
                    return reject(stderr);
                }
                return resolve('init finished');
            });
            this.options.retry = false;
            this.process = null;
        });
    }
    _start() {
        return new Promise((resolve, reject) => {
            this.checkExecutable().then(() => {
                this.process = childProcess.spawn(this.downloadManager.wrapper.path(), this.options.args, this.options.extra);
                this.process.stderr.on('data', (data) => {
                    if (data.toString().includes('daemon is running')) {
                        return resolve('already running');
                    }
                    this.logger.error(`ipfs:_start:stderr: ${data}`);
                    return reject(new Error('could not start ipfs'));
                });
                this.process.stdout.on('data', (data) => {
                    this.logger.info(`ipfs:_start:stdout: ${data}`);
                    if (data.includes('Daemon is ready')) {
                        resolve('all systems up');
                    }
                });
            }).catch(err => {
                this.logger.error(`ipfs:_start:err: ${err}`);
                reject(err);
            });
        });
    }
}
exports.IpfsConnector = IpfsConnector;
