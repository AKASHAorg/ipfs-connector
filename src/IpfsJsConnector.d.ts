/// <reference types="bluebird" />
import * as Promise from 'bluebird';
export declare class IpfsJsConnector {
    private process;
    private _api;
    options: {
        ports: {
            API: number;
            Gateway: number;
            Swarm: number;
        };
        apiAddress: string;
        repo: string;
    };
    logger: any;
    serviceStatus: {
        api: boolean;
        process: boolean;
        version: string;
    };
    constructor(enforcer: any);
    static getInstance(): IpfsJsConnector;
    readonly api: any;
    getOptions(): {
        ports: {
            API: number;
            Gateway: number;
            Swarm: number;
        };
        apiAddress: string;
        repo: string;
    };
    readonly config: {
        repo: string;
        init: boolean;
        start: boolean;
        EXPERIMENTAL: {
            pubsub: boolean;
            sharding: boolean;
        };
        config: {
            Addresses: {
                API: string;
                Gateway: string;
                Swarm: string[];
            };
        };
    };
    setLogger(newLogger: object): void;
    setConfig(option: string, value: string): void;
    setIpfsFolder(path: string): void;
    start(): Promise<{}>;
    stop(): boolean;
    on(event: string, cb: (data?: any) => void): any;
    once(event: string, cb: (data?: any) => void): any;
    removeListener(event: string, cb: (data?: any) => void): any;
    removeAllListeners(event: string): any;
    getPorts(): Promise<{
        gateway: number;
        api: number;
        swarm: number;
    }>;
    setPorts(ports: {
        gateway?: number;
        api?: number;
        swarm?: number;
    }, restart?: boolean): Promise<{
        API: number;
        Gateway: number;
        Swarm: number;
    }>;
    checkVersion(): any;
}
