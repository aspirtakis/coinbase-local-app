import React, { useEffect, useState } from 'react';
import { Table, Spinner, Button, Row, Col, Collapse } from 'reactstrap';
import { fetchOrdersForPair } from '../api/apiCalls'; // Replace with actual API call function
import OrderCandlestickChart from './orderCandlestickChart';

const OrderTable = ({ selectedPair }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState('USDC'); // Default base currency
  const [currentPair, setCurrentPair] = useState(selectedPair); // Current trading pair with base currency applied
  const [profitData, setProfitData] = useState({ coins: 0, usd: 0, commissions: 0, netProfit: 0 }); // State to hold profit and commissions
  const [isProfitPanelOpen, setIsProfitPanelOpen] = useState(false); // Toggle for the profit panel
  const [isGrouped, setIsGrouped] = useState(false); // Toggle for grouped/ungrouped orders
  const [groupedOrders, setGroupedOrders] = useState([]); // State for grouped orders by Order ID

  useEffect(() => {
    if (!selectedPair) return; // Avoid making API calls if no pair is selected

    const base = selectedPair.split('-')[0]; // Extract base currency (e.g., "BTC" from "BTC-USD")
    setCurrentPair(`${base}-${baseCurrency}`); // Update current pair with base currency
  }, [selectedPair, baseCurrency]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentPair) return;
      setLoading(true);

      try {
        const response = await fetchOrdersForPair(currentPair); // Fetch orders for the current pair
        setOrders(response.fills || []);
        setIsGrouped(false); // Reset grouping when new data is fetched
      } catch (err) {
        console.error(`Error fetching orders for ${currentPair}:`, err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentPair]);

  const toggleBaseCurrency = () => {
    setBaseCurrency((prev) => (prev === 'USDC' ? 'BTC' : 'USDC'));
  };

  const toggleProfitPanel = () => {
    if (!isProfitPanelOpen) {
      calculateProfitAndCommissions();
    }
    setIsProfitPanelOpen((prev) => !prev);
  };

  const calculateProfitAndCommissions = () => {
    let coins = 0;
    let usd = 0;
    let commissions = 0;

    orders.forEach((order) => {
      const size = parseFloat(order.size);
      const price = parseFloat(order.price);
      const commission = parseFloat(order.commission);

      commissions += commission;

      if (order.side === 'BUY') {
        coins += size; // Add coins purchased
        usd -= size * price; // Subtract USD spent
      } else if (order.side === 'SELL') {
        coins -= size; // Subtract coins sold
        usd += size * price; // Add USD earned
      }
    });

    const netProfit = usd - commissions; // Calculate net profit after deducting commissions
    setProfitData({
      coins: coins.toFixed(6),
      usd: usd.toFixed(2),
      commissions: commissions.toFixed(2),
      netProfit: netProfit.toFixed(2),
    });
  };

  const toggleGroupOrders = () => {
    if (isGrouped) {
      // If grouped, reset to original orders
      setIsGrouped(false);
    } else {
      // Group orders by Order ID
      const grouped = orders.reduce((acc, order) => {
        const orderId = order.order_id;
        if (!acc[orderId]) {
          acc[orderId] = {
            order_id: orderId,
            trade_ids: [order.trade_id],
            time: order.trade_time,
            side: order.side,
            totalPrice: 0,
            totalSize: 0,
            totalCommission: 0,
          };
        }
        acc[orderId].totalPrice += parseFloat(order.price) * parseFloat(order.size);
        acc[orderId].totalSize += parseFloat(order.size);
        acc[orderId].totalCommission += parseFloat(order.commission);
        return acc;
      }, {});

      const groupedArray = Object.values(grouped).map((group) => ({
        ...group,
        averagePrice: (group.totalPrice / group.totalSize).toFixed(2), // Calculate average price
      }));

      setGroupedOrders(groupedArray);
      setIsGrouped(true);
    }
  };

  return (
    <div>
      <Row className="mb-3">
        <Col sm="4">
          <h5>
            Orders for {currentPair} ({baseCurrency})
          </h5>
        </Col>
        <Col sm="8" className="text-right">
          <Button color="primary" onClick={toggleBaseCurrency}>
            {baseCurrency === 'BTC' ? 'BTC' : 'USDC'}
          </Button>{' '}
          <Button color="success" onClick={toggleProfitPanel}>
            {isProfitPanelOpen ? 'Hide Profit Panel' : 'Show Profit Panel'}
          </Button>{' '}
          <Button color="info" onClick={toggleGroupOrders}>
            {isGrouped ? 'Ungroup Orders' : 'Group by Order ID'}
          </Button>
        </Col>
      </Row>
{isProfitPanelOpen && 
        <OrderCandlestickChart pair={currentPair} orders={orders} timeframe={3600} />}
  

      <Collapse isOpen={isProfitPanelOpen}>
        <div className="mb-3">
          <strong>Profit:</strong> {profitData.coins} {currentPair.split('-')[0]} ({profitData.usd} USD)
          <br />
          <strong>Commissions:</strong> ${profitData.commissions}
          <br />
          <strong>Net Profit (after commissions):</strong> ${profitData.netProfit}
        </div>
      </Collapse>

      {loading ? (
        <Spinner color="primary" />
      ) : isGrouped ? (
        <div className="mb-3">
   
          <Table striped>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Trade IDs</th>
                <th>Time</th>
                <th>Side</th>
                <th>Average Price</th>
                <th>Total Size</th>
                <th>Total Commission</th>
              </tr>
            </thead>
            <tbody>
              {groupedOrders.map((order, index) => (
                <tr key={index}>
                  <td>{order.order_id}</td>
                  <td>{order.trade_ids.join(', ')}</td>
                  <td>{new Date(order.time).toLocaleString()}</td>
                  <td>{order.side}</td>
                  <td>${order.averagePrice}</td>
                  <td>{order.totalSize.toFixed(6)}</td>
                  <td>${order.totalCommission.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : (
        <Table striped>
          <thead>
            <tr>
              <th>Trade ID</th>
              <th>Order ID</th>
              <th>Time</th>
              <th>Side</th>
              <th>Price</th>
              <th>Size</th>
              <th>Commission</th>
              <th>Liquidity</th>
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order.entry_id}>
                  <td>{order.trade_id}</td>
                  <td>{order.order_id}</td>
                  <td>{new Date(order.trade_time).toLocaleString()}</td>
                  <td>{order.side}</td>
                  <td>${parseFloat(order.price).toFixed(2)}</td>
                  <td>{parseFloat(order.size).toFixed(6)}</td>
                  <td>${parseFloat(order.commission).toFixed(2)}</td>
                  <td>{order.liquidity_indicator}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default OrderTable;
