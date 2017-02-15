import React                from 'react';
import MuiThemeProvider     from 'material-ui/styles/MuiThemeProvider';
import CircularProgress     from 'material-ui/CircularProgress';
import {Tabs, Tab}          from 'material-ui/Tabs';
import TextField            from 'material-ui/TextField';

import PresaleToken_json    from '../build/contracts/PresaleToken';
import TokenManager_json    from '../build/contracts/TokenManager';
import Truffle              from 'truffle-contract';

import TokenInfo            from './TokenInfo';
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
      tokenAddress: "0x517fe605f789956bb6bcebd23431c9fc3b866b3e",
      tokenAddressError: null,
      tokenInfo: null
    };
  }


  componentDidMount() {
    this._loadTokenInfo()
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
      .then(([name, symbol, price, supply, mgr, phase]) => {
        const tokenInfo = {
          name, symbol, price,
          tokenManager: mgr,
          currentPhase: phase.toNumber(),
          supply: web3.fromWei(supply, "ether").toNumber(),  // FIXME: use decimals
        };
        this.setState({tokenInfo});
      })
      .catch(err => this.setState({tokenAddressError: err}))
  }


  _setTokenAddress = ev => {
    this.setState(
      {tokenAddress: ev.target.value},
      this._loadTokenInfo
    );
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
              <Tab label="Actions" value="actions">
                <div><h2>Admin Actions</h2></div>
              </Tab>
            </Tabs>
          }
        </div>
      </MuiThemeProvider>
    );
  }
}
