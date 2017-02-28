import React                from 'react';
import TextField            from 'material-ui/TextField';
import RaisedButton         from 'material-ui/RaisedButton';
import List                 from 'material-ui/List/List';
import ListItem             from 'material-ui/List/ListItem';
import Subheader            from 'material-ui/Subheader';

import IconPerson           from 'material-ui/svg-icons/social/person';
import IconMoney            from 'material-ui/svg-icons/editor/attach-money';
import IconMoneyOff         from 'material-ui/svg-icons/editor/money-off';
import IconBusiness         from 'material-ui/svg-icons/places/business-center';
import {yellow500, grey500} from 'material-ui/styles/colors';

import
  { Table, TableBody, TableRow, TableRowColumn
  } from 'material-ui/Table';


export default function(props) {
  const {info, defaultAccount} = props;

  const row = (name, value) => (
    <TableRow>
      <TableRowColumn style={{width: '31%'}}>{name}</TableRowColumn>
      <TableRowColumn>{value}</TableRowColumn>
    </TableRow>
  );

  const managerIcon = addr =>
    <IconPerson
      color={addr === defaultAccount ? yellow500 : grey500}
    />;

  const isManager = info.tokenManager.managers.includes(defaultAccount);

  const button = (icon, label) =>
    <RaisedButton secondary={true}
      icon={icon}
      label={label}
    />;

  const action = (text1, text2, act) =>
    <ListItem insetChildren={true}
      primaryText={text1}
      secondaryText={text2}
      nestedItems={[
        <ListItem key={0} disabled={true} insetChildren={true}>
          {act}
        </ListItem>
      ]}
    />;

  const pendingActions = [];

  return (
    <div>
      <Table selectable={false}>
        <TableBody displayRowCheckbox={false}>
          {row("Crowdsale address", info.crowdsaleManager.address)}
          {row("Multisig address", info.tokenManager.address)}
          {row("Multisig balance", `${info.tokenManager.balance} ETH`)}
        </TableBody>
      </Table>
      <List>
        <Subheader inset={true}>Presale managers</Subheader>
        { info.tokenManager.managers.map((man, i) =>
          <ListItem key={i} disabled={true}
            leftIcon={managerIcon(man)}
            primaryText={man}
          />
        )}
        { !isManager &&
          <ListItem disabled={true}
            primaryText="You have no power here"
            secondaryText="Only presale managers can execute actions."
          />
        }

        { pending.actions &&
          <Subheader inset={true}>Pending actions</Subheader>
        }

        <Subheader inset={true}>Available actions</Subheader>
        { isManager &&
          action(
            "Start presale",
            "Presale is not running. Investors can't buy tokens yet.",
            button(<IconMoney/>, "Start presale"))
        }
        { isManager &&
          action(
            "Pause presale",
            "You can pause presale to prevent inveestors from buyig tokens.",
            button(<IconMoneyOff/>, "Pause presale"))
        }
        { isManager &&
          action(
            "Withdraw funds to multisig contract",
            "There are some Ether on presale contract.",
            button(<IconBusiness/>, "Withdraw ether"))
        }
      </List>
    </div>
  );
}
