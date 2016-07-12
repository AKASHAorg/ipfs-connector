"use strict";
const Promise = require('bluebird');
const IpfsBin_1 = require('./IpfsBin');
const IpfsApiHelper_1 = require('./IpfsApiHelper');
const ipfsApi = require('ipfs-api');
const events_1 = require('events');
const constants_1 = require('./constants');
const childProcess = require('child_process');
const symbolEnforcer = Symbol();
const symbol = Symbol();
class IpfsConnector extends events_1.EventEmitter {
    constructor(enforcer) {
        super();
        this.downloadManager = new IpfsBin_1.IpfsBin();
        this.options = constants_1.options;
        this._callbacks = new Map();
        this.logger = console;
        if (enforcer !== symbolEnforcer) {
            throw new Error('Use .getInstance() instead of constructing a new object');
        }
        this._callbacks.set('process.stderr.on', (data) => {
            if (data.toString().includes('daemon is running')) {
                return this.emit(constants_1.events.SERVICE_STARTED);
            }
            return this.emit(constants_1.events.SERVICE_FAILED, data);
        });
        this._callbacks.set('process.stdout.on', (data) => {
            if (data.includes('Daemon is ready')) {
                return this.emit(constants_1.events.SERVICE_STARTED);
            }
        });
        this._callbacks.set('ipfs.init', (err, stdout, stderr) => {
            if (err) {
                if (stderr.toString().includes('file already exists')) {
                    return this.emit(constants_1.events.IPFS_INIT);
                }
                this.logger.error(stderr);
                return this.emit(constants_1.events.IPFS_INIT, stderr.toString());
            }
            return this.emit(constants_1.events.IPFS_INIT);
        });
        this._callbacks.set('events.IPFS_INIT', (err) => {
            if (!err) {
                this.start();
            }
        });
        this._callbacks.set('events.SERVICE_FAILED', (message) => {
            if (message.includes('ipfs init')) {
                setTimeout(() => this._init(), 500);
            }
        });
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
            api.object = Promise.promisifyAll(api.object);
            api = Promise.promisifyAll(api);
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
        const timeOut = setTimeout(() => {
            this.emit(constants_1.events.DOWNLOAD_STARTED);
        }, 600);
        return this.downloadManager.check().then(data => {
            this.logger.info(`executing from ${data}`);
            return true;
        }).catch(err => {
            this.logger.error(err);
            this.emit(constants_1.events.BINARY_CORRUPTED, err);
            return false;
        }).finally(() => clearTimeout(timeOut));
    }
    start() {
        return this.checkExecutable().then((binOk) => {
            if (!binOk) {
                return this.emit(constants_1.events.SERVICE_FAILED);
            }
            this.process = childProcess.spawn(this.downloadManager.wrapper.path(), this.options.args, this.options.extra);
            this.once(constants_1.events.SERVICE_STARTED, () => {
                this._flushStartingEvents();
            });
            this._pipeStd();
            this._attachStartingEvents();
        });
    }
    _attachStartingEvents() {
        this.process.stderr.on('data', this._callbacks.get('process.stderr.on'));
        this.process.stdout.on('data', this._callbacks.get('process.stdout.on'));
        this.on(constants_1.events.IPFS_INIT, this._callbacks.get('events.IPFS_INIT'));
        this.on(constants_1.events.SERVICE_FAILED, this._callbacks.get('events.SERVICE_FAILED'));
    }
    _flushStartingEvents() {
        this.process.stderr.removeListener('data', this._callbacks.get('process.stderr.on'));
        this.process.stdout.removeListener('data', this._callbacks.get('process.stdout.on'));
        this.removeListener(constants_1.events.IPFS_INIT, this._callbacks.get('events.IPFS_INIT'));
        this.removeListener(constants_1.events.SERVICE_FAILED, this._callbacks.get('events.SERVICE_FAILED'));
    }
    _pipeStd() {
        const logError = (data) => this.logger.error(data.toString());
        const logInfo = (data) => this.logger.info(data.toString());
        this.process.stderr.on('data', logError);
        this.process.stdout.on('data', logInfo);
        this.once(constants_1.events.SERVICE_STOPPED, () => {
            this.process.stderr.removeListener('data', logError);
            this.process.stdout.removeListener('data', logInfo);
        });
    }
    stop(signal = 'SIGINT') {
        this.emit(constants_1.events.SERVICE_STOPPING);
        this._api = null;
        this.options.retry = true;
        if (this.process) {
            this.process.once('exit', () => this.emit(constants_1.events.SERVICE_STOPPED));
            this.process.kill(signal);
            this.process = null;
            return this;
        }
        this.emit(constants_1.events.SERVICE_STOPPED);
        return this;
    }
    _init() {
        let init = childProcess.exec(this.downloadManager.wrapper.path() + ' init', { env: this.options.extra.env }, this._callbacks.get('ipfs.init'));
        this.options.retry = false;
        this.process = null;
    }
}
exports.IpfsConnector = IpfsConnector;
