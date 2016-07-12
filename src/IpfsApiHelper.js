"use strict";
const Promise = require('bluebird');
const isIpfs = require('is-ipfs');
const statics_1 = require('./statics');
class IpfsApiHelper {
    constructor(provider) {
        this.OBJECT_MAX_SIZE = 512 * 1024;
        this.REQUEST_TIMEOUT = 60 * 1000;
        this.apiClient = provider;
    }
    add(data) {
        let dataBuffer;
        dataBuffer = statics_1.toDataBuffer(data);
        if (dataBuffer.length > this.OBJECT_MAX_SIZE) {
            return Promise.reject('Data is too big for an object, use file api instead');
        }
        return this.apiClient.object.put(dataBuffer);
    }
    get(objectHash) {
        if (isIpfs.multihash(objectHash)) {
            return this.apiClient
                .object
                .getAsync(objectHash, { enc: 'base58' })
                .timeout(this.REQUEST_TIMEOUT)
                .then((rawData) => {
                return statics_1.fromRawData(rawData);
            });
        }
    }
    _hasChunks(objectHash) {
        return this.apiClient
            .object
            .statAsync(objectHash, { enc: 'base58' })
            .timeout(this.REQUEST_TIMEOUT)
            .then((result) => {
            return result;
        });
    }
    update(hash, newData) {
        return this.get(hash)
            .then((dataResponse) => {
            const updatedObject = Object.assign({}, dataResponse, newData);
            const dataBuffer = statics_1.toDataBuffer(updatedObject);
            return this.apiClient
                .object
                .patch
                .setData(hash, dataBuffer, { enc: 'base58' });
        })
            .then((dagNode) => {
            return {
                Data: statics_1.fromRawData(dagNode),
                Hash: dagNode.toJSON().Hash
            };
        });
    }
    addFile(source) {
        if (Array.isArray(source)) {
            return this._addMultipleFiles(source);
        }
        return this._addFile(source);
    }
    catFile(hashSource) {
        if (Array.isArray(hashSource)) {
            return this._addMultipleFiles(hashSource);
        }
        return this._catFile(hashSource);
    }
    _addFile(source) {
        const options = Object.assign({}, { isPath: false, recursive: false, followSymlinks: false }, source.options);
        let contentBody = source.data;
        if (options.recursive) {
            options.isPath = true;
        }
        if (!options.isPath) {
            contentBody = new Buffer(contentBody);
        }
        return this.apiClient.add(contentBody, options);
    }
    _addMultipleFiles(sources = []) {
        let data = [];
        sources.forEach((source) => {
            data.push(this._addFile(source));
        });
        return Promise.all(data);
    }
    _catFile(source) {
        if (!isIpfs.multihash(source.id)) {
            throw new Error(`${source.id} not a multihash`);
        }
        let buf = new Buffer(0);
        return new Promise((resolve, reject) => {
            return this.apiClient.cat(source.id).then((response) => {
                if (response.readable) {
                    return response.on('error', (err) => {
                        return reject(err);
                    }).on('data', (data) => {
                        buf = Buffer.concat([buf, data]);
                    }).on('end', () => {
                        if (source.encoding) {
                            return resolve(buf.toString(source.encoding));
                        }
                        return resolve(buf);
                    });
                }
                return resolve(response);
            }).catch((err) => reject(err));
        });
    }
    _catMultipleFiles(hashSources = []) {
        let data = [];
        hashSources.forEach((hash) => {
            data.push(this._catFile(hash));
        });
        return Promise.all(data);
    }
}
exports.IpfsApiHelper = IpfsApiHelper;
