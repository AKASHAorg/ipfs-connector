import { IpfsConnector } from './index';
import IpfsApiHelper from '@akashaproject/ipfs-connector-utils';
import * as path from 'path';
import * as fs from 'fs';
import { expect } from 'chai';
import * as rimraf from 'rimraf';
import * as constants from './src/constants';

const bigObject = require('./tests/stubs/bigObject.json');
let binTarget = path.join(__dirname, 'tests', 'bin');
let filePath = path.join(__dirname, 'tests', 'stubs', 'example.json');
const file = fs.readFileSync(filePath);

let bigObjHash: any, nodeHash: any;

const logger = {
    info: function () {
    },
    error: function (msg) {
        console.error(msg);
    },
    warn: function (msg) {
        console.warn(msg);
    },
    debug: function () {

    }
};


describe('IpfsConnector', function () {
    let instance = IpfsConnector.getInstance();
    this.timeout(90000);
    before(function (done) {
        instance.setBinPath(binTarget);
        rimraf(binTarget, function () {
            done();
        });
    });
    beforeEach(function (done) {
        setTimeout(done, 2500);
    });

    it('prevents multiple instances', function () {
        const newInstance = () => new IpfsConnector(Symbol());
        expect(newInstance).to.throw(Error);
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

    it('should check for binaries', function () {
        let downloading = false;

        // this is important for DOWNLOAD_EVENTS
        instance.enableDownloadEvents();

        instance.once(constants.events.DOWNLOAD_STARTED,  () => {
            downloading = true;
        });

        instance.once(constants.events.DOWNLOAD_PROGRESS,  (data) => {
            expect(downloading).to.be.true;
            expect(data).to.exist;
        });

        return instance.checkExecutable();
    });

    it('should start ipfs daemon', function () {
        let inited = false;
        IpfsConnector.getInstance().once(constants.events.IPFS_INITING, function () {
            inited = true;
        });
        return instance.start().then(function (api) {
            expect(api).to.have.ownProperty('apiClient');
            expect(inited).to.be.true;
        });
    });

    it('checks ipfs version', function () {
        return instance.checkVersion().then((res: any) => {
            expect(res).to.exist;
        });
    });
    it('should get ipfs config addresses', function () {
        expect(instance.api).to.exist;
        return instance.getPorts().then((ports) => {
            expect(ports.api).to.exist;
        });
    });

    it('should set ipfs GATEWAY port', function () {
        return instance.setPorts({ gateway: 8092 }).then((ports) => {
            expect(ports).to.exist;
        });
    });

    it('should set ipfs API port', function () {
        return instance.setPorts({ api: 5043 }).then((ports) => {
            expect(ports).to.exist;
        });
    });

    it('should set ipfs SWARM port', function () {
        return instance.setPorts({ swarm: 4043 }).then((ports) => {
            expect(ports).to.exist;
        });
    });

    it('restarts after setting ports', function () {
        return instance.setPorts({ api: 5041, swarm: 4041, gateway: 8040 }, true)
            .then((ports) => {
                expect(instance.options.apiAddress).to.equal('/ip4/127.0.0.1/tcp/5041');
                expect(ports).to.exist;
            })
    });

    it('adds an object to ipfs', function () {
        expect(instance.api).to.exist;
        return instance.api.add({ data: '{}' })
            .then((node) => {
                expect(node.hash).to.exist;
                instance.api.get(node.hash).then((data1: any) => {
                    expect(data1).to.have.property('data');
                    expect(data1.data).to.equal('{}');
                })
            });
    });
    it('transforms object to buffer', function () {
        const x = { a: 1 };
        const expected = Buffer.from(JSON.stringify(x));
        const actual = IpfsApiHelper.toDataBuffer(x);
        expect(actual.toString()).to.equal(expected.toString());
    });

    it('preserves buffer', function () {
        const initial = Buffer.from(JSON.stringify({ q: 1 }));
        const actual = IpfsApiHelper.toDataBuffer(initial);
        expect(actual.toString()).to.equal(initial.toString());
    });

    it('adds buffer to ipfs', function () {
        const actual = Buffer.from(JSON.stringify({ a: 1, b: 2 }));
        return instance.api.add(actual).then(node => {
            nodeHash = node.hash;
            expect(node).to.have.property('hash');
        });
    });

    it('adds raw buffer using api.addFile', function () {
        const buf = Buffer.from(JSON.stringify({ a: 1, b: 2, c: 3 }));
        return instance.api.addFile(buf).then((node: any) => {
            expect(node).to.have.property('hash');
        });
    });

    it('updates from existing object', function () {
        const initialObj = { a: 1, b: 2 };
        return instance.api.add(initialObj)
            .then((node) => {
                const patchAttr = { b: 3 };
                instance.api.updateObject(node.hash, patchAttr).then((result: any) => {
                    result.data = JSON.parse(result.data);
                    expect(result.data.a).to.equal(initialObj.a);
                    expect(result.data.b).to.equal(patchAttr.b);
                    expect(result.multihash).to.exist;
                    instance.api.getStats(result.multihash).then((stats: any) => {
                        expect(stats.NumLinks).to.equal(0);
                    });
                })
            });
    });

    it('splits when object is too big', function () {
        return instance.api.add(bigObject)
            .then(node => {
                bigObjHash = node.hash;
                instance.api.getStats(node.hash).then((stats: any) => {
                    expect(stats.NumLinks).to.be.above(0);
                });
            })
    });

    it('gets hash stats', function () {
        return instance.api.getStats(bigObjHash)
            .then((stats: any) => {
                expect(stats.NumLinks).to.equal(8);
            })
    });

    it('reads big file', function () {
        return instance.api
            .get(bigObjHash, true)
            .then((bigBuffer: any) => {
                expect(bigBuffer.length).to.equal(Buffer.from(JSON.stringify(bigObject)).length);
            })
    });

    it('constructs object link from hash', function () {
        return instance.api
            .addLinkFrom({ coco: 1 }, 'testLink', nodeHash)
            .then((result) => {
                expect(result.links.length).to.be.above(0);
                return instance.api.getStats(result.multihash).then((stats: any) => {
                    expect(stats.NumLinks).to.be.above(0);
                });
            })
    });


    it('adds file to ipfs', function () {
        return instance.api
            .addFile(file)
            .then((result: any) => {
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
            .then((stats: any) => {
                expect(stats).to.exist;
            });
    });

    it('creates node with links', function () {
        const links = [{ name: 'testFile', size: 12, multihash: 'QmPMH5GFmLP2oU8dK7i4iWJyX6FpgeK3gT6ZC6xLLZQ9cW' },
            { name: 'testLink', size: 12, multihash: 'Qmd7rTCyKW8YTtPbxDnturBPd8KPaA3SK7B2uvcScTWVNj' }];
        return instance.api
            .createNode({ test: 2 }, links)
            .then((result: any) => {
                expect(result).to.exist;
            })
    });

    it('gets node data', function () {
        return instance.api
            .get('QmTymNDirRZeSjFXUUZkYHUL2TfyfMyJvG71AEPwx7yMUk')
            .then((result: any) => {
                expect(result).to.have.property('test');
            })
    });


    it('gets object links', function () {
        return instance.api.getLinks(bigObjHash)
            .then((result: any) => {
                expect(result).to.exist;
            });

    });

    it('gets a link by name', function () {
        return instance.api.findLinks('QmTymNDirRZeSjFXUUZkYHUL2TfyfMyJvG71AEPwx7yMUk', ['testFile'])
            .then((dagLinks: any) => {
                expect(dagLinks).to.exist;
            });
    });

    it('resolves link multihash', function () {
        return instance.api.findLinks('QmTymNDirRZeSjFXUUZkYHUL2TfyfMyJvG71AEPwx7yMUk', ['testLink'])
            .then((dagLinks: any) => {
                expect(dagLinks).to.exist;
                const links = dagLinks.map((link: any) => {
                    return instance.api.get(link.multihash);
                });
                return Promise.all(links).then((data) => {
                    expect(data).to.exist;
                })
            })
    });

    it('resolves a given link path', function () {
        return instance.api
            .addLinkFrom({ test: 3 }, 'firstLink', 'Qmd7rTCyKW8YTtPbxDnturBPd8KPaA3SK7B2uvcScTWVNj')
            .then((result) => {
                expect(result).to.exist;
                return instance.api.addLink(
                    { name: 'ref', hash: result.multihash, size: result.size },
                    'QmTymNDirRZeSjFXUUZkYHUL2TfyfMyJvG71AEPwx7yMUk')
                    .then((patched: any) => {
                        expect(patched).to.exist;
                        return instance.api.findLinkPath(patched.multihash, ['ref', 'firstLink'])
                            .then((final: any) => {
                                expect(final).to.exist;
                                return instance.api.get(final[0].multihash)
                                    .then((finalData: any) => {
                                        expect(finalData).to.have.property('test');
                                    })
                            });
                    })
            });
    });



    it('gets ports without an api', function () {
        return instance.stop().then(() => instance.getPorts()).then((ports) => {
            expect(ports.api).to.exist;
        });
    });

    it('sets ports without an api', function () {
        return instance.setPorts({ gateway: '8051', api: '5033', swarm: '4041' })
            .then(() => {
                return instance.staticGetPorts();
            })
            .then((ports) => {
                expect(ports).to.eql({ gateway: '8051', api: '5033', swarm: '4041' });
            });
    });

    it('sets and get config without an api', function () {
        return instance.staticSetConfig('Config.That.Does.Not.Exist', 'expectedValue')
          .then(() => {
              return instance.staticGetConfig('Config.That.Does.Not.Exist');
          })
          .then((value) => {
              expect(value).to.eql('expectedValue');
          });
    });

    it('run raw cli commands', function () {
        return instance.runCommand('id')
          .then((stdout: string) => {
              expect(stdout).to.exist;
          })
          .catch(() => {
            throw new Error('Should not fail');
          });
    });

    it('fail running a raw cli commands properly', function () {
        return instance.runCommand('doesnotexist')
          .then(() => {
              throw new Error('Should not succed');
          })
          .catch((stderr: string) => {
              expect(stderr).to.exist;
          });
    });

    it('doesn`t throw when calling multiple start', function () {
        return IpfsConnector.getInstance().start().then(() => IpfsConnector.getInstance().start());
    });

    it('doesn`t throw when calling multiple stop', function () {
        return IpfsConnector.getInstance().stop().then(() => IpfsConnector.getInstance().stop());
    });

    it('sets an option', function () {
        IpfsConnector.getInstance().setOption('retry', false);
        expect(IpfsConnector.getInstance().options.retry).to.be.false;
    });

    it('removes ipfs binary file', function (done) {
        instance.downloadManager.deleteBin().then(() => done());
    });

    after(function (done) {
        instance.stop().then(() => {
            rimraf(binTarget, function () {
                done();
            });
        });
    });
});