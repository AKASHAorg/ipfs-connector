"use strict";
const Promise = require('bluebird');
const fs_1 = require('fs');
const Wrapper = require('bin-wrapper');
const path = require('path');
const version = '0.4.3';
const base = `http://dist.ipfs.io/go-ipfs/v${version}/go-ipfs_v${version}_`;
const defaultTarget = path.join(__dirname, 'bin');
class IpfsBin {
    constructor(target = defaultTarget) {
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
    getPath() {
        return this.wrapper.path();
    }
    check() {
        return new Promise((resolve, reject) => {
            this.wrapper.run(['version'], (err) => {
                if (err) {
                    return reject(err);
                }
                return resolve(this.getPath());
            });
        });
    }
    deleteBin() {
        const unlinkAsync = Promise.promisify(fs_1.unlink);
        return unlinkAsync(this.getPath());
    }
}
exports.IpfsBin = IpfsBin;
