# ipfs-connector
[![Build Status](https://travis-ci.org/AkashaProject/ipfs-connector.svg?branch=master)](https://travis-ci.org/AkashaProject/ipfs-connector)
[![bitHound Overall Score](https://www.bithound.io/github/AkashaProject/ipfs-connector/badges/score.svg)](https://www.bithound.io/github/AkashaProject/ipfs-connector)
[![Coverage Status](https://coveralls.io/repos/github/AkashaProject/ipfs-connector/badge.svg?branch=master)](https://coveralls.io/github/AkashaProject/ipfs-connector?branch=master)
Library for solving the cross-platform binaries problem (works on Windows as well) containing helpers for easier read/write on IPFS by extending the [JavaScript IPFS API](https://github.com/ipfs/js-ipfs-api) functionality. 

Some of the differences:

- Able to specify init folder
- Promised based, no callbacks 
- Connector can be accessed from anywhere inside the app as it is a singleton
- Plug your favorite logging library (by default console). See [tests folder](https://github.com/AkashaProject/ipfs-connector/tree/master/tests) for Winston examples

For more information please see the [API docs](http://docs.akasha.world/ipfs-connector/index.html)


```javascript
import { IpfsConnector } from 'ipfs-connector';

const instance = IpfsConnector.getInstance();

// start ipfs daemon and download binaries if needed
instance.start().then(...);

// stop daemon
instance.stop()

// see api docs
// add data to ipfs
instance.api.add(...)
// read data from ipfs
instance.api.cat(...)
```
Dev
```
git clone https://github.com/AkashaProject/ipfs-connector.git
cd ipfs-connector

// install dependencies
npm install

// run tests
npm run test

// generate docs
npm run docs
```
