import React, { useEffect, useState } from 'react';
import { Row, Col, Label, Form, FormGroup, Input, Button } from 'reactstrap';
import { fetchAccounts, fetchPrice } from '../api/apiCalls';
import AccountTable from '../components/AccountTable'; // Import AccountTable
import HeaderTools from '../components/HeaderTools'; // Import HeaderTools

import OrderTable from '../components/OrderTable';

const Trading = () => {
  const [accounts, setAccounts] = useState([]);
  const [prices, setPrices] = useState({});
  const [selectedPair, setSelectedPair] = useState(null); // Track selected trading pair
  const [error, setError] = useState(null);
  const [refresh,setRefresh] = useState(false)

  // Fetch accounts and prices on component mount

  const initializeData = async () => {
    try {
      const data = await fetchAccounts();
      const accountsList = data.accounts || [];
      const withBalance = accountsList.filter(
        (acc) => parseFloat(acc.available_balance.value) > 0
      );

      setAccounts(withBalance);

      // Fetch prices for all accounts
      const priceData = {};
      for (const account of withBalance) {
        const currency = account.currency;
        const priceUSD = await fetchPrice(`${currency}-USD`);
        priceData[currency] = { USD: priceUSD };
      }

      setPrices(priceData);
      setRefresh(false)
    } catch (err) {
      setError(err.message);
    }
  };


  useEffect(() => {
    initializeData();
  }, []);
  useEffect(() => {
    initializeData();
  }, [refresh]);

  const handleRowClick = (currency) => {
    // Set the selected trading pair for the candlestick chart
    setSelectedPair(`${currency}-USDC`);
  };



  return (
    <div>
      {error ? (
        <p style={{ color: 'red' }}>Error: {error}</p>
      ) : (
        <>
          {/* Header with pie chart and balances */}
      {/* <Button onClick={() => setRefresh(true)}>Refresh</Button> */}

          <HeaderTools
            selectedPair={selectedPair}
            accounts={accounts.map((account) => ({
              name: account.currency,
              usdValue: parseFloat(account.available_balance.value) * (prices[account.currency]?.USD || 0),
            }))}
          />
   
          <Row>
            <Col sm="12">
              {/* Account table */}
              <AccountTable
                accounts={accounts}
                prices={prices}
                refresh={() =>setRefresh(true)}
                onRowClick={handleRowClick}
              />
            </Col>
            {selectedPair && <OrderTable selectedPair={selectedPair} />}
            <Col></Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default Trading;
