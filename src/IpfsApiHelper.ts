/// <reference path="../typings/main.d.ts"/>
import * as Promise from 'bluebird';
import { fromRawData, toDataBuffer, fromRawObject, splitPath } from './statics';
import { multihash } from 'is-ipfs';
import { Readable } from 'stream';

export class IpfsApiHelper {
    public apiClient: any;
    public OBJECT_MAX_SIZE = 512 * 1024; // 512kb
    public REQUEST_TIMEOUT = 60 * 1000; // 60s
    public LINK_SYMBOL = '/';

    /**
     * Set ipfs-api object
     * @param provider
     */
    constructor(provider: any) {
        this.apiClient = provider;
    }

    /**
     *
     * @param data
     * @returns {any}
     */
    add(data: Object | Buffer) {
        let dataBuffer: Buffer;
        if (Buffer.isBuffer(data)) {
            dataBuffer = data;
        } else {
            dataBuffer = toDataBuffer(data);
        }
        if (dataBuffer.length > this.OBJECT_MAX_SIZE) {
            return this.addFile(dataBuffer);
        }
        return this.apiClient
            .object
            .putAsync(dataBuffer)
            .then((dagNode: any) => {
                return fromRawObject(dagNode).Hash;
            });
    }

    /**
     *
     * @param dataBuffer
     * @returns {Bluebird}
     */
    addFile(dataBuffer: Buffer) {
        return this.apiClient
            .addAsync(dataBuffer)
            .then((file: any[]) => {
                return file[0].path;
            });
    }

    /**
     *
     * @param objectHash
     * @returns {Bluebird<U>}
     */
    get(objectHash: string) {
        return this._getStats(objectHash)
            .then((stats: any) => {
                if (stats.NumLinks > 0) {
                    return this.getFile(objectHash);
                }
                return this.getObject(objectHash);
            });
    }

    /**
     *
     * @param objectHash
     * @returns {Bluebird<U>|Thenable<U>|PromiseLike<TResult>|Promise<TResult>}
     */
    getObject(objectHash: string) {
        return this.apiClient
            .object
            .getAsync(objectHash, { enc: 'base58' })
            .timeout(this.REQUEST_TIMEOUT)
            .then((rawData: any) => {
                return fromRawData(rawData);
            });
    }

    /**
     *
     * @param hash
     * @returns {"~bluebird/bluebird".Bluebird}
     */
    getFile(hash: string) {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            let fileLength = 0;
            return this.apiClient
                .catAsync(hash)
                .timeout(this.REQUEST_TIMEOUT)
                .then((stream: Readable) => {
                    if (stream.readable) {
                        stream
                            .on('error', (err: Error) => {
                                return reject(err);
                            })
                            .on('data', (data: Buffer) => {
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

    /**
     * @param objectHash
     * @returns {Promise<string|any|Object>|Thenable<string|any|Object>|Bluebird<string|any|Object>|PromiseLike<string|any|Object>}
     * @private
     */
    private _getStats(objectHash: string) {
        return this.apiClient
            .object
            .statAsync(objectHash, { enc: 'base58' })
            .timeout(this.REQUEST_TIMEOUT)
            .then((result: Object) => {
                return result;
            });
    }

    /**
     *
     * @param hash
     * @param newData
     * @returns {Thenable<{Data: any, Hash: any}>|PromiseLike<{Data: any, Hash: any}>|Bluebird<{Data: any, Hash: any}>}
     */
    updateObject(hash: string, newData: Object) {

        return this.get(hash)
            .then((dataResponse: Object) => {
                const updatedObject = Object.assign({}, dataResponse, newData);
                const dataBuffer = toDataBuffer(updatedObject);
                // this returns a DAGNode
                return this.apiClient
                    .object
                    .patch
                    .setData(hash, dataBuffer, { enc: 'base58' });
            })
            .then((dagNode: any) => {
                return {
                    Data: fromRawData(dagNode),
                    Hash: dagNode.toJSON().Hash
                };
            });
    }

    /**
     *
     * @param path
     * @returns {any}
     */
    resolve(path: string) {
        if (multihash(path)) {
            return this.get(path);
        }
        const nodes = splitPath(path);
        const pathLength = nodes.length - 1;
        if (!multihash(nodes[0])) {
            return Promise.reject(new Error('Not a valid ipfs path'));
        }
        return new Promise((resolve, reject) => {
            this.get(nodes[0])
                .then((response: any) => {
                    if (Buffer.isBuffer(response)) {
                        return resolve(response);
                    }
                    let currentIndex = 1;
                    const step = (previousObj: any) => {
                        const chunk = nodes[currentIndex];
                        if (!chunk) {
                            return resolve(previousObj);
                        }
                        if (!previousObj.hasOwnProperty(chunk)) {
                            return reject(new Error('Path could not be resolved'));
                        }
                        // is a link
                        if (previousObj[chunk].hasOwnProperty(this.LINK_SYMBOL)) {
                            this.get(previousObj[chunk][this.LINK_SYMBOL])
                                .then((discoveredNode: any) => {
                                    currentIndex++;
                                    step(discoveredNode);
                                })
                                .catch((err: any) => reject(err));
                            return;
                        }
                        if (currentIndex >= pathLength) {
                            if (multihash(previousObj[chunk])) {
                                this.get(previousObj[chunk])
                                    .then((fetchedNode: any) => {
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

    /**
     *
     * @param data
     * @returns {any}
     */
    public constructObjLink(data: any) {
        const constructed = {};
        if (multihash(data)) {
            constructed[this.LINK_SYMBOL] = data;
            return Promise.resolve(constructed);
        }
        return this.add(data).then((hash: string) => {
            constructed[this.LINK_SYMBOL] = hash;
            return constructed;
        });
    }
}