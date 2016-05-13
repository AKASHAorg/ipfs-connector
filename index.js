const ipfsBin = require('./IpfsBin');
const ipfsAPI = require('ipfs-api');
const Promise = require('bluebird');
const childProcess = require('child_process');
const winston = require('winston');

const symbolEnforcer = Symbol();
const symbol = Symbol();

const defaultApi = '/ip4/127.0.0.1/tcp/5001';

/**
 * Quick usage:
 *    const ipfs = IpfsConnector.getInstance();
 *    ipfs.start();
 *    ipfs.cat('ipfsHash').then(...).catch(...)
 *    ipfs.stop();
 */
class IpfsConnector {

    /**
     * Prevent multiple instances of IpfsConnector
     * @param enforcer
     */
    constructor (enforcer) {
        if (enforcer !== symbolEnforcer) {
            throw new Error('Cannot construct singleton');
        }
        this.ipfsProcess = null;
        this._api = null;
        this._conn = defaultApi;
        this._retry = true;
        this.logger = new (winston.Logger)({
            transports: [
                new (winston.transports.Console)(),
                new (winston.transports.File)({ filename: 'ipfs.log' })
            ]
        });
    }

    /**
     * Get singleton instance
     * @returns {object}
     */
    static getInstance () {
        if (!this[symbol]) {
            this[symbol] = new IpfsConnector(symbolEnforcer);
        }
        return this[symbol];
    }

    getConnection () {
        return this._conn;
    }

    /**
     * start ipfs
     * @param daemon
     */
    start (daemon = true) {

        let options = {
            command: ipfsBin,
            args: ['daemon'],
            extra: {
                env: process.env,
                detached: true
            }
        };
        if (daemon) {
            this._spawnIPFS(options).then(
                (data) => {
                    this.logger.info(`ipfs:start: ${data}`);
                }
            ).catch(
                (err) => {
                    if (this._retry) {
                        return this._initIpfs().then(
                            (data) => {
                                this.start();
                            }
                        ).catch(
                            (errInit) => {
                                this.logger.warn(`ipfs:${errInit}`);
                            }
                        );
                    }
                    return this.logger.warn(err);
                }
            );
        }

        this._connectToAPI();
    }

    /**
     * Set connection to api server
     * Must be done before start()
     * @param socket
     * @param rpc
     * @returns {IpfsConnector}
     */
    setSchema (protocol = defaultApi) {
        this._conn = protocol;
        return this;
    }

    stop () {
        this._kill('SIGINT');
        this.ipfsProcess = null;
    }

    /**
     * Send api calls to server
     * @returns {null|object}
     */
    get api () {
        return this._api;
    }

    /**
     *
     * @param hash
     * @param encoding
     */
    cat (hash, encoding = 'utf8') {
        let buf = new Buffer(0);
        return new Promise((resolve, reject) => {
            if (!this._api) {
                return reject(new Error('no api server found'));
            }

            return this._api.cat(hash, (error, response) => {
                if (error) {
                    return reject(error);
                }

                if (response.readable) {
                    return response.on('error', (err) => {
                        reject(err);
                    }).on('data', (data) => {
                        buf = Buffer.concat([buf, data]);
                    }).on('end', () => {
                        if (encoding) {
                            return resolve(buf.toString(encoding));
                        }
                        return resolve(buf);
                    });
                }
                return resolve(response);
            });
        });
    }

    /**
     * Parallel ipfs cat
     * @param hashSources
     * @returns {bluebird|exports|module.exports}
     */
    catMultiple (hashSources = []) {
        let data = [];

        hashSources.forEach((hash) => {
            data.push(this.cat(hash));
        });

        return new Promise((resolve, reject) => {
            Promise.all(data).then((content) => {
                resolve(content);
            }).catch((error) => {
                reject(error);
            });
        });
    }

    /**
     *
     * @param data
     * @param isPath
     * @param recursive
     * @returns {bluebird|exports|module.exports}
     */
    add (data, { isPath = false, recursive = false } = {}) {
        let options = {};
        let contentBody = data;
        return new Promise((resolve, reject) => {
            if (!this._api) {
                return reject(new Error('no api server found'));
            }

            if (recursive) {
                options.recursive = recursive;
            }

            if (!isPath) {
                contentBody = new Buffer(contentBody);
            }

            return this._api.add(contentBody, options, (error, response) => {
                if (error) {
                    return reject(error);
                }
                return resolve(response);
            });
        });
    }

    /**
     * Parallel ipfs add
     * @param sources <code>sources=[['dummytext'], ['a.txt', {isPath:true}],['a/b/c',{isPath:true,
    * recursive:true}]]</code>
     * @returns {bluebird|exports|module.exports}
     */
    addMultiple (sources = []) {

        let data = [];

        sources.forEach((source) => {
            data.push(this.add(...source));
        });

        return new Promise((resolve, reject) => {
            Promise.all(data).then((hashSources) => {
                resolve(hashSources);
            }).catch((error) => {
                reject(error);
            });
        });
    }

    /**
     * Get key value from ipfs config file
     * @param key
     * @returns {bluebird|exports|module.exports}
     */
    getConfig (key) {
        return new Promise((resolve, reject) => {
            if (!this._api) {
                return reject(new Error('no api server found'));
            }
            return this._api.config.get(key, (err, conf) => {
                if (err) {
                    return reject(err);
                }

                return resolve(conf);
            });
        });
    }

    /**
     * Get folder structure as objects
     * @param folderHash
     * @returns {bluebird|exports|module.exports}
     */
    getFolderLinks (folderHash) {
        return new Promise((resolve, reject) => {
            if (!this._api) {
                return reject(new Error('no api server found'));
            }
            return this._api.ls(folderHash).then((links) => {
                resolve(links.Objects);
            }).catch((error) => {
                reject(error);
            });
        });
    }

    /**
     * Set {key:val} for ipfs config file
     * @param key
     * @param val
     * @returns {bluebird|exports|module.exports}
     */
    setConfig (key, val) {
        return new Promise((resolve, reject) => {
            if (!this._api) {
                return reject(new Error('no api server found'));
            }
            return this._api.config.set(key, val, (err, conf) => {
                if (err) {
                    return reject(err);
                }

                return resolve(conf);
            });
        });
    }

    /**
     * Connect to ipfs api server
     * @returns {boolean}
     * @private
     */
    _connectToAPI () {
        this._api = ipfsAPI(this._conn);
    }

    /**
     * Spawn daemon process
     * @param options
     * @returns {bluebird|exports|module.exports}
     * @private
     */
    _spawnIPFS (options) {
        return new Promise((resolve, reject) => {
            this.ipfsProcess = childProcess.spawn(options.command, options.args, options.extra);
            this.ipfsProcess.once('exit', (code, signal) => {
                if (code !== 0 && !signal) {
                    return reject(new Error('could not start ipfs'));
                }
                return resolve(this.ipfsProcess);
            });
            this._logEvents();
        });
    }


    /**
     * Send process stream to logger
     * @returns {boolean}
     * @private
     */
    _logEvents () {
        this.ipfsProcess.stdout.on('data', (data) => {
            this.logger.info(`ipfs:stdout: ${data}`);
        });

        this.ipfsProcess.stderr.on('data', (data) => {
            this.logger.info(`ipfs:stderr: ${data}`);
        });

        return true;
    }

    /**
     * run <code>ipfs init</code>
     * @private
     */
    _initIpfs () {
        return new Promise((resolve, reject) => {
            let q = childProcess.exec(ipfsBin + ' init');

            q.once('exit', (code, signal) => {
                if (code !== 0 && !signal) {
                    return reject(new Error('ipfs already init'));
                }
                return resolve(q);
            });

            this._retry = false;
            this.ipfsProcess = null;
        });
    }

    /**
     * kill child process & cleanup
     * @private
     */
    _kill (signal) {
        if (this.ipfsProcess) {
            this.ipfsProcess.kill(signal);
        }
        this._api = null;
    }

}

export default IpfsConnector;
