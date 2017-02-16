import React                from 'react';
import MuiThemeProvider     from 'material-ui/styles/MuiThemeProvider';
import CircularProgress     from 'material-ui/CircularProgress';
import {Tabs, Tab}          from 'material-ui/Tabs';
import TextField            from 'material-ui/TextField';

import PresaleToken_json    from '../../build/contracts/PresaleToken';
import TokenManager_json    from '../../build/contracts/TokenManager';
import Truffle              from 'truffle-contract';

import Const                from './constants';
import TokenInfo            from './TokenInfo';
import TokenActions         from './TokenActions';
import './App.css';


const PresaleToken = Truffle(PresaleToken_json);
const TokenManager = Truffle(TokenManager_json);
const web3 = window.web3;
if(web3) {
  PresaleToken.setProvider(web3.currentProvider);
  TokenManager.setProvider(web3.currentProvider);
}



export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      tokenAddress: Const.DEFAULT_TOKEN_ADDRESS,
      tokenAddressError: null,
      tokenInfo: null,
      isLoading: true,
      defaultAccount: null
    };
  }


  _trackAccountInterval = null;
  componentDidMount() {
    this._loadTokenInfo()

    // track account changes
    this._trackAccountInterval = setInterval(() => {
      if (web3.eth.accounts[0] !== this.state.defaultAccount) {
        this.setState({defaultAccount: web3.eth.accounts[0]})
      }
    }, 600);
  }


  componentWillUnmount() {
    clearInterval(this._trackAccountInterval);
  }


  _loadTokenInfo = () => {
    const t = PresaleToken.at(this.state.tokenAddress);
    Promise
      .all(
        [ t.name.call()
        , t.symbol.call()
        , Promise.resolve(200) // FIXME: t.PRICE.call()
        , t.totalSupply.call()
        , t.tokenManager.call()
        , t.currentPhase.call()
        ])
      .then(([name, symbol, price, supply, mgr, phase]) => this.setState({
        isLoading: false,
        tokenInfo: {
          name, symbol, price,
          tokenManager: mgr,
          currentPhase: phase.toNumber(),
          supply: web3.fromWei(supply, "ether"),  // FIXME: use decimals
        }}))
      .catch(err => this.setState({isLoading: false, tokenAddressError: err}))
  }


  _loadManagerInfo =  () => {
    const managerAddress = this.state.tokenInfo.tokenManager;
    const m = TokenManager.at(managerAddress);
    web3.eth.getBalance(
      managerAddress,
      balance => m.getOwners.call().then(
        managers => this.setState({
          managerInfo: {
            address: managerAddress,
            balance: web3.fromWei(balance, "ether"),
            managers
          }})))
  }


  _setTokenAddress = ev => {
    this.setState(
      {tokenAddress: ev.target.value},
      this._loadTokenInfo
    );
  }


  _changeTab = tab => {
    switch(tab.props.value) {
      case "actions": {
        if(!this.state.managerInfo) {
          // FIXME: check if tokenInfo is loaded
          this._loadManagerInfo();
        }
        break;
      }
      default:
    }
  }


  render() {
    const spinner = (
      <CircularProgress
         size={80} thickness={5}
         style={{display: 'block', margin: '20px auto'}}
      />);

    const addressStyle = {
      textAlign: 'center',
      fontSize: '20px',
      color: 'grey'
    };

    return (
      <MuiThemeProvider>
        <div className="App">
          <TextField
            hintText="Token address"
            style={{margin: '20px 0'}}
            inputStyle={addressStyle}
            fullWidth={true}
            errorText={this.state.tokenAddressError}
            value={this.state.tokenAddress}
            onChange={this._setTokenAddress}
          />
          { !window.web3 &&
            <div>
              <p>
                No Ethereum network provider is detected.
                There are several ways to fix this:
              </p>
              <ul>
                <li>install <a href="https://metamask.io">MetaMask</a> browser plugin</li>
                <li>install <a href="https://github.com/ethcore/parity-extension">Parity</a> browser plugin</li>
                <li>open this page in <a href="https://github.com/ethereum/mist/releases">Mist</a> browser</li>
              </ul>
              <p>
                More info on this project is on <a href="https://github.com/sonm-io/token">github</a>
              </p>
            </div>
          }
          { this.state.isLoading && spinner }
          { this.state.tokenInfo &&
            <Tabs>
              <Tab label="Token Info" value="info">
                <TokenInfo info={this.state.tokenInfo}/>
              </Tab>
              <Tab label="Events" value="events">
                { this.state.latestEvents
                    ? <h2>Events</h2>
                    : spinner
                }
              </Tab>
              <Tab label="Actions" value="actions" onActive={this._changeTab}>
                { this.state.managerInfo
                    ? <TokenActions
                        info={this.state.managerInfo}
                        defaultAccount={this.state.defaultAccount}
                      />
                    : spinner
                }
              </Tab>
            </Tabs>
          }
        </div>
      </MuiThemeProvider>
    );
  }
}
