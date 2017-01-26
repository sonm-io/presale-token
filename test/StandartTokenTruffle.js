/**
It can't be npm test because they fail with npm package and updates
So, it's will be rewriten to truffle standart promise test.
**/
contract('StandardToken', function(accounts){

  it("should return the correct totalSupply after construction", function() {


/**
    var token = StandardToken.new(accounts[0],100);
    var tokdep = StandardToken.deployed();
**/
var tokdep = StandardToken.deployed();

StandardToken.new(100,{from : accounts[0]}).then(

function(token1){

  return tokdep.totalSupply.call().then(function(totalSupply){

    assert.equal(totalSupply.valueOf(), 100);


  });

});

/**
    return tokdep.totalSupply.call().then(function(totalSupply){

      assert.equal(totalSupply.valueOf(), 100);


    });
**/

});




});
