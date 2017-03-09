
import Truffle              from 'truffle-contract';
import PresaleToken_json    from '../../build/contracts/PresaleToken';
import TokenManager_json    from '../../build/contracts/TokenManager';
import Const                from './constants';

const PresaleToken = Truffle(PresaleToken_json);
const TokenManager = Truffle(TokenManager_json);
const web3 = window.web3;

if(web3) {
  PresaleToken.setProvider(web3.currentProvider);
  TokenManager.setProvider(web3.currentProvider);
}

const fromWei = x => {
  const y = web3.fromWei(x, 'ether');
  if(y.toNumber) return y.toNumber();
  else return y;
}


const API = {
  getBalance: address => new Promise((resolve, reject) =>
    web3.eth.getBalance(
      address,
      (err, res) => err
        ? reject({message: err, arg: address})
        : resolve(fromWei(res)))
  ),


  checkNetwork: () => new Promise((resolve, reject) =>
    web3.version.getNetwork((err,res) => {
      if(err)
        return reject({UNKNOWN_ERROR: true, more: err});
      if(!res.match(Const.EXPECTED_NETWORK_ID))
        return reject({INVALID_NETWORK_ID: true, arg: res})
      resolve();
    })
  ),


  getTokenInfo: tokenAddress => new Promise((resolve, reject) => {
    try {
      resolve(PresaleToken.at(tokenAddress));
    } catch(err) {
      reject({INVALID_TOKEN_ADDRESS: true});
    }
  })
    .then(token =>
      API.checkNetwork()
        .then(() => token.name.call())
        .then(name => name === Const.EXPECTED_TOKEN_NAME
            ? Promise.resolve(name)
            : Promise.reject({INVALID_TOKEN_NAME: true, arg: name}))
        .then(name => Promise.all(
          [ Promise.resolve(name)
          , Promise.resolve(200)
          , API.getBalance(token.address)
          , token.symbol.call()
          , token.totalSupply.call()
          , token.currentPhase.call()
          , token.tokenManager.call()
          , token.crowdsaleManager.call()
          ]))
        .then(([name, price, balance, symbol, supply, phase, mgr1, mgr2]) =>
          Promise.resolve({
            name, price, balance, symbol,
            supply: fromWei(supply),
            currentPhase: phase.toNumber(),
            tokenManager: {address: mgr1},
            crowdsaleManager: {address: mgr2},
            address: tokenAddress,
          }))
        .then(info => TokenManager.at(info.tokenManager.address)
          .then(mgr => Promise.all(
            [ API.getBalance(mgr.address)
            , mgr.getOwners.call()
            ])
          .then(([balance, managers]) => {
            Object.assign(info.tokenManager, {balance, managers});
            return Promise.resolve(info);
          })))
      ),

  getTokenEvents: address => new Promise((resolve, reject) => {
    const t = PresaleToken.at(address);
    const filter = t.allEvents({
      fromBlock: Const.DEPLOYMENT_BLOCK_NUMBER,
      toBlock: "latest"});
    filter.get((err, res) => err ? reject(err) : resolve(res));
  }),


  getManagerActions: address => new Promise((resolve, reject) => {
    const m = TokenManager.at(address);
    const filter = m.allEvents({
      fromBlock: Const.DEPLOYMENT_BLOCK_NUMBER,
      toBlock: "latest"
    });

    filter.get((err, events) => {
      if(err) return reject(err);
      const txMap = {};
      events.forEach(e => {
        const txId = e.args._txId === undefined ? e.args.transactionId : e.args._txId;
        txMap[txId] || (txMap[txId] = {txId});

        switch(e.event) {
          case "LogTokenSetPresalePhase": {
            txMap[txId].action = "setPresalePhase";
            txMap[txId].newPhase = e.args._phase;
            break;
          }
          case "LogTokenWithdrawEther": {
            txMap[txId].action = "withdrawEther";
            break;
          }
          case "LogTokenSetCrowdsaleManager": {
            txMap[txId].action = "setCrowdsaleManager";
            txMap[txId].crowdsaleManager = e.args._address;
            break;
          }
          case "Execution": {
            txMap[txId].executed = true;
            break;
          }
          case "ExecutionFailure": {
            txMap[txId].failed = true;
            break;
          }
          default: break;
        }
      });

      resolve(Object.values(txMap));
    })
  }),

  buyTokens: (tokenAddress, value) => new Promise((resolve, reject) =>
    web3.eth.sendTransaction(
      { to: tokenAddress,
        value: web3.toWei(value, "ether"),
        gas: 500000,
      },
      (err, res) => err ? reject(err) : resolve(res)
    )),

  startPresale: () => {}
};

export default API;
