/// <reference path="../typings/main.d.ts" />
/// <reference types="node" />
/// <reference types="bluebird" />
import * as Promise from 'bluebird';
export declare class IpfsApiHelper {
    apiClient: any;
    OBJECT_MAX_SIZE: number;
    REQUEST_TIMEOUT: number;
    constructor(provider: any);
    static readonly ENC_BASE58: string;
    add(data: any, isFile?: boolean): any;
    addObject(data: any): any;
    createNode(root: any, links: any[]): any;
    addFile(dataBuffer: Buffer): any;
    findLinks(hash: string, names: string[]): any;
    findLinkPath(start: string, path: string[]): any;
    getLinks(hash: string, enc?: string): any;
    get(objectHash: string, isFile?: boolean): any;
    getObject(objectHash: string, full?: boolean): any;
    getFile(hash: string): Promise<{}>;
    getStats(objectHash: string): any;
    updateObject(hash: string, newData: Object): any;
    addLinkFrom(data: any, name: string, linkTo: string, enc?: string): any;
    addLink(link: {
        name: string;
        size: number;
        hash: string;
    }, linkTo: string, enc?: string): any;
}
