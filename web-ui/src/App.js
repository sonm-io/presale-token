import React                from 'react';
import MuiThemeProvider     from 'material-ui/styles/MuiThemeProvider';
import CircularProgress     from 'material-ui/CircularProgress';
import {Tabs, Tab}          from 'material-ui/Tabs';
import TextField            from 'material-ui/TextField';

import Const                from './constants';
import API                  from './tokenAPI';
import TokenInfo            from './TokenInfo';
import TokenEvents          from './TokenEvents';
import TokenActions         from './TokenActions';
import './App.css';

const web3 = window.web3;


export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      tokenAddress: Const.DEFAULT_TOKEN_ADDRESS,
      tokenError: null,
      tokenInfo: null,
      tokenEvents: null,
      defaultAccount: null,
    };
  }


  _trackAccountInterval = null;

  componentDidMount() {
    if(!web3)  return;
    this.setState({isLoading: true}, () => {
      API.getTokenInfo(this.state.tokenAddress)
        .then(tokenInfo => {
          this.setState({tokenInfo, defaultAccount: web3.eth.accounts[0]});

          // track account changes
          this._trackAccountInterval = setInterval(() => {
            if (web3.eth.accounts[0] !== this.state.defaultAccount) {
              this.setState({defaultAccount: web3.eth.accounts[0]})
            }
          }, 600);
        })
        .catch(err => {
          console.log('ERROR', err);
          this.setState({tokenError: "Unexpected error, sorry"})
          if(err.INVALID_TOKEN_ADDRESS) {
          } else if(err.INVALID_NETWORK_ID) {
          } else if(err.INVALID_TOKEN_NAME) {
          } else if(err.message) {
          }
        })
    })
  }


  componentWillUnmount() {
    clearInterval(this._trackAccountInterval);
  }



  _setTokenAddress = ev => {
    this.setState(
      {tokenAddress: ev.target.value},
    );
  }


  _changeTab = tab => {
    switch(tab.props.value) {
      case "events": {
        API.getEvents(this.state.tokenInfo)
          .then(tokenEvents => this.setState({tokenEvents}));
        break;
      }
      case "actions": {
        break;
      }
      default:
    }
  }


  _buyTokens = value =>
    API.buyTokens(this.state.tokenAddress, value)
      .then(res => console.log("Buy tokens", res));
  // FIXME: show link to transaction
  // FIXME: refresh token info


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
            errorText={this.state.tokenError}
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
          { // address is not validated yet
            window.web3 && !this.state.tokenInfo && !this.state.tokenError && spinner
          }
          { this.state.tokenInfo &&
            <Tabs>
              <Tab label="Token Info" value="info">
                <TokenInfo info={this.state.tokenInfo} onBuyTokens={this._buyTokens}/>
              </Tab>
              <Tab label="Events" value="events" onActive={this._changeTab}>
                { this.state.tokenEvents
                    ? <TokenEvents events={this.state.tokenEvents}/>
                    : <div>
                      <p>Fetching events is quite a slow operation. Please sit back and relax.</p>
                      { spinner }
                      </div>
                }
              </Tab>
              <Tab label="Actions" value="actions">
                <TokenActions
                  info={this.state.tokenInfo}
                  defaultAccount={this.state.defaultAccount}
                />
              </Tab>
            </Tabs>
          }
        </div>
      </MuiThemeProvider>
    );
  }
}
