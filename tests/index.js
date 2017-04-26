"use strict";
const {IpfsConnector, IpfsApiHelper, IpfsJsConnector} = require('../index');
const path = require('path');
const fs = require('fs');
const chai = require('chai');
const rimraf = require('rimraf');
const statics = require('../src/statics');
const constants = require('../src/constants');
const bigObject = require('./stubs/bigObject.json');
const expect = chai.expect;
let instance;
let binTarget = path.join(__dirname, 'bin');
let filePath = path.join(__dirname, 'stubs', 'example.json');

const file = fs.readFileSync(filePath);
let bigObjHash = '';
let bigObjHashLink = '';
let rootHash = '';
let nodeHash;
const logger = {
    info: function () {
    },
    error: function () {
    },
    warn: function () {
    }
};

const runSharedTests = function(){

    it('checks ipfs version', function () {
        return instance.checkVersion().then((res) => {
            expect(res).to.exist;
        })
    });
    it('should get ipfs config addresses', function () {
        expect(instance.api).to.exist;
        return instance.getPorts().then((ports) => {
            expect(ports.api).to.exist;
        });
    });

    it('should set ipfs GATEWAY port', function () {
        return instance.setPorts({gateway: 8092}).then((ports) => {
            expect(ports).to.exist;
        });
    });

    it('should set ipfs API port', function () {
        return instance.setPorts({api: 5043}).then((ports) => {
            expect(ports).to.exist;
        });
    });

    it('should set ipfs SWARM port', function () {
        return instance.setPorts({swarm: 4043}).then((ports) => {
            expect(ports).to.exist;
        });
    });

    it('restarts after setting ports', function () {
        return instance.setPorts({api: 5041, swarm: 4041, gateway: 8040}, true)
            .then((ports) => {
                expect(instance.options.apiAddress).to.equal('/ip4/127.0.0.1/tcp/5041');
                expect(ports).to.exist;
            })
    });

    it('adds an object to ipfs', function () {
        expect(instance.api).to.be.defined;
        return instance.api.add({data: '{}'})
            .then((node) => {
                expect(node.hash).to.be.defined;
                instance.api.get(node.hash).then((data1) => {
                    expect(data1).to.have.property('data');
                    expect(data1.data).to.equal('{}');
                })
            });
    });
    it('transforms object to buffer', function () {
        const x = {a: 1};
        const expected = Buffer.from(JSON.stringify(x));
        const actual = statics.toDataBuffer(x);
        expect(actual.toString()).to.equal(expected.toString());
    });

    it('preserves buffer', function () {
        const initial = Buffer.from(JSON.stringify({q: 1}));
        const actual = statics.toDataBuffer(initial);
        expect(actual.toString()).to.equal(initial.toString());
    });

    it('adds buffer to ipfs', function () {
        const actual = Buffer.from(JSON.stringify({a: 1, b: 2}));
        return instance.api.add(actual).then(node => {
            nodeHash = node.hash;
            expect(node).to.have.property('hash');
        });
    });

    it('adds raw buffer using api.addFile', function () {
        const buf = Buffer.from(JSON.stringify({a: 1, b: 2, c: 3}));
        return instance.api.addFile(buf).then(node => {
            expect(node).to.have.property('hash');
        });
    });

    it('updates from existing object', function () {
        const initialObj = {a: 1, b: 2};
        return instance.api.add(initialObj)
            .then((node) => {
                const patchAttr = {b: 3};
                instance.api.updateObject(node.hash, patchAttr).then((result) => {
                    result.data = JSON.parse(result.data);
                    expect(result.data.a).to.equal(initialObj.a);
                    expect(result.data.b).to.equal(patchAttr.b);
                    expect(result.multihash).to.be.defined;
                    instance.api.getStats(result.multihash).then((stats) => {
                        expect(stats.NumLinks).to.equal(0);
                    });
                })
            });
    });

    it('splits when object is too big', function () {
        return instance.api.add(bigObject)
            .then(node => {
                bigObjHash = node.hash;
                instance.api.getStats(node.hash).then((stats) => {
                    expect(stats.NumLinks).to.be.above(0);
                });
            })
    });

    it('gets hash stats', function () {
        return instance.api.getStats(bigObjHash)
            .then((stats) => {
                expect(stats.NumLinks).to.equal(8);
            })
    });

    it('reads big file', function () {
        return instance.api
            .get(bigObjHash, true)
            .then(bigBuffer => {
                expect(bigBuffer.length).to.equal(Buffer.from(JSON.stringify(bigObject)).length);
            })
    });

    it('constructs object link from hash', function () {
        return instance.api
            .addLinkFrom({coco: 1}, 'testLink', nodeHash)
            .then((result) => {
                expect(result.links.length).to.be.above(0);
                return instance.api.getStats(result.multihash).then((stats) => {
                    expect(stats.NumLinks).to.be.above(0);
                });
            })
    });


    it('adds file to ipfs', function () {
        return instance.api
            .addFile(file)
            .then((result) => {
                expect(result).to.exist;
            });
    });

    it('creates link to a file', function () {
        return instance.api
            .addLinkFrom(bigObject, 'testFile', bigObjHash)
            .then((result) => {
                expect(result.links.length).to.be.above(0);
            })
    });

    it('gets stats for hash', function () {
        return instance.api
            .getStats('QmRB9Mcov6eFhc1oPsbbfyYjEZKRu2ig1zhzfG3BXikcEo')
            .then((stats) => {
                expect(stats).to.exist;
            });
    });

    it('creates node with links', function () {
        const links = [{name: 'testFile', size: 12, multihash: 'QmPMH5GFmLP2oU8dK7i4iWJyX6FpgeK3gT6ZC6xLLZQ9cW'},
            {name: 'testLink', size: 12, multihash: 'Qmd7rTCyKW8YTtPbxDnturBPd8KPaA3SK7B2uvcScTWVNj'}];
        return instance.api
            .createNode({test: 2}, links)
            .then((result) => {
                expect(result).to.exist;
            })
    });

    it('gets node data', function () {
        return instance.api
            .get('QmTymNDirRZeSjFXUUZkYHUL2TfyfMyJvG71AEPwx7yMUk')
            .then((result) => {
                expect(result).to.have.property('test');
            })
    });


    it('gets object links', function () {
        return instance.api.getLinks(bigObjHash)
            .then((result) => {
                expect(result).to.exist;
            });

    });

    it('gets a link by name', function () {
        return instance.api.findLinks('QmTymNDirRZeSjFXUUZkYHUL2TfyfMyJvG71AEPwx7yMUk', ['testFile'])
            .then((dagLinks) => {
                expect(dagLinks).to.exist;
            });
    });

    it('resolves link multihash', function () {
        return instance.api.findLinks('QmTymNDirRZeSjFXUUZkYHUL2TfyfMyJvG71AEPwx7yMUk', ['testLink'])
            .then((dagLinks) => {
                expect(dagLinks).to.exist;
                const links = dagLinks.map((link) => {
                    return instance.api.get(link.multihash);
                });
                return Promise.all(links).then((data) => {
                    expect(data).to.exist;
                })
            })
    });

    it('resolves a given link path', function () {
        return instance.api
            .addLinkFrom({test: 3}, 'firstLink', 'Qmd7rTCyKW8YTtPbxDnturBPd8KPaA3SK7B2uvcScTWVNj')
            .then((result) => {
                expect(result).to.exist;
                return instance.api.addLink(
                    {name: 'ref', hash: result.multihash, size: result.size},
                    'QmTymNDirRZeSjFXUUZkYHUL2TfyfMyJvG71AEPwx7yMUk')
                    .then((patched) => {
                        expect(patched).to.exist;
                        return instance.api.findLinkPath(patched.multihash, ['ref', 'firstLink'])
                            .then((final) => {
                                expect(final).to.exist;
                                return instance.api.get(final[0].multihash)
                                    .then((finalData) => {
                                        expect(finalData).to.have.property('test');
                                    })
                            });
                    })
            });
    });
};

describe('IpfsConnector', function () {
    instance = IpfsConnector.getInstance();
    this.timeout(90000);
    before(function (done) {
        instance.setBinPath(binTarget);
        rimraf(binTarget, function () {
            done();
        });
    });

    beforeEach(function (done) {
        setTimeout(done, 1000);
    });

    it('should set .ipfs init folder', function () {
        const target = path.join(binTarget, 'ipfsTest');
        instance.setIpfsFolder(target);
        expect(instance.options.extra.env.IPFS_PATH).to.equal(target);
    });

    it('should set a different logger', function () {
        instance.setLogger(logger);
        expect(instance.logger).to.deep.equal(logger);
    });

    it('should emit error when specifying bad ipfs-api address', function (done) {
        const memAddr = instance.options.apiAddress;
        instance.options.apiAddress = 'Qmxf09FAke';
        instance.once(constants.events.ERROR, (message) => {
            expect(message).to.be.defined;
            expect(instance.serviceStatus.api).to.be.false;
            instance.options.apiAddress = memAddr;
            done();
        });
        const api = instance.api;
        expect(api).to.be.an('object');
    });

    it('should check for binaries', function () {
        return instance.checkExecutable();
    });

    it('should start ipfs daemon', function (done) {
        let inited = false;
        instance.once(constants.events.IPFS_INITING, function () {
            inited = true;
        });
        instance.once(constants.events.SERVICE_STARTED, function () {
            expect(instance.serviceStatus.process).to.be.true;
            expect(inited).to.be.true;
            setTimeout(done, 1000);
        });
        instance.start().then(function (api){
            expect(api).to.have.ownProperty('apiClient');
        }).catch(function(err){
            expect(err).to.be.undefined;
            done();
        });
    });

    runSharedTests();
    it('removes ipfs binary file', function (done) {
        instance.downloadManager.deleteBin().then(() => done());
    });

    after(function (done) {
        instance.stop();
        rimraf(binTarget, function () {
            done();
        });
    });
});
describe('IpfsJsConnector', function() {
    this.timeout(10000);
    beforeEach(function (done) {
        setTimeout(done, 1000);
    });
    it('should set a different logger', function () {
        IpfsJsConnector.getInstance().setLogger(logger);
        expect(IpfsJsConnector.getInstance().logger).to.deep.equal(logger);
    });

    it('starts js instance', function(){
        return IpfsJsConnector.getInstance().start().then((i) => instance = i);
    });
    runSharedTests();

    after(function (done) {
        instance.stop();
        rimraf((instance.getOptions()).repo, function () {
            done();
        });
    });
});