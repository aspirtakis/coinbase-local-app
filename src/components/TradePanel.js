import React, { useState, useEffect } from 'react';
import { Form, FormGroup, Label, Input, Button, Col, Row } from 'reactstrap';
import { handleTrade } from '../api/apiCalls';
import NotificationToast from './ToastNotificator';
const TradePanel = ({ tradeDetails, refresh }) => {
  const [currentTrade, setCurrentTrade] = useState(tradeDetails);
  const [toast, setToast] = useState({ visible: false, message: '', status: '' }); // Toast state

  // Sync local state with tradeDetails prop when it changes
  useEffect(() => {
    setCurrentTrade(tradeDetails);
  }, [tradeDetails]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentTrade((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const executeTrade = async (side) => {
    const { pair, amount } = currentTrade;

    const adjustedAmount = amount * 0.2; // Remove 0.1%


    try {
      const response = await handleTrade(pair, side, Number(adjustedAmount).toFixed(2));
      if (response.success) {
        setToast({
          visible: true,
          message: `Trade executed successfully! Order ID: ${response.success_response.order_id}`,
          status: 'success',
        });
        // Reset fields
        setCurrentTrade({ pair: '', amount: '' });
        refresh()
      } else {
        setToast({
          visible: true,
          message: 'Trade execution failed.',
          status: 'error',
        });
        refresh()
      }
    } catch (error) {
      setToast({
        visible: true,
        message: 'An error occurred while executing the trade.',
        status: 'error',
      });
      refresh()
      console.error(error);
    }
  };

  return (
    <div>

      <Form>
        <FormGroup>
          <Row>
            <Col sm="4">
              <Label for="pair">Pair</Label>
              <Input
                type="text"
                name="pair"
                id="pair"
                value={currentTrade?.pair || ''}
                onChange={handleInputChange}
              />
            </Col>
            <Col sm="">
              <Label for="amount">Amount</Label>
              <Input
                type="number"
                name="amount"
                id="amount"
                placeholder="Enter amount"
                value={currentTrade?.amount || ''}
                onChange={handleInputChange}
              />
            </Col>
            <Col style={{marginTop:30}} sm="2">
              <Button color="danger" onClick={() => executeTrade('SELL')}>
                SELL
              </Button>

            </Col>
            <Col  style={{marginTop:30}} sm="2">        <Button color="success" onClick={() => executeTrade('BUY')}>
              BUY
            </Button></Col>
          </Row>
        </FormGroup>


      </Form>

      <NotificationToast
        message={toast.message}
        status={toast.status}
        visible={toast.visible}
        onClose={() => setToast({ visible: false, message: '', status: '' })}

      />
    </div>
  );
};

export default TradePanel;
