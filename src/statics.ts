import * as isIpfs from 'is-ipfs';

export const LINK_SYMBOL = '/';

/**
 *
 * @param data
 * @returns {Buffer}
 */
export function toDataBuffer(data: Object) {
    return Buffer.from(JSON.stringify(data));
}

/**
 *
 * @param rawData
 * @returns {any}
 */
export function fromRawData(rawData: any) {
    return JSON.parse(rawData.toJSON().Data);
}

/**
 *
 * @param rawObject
 * @returns {string|any|Object}
 */
export function fromRawObject(rawObject: any) {
    return rawObject.toJSON();
}

/**
 *
 * @param hash
 * @returns {any}
 */
export function constructLink(hash: string) {
    const constructed = {};
    if (isIpfs.multihash(hash)) {
        constructed[LINK_SYMBOL] = hash;
        return constructed;
    }
    return null;
}

/**
 *
 * @param path
 * @returns {string[]}
 */
export function splitPath (path: string) {
    return path.replace(/^\//, '')
        .replace(/([^\\])\//g, '$1\u000B').split('\u000B');
}