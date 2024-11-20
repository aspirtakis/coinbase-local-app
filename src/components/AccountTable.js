import React, { useState } from 'react';
import { Table, Button, Row, Col } from 'reactstrap';
import TradePanel from './TradePanel'; // Import TradePanel

const AccountTable = ({ accounts, prices,onRowClick,refresh}) => {
  const [selectedTrade, setSelectedTrade] = useState(null); // Track selected trade details

  const handleTradeClick = (baseCurrency, account) => {
    const balance = parseFloat(account.available_balance.value);
    const pair = `${account.currency}-${baseCurrency}`;

    setSelectedTrade({
      pair,
      amount: balance.toFixed(2), // Prefill the balance in the trade panel
    });
  };




  return (
    <>
      <Row>
        <Col sm="8">
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
                  <tr key={account.uuid} style={{ cursor: 'pointer' }}
                  onClick={() => {
                    console.log(account.currency)
                     onRowClick(account.currency)
                  }
                    
                    }>
                    <td>{account.currency}</td>
                    <td>{balance.toFixed(2)}</td>
                    <td>${balanceUSD}</td>
                    <td>${priceUSD.toFixed(2)}</td>
                    <td>
                      <Button
                        color="warning"
                        size="sm"
                        onClick={() => handleTradeClick('USDC', account)}
                      >
                        To USDC
                      </Button>{' '}
                      <Button
                        color="primary"
                        size="sm"
                        onClick={() => handleTradeClick('BTC', account)}
                      >
                        To BTC
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Col>
        {selectedTrade && (
          <Col sm="4">
            <TradePanel
              tradeDetails={selectedTrade}
              refresh={refresh}
            />
          </Col>
        )}
      </Row>
    </>
  );
};

export default AccountTable;
