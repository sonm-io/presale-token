pragma solidity ^0.4.4;

import 'multisig-wallet/MultiSigWallet.sol';


contract TokenManager is MultiSigWallet {
    function TokenManager(address[] _owners, uint _required)
        MultiSigWallet(_owners, _required)
    {
    }
}
