declare class BinWrapper {
    constructor(options?: any);
    src(path: string, platform: string, arch: string): BinWrapper;
    dest(path: string): BinWrapper;
    use(path: string): BinWrapper;
    run(command: Array<string>, callback: any): any;
    path: () => string;
    version(range: string): BinWrapper;
}

declare module 'bin-wrapper' {
    export = BinWrapper;
}