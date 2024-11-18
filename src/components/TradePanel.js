import React from 'react';
import { Form, FormGroup, Label, Input, Button } from 'reactstrap';

const TradePanel = ({ tradeDetails, handleInputChange, executeTrade }) => {
  return (
    <div>
      <h5>Trade Panel</h5>
      <Form>
        <FormGroup>
          <Label for="pair">Pair</Label>
          <Input
            type="text"
            name="pair"
            id="pair"
            value={tradeDetails.pair}
            readOnly
          />
        </FormGroup>
        <FormGroup>
          <Label for="amount">Amount</Label>
          <Input
            type="number"
            name="amount"
            id="amount"
            placeholder="Enter amount"
            value={tradeDetails.amount}
            onChange={handleInputChange}
          />
        </FormGroup>
        <Button color="danger" onClick={() => executeTrade('SELL')}>
          SELL
        </Button>{' '}
        <Button color="success" onClick={() => executeTrade('BUY')}>
          BUY
        </Button>
      </Form>
    </div>
  );
};

export default TradePanel;
