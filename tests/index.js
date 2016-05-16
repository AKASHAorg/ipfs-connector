//this is just a placeholder
const { IpfsConnector } = require('../IpfsConnector');
const instance = IpfsConnector.getInstance();
const x = instance
    .start()
    .then(data=> {
        instance.api.add([{data:'/home/marius/tst', options:{isPath: true, recursive: true}}, {data: '{}'}]).then(data=>{
            console.log('add', data);
            instance.api.cat(
                [
                    {id: 'QmSepp2GXmctpxr6foVrenivKMLR1Fqma9uUcx6yGBrrnD', encoding: 'utf-8'},
                    {id: 'QmbJWAESqCsf4RFCqEY7jecCashj8usXiyDNfKtZCwwzGb', encoding: 'utf-8'}
                ]
            ).then(data1=> console.log('cat', data1))
        }).catch(err=> console.log('err', err));
    })
    .catch(err=> console.log('finalerr', err));

setTimeout(function(){
    IpfsConnector.getInstance().stop();
}, 15000);
