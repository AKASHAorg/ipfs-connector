//this is just a placeholder
const { IpfsConnector } = require('../IpfsConnector');
const x = IpfsConnector.getInstance()
    .start()
    .then(data=> console.log('final start', data))
    .catch(err=> console.log('finalerr', err));

