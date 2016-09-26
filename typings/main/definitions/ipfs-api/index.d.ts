declare class IpfsApi {
    constructor (options?: any);

    add (arrayOrBufferOrStream: any[] | any, options?: {}): Promise<{}>;
    cat (sources: string | string[]): Promise<{}>;
    object: any;
}

declare module 'ipfs-api' {
    const stub: any;
    export = stub;
}