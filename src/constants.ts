export const events = {
    DOWNLOAD_STARTED: 'DOWNLOAD_STARTED',
    BINARY_CORRUPTED: 'BINARY_CORRUPTED',
    SERVICE_STARTING: 'SERVICE_STARTING',
    SERVICE_STARTED: 'start',
    SERVICE_STOPPING: 'SERVICE_STOPPING',
    SERVICE_STOPPED: 'stop',
    SERVICE_FAILED: 'SERVICE_FAILED',
    IPFS_INITING: 'IPFS_INITING',
    IPFS_INIT: 'init',
    ERROR: 'error'
};

export const options = {
    retry: true,
    apiAddress: '/ip4/127.0.0.1/tcp/5001',
    args: ['daemon'],
    executable: '',
    extra: {
        detached: true,
        env: { IPFS_PATH: '' }
    }
};