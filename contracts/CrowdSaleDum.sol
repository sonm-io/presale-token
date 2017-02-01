pragma solidity ^0.4.4;


import "./zeppelin/token/StandardToken.sol";


contract token { mapping (address => uint256) public balances;
  event Migrated(address _prebuy,uint amount);
  function DestroyMigr(address _prebuy){
  //  if (_prebuy!=msg.sender) throw;

    uint amt=balances[_prebuy];
    balances[_prebuy]=0;
    Migrated(_prebuy,amt);

  }
 }


/*
 * CrowdsaleToken
 *
 * Simple ERC20 Token example, with crowdsale token creation
 */
contract CrowdSaleDum is StandardToken {

  string public name = "CrowdDummyToken";
  string public symbol = "CDT";
  uint public decimals = 18;

  event MigrationSt (address _prebuy,uint amount);

  token public presaleTokenAddress;

  function CrowdSaleDum(token PresaleToken){
  presaleTokenAddress=token(PresaleToken);
  }

  // 1 ether = 500 example tokens
  uint PRICE = 500;


  function MigratePre(address _prebuyC){
    uint tokens=presaleTokenAddress.balances(_prebuyC);

    totalSupply = safeAdd(totalSupply, tokens);
    balances[_prebuyC] = safeAdd(balances[_prebuyC], tokens);
    presaleTokenAddress.DestroyMigr(_prebuyC);
  }

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
}
