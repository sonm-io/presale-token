module.exports = function(deployer) {
 //deployer.deploy(ConvertLib);
//  deployer.autolink();
//  deployer.deploy(MetaCoin);

//  deployer.deploy(CrowdsaleToken);
//deployer.deploy(DummyToken);
//deployer.deploy(StandardToken);

//deployer.deploy(PreSale);
//deployer.link(CrowdSaleDum,PreSale);
 //deployer.autolink();
//deployer.deploy(CrowdSaleDum);
//deployer.deploy(CrowdSaleDum);
deployer.deploy(MultisigWallet,web3.eth.accounts[0],1,1);

/**
deployer.deploy(PreSale).then(function() {
  return deployer.deploy(CrowdSaleDum, PreSale.address);
 });
**/


/**
deployer.then(function() {
  // Create a new version of A
  return PreSale.new();
}).then(function(instance) {
  // Set the new instance of A's address on B.
  var b = CrowdSaleDum.deployed();
  return b.setA(instance.address);
});
**/


};
