import React, { useEffect, useState } from 'react';
import { ListGroup, ListGroupItem } from 'reactstrap';

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/accounts');
        if (!response.ok) throw new Error(`Error: ${response.status} ${response.statusText}`);
        const data = await response.json();
        setAccounts(data.accounts || []);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchAccounts();
  }, []);

  return (
    <div>
      <h2>Accounts</h2>
      {error ? (
        <p style={{ color: 'red' }}>Error: {error}</p>
      ) : (
        <ListGroup>
          {accounts.map((account) => (
            <ListGroupItem key={account.uuid}>
              <strong>{account.name} ({account.currency})</strong>: 
              Available Balance: {account.available_balance.value} {account.available_balance.currency}
            </ListGroupItem>
          ))}
        </ListGroup>
      )}
    </div>
  );
};

export default Accounts;
