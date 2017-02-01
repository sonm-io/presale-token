pragma solidity ^0.4.4;


import "./zeppelin/token/StandardToken.sol";


contract token { mapping (address => uint256) public balances; }


/*
 * CrowdsaleToken
 *
 * Simple ERC20 Token example, with crowdsale token creation
 */
contract CrowdSaleDum is StandardToken (PresaleToken){

  string public name = "CrowdDummyToken";
  string public symbol = "CDT";
  uint public decimals = 18;


  token public presaleTokenAddress;

  presaleTokenAddress=token(PresaleToken);

  // 1 ether = 500 example tokens
  uint PRICE = 500;

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
