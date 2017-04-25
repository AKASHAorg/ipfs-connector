import * as IPFS from 'ipfs';
import { IpfsApiHelper } from './IpfsApiHelper';
import * as ipfsApi from 'ipfs-api';
import * as Promise from 'bluebird';

const symbolEnforcer = Symbol();
const symbol = Symbol();
const requiredVersion = '0.23.1';
export class IpfsJsConnector {

    private process: any;
    private _api: any;
    private options = {
      ports: {
          API: 5042,
          Gateway: 8042,
          Swarm: 4042
      },
        repo: '0x497066734a73436f6e6e6563746f72'
    };

    public logger: any = console;
    public serviceStatus: { api: boolean, process: boolean, version: string } = {
        process: false,
        api: false,
        version: ''
    };

    constructor(enforcer: any) {
        if (enforcer !== symbolEnforcer) {
            throw new Error('Use .getInstance() instead of constructing a new object');
        }
    }

    public static getInstance(): IpfsJsConnector {
        if (!this[symbol]) {
            this[symbol] = new IpfsJsConnector(symbolEnforcer);
        }
        return this[symbol];
    }

    get api() {
        if (!this._api) {
            let api = this.process;
            api.version()
                .then((data: any) => this.serviceStatus.api = true)
                .catch((err: Error) => {
                    this.serviceStatus.api = false;
                    this._api = null;
                });
            api.object = Promise.promisifyAll(api.object);
            api.object.patch = Promise.promisifyAll(api.object.patch);
            api.config = Promise.promisifyAll(api.config);
            api.addAsync = Promise.promisify(api.files.add);
            api.catAsync = Promise.promisify(api.files.cat);
            api = Promise.promisifyAll(api);
            this._api = new IpfsApiHelper(api);
        }
        return this._api;
    }

    get config () {
        return {
            repo: this.options.repo,
            init: true,
            start: true,
            EXPERIMENTAL: {
                pubsub: true,
                sharding: true
            },
            config: {
                Addresses: {
                    API: `/ip4/127.0.0.1/tcp/${this.options.ports.API}`,
                    Gateway: `/ip4/127.0.0.1/tcp/${this.options.ports.Gateway}`,
                    Swarm: [
                        `/ip4/0.0.0.1/tcp/${this.options.ports.Swarm}`,
                        `/ip6/::/tcp/${this.options.ports.Swarm}`
                    ]
                }
            }
        };
    }

    public setLogger(newLogger: object) {
        this.logger = newLogger;
    }

    public setConfig() {

    }

    public setIpfsFolder(path: string) {
        this.options.repo = Buffer.from(path).toString('hex');
    }

    public start() {
        return new Promise((resolve, reject) => {
            this.process = new IPFS(this.config);
            console.log(this.process);
            this.on('error', (err) => {
                this.logger.error(err);
                reject(err);
            });
            this.on('start', () => {
                this.logger.info('js-ipfs started');
                resolve(this);
            });
        });
    }

    public stop() {
        this.process.stop();
        this._api = null;
    }

    /**
     * Ex: 'ready', 'error', 'init', 'start', 'stop'
     * @param event
     * @param cb
     * @returns {any}
     */
    public on(event: string, cb: (data?: any) => void) {
        return this.process.on(event, cb);
    }

    public getPorts() {

    }

    public setPorts(ports: { gateway?: number, api?: number, swarm?: number }) {
        this.options.ports = Object.assign({}, this.options.ports, ports);
    }

    public checkVersion() {
        return this.api.apiClient.versionAsync().then(
            (data: any) => {
                this.serviceStatus.version = data.version;
                return data.version === requiredVersion;
            }
        );
    }
}