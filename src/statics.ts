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
    let data: any;
    try {
        data = JSON.parse(rawData.toJSON().Data);
    } catch (err) {
        data = rawData.toJSON().Data;
    }
    return data;
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
 * @param path
 * @returns {string[]}
 */
export function splitPath (path: string) {
    return path.replace(/^\//, '')
        .replace(/([^\\])\//g, '$1\u000B').split('\u000B');
}