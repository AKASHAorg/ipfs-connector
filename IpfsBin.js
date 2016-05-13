"use strict";
const { version } = require('./package.json');
const Promise = require('bluebird');
const Wrapper = require('bin-wrapper');
const path = require('path');
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
    check() {
        return new Promise((resolve, reject) => {
            this.wrapper.run(['version'], (err) => {
                if (err) {
                    return reject(err);
                }
                return resolve('ipfs-bin: executable is ok');
            });
        });
    }
}
exports.IpfsBin = IpfsBin;
