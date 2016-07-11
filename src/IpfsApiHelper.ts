/// <reference path="../typings/main.d.ts"/>
import * as Promise from 'bluebird';
import * as isIpfs from 'is-ipfs';
import {marshal, unmarshal} from 'ipld';

export class IpfsApiHelper {
    public apiClient: any;

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
        return this.apiClient.object.put(new Buffer(JSON.stringify(data)));
    }

    /**
     *
     * @param objectHash
     * @returns {Bluebird<U>}
     */
    get(objectHash: string) {
        return this.apiClient
            .object
            .get(objectHash, {enc: 'base58'})
            .then((rawData: any) => {
                return JSON.parse(rawData.toJSON().Data);
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