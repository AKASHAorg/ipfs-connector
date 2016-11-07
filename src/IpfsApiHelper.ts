/// <reference path="../typings/main.d.ts"/>
import * as Promise from 'bluebird';
import { fromRawData, toDataBuffer, fromRawObject, splitPath } from './statics';
import { multihash } from 'is-ipfs';
import { Readable } from 'stream';
import set = Reflect.set;

export class IpfsApiHelper {
    public apiClient: any;
    public OBJECT_MAX_SIZE = 1.5 * 1024 * 1024; // 1.5mb
    public REQUEST_TIMEOUT = 60 * 1000; // 60s

    /**
     * Set ipfs-api object
     * @param provider
     */
    constructor(provider: any) {
        this.apiClient = provider;
    }

    public static get LINK_SYMBOL() {
        return '/';
    }

    public static get ENC_SYMBOL() {
        return 'enc';
    }

    public static get ENC_PROTOBUF() {
        return 'protobuf';
    }

    public static get ENC_BASE58() {
        return 'base58';
    }

    /**
     *
     * @param data
     * @param isProtobuf
     * @returns {any}
     */
    add(data: any, isProtobuf = false) {
        let dataBuffer: Buffer;
        if (Buffer.isBuffer(data) || isProtobuf) {
            dataBuffer = data;
        } else {
            dataBuffer = toDataBuffer(data);
        }
        if (dataBuffer.length > this.OBJECT_MAX_SIZE || isProtobuf) {
            return this.addFile(dataBuffer);
        }
        return this.apiClient
            .object
            .putAsync(dataBuffer)
            .then((dagNode: any) => {
                return fromRawObject(dagNode).then((jsonData) => jsonData.Hash);
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
     * @param isProtobuf
     * @returns {Bluebird<U>}
     */
    get(objectHash: string, isProtobuf = false) {
        return this._getStats(objectHash)
            .then((stats: any) => {
                if (stats.NumLinks > 0 || isProtobuf) {
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
            .getAsync(objectHash, { enc: IpfsApiHelper.ENC_BASE58 })
            .timeout(this.REQUEST_TIMEOUT)
            .then((rawData: any) => {
                return fromRawData(rawData).then((jsonData) => jsonData);
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
            .statAsync(objectHash, { enc: IpfsApiHelper.ENC_BASE58 })
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
                    .setData(hash, dataBuffer, { enc: IpfsApiHelper.ENC_BASE58 });
            })
            .then((dagNode: any) => {
                return fromRawObject(dagNode).then((jsonData) => jsonData);
            });
    }

    /**
     *
     * @param path
     * @returns {any}
     */
    resolve(path: any) {
        if (typeof path === "object") {
            if (path.hasOwnProperty(IpfsApiHelper.LINK_SYMBOL) && path.hasOwnProperty(IpfsApiHelper.ENC_SYMBOL)) {
                return this.get(
                    path[IpfsApiHelper.LINK_SYMBOL],
                    path[IpfsApiHelper.ENC_SYMBOL] === IpfsApiHelper.ENC_PROTOBUF
                );
            }
        }
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
                        if (previousObj[chunk].hasOwnProperty(IpfsApiHelper.LINK_SYMBOL) &&
                            previousObj[chunk].hasOwnProperty(IpfsApiHelper.ENC_SYMBOL)
                        ) {
                            this.get(
                                previousObj[chunk][IpfsApiHelper.LINK_SYMBOL],
                                previousObj[chunk][IpfsApiHelper.ENC_SYMBOL] === IpfsApiHelper.ENC_PROTOBUF)
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
     * @param isProtobuf
     * @returns {any}
     */
    public constructObjLink(data: any, isProtobuf = false) {
        const constructed = {};
        constructed[IpfsApiHelper.ENC_SYMBOL] = (isProtobuf) ? IpfsApiHelper.ENC_PROTOBUF : IpfsApiHelper.ENC_BASE58;
        if (data.length < 64 && multihash(data)) {
            constructed[IpfsApiHelper.LINK_SYMBOL] = data;
            return Promise.resolve(constructed);
        }
        return this.add(data, isProtobuf).then((hash: string) => {
            constructed[IpfsApiHelper.LINK_SYMBOL] = hash;
            return constructed;
        });
    }
}