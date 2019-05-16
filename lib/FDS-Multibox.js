// multibox smart contracts

let Web3 = require('web3');
let namehash = require('eth-ens-namehash');

let MultiboxContract = require('../abi/Multibox.json');

let httpTimeout = 2000;

class Multibox {

    constructor(config) {
        this.config = config;
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.ethGateway, httpTimeout));
        this.gasPrice = this.web3.utils.toWei(config.gasPrice.toString(), 'gwei');
    }

    /**
     * encode feed locatio hash
     * @param {any} senderAddress address
     * @param {any} recipientNamehash recepient hash 
     * @returns {any} encoded sender and recipient hash
     */
    encodeFeedLocationHash(senderAddress, recipientNamehash) {
        return senderAddress + recipientNamehash.substr(42, 66);
    }
    /**
     * subdomain name hash to feed location hash
     * @param {any} recipientNamehash hash of recipient name
     * @returns {any} substring of recepient name hash that is feed location hash
     */
    subdomainNameHashToFeedLocationHash(recipientNamehash) {
        return recipientNamehash.substr(42, 66);
    }
    /**
     * Decode feed location
     * @param {any} feedLocationHash hash of feed location
     * @returns {any} object with address and topic
     */
    decodeFeedLocationHash(feedLocationHash) {
        return {
            address: feedLocationHash.substring(0, 42),
            topic: feedLocationHash.substr(42, 66)
        };
    }

    /**
     * deploy multibox
     * @param {any} wallet wallet 
     * @param {number} nonce number
     * @returns {TransactionReceipt} transactio receipt
     */
    deployMultibox(wallet, nonce) {
        let contract = new this.web3.eth.Contract(MultiboxContract.abi);
        let dataTx = contract.deploy({ data: MultiboxContract.bytecode }).encodeABI();
        let privateKey = wallet.wallet.getPrivateKeyString();
        let tx = {
            from: wallet.wallet.getAddressString(),
            data: dataTx,
            gas: 1500000,
            gasPrice: this.gasPrice,
            nonce: nonce
        };

        return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('transactionHash', function (hash) {
                    return hash;
                });
        });
    }

    /**
     * create new request
     * @param {any} senderAccount account 
     * @param {any} recipientSubdomain name
     * @param {any} multiboxAddress address
     * @param {any} feedLocationHash hash
     * @returns {TransactionReceipt} transactio receipt
     */
    newRequest(senderAccount, recipientSubdomain, multiboxAddress, feedLocationHash) {
        let recipientMultiboxContract = new this.web3.eth.Contract(MultiboxContract.abi, multiboxAddress);
        let recipientNamehash = namehash.hash(senderAccount.subdomain + '.' + this.config.ensConfig.domain);
        let dataTx = recipientMultiboxContract.methods.newRequest(
            recipientNamehash,
            feedLocationHash
        ).encodeABI();

        let privateKey = senderAccount.privateKey;
        let tx = {
            from: senderAccount.address,
            to: multiboxAddress,
            data: dataTx,
            gas: 510000,
            gasPrice: this.gasPrice
        };

        return this.web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
            return this.web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('transactionHash', function (hash) {
                    return hash;
                });
        });
    }

    /**
     * Get raw requests 
     * @param {any} namehash hash 
     * @param {any} multiboxAddress address
     * @returns {TransactionObject} transaction 
     */
    getRequestRaw(namehash, multiboxAddress) {
        let recipientMultiboxContract = new this.web3.eth.Contract(MultiboxContract.abi, multiboxAddress);
        return recipientMultiboxContract.methods
            .getRequest(namehash)
            .call();
    }

    /**
     * get requests from subdomain and address 
     * @param {any} subdomain name
     * @param {any} multiboxAddress address
     * @returns {any} raw requestss
     */
    getRequest(subdomain, multiboxAddress) {
        let recipientMultiboxContract = new this.web3.eth.Contract(MultiboxContract.abi, multiboxAddress);
        return this.getRequestRaw(namehash.hash(subdomain + '.' + this.config.ensConfig.domain), multiboxAddress);
    }

    /**
     * Get requests to multibox
     * @param {any} multiboxAddress address
     * @returns {any} requests
     */
    getRequests(multiboxAddress) {
        let recipientMultiboxContract = new this.web3.eth.Contract(MultiboxContract.abi, multiboxAddress);
        return recipientMultiboxContract.methods
            .getRequests()
            .call();
    }

    async sfGetSFHash(acc, data) {
        let h = await acc.SwarmStore.SF.sendRequest('/bzz-raw:/', 'POST', 'text', acc.Tx.web3.utils.toHex(data));
        let r = await acc.SwarmStore.SF.sendRequest('/bzz-raw:/' + h, 'GET');
        console.log(data + ":" + h + ":" + r);
        // execute contract addFolder 
        return h;
    }
}

module.exports = Multibox;