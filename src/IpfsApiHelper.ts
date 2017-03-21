/// <reference path="../typings/main.d.ts"/>
import * as Promise from 'bluebird';
import { fromRawData, toDataBuffer, fromRawObject } from './statics';
import { multihash } from 'is-ipfs';
import { Readable } from 'stream';
import { DAGLink, DAGNode } from 'ipld-dag-pb';
import { version as requiredVersion } from './IpfsBin';

export class IpfsApiHelper {
    public apiClient: any;
    public OBJECT_MAX_SIZE = 256 * 1024; // 256kb
    public REQUEST_TIMEOUT = 60 * 1000; // 60s

    /**
     * Set ipfs-api object
     * @param provider
     */
    constructor(provider: any) {
        this.apiClient = provider;
        DAGNode.createAsync = Promise.promisify(DAGNode.create);
    }

    public static get ENC_BASE58() {
        return 'base58';
    }

    /**
     *
     * @param data
     * @param isFile
     * @returns {any}
     */
    public add(data: any, isFile = false) {
        let dataBuffer: Buffer;
        if (Buffer.isBuffer(data) || isFile) {
            dataBuffer = data;
        } else {
            dataBuffer = toDataBuffer(data);
        }
        if (dataBuffer.length > this.OBJECT_MAX_SIZE || isFile) {
            return this.addFile(dataBuffer);
        }
        return this.addObject(dataBuffer);
    }

    /**
     *
     * @param data
     * @returns {Bluebird}
     */
    public addObject(data: any) {
        return this.apiClient
            .object
            .putAsync(data)
            .then((dagNode: any) => {
                const format = dagNode.toJSON();
                return { hash: format.multihash, size: format.size };
            });
    }

    /**
     *
     * @param root
     * @param links
     * @returns {Bluebird<U2|U1>|Thenable<U>|Bluebird<U>|Promise<TResult>|Bluebird<R>|Promise<T>|any}
     */
    public createNode(root: any, links: any[]) {
        return DAGNode
            .createAsync(toDataBuffer(root), links)
            .then((dagNode: any) => {
                return this.addObject(dagNode);
            });
    }

    /**
     *
     * @param dataBuffer
     * @returns {Bluebird}
     */
    public addFile(dataBuffer: Buffer) {
        return this.apiClient
            .addAsync(dataBuffer)
            .then((file: any[]) => {
                return { hash: file[0].hash, size: file[0].size };
            });
    }

    /**
     *
     * @param hash
     * @param names
     * @returns {Bluebird<undefined|T|number|any>}
     */
    public findLinks(hash: string, names: string []) {
        return this.getObject(hash, true)
            .then((dagNode: any) => {
                const format = dagNode.toJSON();
                return format.links.filter((link: any) => names.indexOf(link.name) !== -1)
            });
    }

    /**
     *
     * @param start
     * @param path
     * @returns {Function}
     */
    public findLinkPath(start: string, path: string []) {
        const _this = this;
        return Promise.coroutine(function*() {
            if (!multihash(start) || !path.length) {
                throw new Error('Invalid path');
            }
            let index = 0;
            let currentPath = yield _this.findLinks(start, path.slice(index, ++index));
            while (index < path.length && currentPath.length) {
                currentPath = yield _this.findLinks(currentPath[0].multihash, path.slice(index, ++index));
            }
            return currentPath;
        })();
    }

    /**
     *
     * @param hash
     * @returns {any}
     */
    public getLinks(hash: string) {
        return this.apiClient.object.linksAsync(hash);
    }

    /**
     *
     * @param objectHash
     * @param isFile
     * @returns {any}
     */
    public get(objectHash: string, isFile = false) {
        if (isFile) {
            return this.getFile(objectHash);
        }
        return this.getObject(objectHash);
    }

    /**
     *
     * @param objectHash
     * @param full
     * @returns {Bluebird<U>}
     */
    public getObject(objectHash: string, full?: boolean) {
        return this.apiClient
            .object
            .getAsync(objectHash, { enc: IpfsApiHelper.ENC_BASE58 })
            .timeout(this.REQUEST_TIMEOUT)
            .then((rawData: any) => {
                if (full) {
                    return rawData;
                }
                return fromRawData(rawData);
            });
    }

    /**
     *
     * @param hash
     * @returns {Bluebird}
     */
    public getFile(hash: string) {
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
     *
     * @param objectHash
     * @returns {Bluebird<Object>}
     */
    public getStats(objectHash: string) {
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
    public updateObject(hash: string, newData: Object) {

        return this.get(hash)
            .then((dataResponse: Object) => {
                const updatedObject = Object.assign({}, dataResponse, newData);
                const dataBuffer = toDataBuffer(updatedObject);
                // this returns a DAGNode
                return this.apiClient
                    .object
                    .patch
                    .setDataAsync(hash, dataBuffer);
            })
            .then((dagNode: any) => {
                return fromRawObject(dagNode);
            });
    }


    /**
     *
     * @param data
     * @param name
     * @param linkTo
     * @returns {Bluebird<U>}
     */
    public addLinkFrom(data: any, name: string, linkTo: string) {
        return this.add(data)
            .then((result: { size: number, hash: string }) => {
                return this.addLink({ name, size: result.size, hash: result.hash }, linkTo);
            })
    }

    /**
     *
     * @param link
     * @param linkTo
     * @returns {Thenable<U>|Bluebird<R>|Promise<T>|Promise<TResult2|TResult1>|Bluebird<U>|PromiseLike<TResult>|any}
     */
    public addLink(link: { name: string, size: number, hash: string }, linkTo: string) {
        const objLink = new DAGLink(link.name, link.size, link.hash);
        return this.apiClient.object.patch.addLinkAsync(linkTo, objLink)
            .then((dagNode: any) => fromRawObject(dagNode));
    }

    /**
     * @returns {PromiseLike<TResult|boolean>|Bluebird<boolean>|Promise<TResult|boolean>|Promise<boolean>|Bluebird<R>|Promise<TResult2|boolean>|any}
     */
    public checkVersion() {
        return this.apiClient.versionAsync().then(
            (data: any) => {
                return data.version === requiredVersion;
            }
        )
    }
}