const TokenManager = artifacts.require("./TokenManager.sol");

contract("TokenManager", () => {
  it("should create Tokenmanager with 3 members", () => {
    TokenManager.deployed()
      .then(mgr => assert.equal(mgr.getOwners().length, 3,
        "has invalid number of members"));
  })
})
