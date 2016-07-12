/// <reference path="../typings/main.d.ts"/>
import * as Promise from 'bluebird';
import * as isIpfs from 'is-ipfs';
import {fromRawData, toDataBuffer, constructLink, fromRawObject} from './statics';

export class IpfsApiHelper {
    public apiClient: any;
    public OBJECT_MAX_SIZE = 512 * 1024; // 512kb
    public REQUEST_TIMEOUT = 60 * 1000; // 60s
    /**
     * Set ipfs-api object
     * @param provider
     */
    constructor (provider: any) {
        this.apiClient = provider;
    }

    /**
     *
     * @param data
     * @returns {IDBRequest}
     */
    add(data: Object) {
        let dataBuffer: Buffer;
        dataBuffer = toDataBuffer(data);
        if (dataBuffer.length > this.OBJECT_MAX_SIZE) {
            return Promise.reject('Data is too big for an object, use file api instead');
        }
        return this.apiClient.object.put(dataBuffer);
    }

    /**
     *
     * @param objectHash
     * @returns {Bluebird<U>}
     */
    get(objectHash: string) {
        if (isIpfs.multihash(objectHash)) {
            return this.apiClient
                .object
                .getAsync(objectHash, { enc: 'base58' })
                .timeout(this.REQUEST_TIMEOUT)
                .then((rawData: any) => {
                    return fromRawData(rawData);
                });
        }
    }

    /**
     * @Todo: chain into .get object to resolve files
     * @param objectHash
     * @returns {Promise<string|any|Object>|Thenable<string|any|Object>|Bluebird<string|any|Object>|PromiseLike<string|any|Object>}
     * @private
     */
    private _hasChunks(objectHash: string) {
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
    update(hash: string, newData: Object) {

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
     * Add data to ipfs
     * @param source
     * @returns {Bluebird}
     */
    public addFile (source: {
        data: any,
        options?: { isPath: boolean, recursive: boolean, followSymlinks: boolean }
    }[]): Promise<{} | {}[]> {
        if (Array.isArray(source)) {
            return this._addMultipleFiles(source);
        }
        return this._addFile(source);
    }

    /**
     * Read data from ipfs
     * @param hashSource
     * @returns {Bluebird<any>}
     */
    public catFile (hashSource: {
        id: string,
        encoding?: string
    }[]): Promise<{} | {}[]> {
        if (Array.isArray(hashSource)) {
            return this._addMultipleFiles(hashSource);
        }
        return this._catFile(hashSource);
    }

    /**
     * Read data from ipfs
     * @param source
     * @returns {Bluebird}
     * @private
     */
    private _addFile (source: any): Promise<{}> {
        const options = Object.assign({},
            { isPath: false, recursive: false, followSymlinks: false },
            source.options);
        let contentBody = source.data;
        if (options.recursive) {
            options.isPath = true;
        }

        if (!options.isPath) {
            contentBody = new Buffer(contentBody);
        }

        return this.apiClient.add(contentBody, options);
    }

    /**
     *
     * @param sources
     * @returns {Bluebird<any>}
     * @private
     */
    private _addMultipleFiles (sources: {}[] = []): Promise<{}[]> {

        let data: Promise<{}>[] = [];

        sources.forEach((source) => {
            data.push(this._addFile(source));
        });

        return Promise.all(data);
    }

    /**
     *
     * @param source
     * @returns {Bluebird}
     * @private
     */
    private _catFile (source: any): Promise<{}> {
        if (!isIpfs.multihash(source.id)) {
            throw new Error(`${source.id} not a multihash`);
        }
        let buf = new Buffer(0);
        return new Promise((resolve, reject) => {
            return this.apiClient.cat(source.id).then((response: any) => {
                if (response.readable) {
                    return response.on('error', (err: Error) => {
                        return reject(err);
                    }).on('data', (data: Buffer) => {
                        buf = Buffer.concat([buf, data]);
                    }).on('end', () => {
                        if (source.encoding) {
                            return resolve(buf.toString(source.encoding));
                        }
                        return resolve(buf);
                    });
                }
                return resolve(response);
            }).catch((err: Error) => reject(err));
        });
    }

    /**
     *
     * @param hashSources
     * @returns {Bluebird<any>}
     * @private
     */
    private _catMultipleFiles (hashSources: {}[] = []): Promise<{}[]> {
        let data: Promise<{}>[] = [];
        hashSources.forEach((hash) => {
            data.push(this._catFile(hash));
        });
        return Promise.all(data);
    }
}