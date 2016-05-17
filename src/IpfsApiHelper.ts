/// <reference path="../typings/main.d.ts"/>
import * as Promise from 'bluebird';

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
     * Add data to ipfs
     * @param source
     * @returns {Bluebird}
     */
    public add (source: {
        data: any,
        options?: { isPath: boolean, recursive: boolean, followSymlinks: boolean }
    }[]): Promise<{} | {}[]> {
        if (Array.isArray(source)) {
            return this._addMultiple(source);
        }
        return this._add(source);
    }

    /**
     * Read data from ipfs
     * @param hashSource
     * @returns {Bluebird<any>}
     */
    public cat (hashSource: {
        id: string,
        encoding?: string
    }[]): Promise<{} | {}[]> {
        if (Array.isArray(hashSource)) {
            return this._catMultiple(hashSource);
        }
        return this._cat(hashSource);
    }

    /**
     * Read data from ipfs
     * @param source
     * @returns {Bluebird}
     * @private
     */
    private _add (source: any): Promise<{}> {
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
    private _addMultiple (sources: {}[] = []): Promise<{}[]> {

        let data: Promise<{}>[] = [];

        sources.forEach((source) => {
            data.push(this._add(source));
        });

        return Promise.all(data);
    }

    /**
     *
     * @param source
     * @returns {Bluebird}
     * @private
     */
    private _cat (source: any): Promise<{}> {
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
    private _catMultiple (hashSources: {}[] = []): Promise<{}[]> {
        let data: Promise<{}>[] = [];
        hashSources.forEach((hash) => {
            data.push(this._cat(hash));
        });
        return Promise.all(data);
    }
}