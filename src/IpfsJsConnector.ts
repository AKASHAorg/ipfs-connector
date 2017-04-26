import * as IPFS from 'ipfs';
import { IpfsApiHelper } from './IpfsApiHelper';
import * as Promise from 'bluebird';

const symbolEnforcer = Symbol();
const symbol = Symbol();
const requiredVersion = '0.23.1';
export class IpfsJsConnector {

    private process: any;
    private _api: any;
    public options = {
        ports: {
            API: 5042,
            Gateway: 8042,
            Swarm: 4042
        },
        apiAddress: '',
        repo: '0x497066734a73436f6e6e6563746f72'
    };

    public logger: any = console;
    public serviceStatus: { api: boolean, process: boolean, version: string } = {
        process: false,
        api: false,
        version: ''
    };

    /**
     *
     * @param enforcer
     */
    constructor(enforcer: any) {
        if (enforcer !== symbolEnforcer) {
            throw new Error('Use .getInstance() instead of constructing a new object');
        }
    }

    /**
     *
     * @returns {any}
     */
    public static getInstance(): IpfsJsConnector {
        if (!this[symbol]) {
            this[symbol] = new IpfsJsConnector(symbolEnforcer);
        }
        return this[symbol];
    }

    /**
     *
     * @returns {any}
     */
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

    /**
     *
     * @returns {{ports: {API: number, Gateway: number, Swarm: number}, repo: string}}
     */
    public getOptions() {
        return this.options;
    }

    /**
     *
     * @returns {{repo: string, init: boolean, start: boolean, EXPERIMENTAL: {pubsub: boolean, sharding: boolean}, config: {Addresses: {API: string, Gateway: string, Swarm: [string,string]}}}}
     */
    get config() {
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

    /**
     *
     * @param newLogger
     */
    public setLogger(newLogger: object) {
        this.logger = newLogger;
    }

    /**
     *
     * @param option
     * @param value
     */
    public setConfig(option: string, value: string): void {
        if (this.options.hasOwnProperty(option)) {
            this.options[option] = value;
        }
    }

    /**
     *
     * @param path
     */
    public setIpfsFolder(path: string) {
        this.options.repo = Buffer.from(path).toString('hex');
    }

    /**
     *
     * @returns {Bluebird}
     */
    public start() {
        return new Promise((resolve, reject) => {
            this.process = new IPFS(this.config);
            this.options.apiAddress = this.config.config.Addresses.API;
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

    /**
     *
     */
    public stop() {
        this.process.stop();
        this._api = null;
        return true;
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

    /**
     *
     * @param event
     * @param cb
     */
    public once(event: string, cb: (data?: any) => void) {
        return this.process.once(event, cb);
    }

    /**
     *
     * @param event
     * @param cb
     */
    public removeListener(event: string, cb: (data?: any) => void) {
        return this.process.removeListener(event, cb);
    }

    /**
     *
     * @param event
     * @returns {any|Cluster}
     */
    public removeAllListeners(event: string) {
        return this.process.removeAllListeners(event);
    }

    /**
     *
     * @returns {{gateway: number, api: number, swarm: number}}
     */
    public getPorts() {
        return Promise.resolve({
            gateway: this.options.ports.Gateway,
            api: this.options.ports.API,
            swarm: this.options.ports.Swarm
        });
    }

    /**
     *
     * @param ports
     * @param restart
     * @returns {Bluebird<{API, Gateway, Swarm}>}
     */
    public setPorts(ports: { gateway?: number, api?: number, swarm?: number }, restart = false) {
        this.options.ports = Object.assign({}, this.options.ports, {Gateway: ports.gateway, API: ports.api, Swarm: ports.swarm});
        return Promise.resolve(this.options.ports)
            .then((ports) => {
                if (restart) {
                    return Promise.resolve(this.stop()).delay(1000)
                        .then(() => {
                            return this.start().delay(500);
                        })
                        .then(() => ports);
                }
                return ports;
            });
    }

    /**
     *
     * @returns {PromiseLike<boolean>|Promise<TResult|boolean>|Bluebird<boolean>|PromiseLike<TResult|boolean>|Thenable<boolean>|PromiseLike<TResult2|boolean>|any}
     */
    public checkVersion() {
        return this.api.apiClient.versionAsync().then(
            (data: any) => {
                this.serviceStatus.version = data.version;
                return data.version === requiredVersion;
            }
        );
    }
}