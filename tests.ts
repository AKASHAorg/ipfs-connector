import { IpfsConnector } from './index';
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

  },
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

    instance.once(constants.events.DOWNLOAD_STARTED, () => {
      downloading = true;
    });

    instance.once(constants.events.DOWNLOAD_PROGRESS, (data) => {
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
      expect(api).to.have.ownProperty('ipfsApi');
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
      });
  });

  it('adds an object to ipfs', function () {
    return instance.api.add({ data: '{}' })
      .then((node) => {
        expect(node.multihash).to.exist;
        instance.api.get(node, '/').then((data1: any) => {
          expect(data1.value).to.have.property('data');
          expect(data1.value.data).to.equal('{}');
        });
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