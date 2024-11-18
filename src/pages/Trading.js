import React, { useEffect, useState } from 'react';
import { Row, Col } from 'reactstrap';
import { fetchAccounts, fetchPrice } from '../api/apiCalls';
import AccountTable from '../components/AccountTable';
import HeaderTools from '../components/HeaderTools';

const Trading = () => {
  const [accounts, setAccounts] = useState([]);
  const [prices, setPrices] = useState({});
  const [selectedPair, setSelectedPair] = useState(null); // Track selected trading pair
  const [error, setError] = useState(null);

  // Fetch accounts and prices on component mount
  useEffect(() => {
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
      } catch (err) {
        setError(err.message);
      }
    };

    initializeData();
  }, []);

  const handleRowClick = (currency) => {
    // Set the selected trading pair for the candlestick chart
    setSelectedPair(`${currency}-USD`);
  };

  const handleTrade = (baseCurrency, quoteCurrency) => {
    console.log(`Trading ${quoteCurrency} to ${baseCurrency}`);
    // Add trading logic here
  };

  return (
    <div>

      {error ? (
        <p style={{ color: 'red' }}>Error: {error}</p>
      ) : (
        <>
          {/* Header with pie chart and balances */}
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
                handleTrade={handleTrade}
                onRowClick={handleRowClick}
              />
            </Col>
          </Row>

        </>
      )}
    </div>
  );
};

export default Trading;
