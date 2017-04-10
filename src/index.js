'use strict'

const _ = require('lodash')
const Bluebird = require('bluebird')
const fs = Bluebird.promisifyAll(require('fs'))
const jsonfile = require('jsonfile')
const Web3 = require('web3')
const pudding = require('ether-pudding')
// const artifactor = require('truffle-artifactor')

module.exports = class DougArtifactor {

	constructor(options){
		this.contractsFile = options.contractsFile
		this.addressFile = options.addressFile
		const url = `http://${options.web3.host}:${options.web3.port}`
		const provider = new Web3.providers.HttpProvider(url)
		this.web3 = new Web3(provider)
	}

	run(){

    	if (!this.web3.isConnected()) return Bluebird.reject(`Can't connect to JSON RPC at: ${url}`)

		const mainAddress = fs.readFileSync(this.addressFile, 'utf-8')

		return this.load(this.contractsFile).then(contracts => {

			const provider = this.getDougProvider(mainAddress)

			contracts = _.pickBy(contracts, contract => (contract.type !== 'DougMain'))

			const calls = []
			const localizedContracts = {}

			const result = _.forEach(contracts, (contract, name) => {
				const call = new Bluebird((resolve, reject) => {
					if (contract.type === 'DougContract') return resolve(provider.contracts.call(name).then(address => this.localizeContract(contract).at(address)))
					else if (contract.type === 'DougEntity') return resolve(this.localizeContract(contract))
				}).then(localizedContract => {
					localizedContracts[name] = localizedContract
				})
				calls.push(call)
			})

			return Bluebird.all(calls).then(() => (name, address) => {
				if (typeof localizedContracts[name] === 'function'){
					if (!address) return new Error(`Address needed`)
					return localizedContracts[name].at(address)
				}
				else {
					if (address) return new Error(`No address needed`)
					return localizedContracts[name]
				}
			})

		}).catch(err => console.log(err))
	}

	load(filePath){
		return new Bluebird((resolve, reject) => {
			jsonfile.readFile(filePath, (err, sources) => {
				if (err) return reject(err)
				const contracts = _.mapValues(sources, (source, name) => {
					const contract = pudding.whisk(name, source)
					contract.type = source.type
					return contract
				})
				return resolve(contracts)
			})
		})
	}

	getDougProvider(address){
		return this.localizeContract(pudding.whisk('DougProvider', {
			"abi": [{
				"constant": false,
				"inputs": [{
					"name": "name",
					"type": "bytes32"
				}],
				"name": "contracts",
				"outputs": [{
					"name": "addr",
					"type": "address"
				}],
				"payable": false,
				"type": "function"
			}],
			"unlinked_binary": "6060604052602c8060106000396000f3606060405260e060020a6000350463ec56a3738114601c575b6002565b3460025760006060908152602090f3"
		})).at(address)
	}

	localizeContract(contract){
	    contract.setProvider(this.web3.currentProvider)
	    contract.defaults({
			from: this.web3.eth.defaultAccount,
			gas: '0x2fefd8',
			// gasLimit: '0x2fefd8'
		})
	    return contract
	}
}
