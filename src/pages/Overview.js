import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardTitle, CardText, Row, Col, Button } from 'reactstrap';
import { fetchAccounts, fetchPrice } from '../api/apiCalls';

const Overview = () => {
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [showWithBalanceOnly, setShowWithBalanceOnly] = useState(true);
  const [accountPrices, setAccountPrices] = useState({});
  const [totalBalanceUSD, setTotalBalanceUSD] = useState(0);
  const [totalBalanceEUR, setTotalBalanceEUR] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeData = async () => {
      try {
        const data = await fetchAccounts();
        const accountsList = data.accounts || [];

        setAccounts(accountsList);
        setFilteredAccounts(
          accountsList.filter((acc) => parseFloat(acc.available_balance.value) > 0)
        );

        // Fetch prices for all accounts and calculate total balances in USD and EUR
        const prices = {};
        let totalUSD = 0;
        let totalEUR = 0;

        for (const account of accountsList) {
          const currency = account.currency;
          const balance = parseFloat(account.available_balance.value);

          if (balance > 0) {
            const [priceUSD, priceEUR] = await Promise.all([
              fetchPrice(`${currency}-USD`),
              fetchPrice(`${currency}-EUR`),
            ]);

            prices[currency] = { USD: priceUSD, EUR: priceEUR };

            // Add to total balances
            totalUSD += balance * priceUSD;
            totalEUR += balance * priceEUR;
          }
        }

        setAccountPrices(prices);
        setTotalBalanceUSD(totalUSD);
        setTotalBalanceEUR(totalEUR);
      } catch (err) {
        setError(err.message);
      }
    };

    initializeData();
  }, []);

  const toggleShowWithBalanceOnly = () => {
    setShowWithBalanceOnly((prev) => !prev);
    if (!showWithBalanceOnly) {
      setFilteredAccounts(accounts.filter((acc) => parseFloat(acc.available_balance.value) > 0));
    } else {
      setFilteredAccounts(accounts);
    }
  };

  return (
    <div>
 
      {error ? (
        <p style={{ color: 'red' }}>Error: {error}</p>
      ) : (
        <>
          <div className="mb-4">
            <h4>Total Account Balance:</h4>
            <p><strong>USD:</strong> ${totalBalanceUSD.toFixed(2)} -- EURO  €{totalBalanceEUR.toFixed(2)}</p>
            
          </div>
          <Button color="primary" onClick={toggleShowWithBalanceOnly}>
            {showWithBalanceOnly ? 'Show All Accounts' : 'Show Accounts with Balance'}
          </Button>
          <Row className="mt-3">
            {filteredAccounts.length > 0 ? (
              filteredAccounts.map((account) => {
                const balance = parseFloat(account.available_balance.value);
                const priceUSD = accountPrices[account.currency]?.USD || 0;
                const priceEUR = accountPrices[account.currency]?.EUR || 0;
                const balanceUSD = (balance * priceUSD).toFixed(2);
                const balanceEUR = (balance * priceEUR).toFixed(2);

                return (
                  <Col sm="4" key={account.uuid} className="mb-3">
                    <Card>
                      <CardBody>
                        <CardTitle tag="h5">{account.name} ({account.currency})</CardTitle>
                        <CardText>
                          <strong>Available Balance:</strong> {balance} {account.currency}
                        </CardText>
                        <CardText>
                          <strong>Balance in USD:</strong> ${balanceUSD} <br />
                          <strong>Balance in EUR:</strong> €{balanceEUR}
                        </CardText>
                      </CardBody>
                    </Card>
                  </Col>
                );
              })
            ) : (
              <p>No accounts to display.</p>
            )}
          </Row>
        </>
      )}
    </div>
  );
};

export default Overview;
