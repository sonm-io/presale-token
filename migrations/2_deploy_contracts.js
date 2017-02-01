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


deployer.deploy(PreSale).then(function() {
  return deployer.deploy(CrowdSaleDum, PreSale.address);
});


};
