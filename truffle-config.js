const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs');
const { mnemonic, BSCSCANAPIKEY} = require('./env.json');

module.exports = {
  // deploy
  // plugins: [
  //   'truffle-plugin-verify'
  // ],
  // api_keys: {
  //   bscscan: BSCSCANAPIKEY
  // },
  networks: {
    // development: {
    //   host: "127.0.0.1",     // Localhost (default: none)
    //   port: 8545,            // Standard BSC port (default: none)
    //   network_id: "*",       // Any network (default: none)
    // },
    // bscTestnet: {
    //   networkCheckTimeout: 10000,
    //   provider: () => new HDWalletProvider(mnemonic, `https://data-seed-prebsc-1-s1.binance.org:8545`),
    //   network_id: 97,
    //   confirmations: 10,
    //   timeoutBlocks: 200,
    //   skipDryRun: true
    // },
    // bsc: {
    //   provider: () => new HDWalletProvider(mnemonic, `https://bsc-dataseed1.binance.org`),
    //   network_id: 56,
    //   confirmations: 10,
    //   timeoutBlocks: 200,
    //   skipDryRun: true
    // },
  },
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "^0.8.0",    // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      // settings: {          // See the solidity docs for advice about optimization and evmVersion
      //  optimizer: {
      //    enabled: false,
      //    runs: 200
      //  },
      //  evmVersion: "byzantium"
      // }
    },
  },
};
