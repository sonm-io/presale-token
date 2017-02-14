const TokenManager = artifacts.require("./TokenManager.sol");
const PresaleToken = artifacts.require("./PresaleToken.sol");


module.exports = (deployer, network) => {
  let [dev1, dev2, dev3] = web3.eth.accounts;

  if (network === "testnet") {
    dev1 = "0x980ee67ea21bc8b6c1aaaf9b57c9166052575213";
    dev2 = "0x587d96cb98d8e628af7af908f331990e5660df72";
    dev3 = "0x7f3307d6e3856ef6991157b5056f9de5e043c75c";
    // Private keys for these addresses
    // f099584c9fa50e8367b9dd9cb2a7c40cda9d8883b9571c1122cb43bdb7530013
    // 0dee03c50b135c5649f15b373f1b52b160d11954ede41c117999b446a3d146b0
    // 5efb179d282e88f724b160609ccb9a8127761ffbc1ebfcfa83c2344257ea2546

  } else if (network === "live") {
    // FIXME: add dev team mainnet addresses
  }

  deployer.deploy(TokenManager, [dev1, dev2, dev3], 2)
    .then(TokenManager.deployed)
    .then(tokenMgr => deployer.deploy(PresaleToken, tokenMgr.address));
};
