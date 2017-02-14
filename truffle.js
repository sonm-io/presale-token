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
      network_id: 3
    },
    live: {
      host: "localhost",
      port: 8545,
      network_id: 1
    }
  }
};
