pragma solidity ^0.4.4;


import "./zeppelin/token/StandardToken.sol";
import "./zeppelin/lifecycle/Stoppable.sol";

/*
 * CrowdsaleToken
 *
 * Simple ERC20 Token example, with crowdsale token creation
 */
contract PreSale is StandardToken,Stoppable {

  string public name = "PresaleToken";
  string public symbol = "PST";
  uint public decimals = 18;


  address public withdraw=owner;
  address public manager=owner;

  // Initial founder address (set in constructor)
  // All deposited ETH will be instantly forwarded to this address.
  // Address is a multisig wallet.
  //address public founder = 0x0;
  //Will use owner instead


  event Migrated(address _prebuy,uint amount);
  event Buy(address indexed sender, uint eth, uint pst);

  // 1 ether = 1000 example tokens
  uint PRICE = 1000;
  uint public etherCap = 20000 * 10**18; //max amount raised during crowdsale (200k USD)
  uint public presaleTokenSupply = 0; //this will keep track of the token supply created during the presale
  uint public presaleEtherRaised = 0; //this will keep track of the Ether raised during the presale



  function () payable {
    createTokens(msg.sender);
  }




  // function buy.
  function createTokens(address recipient) payable {
    if (msg.value == 0) throw;

    if (safeAdd(presaleEtherRaised,msg.value)>etherCap || stopped) throw;

    uint tokens = safeMul(msg.value, getPrice());

    totalSupply = safeAdd(totalSupply, tokens);
    balances[recipient] = safeAdd(balances[recipient], tokens);
    presaleTokenSupply = safeAdd(presaleTokenSupply,tokens);
    presaleEtherRaised = safeAdd(presaleEtherRaised, msg.value);

    // I don't understand this
  //  if (!withdraw.call.value(msg.value)()) throw; //immediately send Ether to founder address

  // We can use it if we want immediately send.
  //if(!withdraw.send(msg.value)) throw;

    Buy(recipient, msg.value, tokens);
  }

  // replace this with any other price function
  function getPrice() constant returns (uint result){
    return PRICE;
  }


/**
modifier manager is for invoke migrate function.


**/

  modifier onlyManager() {
    if (msg.sender == manager)
      _;
    else
      throw;
  }

  function transferManager(address newManager) onlyManager {
    if (newManager != address(0)) manager = newManager;
  }


/**
withdraw change

**/

modifier onlyOut() {
  if (msg.sender == withdraw)
    _;
  else
    throw;
}

function changeWithDraw(address newOut) onlyOut {
  if (newOut != address(0)) withdraw = newOut;
}

//------------



// This function is clean balance after migration
  function DestroyMigr(address _prebuy){
//    if (_prebuy!=msg.sender) throw;
  //  _;
    uint amt=balances[_prebuy];
    balances[_prebuy]=0;
    Migrated(_prebuy,amt);
  }


// Function destroy is for test only.
  function destroy() { // so funds not locked in contract forever
      if (msg.sender == owner) {
        suicide(msg.sender); // send funds to organizer
      }
}



// We have use this version of withdraw or we can use straight-forwarding function.
  function withdraw(){

  if(!withdraw.send(presaleEtherRaised))
  throw;
  }


}
