import { homedir } from 'os';
import { join as pathJoin } from 'path';

export const events = {
    DOWNLOAD_STARTED: 'DOWNLOAD_STARTED',
    BINARY_CORRUPTED: 'BINARY_CORRUPTED',
    SERVICE_STARTING: 'SERVICE_STARTING',
    SERVICE_STARTED: 'SERVICE_STARTED',
    SERVICE_STOPPING: 'SERVICE_STOPPING',
    SERVICE_STOPPED: 'SERVICE_STOPPED',
    SERVICE_FAILED: 'SERVICE_FAILED',
    IPFS_INITING: 'IPFS_INITING',
    IPFS_INIT: 'IPFS_INIT',
    ERROR: 'ERROR'
};

export const options = {
    retry: true,
    apiAddress: '/ip4/127.0.0.1/tcp/5001',
    args: ['daemon'],
    executable: '',
    extra: {
        env: Object.assign({}, { IPFS_PATH: pathJoin(homedir(), '.ipfs') }),
        detached: true
    }
};