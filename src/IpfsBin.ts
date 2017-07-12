/// <reference path="../typings/main.d.ts"/>

import * as  Promise from 'bluebird';
import { unlink } from 'fs';
import * as path from 'path';
import * as EventEmitter from 'events';
import * as BinWrapper from 'bin-wrapper';
import { events } from './constants';

const download = require('download');
const osFilterObj = require('os-filter-obj');

export const version = '0.4.10';
const base: string = `https://dist.ipfs.io/go-ipfs/v${version}/go-ipfs_v${version}_`;
const defaultTarget = path.join(__dirname, 'bin');

class Wrapper extends BinWrapper {
    private _progress = new EventEmitter();

    public download(cb) {
        const files = osFilterObj(this.src());
        if (!files.length) {
            cb(new Error('No binary found matching your system. It\'s probably not supported.'));
            return;
        }
        this._progress.emit(events.DOWNLOAD_STARTED);
        const destination = this.dest();
        const downloads = [];
        files.forEach((file) => {
            downloads.push(
                download(file.url, destination, { extract: true })
                    .on('response', res => {
                        const progress = { total: res.headers['content-length'], completed: 0, resource: file.url };
                        this._progress.emit(events.DOWNLOAD_PROGRESS, progress);
                        res.on('data', data => {
                            progress.completed += data.length;
                            this._progress.emit(events.DOWNLOAD_PROGRESS, progress);
                        });
                    })
                    .on('error', error => {
                        this._progress.emit(events.DOWNLOAD_ERROR, error);
                    })
            );
        });

        // this is required for backward compatibility
        return Promise.all(downloads).then(() => {
            cb();
        }).catch((err) => {
            cb(err);
        });
    }
    // use this getter to listen for DOWNLOAD_* events
    public get downloadProgress() {
        return this._progress;
    }
}

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
            .use(process.platform === 'win32' ? path.join('go-ipfs', 'ipfs.exe') : path.join('go-ipfs', 'ipfs'));
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
        this.wrapper.run(['version'], (err: any) => {
            if (err) {
                return cb(err);
            }
            const response = { binPath: this.getPath() };
            return cb('', response);
        });
    }

    /**
     *
     * @returns {Bluebird<T>}
     */
    deleteBin() {
        return Promise.fromCallback((cb) => {
            return unlink(this.getPath(), cb);
        }).then(() => true).catch(() => false);
    }
}
