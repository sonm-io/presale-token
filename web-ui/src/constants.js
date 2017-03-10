
const Dev = {
  // check if we are on right network
  EXPECTED_NETWORK_ID: "[^13]",
  EXPECTED_NETWORK_NAME: "testrpc",
  DEFAULT_TOKEN_ADDRESS: "0x6b1fbed2283243be593b6a4012b70cecb0eadef3",
  // check if this is our token
  EXPECTED_TOKEN_NAME: "SONM Presale Token",
  // Block number when token was deployed (this is used to filter events).
  DEPLOYMENT_BLOCK_NUMBER: 1
};

/*
const Ropsten = {
  EXPECTED_NETWORK_ID: "3",
  EXPECTED_NETWORK_NAME: "Ropsten",
  DEFAULT_TOKEN_ADDRESS: "0x517fe605f789956bb6bcebd23431c9fc3b866b3e",
  EXPECTED_TOKEN_NAME: "SONM Presale Token",
  DEPLOYMENT_BLOCK_NUMBER: 539213
};

const Mainnet = {
  EXPECTED_NETWORK_ID: "1",
  EXPECTED_NETWORK_NAME: "Main",
  DEFAULT_TOKEN_ADDRESS: "",
  EXPECTED_TOKEN_NAME: "SONM Presale Token",
  DEPLOYMENT_BLOCK_NUMBER: 539213
};
*/

export default Dev;
