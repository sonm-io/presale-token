import React                from 'react';
import TextField            from 'material-ui/TextField';
import RaisedButton         from 'material-ui/RaisedButton';
import List                 from 'material-ui/List/List';
import ListItem             from 'material-ui/List/ListItem';
import Subheader            from 'material-ui/Subheader';

import IconPerson           from 'material-ui/svg-icons/social/person';
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

  const isManager = info.managers.includes(defaultAccount);

  return (
    <div>
      <Table selectable={false}>
        <TableBody displayRowCheckbox={false}>
          {row("Multisig address", info.address)}
          {row("Balance", `${info.balance} ETH`)}
        </TableBody>
      </Table>
      <List>
        <Subheader inset={true}>Presale managers</Subheader>
        { info.managers.map((man, i) =>
          <ListItem key={i} disabled={true} leftIcon={managerIcon(man)}>
            {man}
          </ListItem>)
        }
        <Subheader inset={true}>Available actions</Subheader>
        { !isManager &&
          <ListItem
            disabled={true}
            primaryText="You have no power here"
            secondaryText="Only presale managers can execute actions."
          />
        }
        { isManager &&
          <ListItem />
        }
      </List>
    </div>
  );
}
