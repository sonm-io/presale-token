module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    ropsten: {
      host: "localhost",
      port: 8545,
      network_id: 3,
      from: "0x0073a284FE9C6f9ad578F23E2397BF2fe6De59A1"
    },
    kovan: {
      host: "localhost",
      port: 8545,
      network_id: 42,
      from: "0x00C0d8F90F2c982A66d764aD025C0992F9B8d9c1"
    },
    mainnet: {
      host: "localhost",
      port: 8545,
      network_id: 1
    }
  }
};
