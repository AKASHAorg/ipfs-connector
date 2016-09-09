"use strict";
const Promise = require('bluebird');
const statics_1 = require('./statics');
const is_ipfs_1 = require('is-ipfs');
class IpfsApiHelper {
    constructor(provider) {
        this.OBJECT_MAX_SIZE = 512 * 1024;
        this.REQUEST_TIMEOUT = 60 * 1000;
        this.LINK_SYMBOL = '/';
        this.apiClient = provider;
    }
    add(data) {
        let dataBuffer;
        if (Buffer.isBuffer(data)) {
            dataBuffer = data;
        }
        else {
            dataBuffer = statics_1.toDataBuffer(data);
        }
        if (dataBuffer.length > this.OBJECT_MAX_SIZE) {
            return this.addFile(dataBuffer);
        }
        return this.apiClient
            .object
            .putAsync(dataBuffer)
            .then((dagNode) => {
            return statics_1.fromRawObject(dagNode).Hash;
        });
    }
    addFile(dataBuffer) {
        return this.apiClient
            .addAsync(dataBuffer)
            .then((file) => {
            return file[0].path;
        });
    }
    get(objectHash) {
        return this._getStats(objectHash)
            .then((stats) => {
            if (stats.NumLinks > 0) {
                return this.getFile(objectHash);
            }
            return this.getObject(objectHash);
        });
    }
    getObject(objectHash) {
        return this.apiClient
            .object
            .getAsync(objectHash, { enc: 'base58' })
            .timeout(this.REQUEST_TIMEOUT)
            .then((rawData) => {
            return statics_1.fromRawData(rawData);
        });
    }
    getFile(hash) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            let fileLength = 0;
            return this.apiClient
                .catAsync(hash)
                .timeout(this.REQUEST_TIMEOUT)
                .then((stream) => {
                if (stream.readable) {
                    stream
                        .on('error', (err) => {
                        return reject(err);
                    })
                        .on('data', (data) => {
                        fileLength += data.length;
                        chunks.push(data);
                    })
                        .on('end', () => {
                        const file = Buffer.concat(chunks, fileLength);
                        resolve(file);
                    });
                    return;
                }
                return resolve(stream);
            });
        });
    }
    _getStats(objectHash) {
        return this.apiClient
            .object
            .statAsync(objectHash, { enc: 'base58' })
            .timeout(this.REQUEST_TIMEOUT)
            .then((result) => {
            return result;
        });
    }
    updateObject(hash, newData) {
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
    resolve(path) {
        if (is_ipfs_1.multihash(path)) {
            return this.get(path);
        }
        const nodes = statics_1.splitPath(path);
        const pathLength = nodes.length - 1;
        if (!is_ipfs_1.multihash(nodes[0])) {
            return Promise.reject(new Error('Not a valid ipfs path'));
        }
        return new Promise((resolve, reject) => {
            this.get(nodes[0])
                .then((response) => {
                if (Buffer.isBuffer(response)) {
                    return resolve(response);
                }
                let currentIndex = 1;
                const step = (previousObj) => {
                    const chunk = nodes[currentIndex];
                    if (!chunk) {
                        return resolve(previousObj);
                    }
                    if (!previousObj.hasOwnProperty(chunk)) {
                        return reject(new Error('Path could not be resolved'));
                    }
                    if (previousObj[chunk].hasOwnProperty(this.LINK_SYMBOL)) {
                        this.get(previousObj[chunk][this.LINK_SYMBOL])
                            .then((discoveredNode) => {
                            currentIndex++;
                            step(discoveredNode);
                        })
                            .catch((err) => reject(err));
                        return;
                    }
                    if (currentIndex >= pathLength) {
                        if (is_ipfs_1.multihash(previousObj[chunk])) {
                            this.get(previousObj[chunk])
                                .then((fetchedNode) => {
                                resolve(fetchedNode);
                            });
                            return;
                        }
                        return resolve(previousObj[chunk]);
                    }
                    return reject(new Error('Invalid object path'));
                };
                return step(response);
            });
        });
    }
    constructObjLink(data) {
        const constructed = {};
        if (is_ipfs_1.multihash(data)) {
            constructed[this.LINK_SYMBOL] = data;
            return Promise.resolve(constructed);
        }
        return this.add(data).then((hash) => {
            constructed[this.LINK_SYMBOL] = hash;
            return constructed;
        });
    }
}
exports.IpfsApiHelper = IpfsApiHelper;
