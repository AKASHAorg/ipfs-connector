/// <reference types="node" />
/// <reference types="bluebird" />
import * as Promise from 'bluebird';
export declare function toDataBuffer(data: Object): Buffer;
export declare function fromRawData(rawData: any): Promise<any>;
export declare function fromRawObject(rawObject: any): Promise<any>;
export declare function splitPath(path: string): string[];
