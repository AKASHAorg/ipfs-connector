"use strict";
const Promise = require('bluebird');
class IpfsApiHelper {
    constructor(provider) {
        this.apiClient = provider;
    }
    add(source) {
        if (Array.isArray(source)) {
            return this._addMultiple(source);
        }
        return this._add(source);
    }
    cat(hashSource) {
        if (Array.isArray(hashSource)) {
            return this._catMultiple(hashSource);
        }
        return this._cat(hashSource);
    }
    _add(source) {
        const options = Object.assign({}, { isPath: false, recursive: false, followSymlinks: false }, source.options);
        let contentBody = source.data;
        if (!options.isPath) {
            contentBody = new Buffer(contentBody);
        }
        return this.apiClient.add(contentBody, options);
    }
    _addMultiple(sources = []) {
        let data = [];
        sources.forEach((source) => {
            data.push(this._add(source));
        });
        return Promise.all(data);
    }
    _cat(source) {
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
    _catMultiple(hashSources = []) {
        let data = [];
        hashSources.forEach((hash) => {
            data.push(this._cat(hash));
        });
        return Promise.all(data);
    }
}
exports.IpfsApiHelper = IpfsApiHelper;
