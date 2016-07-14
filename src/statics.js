"use strict";
function toDataBuffer(data) {
    return Buffer.from(JSON.stringify(data));
}
exports.toDataBuffer = toDataBuffer;
function fromRawData(rawData) {
    return JSON.parse(rawData.toJSON().Data);
}
exports.fromRawData = fromRawData;
function fromRawObject(rawObject) {
    return rawObject.toJSON();
}
exports.fromRawObject = fromRawObject;
function splitPath(path) {
    return path.replace(/^\//, '')
        .replace(/([^\\])\//g, '$1\u000B').split('\u000B');
}
exports.splitPath = splitPath;
