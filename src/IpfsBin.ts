/// <reference path="../typings/main.d.ts"/>

import * as  Promise from 'bluebird';
import { unlink } from 'fs';
import * as path from 'path';
import Wrapper = require('bin-wrapper');

const version = '0.4.5';
const base: string = `https://dist.ipfs.io/go-ipfs/v${version}/go-ipfs_v${version}_`;
const defaultTarget = path.join(__dirname, 'bin');

export class IpfsBin {
    public wrapper: any;

    /**
     * @param target    Folder path for `target` ipfs executable
     */
    constructor(target = defaultTarget) {
        this.wrapper = new Wrapper()
            .src(base + 'linux-amd64.tar.gz', 'linux', 'x64')
            .src(base + 'linux-386.tar.gz', 'linux', 'ia32')
            .src(base + 'linux-arm.tar.gz', 'linux', 'arm')
            .src(base + 'windows-386.zip', 'win32', 'ia32')
            .src(base + 'windows-amd64.zip', 'win32', 'x64')
            .src(base + 'darwin-amd64.tar.gz', 'darwin', 'x64')
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
     * @param cb
     */
    check(cb: any) {
        let downloading = false;
        const timeOut = setTimeout(() => {
            downloading = true;
            cb('', { downloading })
        }, 2000);
        this.wrapper.run(['version'], (err: any) => {
            clearTimeout(timeOut);
            if (err) {
                return cb(err);
            }
            const response = { binPath: this.getPath() };

            if(!downloading){
                return cb('', response);
            }

            setTimeout(()=> cb('', response), 300);
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
