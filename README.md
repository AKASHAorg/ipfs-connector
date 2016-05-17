# ipfs-connector

[API DOCS](http://docs.akasha.world/ipfs-connector/index.html)
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
