import React, { useState,useEffect } from 'react';
import { Table, Button, Row, Col } from 'reactstrap';
import TradePanel from './TradePanel'; // Import TradePanel

const AccountTable = ({ accounts, prices,onRowClick,setusdc}) => {
  const [selectedTrade, setSelectedTrade] = useState(null); // Track selected trade details
  const [shoallbalance, setShowAllbalances] = useState(false); // Track selected trade details
  const [portfolio, setPortfolio] = useState([]); // Track selected trade details
  
  
  const handleTradeClick = (baseCurrency, account) => {
    const balance = parseFloat(account.available_balance.value);
    const pair = `${account.currency}-${baseCurrency}`;

    setSelectedTrade({
      pair,
      amount: balance.toFixed(2), // Prefill the balance in the trade panel
    });
  };


  useEffect(() => {

    const accountusds= accounts.filter((acc) => acc.currency === "USDC")
    
    setusdc(accountusds);
    const updatedPortfolio = shoallbalance
      ? accounts // Show all balances if `shoallbalance` is true
      : accounts.filter((account) => {
          const balance = parseFloat(account.available_balance.value);
          const priceUSD = prices[account.currency]?.USDC || 0;
          const balanceUSD = balance * priceUSD;
          return balanceUSD > 1; // Only include accounts with balance > $1
        });
  
    setPortfolio(updatedPortfolio);
  }, [shoallbalance, accounts, prices]); // Include `shoallbalance`, `accounts`, and `prices` in the dependency array
  

  return (
    <>
      <Row>

        <Col sm="12" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd' }}>
          <Table striped >
   
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
              {portfolio.map((account) => {
                const balance = parseFloat(account.available_balance.value);
                const priceUSD = prices[account.currency]?.USDC || 0;
                const balanceUSD = (balance * priceUSD).toFixed(2);

                return (
                  <tr key={account.uuid} style={{ cursor: 'pointer' }}
                  onClick={() => {

                     onRowClick(account.currency,balance)
                  }
                    
                    }>
                    <td>{account.currency}</td>
                    <td>{balance.toFixed(8)}</td>
                    <td>${balanceUSD}</td>
                    <td>${Number(priceUSD).toFixed(2)}</td>
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

        <Button onClick={() => setShowAllbalances((prev) => !prev)}>
  {shoallbalance ? "Hide All" : "Show All"}
</Button>

      </Row>
    </>
  );
};

export default AccountTable;
