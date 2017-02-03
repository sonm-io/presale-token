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


//------INITIAL VALUES-----------
  // 1 ether = 200 example tokens
  uint PRICE = 200;
  // We are distribute first 4 000 000 tokens for 200 000$ (USD).
  uint public etherCap = 20000 * 10**18; //max amount raised during crowdsale (200k USD)
  uint public presaleTokenSupply = 0; //this will keep track of the token supply created during the presale
  uint public presaleEtherRaised = 0; //this will keep track of the Ether raised during the presale
//--------------



//----------BUY&PRICE section------------------------

  function () payable {
    BuyToken(msg.sender);
  }




  // function buy.
  function BuyToken(address recipient) payable {
    if (msg.value == 0) throw;

    if (safeAdd(presaleEtherRaised,msg.value)>etherCap || stopped) throw;

    uint tokens = safeMul(msg.value, getPrice());

    totalSupply = safeAdd(totalSupply, tokens);
    balances[recipient] = safeAdd(balances[recipient], tokens);
    presaleTokenSupply = safeAdd(presaleTokenSupply,tokens);
    presaleEtherRaised = safeAdd(presaleEtherRaised, msg.value);


    if (!withdraw.call.value(msg.value)()) throw;   //immediately send Ether to withdraw address.


  // We can use it if we want immediately send.
  //if(!withdraw.send(msg.value)) throw;

    Buy(recipient, msg.value, tokens);
  }


  // price in presale are fixed
  function getPrice() constant returns (uint result){
    return PRICE;
  }
//---------------------------------------------------------



//------------MIGRATION--------------------------------------------
/**
modifier manager is for invoke migrate function.
for default manager = owner. Later, when crowdsale is deployed, manager address
switched for presale address.
DestroyMigr can be invoked only by this address.
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

  // This function is clean balance after migration
    function DestroyMigr(address _prebuy) onlyManager{
  //    if (_prebuy!=msg.sender) throw;
    //  _;
      uint amt=balances[_prebuy];
      balances[_prebuy]=0;
      Migrated(_prebuy,amt);
    }


//-------------WITHDRAW modifiers-------------

/**
Withraw funs is automatical (see line 62)
This function is only to change this address.

Logic: first withdraw is owner address, then this address is changing to
multisig wallet address and canot be changed one more time.

Reason: I cannot set construction parameter of multisig because multisig
is not compile through truffle. We have to set this manually :(


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




// Function destroy is for test only. Probably we will keep this to destroy this contract after crowdsale
  function destroy() onlyOwner { // so funds not locked in contract forever
      if (msg.sender == owner) {
        suicide(msg.sender); // send funds to organizer
      }
}


/**
// We have use this version of withdraw or we can use straight-forwarding function.
  function withdraw(){

  if(!withdraw.send(presaleEtherRaised))
  throw;
  }
**/

}
