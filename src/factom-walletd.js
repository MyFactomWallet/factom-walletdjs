'use-strict'

var URL = 'http://127.0.0.1:8089'
var lib = URL.startsWith('https') ? require('https') : require('http')
var options = optinit()
var timeout = 2000

function optinit () {
  var opt = require('url').parse(URL)
  opt.headers = { 'content-type': 'text/plain', 'content-length': 0 }
  opt.method = 'POST'
  return opt
}


/**
  * Set the URL of the factom node.
  * @method setFactomNode
  * @param {url} url of the factom node
 */
function setFactomNode (url) {
  URL = url
  lib = URL.startsWith('https') ? require('https') : require('http')
  options = optinit()
}

/**
  * Set the timeout of the JSON request to the factom node
  * @method setTimeout
  * @param {Number} to Set the timeout in milliseconds
 */
function setTimeout (to) {
  timeout = to
}

/**
 * Utility commands for dispatching JSON commands to the factom server.
 * @method dispatch
 * @param {Array} jdata
 *
 */
function dispatch (jdata) {
  return new Promise((resolve, reject) => {
    var body = JSON.stringify(jdata)
    options.headers['content-length'] = Buffer.byteLength(body)
    const request = new lib.ClientRequest(options)
    request.on('socket', (socket) => {
      socket.setTimeout(timeout)
      socket.on('timeout', () => request.abort())
    })
    request.end(body)
    request.on('response', (response) => {
      response.setEncoding('utf8')

      // handle http errors
      if (response.statusCode < 200 || response.statusCode > 299) {
        reject(new Error('Failed to load page, status code: ' + response.statusCode))
      }
      // temporary data holder
      const body = []
      // on every content chunk, push it to the data array
      response.on('data', (data) => body.push(data))
      // all done, resolve promise with those joined chunks
      response.on('end', () => resolve(JSON.parse(body.join('')).result))
    })
    // handle connection errors of the request
    request.on('error', (err) => reject(err))
  })
}


function newCounter () {
  let i = 0
  return function () {
    i++
    return i
  }
}

const APICounter = newCounter()


/**
 * https://docs.factom.com/api#add-ec-output
 *
 * When adding entry credit outputs, the amount given is in factoshis, 
 * not entry credits. This means math is required to determine the correct 
 * amount of factoshis to pay to get X EC.
 *
 * (ECRate * ECTotalOutput)
 *
 * @method addEcOutput
 *
 * @param {String} txname transaction name
 * @param {String} ecaddress entry credit address
 * @param {Number} amount
 *
 */
function addEcOutput (txname, ecaddress, amount) {
  var jdata = { 'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'add-ec-output',
    'params': {
      'tx-name': txname,
      'address': ecaddress,
      'amount' : amount
    }}
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#add-fee
 *
 * Addfee is a shortcut and safeguard for adding the required additional
 * factoshis to covert the fee. The fee is displayed in the returned 
 * transaction after each step, but addfee should be used instead of 
 * manually adding the additional input. This will help to prevent overpaying.
 *
 * @method addFee
 *
 * @param {String} txname name of the transaction
 * @param {String} fctaddress Factoid address
 *
 */
function addFee (txname, fctaddress) {
  var jdata = { 'jsonrpc': '2.0',
      'id': ApiCounter(),
      'method': 'add-ec-output',
      'params': {
         'tx-name': txname,
         'address': fctaddress
      }}

  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#add-input 
 * Adds an input to the transaction from the given address. The public address
 * is given, and the wallet must have the private key associated with the 
 * address to successfully sign the transaction.
 *
 * The input is measured in factoshis, so to send ten factoids, you must input
 * 1,000,000,000 factoshis
 *
 * @method addInput
 *
 * @param {String} txname  transaction name
 * @param {String} fctaddress  factoid address
 *
 */
function addInput  (txname, fctaddress) {
  var jdata = {'jsonrpc': '2.0', 
      'id': ApiCounter(), 
      'method': 'add-input',
      'params': {
           'tx-name': txname,
           'address': fctaddress
       }}
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#add-output
 * Adds a factoid address output to the transaction. Keep in mind the output
 * is done in factoshis. 1 factoid is 1,000,000,000 factoshis.
 *
 * @method addOutput
 *
 * @param {String} txname Transaction Name
 * @param {String} fctaddress destination factoid address
 * @param {Number} amount amount to send in factoshis
 *
 */
function addOutput  (fctaddress, amount) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'add-output',
    'params': {
      'tx-name': txname,
      'address': fctaddress,
      'amount' : amount
    }}
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#address
 * Retrieve the public and private parts of a Factoid or Entry Credit
 * address stored in the wallet.
 *
 * @method address
 *
 * @param {String} address entry credit or factoid address 
 *
 */
function address  (address) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'address',
    'params': {
      'address': address
    }}
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#all-addresses
 * 
 * Retrieve all of the Factoid or Entry Credit addresses stored in the wallet
 * @method allAddresses
 *
 * @param {Number} height height of block requested
 *
 */
function allAddresses  (height) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'all-addresses'
    }
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#compose-chain
 *
 * This method, compose-chain, will return the appropriate API calls to 
 * create a chain in factom. You must first call the commit-chain, then 
 * the reveal-chain API calls. To be safe, wait a few seconds after calling 
 * commit.
 *
 * Notes:
 *
 * Ensure that all data given in the firstentry fields are encoded in hex. 
 * This includes the content section.
 *
 * @method composeChain
 *
 * @param {Array} extids an array of external id's ["1234", "5678"]
 * @param {String} content Entry contents
 * @param {String} ecaddress Entry Credit public address
 *
 *
 */
function composeChain  (extids, content, ecaddress ) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'compose-chain',
    'params': {
      'chain': {'firstentry':{'extids':extids, 'content':content}},
      'ecpub': ecaddress
    }}
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#compose-entry
 *
 * This method, compose-entry, will return the appropriate API calls to create
 * an entry in factom. You must first call the commit-entry, then the 
 * reveal-entry API calls. To be safe, wait a few seconds after calling commit.
 *
 * Notes:
 * Ensure all data given in the entry fields are encoded in hex. This includes
 * the content section.
 *
 *
 * @param {String} chainid hex encoded chain id
 * @param {Array} extids  array of extenral id strings e.g. ['cd90', '90cd']
 * @param {String} content content of entry 
 * @param {String} ecaddress Entry Credit public address
 *
 */
function composeEntry  (chainid, extids, content, ecaddress) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'compose-entry',
    'params': {
      'entry': {'chainid':chainid, 'extids':extids, 'content':content},
      'ecpub': ecaddress
    }}
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#compose-transaction
 *
 * Compose transaction marshals the transaction into a hex encoded string. 
 * The string can be inputted into the factomd API factoid-submit to be 
 * sent to the network.
 *
 * @method composeTransaction
 *
 * @param {String} txname  name of transaction 
 *
 */
function composeTransaction  (txname) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'compose-transaction',
    'params': {
      'tx-name': txname
    }}
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#delete-transaction
 *
 * Deletes a working transaction in the wallet. The full transaction will
 * be returned, and then deleted.
 *
 * @method deleteTransaction
 *
 * @param {String} txname Name of transaction 
 *
 */
function deleteTransaction  (txname) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'delete-transaction',
    'params': {
      'tx-name': txname 
    }}
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#generate-ec-address
 *
 * Create a new Entry Credit Address and store it in the wallet.
 *
 * @method generateEcAddress
 *
 *
 */
function generateEcAddress (id) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'generate-ec-address'
    }
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#generate-factoid-address
 *
 * Create a new Factoid Address and store it in the wallet
 * 
 * @method generateFactoidAddress
 *
 *
 */
function generateFactoidAddress (id) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'generate-factoid-address'
    }
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#get-height
 *
 * Get the current height of blocks that have been cached by the wallet
 * while syncing
 *
 * @method getHeight
 *
 *
 */
function getHeight (id) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'get-height'
    }
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#import-addresses
 *
 * Import Factoid and/or Entry Credit address secret keys into the wallet.
 *
 * @method importAddresses
 *
 * @param {Array} privaddresses Array of secret private fct addresses in the format [{'secret':'FsXXXXXXX','secret':'FsYYYYYYYYY', 'secret':'Es...' }] 
 *
 */
function importAddresses  (privaddresses) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'import-addresses',
    'params': {
      'addresses': privaddresses
    }}
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#import-koinify
 *
 * Import a Koinify crowd sale address into the wallet. In our examples we 
 * used the word “yellow” twelve times, note that in your case the master 
 * passphrase will be different.
 *
 * @method importKoinify
 *
 * @param {String} koinify Koinify phrase (12 words)
 *
 */
function importKoinify  (koinify) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'import-koinify',
    'params': {
      'words': koinify
    }}
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#new-transaction
 *
 * This will create a new transaction. The txid is in flux until the final
 * transaction is signed. Until then, it should not be used or recorded.
 *
 * When dealing with transactions all factoids are represented in factoshis.
 * 1 factoid is 1e8 factoshis, meaning you can never send anything less 
 * than 0 to a transaction (0.5).
 *
 * @method  newTransaction
 *
 * @param {String} txname
 *
 */
function newTransaction  (txname) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'new-transaction',
    'params': {
      'tx-name': txname
    }}
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#properties61
 *
 * Retrieve current properties of factom-walletd, including 
 * the wallet and wallet API versions.
 *
 * @method properties
 *
 *
 */
function properties (id) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'properties'
    }
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#sign-transaction
 *
 * Signs the transaction. It is now ready to be executed.
 *
 * @method signTransaction
 *
 * @param {String} txname Transaction Name
 *
 */
function signTransaction  (txname) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'sign-transaction',
    'params': {
      'tx-name': txname
    }}
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#sub-fee
 *
 * When paying from a transaction, you can also make the receiving transaction
 * pay for it. Using sub fee, you can use the receiving address in the 
 * parameters, and the fee will be deducted from their output amount.
 *
 * This allows a wallet to send all it’s factoids, by making the input 
 * and output the remaining balance, then using sub fee on the output address.
 *
 * @method subFee
 *
 * @param {String} txname transaction anem
 * @param {String} fctaddress address
 *
 */
function subFee  (txname, fctaddress) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'sub-fee',
    'params': {
      'tx-name': txname,
      'address': fctaddress
    }}
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#tmp-transactions
 *
 * Lists all the current working transactions in the wallet. 
 * These are transactions that are not yet sent.
 *
 * @method tmpTransactions
 *
 * @param {String} address entry credit address
 *
 */
function tmpTransactions  (address) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'tmp-transactions'
    }
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#using-a-range
 *
 * This will retrieve all transactions within a given block height range
 *
 * @method transactionsByRange
 *
 * @param {Number} start Starting block height for query
 * @param {Number} end Ending block height for query
 *
 */
function transactionsByRange  (start, end) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'transactions',
    'params': {
      'range': {'start':start, 'end':end}
    }}
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#by-txid
 *
 * This will retrieve a transaction by the given TxID. This call is the 
 * fastest way to retrieve a transaction, but it will not display the 
 * height of the transaction. If a height is in the response, it will be 0.
 * To retrieve the height of a transaction, use the 'By Address’ method
 *
 * This call in the backend actually pushes the request to factomd. 
 * For a more informative response, it is advised to use the factomd 
 * transaction method
 *
 * @method transactionsbyTxID 
 *
 * @param {String} txid transaction id
 *
 */
function transactionsByTxID  (txid) {
  var jdata = {'jsonrpc': '2.0', 'id': ApiCounter(), 'method': 'transactions',
    'params':{
      'txid':txid
  }}
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#by-address
 *
 * Retrieves all transactions that involve a particular address.
 *
 * @method transactionsByAddress 
 *
 * @param {String} address query by address
 *
 */
function transactionsByAddress  (address) {
  var jdata = {'jsonrpc': '2.0', 
    'id': ApiCounter(), 
    'method': 'transactions',
    'params': {
      'address':address
  }}
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#all-transactions
 *
 * The developers were so preoccupied with whether or not they could, 
 * they didn’t stop to think if they should.
 *
 * The amount of data returned by this is so large, I couldn’t get you 
 * a sample output as it froze my terminal window. It is strongly 
 * recommended to use other techniques to retrieve transactions; it is 
 * rarely the case to require EVERY transaction in the blockchain. If 
 * you are still determined to retrieve EVERY transaction in the blockchain,
 * use other techniques such as using the 'range’ method and specifically 
 * requesting for transactions between blocks X and Y, then incrementing 
 * your X’s and Y’s until you reach the latest block. This is much more 
 * manageable.
 *
 * @method transactionsAll
 *
 *
 */
function transactionsAll (id) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'transactions'
    }
  return dispatch(jdata)
}

/**
 * https://docs.factom.com/api#wallet-backup
 *
 * Return the wallet seed and all addresses in the wallet for backup and 
 * offline storage.
 *
 * @method walletBackup 
 *
 *
 */
function walletBackup  (message) {
  var jdata = {'jsonrpc': '2.0',
    'id': ApiCounter(),
    'method': 'wallet-backup'
    }
  return dispatch(jdata)
}


module.exports = {
  setTimeout,
  setFactomNode,
  addEcOutput,
  addFee,
  addInput,
  addOutput,
  address,
  allAddresses,
  composeChain,
  composeEntry,
  composeTransaction,
  deleteTransaction,
  generateEcAddress,
  generateFactoidAddress,
  getHeight,
  importAddresses,
  importKoinify,
  newTransaction,
  properties,
  signTransaction,
  subFee,
  tmpTransactions,
  transactionsByRange,
  transactionsByTxID,
  transactionsByAddress,
  transactionsAll,
  walletBackup
}
