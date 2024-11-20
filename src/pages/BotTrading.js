import React, { useState, useEffect } from 'react';
import { Button, Input, Row, Col, Table } from 'reactstrap';
import ReactECharts from 'echarts-for-react';
import { fetchCandleData, fetchOrdersForPair, fetchPrice, listProducts } from '../api/apiCalls';
import { calculateRSI, calculateEMA } from '../utils/indicators';
import { handleFetchPrice, handleFetchOrders } from '../utils/tradingUtils';
import ADXGauge from '../components/GausesAdx';
import CompositeTrendGauges from '../components/TrendGauses';
import { calculateCompositeTrend, calculateTrend, calculateSupportResistanceFibonacci, executeScalpingStrategy } from '../utils/tradingUtils'
import TradePanel from '../components/TradePanel';
import { detectATRSignal } from '../utils/tradingUtils';
import { detectBollingerBandsSignal } from '../utils/tradingUtils';
import { multipleTimeframeAnalysis } from '../utils/tradingUtils';
import { detectReversalEntrySignal } from '../utils/tradingUtils';
import { detectCandlestickReversalSignal } from '../utils/tradingUtils';

const BotTrading = () => {
  const [pair, setPair] = useState('BTC-USDC');
  const [pairtype, setPairtype] = useState('BTC-USDC');
  const [candlesH1, setCandlesH1] = useState([]);
  const [mergedBuyOrders, setMergedBuyOrders] = useState([]);
  const [latestPrice, setLatestPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [botActive, setBotActive] = useState(false);
  const [direction, setDirection] = useState("");
  const [trendStrength, settrendStrength] = useState("");
  const [Srlevels, setSrlevels] = useState();
  const [frame, setFrame] = useState(3600);
  const [signals, setSignals] = useState([]); // State to store the list of signals
  const [OpenTrade, setOpenTrade] = useState(false); // State to store the list of signals

  useEffect(() => {
    let interval;
    if (botActive) {
      setLoading(true);
      interval = setInterval(() => {
        handleFetchData();
        handleFetchOrders(pair).then((res) => setMergedBuyOrders(res));
        handleFetchPrice(pair).then((res) => setLatestPrice(res));
        calculateSupportResistanceFibonacci(pair, frame).then(res => setSrlevels(res))
        calculateTrend(pair, frame).then(res => {
          setDirection(res.trendDirection)
          settrendStrength(res.trendStrength)
        }
        )
        setLoading(false);
      }, 15000);
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [botActive, pair]);

  const refresh = () => {
    handleFetchData();
    handleFetchOrders(pair).then((res) => setMergedBuyOrders(res));
    handleFetchPrice(pair).then((res) => setLatestPrice(res));
    calculateSupportResistanceFibonacci(pair, frame).then(res => setSrlevels(res));
    calculateTrend(pair, frame).then(res => {
      setDirection(res.trendDirection)
      settrendStrength(res.trendStrength)
    })
  }


  const handleFetchData = async () => {
    try {
      const candles = await fetchCandleData(pair, frame); // Fetch H1 candles
      setCandlesH1(candles);
    } catch (error) {
      console.error('Error fetching H1 data:', error.message);
    }
  };
  const toggleBot = () => setBotActive((prevState) => !prevState);
  const toggleTrade = () => setOpenTrade((prevState) => !prevState);
  const generateCandleChartOptions = (supportResistance) => {
    if (candlesH1.length === 0) return {};

    const candlestickData = candlesH1
      .map((c) => [parseFloat(c.open), parseFloat(c.close), parseFloat(c.low), parseFloat(c.high)])
      .reverse();

    const timeData = candlesH1.map((c) => new Date(c.time).toLocaleTimeString()).reverse();

    const { support, resistance } = supportResistance || {};

    const markLines = [];

    // Add Support and Resistance lines if they exist
    if (support) {
      markLines.push({
        yAxis: support,
        name: 'Support',
        lineStyle: { color: '#f46a6a', type: 'dashed' },
      });
    }
    if (resistance) {
      markLines.push({
        yAxis: resistance,
        name: 'Resistance',
        lineStyle: { color: '#34c38f', type: 'dashed' },
      });
    }

    return {
      title: { text: `H1 Candlestick Chart for ${pair}`, left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: timeData,
      },
      yAxis: { type: 'value', scale: true },
      dataZoom: [
        { type: 'slider', start: 0, end: 100 }, // Add zoom slider at the bottom
        { type: 'inside', start: 0, end: 100 }, // Add zoom functionality for scroll/pinch
      ],
      series: [
        {
          name: 'Candlestick',
          type: 'candlestick',
          data: candlestickData,
          itemStyle: {
            color: '#34c38f',
            color0: '#f46a6a',
            borderColor: '#34c38f',
            borderColor0: '#f46a6a',
          },
          markLine: {
            data: markLines,
          },
        },
      ],
    };
  };

  const handleCloseOrder = (orderId) => alert(`Closing order: ${orderId}`);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent default action if needed (like form submission)
      setPair(pairtype); // Optionally clear the input after Enter
      refresh()
    }
  };

  // const tradeNow = () => {
  //   // calculateCompositeTrend(pair).then(res => console.log(res))
  //   // calculateTrend(pair,frame).then(res => console.log(res))
  //   // calculateSupportResistanceFibonacci(pair,frame).then(res => console.log(res))
  //   // executeScalpingStrategy(pair,frame).then(res => console.log(res))
  //   listProducts().then(res => console.log(res))
  // }




  const tradeNow = async () => {
    try {
      const response = await listProducts();
      if (!response || !response.products) {
        console.error('No products found');
        return;
      }
      const products = response.products.filter((product) =>
        product.product_id.endsWith('-USDC')
      );

      const timeframe = frame;
      const signalsList = []; // Temporary array to hold signals

      for (const product of products) {
        try {
          // Execute scalping strategy for each product
          const result = await executeScalpingStrategy(product.product_id, timeframe);
          if (result && result.signal !== 'None') {
            signalsList.push(result); // Add valid signal to the array
          }
        } catch (error) {
          console.error(`Error processing data for ${product.product_id}:`, error.message);
        }
      }

      // Update the state with the signals after processing all products
      setSignals(signalsList);
    } catch (error) {
      console.error('Error fetching product list:', error.message);
    }
  };



const checkATRSignal = async () => {

  try {
    const response = await listProducts();
    if (!response || !response.products) {
      console.error('No products found');
      return;
    }
    const products = response.products.filter((product) =>
      product.product_id.endsWith('-USDC')
    );

    const timeframe = frame;
    const signalsList = []; // Temporary array to hold signals

    for (const product of products) {
      try {
        // Execute scalping strategy for each product
        const result = await detectATRSignal(product.product_id, timeframe);
        if (result && result.signal !== 'None') {
          signalsList.push(result); // Add valid signal to the array
        }


      } catch (error) {
        console.error(`Error processing data for ${product.product_id}:`, error.message);
      }
    }

    // Update the state with the signals after processing all products
    setSignals([])
    setSignals(signalsList);
  } catch (error) {
    console.error('Error fetching product list:', error.message);
  }


};






const checkBollingerBandsSignal = async () => {
  try {
    const response = await listProducts();
    if (!response || !response.products) {
      console.error('No products found');
      return;
    }
    const products = response.products.filter((product) =>
      product.product_id.endsWith('-USDC')
    );

    const timeframe = frame;
    const signalsList = []; // Temporary array to hold signals

    for (const product of products) {
      try {
        // Execute scalping strategy for each product
        const result = await detectBollingerBandsSignal(product.product_id, timeframe);
        if (result && result.signal !== 'None') {
          signalsList.push(result); // Add valid signal to the array
        }
      } catch (error) {
        console.error(`Error processing data for ${product.product_id}:`, error.message);
      }
    }
    // Update the state with the signals after processing all products
    setSignals([])
    setSignals(signalsList);
  } catch (error) {
    console.error('Error fetching product list:', error.message);
  }


};

const runMultipleTimeframeAnalysis = async () => {
  try {
    const response = await listProducts();
    if (!response || !response.products) {
      console.error('No products found');
      return;
    }
    const products = response.products.filter((product) =>
      product.product_id.endsWith('-USDC')
    );

    const timeframe = frame;
    const signalsList = []; // Temporary array to hold signals

    for (const product of products) {
      try {
        // Execute scalping strategy for each product
        const result = await multipleTimeframeAnalysis(product.product_id);
        if (result && result.signal !== 'None') {
          signalsList.push(result); // Add valid signal to the array
        }
      } catch (error) {
        console.error(`Error processing data for ${product.product_id}:`, error.message);
      }
    }
    // Update the state with the signals after processing all products
    setSignals([])
    setSignals(signalsList);
  } catch (error) {
    console.error('Error fetching product list:', error.message);
  }


};

const runReversalSignalDetection = async () => {
  try {
    const response = await listProducts();
    if (!response || !response.products) {
      console.error('No products found');
      return;
    }
    const products = response.products.filter((product) =>
      product.product_id.endsWith('-USDC')
    );
    const timeframe = frame;
    const signalsList = []; // Temporary array to hold signals
    for (const product of products) {
      try {
        const result = await detectReversalEntrySignal(product.product_id,timeframe);
        if (result && result.signal !== 'None') {
          signalsList.push(result); // Add valid signal to the array
        }
      } catch (error) {
        console.error(`Error processing data for ${product.product_id}:`, error.message);
      }
    }
    setSignals([])
    setSignals(signalsList);
  } catch (error) {
    console.error('Error fetching product list:', error.message);
  }
};




const runCandleSignalDetection = async () => {
  try {
    const response = await listProducts();
    if (!response || !response.products) {
      console.error('No products found');
      return;
    }
    const products = response.products.filter((product) =>
      product.product_id.endsWith('-USDC')
    );
    const timeframe = frame;
    const signalsList = []; // Temporary array to hold signals
    for (const product of products) {
      try {
        const result = await detectCandlestickReversalSignal(product.product_id,timeframe);
        if (result && result.signal !== 'None') {
          signalsList.push(result); // Add valid signal to the array
        }
      } catch (error) {
        console.error(`Error processing data for ${product.product_id}:`, error.message);
      }
    }
    setSignals([])
    setSignals(signalsList);
  } catch (error) {
    console.error('Error fetching product list:', error.message);
  }
};


  return (
    <div>
      <h2>{pair}---{latestPrice} -- TREND : {direction} -- Power:{Number(trendStrength).toFixed(2)}</h2>
      <Row> RESISTEANCE :{Srlevels && Srlevels.resistance}    --- SUPPORT : {Srlevels && Srlevels.support}</Row>
      <Row> Fib23UP--{Srlevels && Srlevels.extensions[0].level} DOWN: {Srlevels && Srlevels.retracements[0].level}</Row>



      <Row className="mb-4">

        <Col sm="4">
          <Input
            type="text"
            value={pairtype}
            onChange={(e) => setPairtype(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Press Enter to submit"
          />
        </Col>
        <Col sm="4">
          <Input
            type="select"
            value={frame}
            onChange={(e) => {
              setFrame(Number(e.target.value))
              refresh()   
            }} // Convert the value to a number
          >
            <option value={300}>M5 (5 Minutes)</option>
            <option value={900}>M15 (15 Minutes)</option>
            <option value={1800}>M30 (1 Hour)</option>
            <option value={3600}>H1 (1 Hour)</option>
            <option value={21600}>H6 (6 Hours)</option>
            <option value={86400}>D1 (1 Day)</option>
          </Input>
        </Col>
        <Col sm="2">
          <Button color={botActive ? 'danger' : 'primary'} onClick={toggleBot}>
            {botActive ? 'Stop Bot' : 'Start Bot'}
          </Button>
        </Col>
        <Col sm="2">
          <Button style={{ maxWidth: 200 }} onClick={() => tradeNow()}>Scalping Sgnals</Button>
          <Button style={{ maxWidth: 200 }} onClick={() => checkATRSignal()}>ATR Signals</Button>
          <Button style={{ maxWidth: 200 }} onClick={() => checkBollingerBandsSignal()}>Bolinger Signals</Button>
          <Button style={{ maxWidth: 200 }} onClick={() => runMultipleTimeframeAnalysis()}>MF Signals</Button>
          <Button style={{ maxWidth: 200 }} onClick={() => runReversalSignalDetection()}>Reversals Signals</Button>
          <Button style={{ maxWidth: 200 }} onClick={() => runCandleSignalDetection()}>Candle Rev Signals</Button>
          <Button style={{ maxWidth: 200 }} onClick={() => toggleTrade()}>TradePanel</Button>
        </Col>
      </Row>

      <Row>
        <Col>
          <Row>
            <ADXGauge pair={pair} ></ADXGauge>
          </Row>
          <Row>
            <CompositeTrendGauges pair={pair}></CompositeTrendGauges>
          </Row>

        </Col>
        {OpenTrade &&
          <Col>
            <TradePanel tradeDetails={{ pair: pair, ammount: 0 }} refresh={() => refresh()}></TradePanel>
          </Col>}
        {!OpenTrade &&
          <Col>
            <ReactECharts option={generateCandleChartOptions()} style={{ height: 400 }} />
          </Col>}
      </Row>


      <hr />


      <hr />
      <div>
        <h4>Latest BUY Orders (Merged by Order ID):</h4>
        {mergedBuyOrders.length > 0 ? (
          <Table striped>
            <thead>
              <tr>
                <th>PAIR</th>
                <th>Price</th>
                <th>Trade Time</th>
                <th>Amount</th>
                <th>Commission</th>
                <th>Profit (Net)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mergedBuyOrders.map((order) => {
                const profit = latestPrice ? (latestPrice - order.price) * order.amount : 0;
                const netProfit = profit - order.commission;
                const isProfit = netProfit > 0;

                return (
                  <tr key={order.id}>
                    <td>{pair}</td>
                    <td>${order.price.toFixed(2)}</td>
                    <td>{order.tradeTime}</td>
                    <td>{order.amount.toFixed(2)}</td>
                    <td>${order.commission.toFixed(2)}</td>
                    <td style={{ color: isProfit ? 'green' : 'red' }}>
                      {isProfit ? '+' : ''}
                      ${netProfit.toFixed(2)}
                    </td>
                    <td>
                      {isProfit && (
                        <Button
                          color="success"
                          size="sm"
                          onClick={() => handleCloseOrder(order.orderId)}
                        >
                          Close Order
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <p>No BUY orders found for this pair.</p>
        )}
      </div>
      <div>
        <h3>Signals Scalping</h3>
        {signals.length > 0 ? (
          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd' }}>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Pair</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((signal, index) => (
                  <tr
                    key={index}
                    onClick={() => {
                      setPair(signal.pair)
                      setPairtype(signal.pair)
                      refresh()
                    }


                    }
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{signal.pair}</td>
                    <td>{signal.signal}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <p>No valid signals found.</p>
        )}
      </div>

    </div>
  );
};

export default BotTrading;
