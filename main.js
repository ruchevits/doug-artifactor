'use strict'

const DougArtifactor = require('./src')

const artifactor = new DougArtifactor({
	contractsFile: '/var/sandbox/config/contracts.json',
	addressFile: '/var/sandbox/config/address',
	web3: {
		host: '127.0.0.1',
		port: '8545'
	}
})

artifactor.run().then(contracts => {
	console.log(contracts('Keystore'))
})
.catch(err => console.log(err))

