import React, { useState, useEffect } from 'react';
import { Table, Button, Row, Col } from 'reactstrap';
import TradePanel from './TradePanel'; // Import TradePanel

const AccountTable = ({ accounts, prices, onRowClick }) => {
  const [selectedTrade, setSelectedTrade] = useState(null); // Track selected trade details
  const [showAllBalances, setShowAllBalances] = useState(false); // Track whether to show all balances
  const [portfolio, setPortfolio] = useState([]); // Track filtered accounts

  useEffect(() => {
    // Update portfolio based on the `showAllBalances` toggle
    if (showAllBalances) {
      // Show all accounts
      setPortfolio(accounts);
    } else {
      // Filter accounts with available_balance.value * usdcValue > 2
      const filteredAccounts = accounts.filter((account) => {
        const balance = parseFloat(account.available_balance.value);
        const balanceUSD = account.usdcValue; // Calculate balance in USD
        return balanceUSD > 2; // Only include if balance in USD > 2
      });
      setPortfolio(filteredAccounts);
    }
  }, [accounts, showAllBalances]);

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
        <Col
          sm="12"
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #ddd',
          }}
        >
          <Table striped>
            <thead>
              <tr>
                <th>Currency</th>
                <th>Balance</th>
                <th>Balance in USD</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {portfolio &&
                portfolio.map((account) => {
                  const balance = parseFloat(account.available_balance.value);
                  const balanceUSD = account.usdcValue;

                  return (
                    <tr
                      key={account.uuid}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onRowClick(account.currency, balance)}
                    >
                      <td>{account.currency}</td>
                      <td>{balance.toFixed(8)}</td>
                      <td>${Number(balanceUSD).toFixed(2)}</td>
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

        {/* Show All / Filter Button */}
        <Button
          onClick={() => setShowAllBalances((prev) => !prev)}
          style={{ marginTop: '10px' }}
        >
          {showAllBalances ? 'Show Filtered' : 'Show All'}
        </Button>
      </Row>
    </>
  );
};

export default AccountTable;
