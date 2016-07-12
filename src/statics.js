"use strict";
const isIpfs = require('is-ipfs');
exports.LINK_SYMBOL = '/';
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
function constructLink(hash) {
    const constructed = {};
    if (isIpfs.multihash(hash)) {
        constructed[exports.LINK_SYMBOL] = hash;
        return constructed;
    }
    return null;
}
exports.constructLink = constructLink;
