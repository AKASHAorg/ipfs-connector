declare module 'is-ipfs'{
    export function multihash(hash: string): boolean;
    export function url(path: string): boolean;
    export function path(path: string): boolean;
    export function urlOrPath(uOrP: string): boolean;
    export function ipfsUrl(url: string): boolean;
    export function ipfsPath(path: string): boolean;
    export function ipnsPath(path: string): boolean;
}