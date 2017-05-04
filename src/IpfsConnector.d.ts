/// <reference path="../typings/main.d.ts" />
/// <reference types="node" />
/// <reference types="bluebird" />
import * as Promise from 'bluebird';
import { IpfsBin } from './IpfsBin';
import IpfsApiHelper from '@akashaproject/ipfs-connector-utils';
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
            detached: boolean;
            env: {
                IPFS_PATH: string;
            };
        };
    };
    logger: any;
    serviceStatus: {
        api: boolean;
        process: boolean;
        version: string;
    };
    private _isRetry;
    private _callbacks;
    private _api;
    constructor(enforcer: any);
    static getInstance(): IpfsConnector;
    readonly api: IpfsApiHelper;
    setLogger(logger: {}): void;
    setBinPath(path: string): void;
    setOption(option: string, value: any): void;
    setIpfsFolder(target: string): void;
    checkExecutable(): Promise<any>;
    start(): Promise<any>;
    private _start(binPath);
    private _cleanupFile(filePath);
    private _attachStartingEvents();
    private _flushStartingEvents();
    private _handleStdout(data);
    private _handleStderr(data);
    private _pipeStd();
    private _handleExit(code, signal);
    private _handleError(err);
    private _handleInit(err, stdout, stderr);
    private _handleInitEvent(err?);
    stop(): Promise<this>;
    private _init();
    staticGetPorts(retry?: boolean): any;
    staticSetPorts(ports: {
        gateway?: string | number;
        api?: string | number;
        swarm?: string | number;
    }, start?: boolean): Promise<any>;
    private _setPort(service, port, execPath);
    rpcGetPorts(): Promise<{
        gateway: string;
        api: string;
        swarm: string;
    }>;
    rpcSetPorts(ports: {
        gateway?: string | number;
        api?: string | number;
        swarm?: string | number;
    }, restart?: boolean): Promise<any>;
    getPorts(): Promise<{
        gateway: string;
        api: string;
        swarm: string;
    }>;
    setPorts(ports: {
        gateway?: string | number;
        api?: string | number;
        swarm?: string | number;
    }, restart?: boolean): Promise<any>;
    checkVersion(): any;
}
