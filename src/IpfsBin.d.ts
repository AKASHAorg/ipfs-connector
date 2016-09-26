/// <reference path="../typings/main.d.ts" />
/// <reference types="bluebird" />
import * as Promise from 'bluebird';
import Wrapper from 'bin-wrapper';
export declare class IpfsBin {
    wrapper: Wrapper;
    constructor(target?: string);
    getPath(): string;
    check(): Promise<{}>;
    deleteBin(): Promise<{}>;
}
