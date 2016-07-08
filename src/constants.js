"use strict";
const os_1 = require('os');
const path_1 = require('path');
exports.events = {
    DOWNLOAD_STARTED: 'DOWNLOAD_STARTED',
    BINARY_CORRUPTED: 'BINARY_CORRUPTED',
    SERVICE_STARTING: 'SERVICE_STARTING',
    SERVICE_STARTED: 'SERVICE_STARTED',
    SERVICE_STOPPING: 'SERVICE_STOPPING',
    SERVICE_STOPPED: 'SERVICE_STOPPED',
    SERVICE_FAILED: 'SERVICE_FAILED',
    IPFS_INIT: 'IPFS_INIT',
    ERROR: 'ERROR'
};
exports.options = {
    retry: true,
    apiAddress: '/ip4/127.0.0.1/tcp/5001',
    args: ['daemon'],
    executable: '',
    extra: {
        env: Object.assign({}, process.env, { IPFS_PATH: path_1.join(os_1.homedir(), '.ipfs') }),
        detached: true
    }
};
