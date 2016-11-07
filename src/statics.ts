import * as Promise from 'bluebird';
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
    return fromRawObject(rawData).then((data) => {
        let returned: any;
        try {
            returned = JSON.parse(data.Data);
        } catch (err) {
            returned = data.Data;
        }
        return returned;
    });
}

/**
 *
 * @param rawObject
 * @returns {string|any|Object}
 */
export function fromRawObject(rawObject: any) {
    return Promise.fromCallback((cb) => {
        rawObject.toJSON(cb);
    });
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