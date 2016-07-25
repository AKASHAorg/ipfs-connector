# ipfs-connector
[![Build Status](https://travis-ci.org/AkashaProject/ipfs-connector.svg?branch=master)](https://travis-ci.org/AkashaProject/ipfs-connector)
[![bitHound Overall Score](https://www.bithound.io/github/AkashaProject/ipfs-connector/badges/score.svg)](https://www.bithound.io/github/AkashaProject/ipfs-connector)
[![Coverage Status](https://coveralls.io/repos/github/AkashaProject/ipfs-connector/badge.svg?branch=master)](https://coveralls.io/github/AkashaProject/ipfs-connector?branch=master)

Library for solving the cross-platform binaries problem (works on Windows as well) containing helpers for easier read/write on IPFS by extending the [JavaScript IPFS API](https://github.com/ipfs/js-ipfs-api) functionality.

Some of the differences:

- Able to specify init folder
- Promised based, no callbacks 
- Connector can be accessed from anywhere inside the app as it is a singleton
- Plug your favorite logging library (by default console). See [tests folder](https://github.com/AkashaProject/ipfs-connector/tree/master/tests)

For more information please see the [API docs](http://docs.akasha.world/ipfs-connector/index.html)

### Installation
```
npm install @akashaproject/ipfs-connector --save
```

### Usage
```javascript
import { IpfsConnector } from '@akashaproject/ipfs-connector';

const instance = IpfsConnector.getInstance();

// start ipfs daemon and download binaries if needed
instance.start().then(...);

// stop daemon
instance.stop()

// see api docs
// add data to ipfs
instance.api.add(object | Buffer)

// read data from ipfs
instance.api.get('ipfs hash')

// resolve ipfs hash object paths(see tests)
instance.api.resolve('QmTCMGWApewThNp64JBg9yzhiZGKKDHigS2Y45Tyg1HG8r/c1')

// access default js-ipfs-api from
instance.api.apiClient
```
### Dev
```
git clone https://github.com/AkashaProject/ipfs-connector.git
cd ipfs-connector

// install dependencies
npm install

// run tests
npm test

// generate docs
npm run docs
```
[CHANGELOG](CHANGELOG.md)

[LICENSE](LICENSE.md)