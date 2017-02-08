const TokenManager = artifacts.require("./TokenManager.sol");
const PresaleToken = artifacts.require("./PresaleToken.sol");

module.exports = deployer => {
  // FIXME: constant addresses for ropsten & mainnet deployment
  const [a, b, c] = web3.eth.accounts;

  deployer.deploy(TokenManager, [a,b,c], 2)
    .then(TokenManager.deployed)
    .then(tokenMgr => deployer.deploy(PresaleToken, tokenMgr.address));
};
