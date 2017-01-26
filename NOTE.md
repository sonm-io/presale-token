# Important notes

1. In this project I am using **NOT BETA** version of truffle - this mean this project is not support npm package "in the box".
2. At this moment (26.01.2017) - Official Zeppelin team does not fix vulnurability with "throw"
-(https://github.com/OpenZeppelin/zeppelin-solidity/pull/135)
,so I've used @SCBuergel version (https://github.com/SCBuergel/zeppelin-solidity)
Also @SCBuergel does not write test properly, so his version does not include into the
npm package, and also, above it, npm version of library is out of date even from official master branch.

  Well, at least we found this bug with 'throw' and I copied right version of contract themselves.

3. Deployed crowdsale contract from OpenZeppelin, it's seems works.. truffle console stil make me angry because it's not support default accounts and have strange behaviour, but simple functions looked like works

**TODO**:

-- clean second issue, when guys from OpenZeppelin handle merge from @SCBuergel and write properly test. In opposition we need to run test's ourself in truffle syntax.

-- do crowdsale dummy, rewrite deploy script, rewrite tests(?)
