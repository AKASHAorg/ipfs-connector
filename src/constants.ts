import { events as binEvents } from '@akashaproject/bin-wrapper-progress';

export const events = Object.assign(
    {},
    binEvents,
    {
        BINARY_CORRUPTED: 'BINARY_CORRUPTED',
        UPGRADING_BINARY: 'UPGRADING_BINARY',
        SERVICE_STARTING: 'SERVICE_STARTING',
        SERVICE_STARTED: 'start',
        SERVICE_STOPPING: 'SERVICE_STOPPING',
        SERVICE_STOPPED: 'stop',
        SERVICE_FAILED: 'SERVICE_FAILED',
        IPFS_INITING: 'IPFS_INITING',
        IPFS_INIT: 'init',
        STATUS_UPDATE: 'STATUS_UPDATE',
        ERROR: 'error'
    });

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