import React                from 'react';
import CircularProgress     from 'material-ui/CircularProgress';
import TextField            from 'material-ui/TextField';
import
  { Table, TableBody, TableRow, TableRowColumn
  } from 'material-ui/Table';

import PresaleToken_json    from '../build/contracts/PresaleToken';
import TokenManager_json    from '../build/contracts/TokenManager';
import Truffle              from 'truffle-contract';


const PresaleToken = Truffle(PresaleToken_json);
const TokenManager = Truffle(TokenManager_json);
const web3 = window.web3;
if(web3) {
  PresaleToken.setProvider(web3.currentProvider);
  TokenManager.setProvider(web3.currentProvider);
}


export default class TokenInfo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      info: null,
      isLoading: true
    }
  }

  componentDidMount() {
    this._loadInfo();
  }

  _loadInfo = () => {
    const t = PresaleToken.at(this.props.presaleToken);
    Promise.all(
      [ t.name.call()
      , t.symbol.call()
      , Promise.resolve(200) // FIXME: t.PRICE.call()
      , t.totalSupply.call()
      , t.tokenManager.call()
      , t.currentPhase.call()
      ]
    ).then(([name, symbol, price, supply, mgr, phase]) => {
      const info = {
        name, symbol, price,
        tokenManager: mgr,
        currentPhase: phase.toNumber(),
        supply: web3.fromWei(supply, "ether").toNumber(),  // FIXME: use decimals
      };
      this.setState({isLoading: false, info});
    })
  }

  render() {
    const {info} = this.state;
    const row = (name, value) => (
      <TableRow>
        <TableRowColumn>{name}</TableRowColumn>
        <TableRowColumn>{value}</TableRowColumn>
      </TableRow>
    );

    const phaseBlock =
      [ <p><b>Presale is not yet started.</b> Please check this page later.</p>
      , <div>
          <p><b>Presale is in progress.</b> You can buy some tokens here.</p>
          <p> Buy tokens </p>
        </div>
      , <p><b>Presale is paused.</b> Please come back later.</p>
      , <p><b>Presale is over.</b> You can now migrate your tokens.</p>
      , <p><b>Presale is over.</b> Migration is over too.</p>
      ]

    return (
      <div>
        { this.state.isLoading &&
          <CircularProgress
             size={80} thickness={5}
             style={{display: 'block', margin: '20px auto'}}
          />
        }
        { this.state.info &&
          <Table selectable={false}>
            <TableBody displayRowCheckbox={false}>
              {row("Name", info.name)}
              {row("Symbol", info.symbol)}
              {row("Price", `${info.price} ${info.symbol} per 1 ETH`)}
              {row("Total supply", `${info.supply} ${info.symbol}`)}
            </TableBody>
          </Table>
        }
        { this.state.info && phaseBlock[this.state.info.currentPhase] }
      </div>
    );
  }
}
