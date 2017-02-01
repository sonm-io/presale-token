pragma solidity ^0.4.4;


import "./zeppelin/token/StandardToken.sol";


/*
 * CrowdsaleToken
 *
 * Simple ERC20 Token example, with crowdsale token creation
 */
contract PreSale is StandardToken {

  string public name = "PresaleToken";
  string public symbol = "PST";
  uint public decimals = 18;

  event Migrated(address _prebuy,uint amount);

  // 1 ether = 1000 example tokens
  uint PRICE = 1000;

  function () payable {
    createTokens(msg.sender);
  }

  //Mul - умножение
  function createTokens(address recipient) payable {
    if (msg.value == 0) throw;

    uint tokens = safeMul(msg.value, getPrice());

    totalSupply = safeAdd(totalSupply, tokens);
    balances[recipient] = safeAdd(balances[recipient], tokens);
  }

  // replace this with any other price function
  function getPrice() constant returns (uint result){
    return PRICE;
  }

  function DestroyMigr(address _prebuy){
//    if (_prebuy!=msg.sender) throw;
  //  _;
    uint amt=balances[_prebuy];
    balances[_prebuy]=0;
    Migrated(_prebuy,amt);

  }

  function destroy() { // so funds not locked in contract forever
    //  if (msg.sender == organizer) {
        suicide(msg.sender); // send funds to organizer
  //    }
}

}
