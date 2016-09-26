/// <reference path="../typings/main.d.ts"/>

import * as  Promise from 'bluebird';
import { unlink } from 'fs';
import Wrapper = require('bin-wrapper');
import * as path from 'path';

const  version  = '0.4.3';
const base: string = `http://dist.ipfs.io/go-ipfs/v${version}/go-ipfs_v${version}_`;
const defaultTarget = path.join(__dirname, 'bin');

export class IpfsBin {
    public wrapper: any;

    /**
     * @param target    Folder path for `target` ipfs executable
     */
    constructor (target = defaultTarget) {
        this.wrapper = new Wrapper()
            .src(base + 'linux-amd64.tar.gz', 'linux', 'x64')
            .src(base + 'linux-386.tar.gz', 'linux', 'ia32')
            .src(base + 'linux-arm.tar.gz', 'linux', 'arm')
            .src(base + 'windows-386.zip', 'win32', 'ia32')
            .src(base + 'windows-amd64.zip', 'win32', 'x64')
            .src(base + 'darwin-amd64.zip', 'darwin', 'x64')
            .dest(target)
            .use(process.platform === 'win32' ? 'ipfs.exe' : 'ipfs');
    }

    /**
     * Get exec path for IPFS
     * @returns {string}
     */
    getPath() {
        return this.wrapper.path();
    }

    /**
     * Start download and check the ipfs executable
     * @returns {Bluebird}
     */
    check (): Promise<{}> {
        return new Promise((resolve, reject) => {
            this.wrapper.run(['version'], (err: any) => {
                if (err) {
                    return reject(err);
                }

                return resolve(this.getPath());
            });
        });
    }

    /**
     *
     * @returns {Bluebird<T>}
     */
    deleteBin() {
        const unlinkAsync = Promise.promisify(unlink);
        return unlinkAsync(this.getPath());
    }
}
