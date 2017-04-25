/// <reference types="bluebird" />
import * as Promise from 'bluebird';
export declare class IpfsJsConnector {
    private process;
    private _api;
    private options;
    logger: any;
    serviceStatus: {
        api: boolean;
        process: boolean;
        version: string;
    };
    constructor(enforcer: any);
    static getInstance(): IpfsJsConnector;
    readonly api: any;
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
    setConfig(): void;
    setIpfsFolder(path: string): void;
    start(): Promise<{}>;
    stop(): void;
    on(event: string, cb: (data?: any) => void): any;
    getPorts(): void;
    setPorts(ports: {
        gateway?: number;
        api?: number;
        swarm?: number;
    }): void;
    checkVersion(): any;
}
