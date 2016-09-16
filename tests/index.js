"use strict";
const { IpfsConnector } = require('../index');
const path = require('path');
const fs = require('fs');
const chai = require('chai');
const rimraf = require('rimraf');
const constants = require('../src/constants');
const bigObject = require('./stubs/bigObject.json');
const expect = chai.expect;

describe('IpfsConnector', function () {
    let instance = IpfsConnector.getInstance();
    let binTarget = path.join(__dirname, 'bin');
    let filePath = path.join(__dirname, 'stubs', 'example.json');
    let rootHash = '';
    const logger = {
        info: function () {
        },
        error: function () {
        },
        warn: function () {
        }
    };
    this.timeout(60000);
    before(function (done) {
        instance.setBinPath(binTarget);
        rimraf(binTarget, function () {
            done();
        });
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
    it('should emit when downloading binaries', function (done) {
        this.timeout(120000);
        let triggered = false;
        instance.on(constants.events.DOWNLOAD_STARTED, () => {
            triggered = true;
        });
        instance.checkExecutable().then(()=> {
            expect(triggered).to.be.true;
            done();
        }).catch((err) => {
            expect(triggered).to.be.true;
            done();
        });
    });
    it('should start ipfs daemon', function (done) {
        instance.setLogger(console);
        instance.on(constants.events.SERVICE_STARTED, function () {
            expect(instance.serviceStatus.process).to.be.true;
            done();
        });
        instance.start();
    });
    it('should set config key for spawned process', function () {
        instance.setConfig('retry', 1);
        expect(instance.options.retry).to.equal(1);
    });
    it('should add an object to ipfs', function (done) {
        expect(instance.api).to.be.defined;
        instance.api.add({ data: '{}' })
            .then((hash) => {
                expect(hash).to.be.defined;
                instance.api.get(hash).then((data1) => {
                    expect(data1).to.have.property('data');
                    done();
                }).catch(err => {
                    throw new Error(err);
                });
            }).catch(err => {
            console.log(err);
            expect(err).to.be.undefined;
            done();
        });
    });
    it('should add buffer to ipfs', function (done) {
        const actual = Buffer.from(JSON.stringify({ a: 1, b: 2 }));
        instance.api.add(actual).then(hash=> {
            expect(hash).to.be.defined;
            done();
        });
    });
    it('should update from existing object', function (done) {
        const initialObj = { a: 1, b: 2 };
        instance.api.add(initialObj)
            .then((hash) => {
                const patchAttr = { b: 3 };
                instance.api.updateObject(hash, patchAttr).then((result) => {
                    expect(result.Data.a).to.equal(initialObj.a);
                    expect(result.Data.b).to.equal(patchAttr.b);
                    expect(result.Hash).to.be.defined;
                    instance.api._getStats(result.Hash).then((stats) => {
                        expect(stats.NumLinks).to.be.defined;
                        done();
                    });
                }).catch(err => console.log(err));
            });
    });
    it('should split when object is too big', function (done) {
        instance.api.add(bigObject)
            .then(hash => {
                instance.api._getStats(hash).then((stats) => {
                    expect(stats.NumLinks).to.be.above(0);
                    done();
                });
            })
            .catch(err => {
                expect(err).to.be.undefined;
                done();
            });
    });
    it('should read big file', function (done) {
        instance.api
            .get("QmYZ63vj8KjipwiSKGatx7g8J5sWu6FyNqSUb88MRNAS9N")
            .then(bigBuffer=> {
                expect(bigBuffer.length).to.equal(Buffer.from(JSON.stringify(bigObject)).length);
                done();
            })
    });
    it('should construct object link from hash', function (done) {
        const expected = {};
        expected[instance.api.LINK_SYMBOL] = "QmYZ63vj8KjipwiSKGatx7g8J5sWu6FyNqSUb88MRNAS9N";
        instance.api
            .constructObjLink("QmYZ63vj8KjipwiSKGatx7g8J5sWu6FyNqSUb88MRNAS9N")
            .then((result)=> {
                expect(result).to.deep.equal(expected);
                done();
            })
            .catch((err)=> {
                expect(err).to.be.undefined;
                done();
            });
    });
    it('should add file to ipfs', function (done) {
       const file = fs.readFileSync(filePath);
        instance.api
            .addFile(file)
            .then((result)=> {
                expect(result).to.exist;
            })
            .catch((err)=> {
                expect(err).not.to.exist;
            })
            .finally(() => done());
    });
    it('should construct object link from source', function (done) {
        const inputObj = {
            a: 1,
            b: 2
        };
        const inputLink = { c: '', d: '', e: 'QmYZ63vj8KjipwiSKGatx7g8J5sWu6FyNqSUb88MRNAS9N' };
        const subLevels = [{ c1: 5, c2: 6 }, {
            d1: 'sdasdsadsad',
            d2: 'QmYZ63vj8KjipwiSKGatx7g8J5sWu6FyNqSUb88MRNAS9N'
        }];
        let pool = subLevels.map(
            (plainObj) => {
                return instance.api.constructObjLink(plainObj);
            }
        );
        const expectedObj = {
            a: 1,
            b: 2,
            c: { '/': 'QmTCMGWApewThNp64JBg9yzhiZGKKDHigS2Y45Tyg1HG8r' },
            d: { '/': 'QmV3SDTMn98nvzPTWmgzGDxc8AcYsrKRQ2zG5Ck6cuC2QY' },
            e: 'QmYZ63vj8KjipwiSKGatx7g8J5sWu6FyNqSUb88MRNAS9N'
        };
        const runChecks = (hash) => {
            const steps = [];
            const checks = [];
            steps.push(instance.api.resolve(`${hash}/a`));
            checks.push(expectedObj.a);

            steps.push(instance.api.resolve(`${hash}/e`));
            checks.push(bigObject);

            steps.push(instance.api.resolve(`${hash}/c/c1`));
            checks.push(subLevels[0].c1);

            steps.push(instance.api.resolve(`${hash}/d/d2`));
            checks.push(bigObject);

            steps.push(instance.api.resolve(`${hash}/d/d1`));
            checks.push(subLevels[1].d1);

            steps.push(instance.api.resolve(`${hash}/c`));
            checks.push(subLevels[0]);

            return Promise.all(steps)
                .then(results => {
                    results.forEach((result, key)=> {
                        if (Buffer.isBuffer(result)) {
                            expect(result.length)
                                .to
                                .equal(Buffer.from(JSON.stringify(checks[key])).length)
                        } else {
                            expect(result).to.deep.equal(checks[key]);
                        }
                        if (key === (results.length - 1)) {
                            done();
                        }
                    });
                })
        };
        Promise.all(pool).then(
            (links) => {
                [inputLink.c, inputLink.d] = links;
                const constructedObj = Object.assign({}, inputObj, inputLink);
                expect(constructedObj).to.deep.equal(expectedObj);
                return instance.api.add(constructedObj);
            }
        ).then((hash) => {
            rootHash = hash;
            return runChecks(hash);
        })
    });
    it('should resolve ipfs hash simple path', function (done) {
        instance.api
            .resolve('QmTCMGWApewThNp64JBg9yzhiZGKKDHigS2Y45Tyg1HG8r')
            .then(data=> {
                expect(data).to.deep.equal({ c1: 5, c2: 6 });
                done();
            });
    });

    it('should reject when root hash is an not ipfs hash', function (done) {
        instance.api
            .resolve('QmTCMGWApewThNp64JBg9yzhiZGKKDHigS2Y45Tyg1H/data/aa')
            .then(data=> {
                expect(data).to.be.undefined;
                done();
            })
            .catch(err=> {
                expect(err).to.be.defined;
                done();
            });
    });

    it('should reject when path cant be resolved', function (done) {
        instance.api
            .resolve('QmTCMGWApewThNp64JBg9yzhiZGKKDHigS2Y45Tyg1HG8r/c3')
            .then(data=> {
                expect(data).to.be.undefined;
                done();
            })
            .catch(err=> {
                expect(err).to.be.defined;
                done();
            });
    });

    it('should remove ipfs binary file', function (done) {
        instance.downloadManager.deleteBin().then(()=> done());
    });
    after(function (done) {
        instance.stop();
        rimraf(binTarget, function () {
            done();
        });
    });
});
