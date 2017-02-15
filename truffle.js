module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    testnet: {
      host: "localhost",
      port: 8545,
      network_id: 3,
      from: "0x0073a284FE9C6f9ad578F23E2397BF2fe6De59A1"
    },
    live: {
      host: "localhost",
      port: 8545,
      network_id: 1
    }
  }
};
