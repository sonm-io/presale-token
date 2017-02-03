# Important notes

1. In this project I am using **NOT BETA** version of truffle - this mean this project is not support npm package "in the box".
2. At this moment (26.01.2017) - Official Zeppelin team does not fix vulnurability with "throw"
-(https://github.com/OpenZeppelin/zeppelin-solidity/pull/135)
,so I've used @SCBuergel version (https://github.com/SCBuergel/zeppelin-solidity)
Also @SCBuergel does not write test properly, so his version does not include into the
npm package, and also, above it, npm version of library is out of date even from official master branch.

  Well, at least we found this bug with 'throw' and I copied right version of contract themselves.

3. Deployed crowdsale contract from OpenZeppelin, it's seems works.. truffle console stil make me angry because it's not support default accounts and have strange behaviour, but simple functions looked like works

4. Deployed DMT successful, do test?

5. It is absolute hell with packages and dependencys no test is working.. probably will try install truffle BETA?

6. There are pifall with dependencys npm. Clone this repo and
``` npm install ```
do not use any other npm packages from any resources

7. There is still need to fix tests, cause of vulnurability fix (see line 6 issue)
I hate zeppeline now for their awful work with versions, packages and dependencys, but still it is better than write acyncrhonos truffle native tests.

Will work on contracts now, someone will be needed to rewrite tests.


1.02 - Start write another two dummys - PST and CDT.

1.02 - Seems like migrate function must work..

what protocol must be used for p2p message? hmm...

1.02 21:21 - Seems like I fix presale contract, but it's still weird behavior. Continue testing.

21:27 - Yep, it's really work how it must. Well write additional payload and deploy to testnet.
22^40 - Played with MultisigWallet - weird behavior.

2.02 - Added some modificators. Not tested yet.
17:19 - add all modifiers? Still not tested yet.

3.02 - Some comments clean.
3.02, 1:38 - seems like it work on testrpc. will deploy it on testnet and check.




**TODO**:

-- clean second issue, when guys from OpenZeppelin handle merge from @SCBuergel and write properly test. In opposition we need to run test's ourself in truffle syntax.





--add payload
