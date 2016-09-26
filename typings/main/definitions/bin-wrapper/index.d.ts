declare module 'bin-wrapper' {
    export default class BinWrapperIpfs {
        constructor(options?: any);
        src(path: string, platform: string, arch: string): BinWrapperIpfs;
        dest(path: string): BinWrapperIpfs;
        use(path: string): BinWrapperIpfs;
        run(command: Array<string>, callback: any): any;
        path: () => string;
        version(range: string): BinWrapperIpfs;
    }
}