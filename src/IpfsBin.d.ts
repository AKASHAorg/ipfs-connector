/// <reference path="../typings/main.d.ts" />
/// <reference types="bluebird" />
import * as Promise from 'bluebird';
export declare class IpfsBin {
    wrapper: any;
    constructor(target?: string);
    getPath(): any;
    check(cb: any): void;
    deleteBin(): Promise<{}>;
}
