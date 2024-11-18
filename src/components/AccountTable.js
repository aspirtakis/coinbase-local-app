import React from 'react';
import { Table, Button } from 'reactstrap';

const AccountTable = ({ accounts, prices, handleTrade, onRowClick }) => {
  return (
    <Table striped>
      <thead>
        <tr>
          <th>Currency</th>
          <th>Balance</th>
          <th>Balance in USD</th>
          <th>Price (USD)</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {accounts.map((account) => {
          const balance = parseFloat(account.available_balance.value);
          const priceUSD = prices[account.currency]?.USD || 0;
          const balanceUSD = (balance * priceUSD).toFixed(2);

          return (
            <tr
              key={account.uuid}
              onClick={() => onRowClick(account.currency)} // Row click handler
              style={{ cursor: 'pointer' }}
            >
              <td>{account.currency}</td>
              <td>{balance.toFixed(2)}</td>
              <td>${balanceUSD}</td>
              <td>${priceUSD.toFixed(2)}</td>
              <td>
                <Button
                  color="warning"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click event
                    handleTrade('USD', account.currency);
                  }}
                >
                  SELL to USD
                </Button>{' '}
                <Button
                  color="primary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click event
                    handleTrade('BTC', account.currency);
                  }}
                >
                  SELL to BTC
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
};

export default AccountTable;
