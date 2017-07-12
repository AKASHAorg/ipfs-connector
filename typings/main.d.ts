declare module 'bin-wrapper';

declare module 'ipfs';
declare module 'ipfs-api';
declare module 'ipld';
declare module 'is-ipfs';
declare module 'ipld-dag-pb';

interface Connector {
    api: any;
    setLogger(logger: {}): void;
    setConfig(option: string, value: string): void;
    setIpfsFolder(target: string): void;
    start(): void;
    stop(): void;
    getPorts(): void;
    setPorts(ports: { gateway?: number, api?: number, swarm?: number }, restart: boolean): void;
    checkVersion(): void;
}