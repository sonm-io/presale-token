pragma solidity ^0.4.4;


import "./zeppelin/token/StandardToken.sol";
import "./zeppelin/lifecycle/Stoppable.sol";

contract token is Stoppable {
  mapping (address => uint) public balances;
  address public manager=owner;
  event Migrated(address _prebuy,uint amount);

  function DestroyMigr(address _prebuy) onlyManager{
  //  if (_prebuy!=msg.sender) throw;

    uint amt=balances[_prebuy];
    balances[_prebuy]=0;
    Migrated(_prebuy,amt);

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



  function balanceOf(address _owner) constant returns (uint balance)
  {
    return balances[_owner];
  }

 }


/*
 * CrowdsaleToken
 *
 * Simple ERC20 Token example, with crowdsale token creation
 */
contract CrowdSaleDum is StandardToken,Stoppable {

  string public name = "CrowdDummyToken";
  string public symbol = "CDT";
  uint public decimals = 18;

  event MigrationSt (address _prebuy,uint amount);


//  event initpresbal(uint inittok);

  event Buy(address indexed sender, uint eth, uint fbt);



  token public presaleTokenAddress;

  function CrowdSaleDum(token PresaleToken){
  presaleTokenAddress=token(PresaleToken);

  }

  // 1 ether = 500 example tokens

  uint PRICE = 500;

//Cap not set for this contract yet.
//  uint public etherCap = 20000 * 10**18; //max amount raised during crowdsale (200k USD)


  uint public saleTokenSupply = 0; //this will keep track of the token supply created during the presale
  uint public saleEtherRaised = 0; //this will keep track of the Ether raised during the presale

  function MigratePre(address _prebuyC){
  //  uint tokens=presaleTokenAddress.balances(_prebuyC);
    uint tokens=presaleTokenAddress.balanceOf(_prebuyC);
  //  initpresbal(tokens);

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

    saleTokenSupply = safeAdd(saleTokenSupply,tokens);
    saleEtherRaised = safeAdd(saleEtherRaised, msg.value);

    // I don't understand this
  //  if (!owner.call.value(msg.value)()) throw; //immediately send Ether to founder address

  // We can use it if we want immediately send.
  //if(!owner.send(msg.value)) throw;

    Buy(recipient, msg.value, tokens);


  }

  // replace this with any other price function
  function getPrice() constant returns (uint result){
    return PRICE;
  }


// For test only
  function destroy() { // so funds not locked in contract forever
    if (msg.sender == owner) {
      suicide(msg.sender); // send funds to organizer
    }
  }

//We have use this version of withdraw or we can use straight-forwarding function.
  function withdraw(){

  if(!owner.send(saleEtherRaised))
  throw;
  }

}
