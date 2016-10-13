/// <reference path="../typings/main.d.ts" />
/// <reference types="node" />
/// <reference types="bluebird" />
import * as Promise from 'bluebird';
export declare class IpfsApiHelper {
    apiClient: any;
    OBJECT_MAX_SIZE: number;
    REQUEST_TIMEOUT: number;
    constructor(provider: any);
    static readonly LINK_SYMBOL: string;
    static readonly ENC_SYMBOL: string;
    static readonly ENC_PROTOBUF: string;
    static readonly ENC_BASE58: string;
    add(data: Object | Buffer, isProtobuf?: boolean): any;
    addFile(dataBuffer: Buffer): any;
    get(objectHash: string, isProtobuf?: boolean): any;
    getObject(objectHash: string): any;
    getFile(hash: string): Promise<{}>;
    private _getStats(objectHash);
    updateObject(hash: string, newData: Object): any;
    resolve(path: string): any;
    constructObjLink(data: any, isProtobuf?: boolean): any;
}
