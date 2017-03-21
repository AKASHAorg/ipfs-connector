/// <reference path="../typings/main.d.ts" />
/// <reference types="node" />
/// <reference types="bluebird" />
import * as Promise from 'bluebird';
import { IpfsBin } from './IpfsBin';
import { IpfsApiHelper } from './IpfsApiHelper';
import { EventEmitter } from 'events';
export declare class IpfsConnector extends EventEmitter {
    private process;
    downloadManager: IpfsBin;
    options: {
        retry: boolean;
        apiAddress: string;
        args: string[];
        executable: string;
        extra: {
            env: any;
            detached: boolean;
        };
    };
    logger: any;
    serviceStatus: {
        api: boolean;
        process: boolean;
        version: string;
    };
    private _callbacks;
    private _api;
    constructor(enforcer: any);
    static getInstance(): IpfsConnector;
    readonly api: IpfsApiHelper;
    setLogger(logger: {}): void;
    setBinPath(path: string): void;
    setConfig(option: string, value: string): void;
    setIpfsFolder(target: string): void;
    checkExecutable(): Promise<{}>;
    start(): Promise<void>;
    private _start(binPath);
    private _attachStartingEvents();
    private _flushStartingEvents();
    private _pipeStd();
    stop(): this;
    private _init();
    getPorts(): Promise<{
        gateway: number;
        api: number;
        swarm: number;
    }>;
    setPorts(ports: {
        gateway?: number;
        api?: number;
        swarm?: number;
    }, restart?: boolean): Promise<any>;
    checkVersion(): any;
}
