declare module 'ipld' {
    export const LINK_TAG: string;
    export const LINK_SYMBOL: string;
    export function marshal(object: Object): string;
    export function unmarshal(encoded: string, options?: Object): Object;
    export function multihash(object: Object): string;
}