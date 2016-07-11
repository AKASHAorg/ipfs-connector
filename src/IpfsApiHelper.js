"use strict";
const Promise = require('bluebird');
const isIpfs = require('is-ipfs');
class IpfsApiHelper {
    constructor(provider) {
        this.apiClient = provider;
    }
    add(data) {
        return this.apiClient.object.put(new Buffer(JSON.stringify(data)));
    }
    get(objectHash) {
        return this.apiClient
            .object
            .get(objectHash, { enc: 'base58' })
            .then((rawData) => {
            return JSON.parse(rawData.toJSON().Data);
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
