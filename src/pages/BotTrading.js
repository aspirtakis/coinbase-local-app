import React, { useState, useEffect } from 'react';
import { Button, Input, Row, Col, Table, ButtonGroup, Spinner, Label } from 'reactstrap';
import ReactECharts from 'echarts-for-react';
import { fetchCandleData, fetchPrice, listProducts, fetchAccounts, fetchbidask, handleTrade } from '../api/apiCalls';
import { handleFetchPrice, handleFetchOrders } from '../utils/tradingUtils';
import ADXGauge from '../components/GausesAdx';
import CompositeTrendGauges from '../components/TrendGauses';
import { calculateAccountTotals, calculateCompositeTrend, calculateTrend, calculateSupportResistanceFibonacci, executeScalpingStrategy } from '../utils/tradingUtils'
import TradePanel from '../components/TradePanel';
import { detectATRSignal } from '../utils/tradingUtils';
import { detectBollingerBandsSignal } from '../utils/tradingUtils';
import { multipleTimeframeAnalysis } from '../utils/tradingUtils';
import { detectReversalEntrySignal } from '../utils/tradingUtils';
import { calculateAllPairProfits, calculatePairProfit, detectThreeLevelSemaforSignal, detectCandlestickReversalSignal, calculateProbabilityBasedSignal, filterActivePairs } from '../utils/tradingUtils';
import AccountTable from '../components/AccountTable';
import TimeFrameToggle from '../components/timeframes';
import OrderTotalsTable from '../components/orderTotals';
import Spinneras from '../components/spinner';
import NotificationToast from '../components/ToastNotificator';
import ConsoleLogs from '../components/consoles';

const BotTrading = () => {
  const [currentTrade, setCurrentTrade] = useState();
  const [toast, setToast] = useState({ visible: false, message: '', status: '' }); // Toast state

  const [pair, setPair] = useState('BTC-USDC');
  const [pairtype, setPairtype] = useState('BTC-USDC');
  const [candlesH1, setCandlesH1] = useState([]);
  const [mergedBuyOrders, setMergedBuyOrders] = useState([]);
  const [latestPrice, setLatestPrice] = useState(null);

  const [direction, setDirection] = useState("");
  const [trendStrength, settrendStrength] = useState("");
  const [Srlevels, setSrlevels] = useState();
  const [frame, setFrame] = useState(3600);
  const [signals, setSignals] = useState([]); // State to store the list of signals
  const [signalsSell, setSignalsSell] = useState([]); // State to store the list of signals

  const [TotalAccounts, setTotalAccounts] = useState();
  const [accounts, setAccounts] = useState([]);
  const [prices, setPrices] = useState({});
  const [error, setError] = useState(null);
  const [refresh, setRefresh] = useState(false)
  const [botisScanning, setbotIsScanning] = useState(false)
  const [usdc, setUsdc] = useState([])
  const [orderstotals, setOrdersTotals] = useState([])
  const [AllOrdersTotals, setAllOrdersTotals] = useState([])
  const [btcprice, setBtcprice] = useState([])
  const [accountsData, setAccountsData] = useState([])
  const [loading, setLoading] = useState(false)


  const [botActive, setBotActive] = useState(true);

  const [closingPercent, setClosingPercent] = useState(5);
  const [betAmount, setBetAmount] = useState(10);
  const [betPropabilty, setBetPropability] = useState(75);
  const toggleBot = () => setBotActive((prevState) => !prevState);
  const [ammount, setAmmount] = useState(0);
  const [autoTrading, setAutoTrading] = useState(false);
  const [autoClosing, setAutoClosing] = useState(false);
  const closepercent = closingPercent
  const betammount = betAmount

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // const botData = async () => {
  //   setbotIsScanning(true)
  //   console.log("Starting Auto Trading");
  //   try {
  //     const signals = await checkPropability();
  //     for (const signal of signals) {
  //       console.log(`Processing signal for pair: ${signal.pair}`);
  //       const mergedOrders = await handleFetchOrders(signal.pair);

  //       if (mergedOrders.length > 0) {
  //         console.log(`PAIR HAS ORDERS ABORTING  ${signal.pair}`);
  //         continue;
  //       }
  //       const acco = await fetchAccounts()
  //       const accountusds = acco.accounts.filter((acc) => acc.currency === "USDC")
  //       const usdcr = accountusds[0].available_balance.value;
  //       if (usdcr > betammount && signal.probability > betPropabilty) {
  //         console.log(`${usdcr} -Available -> Trade ${signal.pair} -->Propabiliyty ${signal.probability}`);
  //         await executeTrade(signal.pair, "BUY", betammount)
  //       }
  //       await delay(3000); // 3-second delay between orders
  //     }
  //     setbotIsScanning(false)
  //   } catch (error) {
  //     console.error("Error during auto trading process:", error.message);
  //   }

  // };


  const closing = async () => {
    setbotIsScanning(true)
    try {
      const data = await fetchAccounts();
      const allOrdersTotals = await calculateAllPairProfits([], data);

      await Promise.all(
        allOrdersTotals.map(async (order) => {
          if (order.profitPercentage > closepercent) {
            const adjustedAmount = order.balance * 0.3; // Remove 0.1%
         
            const SRS = await calculateSupportResistanceFibonacci(order.pair, frame);
            const price = await fetchPrice(order.pair);
            const reversals = await detectCandlestickReversalSignal(order.pair, frame);
            const power = await calculateCompositeTrend(order.pair, frame);

            const resistance = SRS.resistance;
            const tolerance = resistance * 0.01; // 1% of resistance

            if (
              price > resistance - tolerance &&
              price < resistance + tolerance &&
              reversals.signal === "Sell" &&
              power.H1 < 35 &&
              power.D1 < 40
            ) {
              console.log("EXECUTING CLOSING FOR " + order.pair );
              await executeTrade(order.pair, "SELL", Number(adjustedAmount).toFixed(2));
            } else {
              console.log(order.pair + " -- ABORTING CLOSING "+ "AT : "+price);
              console.log("Candles Signal is : " + reversals.signal);
              console.log("RESISTANCE:" + SRS.resistance);
              console.log("Power - H1:" + power.H1);
              console.log("Power - D1:" + power.D1);
     


  
            }
          }
        })
      );

      console.log("All orders processed");
      setbotIsScanning(false)
      return "End_Closing";
    } catch (error) {
      console.error("Error in closing function:", error.message);
      return "Error";
    }
  };








  const executeTrade = async (pair, side, amount) => {
    try {
      const response = await handleTrade(pair, side, Number(amount).toFixed(2));
      if (response.success) {
        setToast({
          visible: true,
          message: `Trade executed successfully! Order ID: ${response.success_response.order_id}`,
          status: 'success',
        });
        // Reset fields

      } else {
        setToast({
          visible: true,
          message: 'Trade execution failed.',
          status: 'error',
        });

      }
    } catch (error) {
      setToast({
        visible: true,
        message: 'An error occurred while executing the trade.',
        status: 'error',
      });
      console.error(error);
    }
  };



  useEffect(() => {
    let isRunningClosing = false; // Flag to prevent overlapping cycles

    const handleClosing = async () => {
      if (isRunningClosing) return;
      isRunningClosing = true;

      try {
        const closeOrders = await closing(); // Run the closing function
        console.log(closeOrders);
      } catch (error) {
        console.error("Error in handleClosing:", error.message);
      }

      isRunningClosing = false;

      // Wait 3 minutes before starting the next cycle
      setTimeout(() => {
        if (autoClosing) handleClosing();
      }, 360000); // 3 minutes
    };

    if (autoClosing) {
      handleClosing(); // Start the first cycle immediately
    }

    return () => {
      isRunningClosing = false; // Cleanup on unmount or when autoClosing changes
    };
  }, [autoClosing]);

  






  const fetchData = async () => {
    await initializeData();
    const btcprice = await fetchPrice("BTC-USDC");
    setBtcprice(btcprice);
  };

  useEffect(() => {
    fetchData()
  }, []);

  useEffect(() => {
    let interval;
    const fetchData = async () => {
      await initializeData();
    };
    if (botActive) {
      setLoading(true)
      interval = setInterval(() => {
        fetchData();
        setLoading(false)
      }, 60000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [botActive]);


  useEffect(() => {
    let interval;
    const fetchData = async () => {
      const btcprice = await fetchPrice("BTC-USDC");
      setBtcprice(btcprice);

    };
    if (botActive) {
      interval = setInterval(() => {
        fetchData();
      }, 10000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [botActive]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const candles = await handleFetchData();
        if (candles.length > 0) {
          const latestPrice = await handleFetchPrice(pair);
          setLatestPrice(latestPrice);
          const mergedOrders = await handleFetchOrders(pair);
          setMergedBuyOrders(mergedOrders);
          const trend = await calculateTrend(candles);
          setDirection(trend.trendDirection);
          settrendStrength(trend.trendStrength);
          // const rsiAdx = await calculateCompositeTrend(pair, candles);
          // setRsiadx(rsiAdx);
          const srLevels = await calculateSupportResistanceFibonacci(pair, frame, candles);
          setSrlevels(srLevels);
          const ordersTotals = await calculatePairProfit(pair);
          setOrdersTotals(ordersTotals);
        }
      } catch (error) {
        console.error("Error during data initialization:", error);
      } finally {
        setRefresh(false);
        setLoading(false)
      }
    };

    fetchData();
  }, [pair, frame]);

  const initializeData = async () => {
    try {
      setLoading(true)
      const data = await fetchAccounts();
      const allOrdersTotals = await calculateAllPairProfits([], data);
      setAllOrdersTotals(allOrdersTotals);
      const accountTotals = await calculateAccountTotals(accounts);
      setTotalAccounts(accountTotals);
      const accountsList = data.accounts || [];
      const withBalance = accountsList.filter(
        (acc) => parseFloat(acc.available_balance.value) > 0
      );
      setAccounts(withBalance);
      setAccountsData(data);
      const priceData = {};
      for (const account of withBalance) {
        const currency = account.currency;
        const priceUSD = await fetchPrice(`${currency}-USDC`);
        priceData[currency] = { USDC: priceUSD };
      }
      setPrices(priceData);
      setLoading(false)
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFetchData = async () => {
    try {

      const candles = await fetchCandleData(pair, frame); // Fetch H1 candles
      const reversedCandles = candles //.reverse();
      setCandlesH1(reversedCandles);
      return (reversedCandles)
    } catch (error) {
      console.error('Error fetching H1 data:', error.message);
    }
  };

  const generateCandleChartOptions = (supportResistance) => {
    if (candlesH1.length === 0) return {};
    const candlestickData = candlesH1
      .map((c) => [parseFloat(c.open), parseFloat(c.close), parseFloat(c.low), parseFloat(c.high)])
    const timeData = candlesH1.map((c) => new Date(c.time).toLocaleTimeString());
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


  const tradeNow = async () => {
    try {
      setbotIsScanning(true)
      const response = await listProducts();
      if (!response || !response.products) {
        console.error('No products found');
        return;
      }
      const productsUsdc = response.products.filter((product) =>
        product.product_id.endsWith('-USDC')
      );
      const products = filterActivePairs(productsUsdc)

      const timeframe = frame;
      const signalsList = []; // Temporary array to hold signals
      const signalsListSell = []; // Temporary array to hold signals

      for (const product of products) {
        try {
          // Execute scalping strategy for each product
          const result = await executeScalpingStrategy(product.product_id, timeframe);

          if (result.signal === 'Buy') {
            signalsList.push(result); // Add valid signal to the array
          }
          if (result.signal === 'Sell') {
            signalsListSell.push(result); // Add valid signal to the array
          }
        } catch (error) {
          console.error(`Error processing data for ${product.product_id}:`, error.message);
        }
      }

      // Update the state with the signals after processing all products
      setSignals(signalsList);
      setSignalsSell(signalsListSell);
      setbotIsScanning(false)
    } catch (error) {
      console.error('Error fetching product list:', error.message);
    }
  };

  const checkATRSignal = async () => {
    setbotIsScanning(true)
    try {
      const response = await listProducts();
      if (!response || !response.products) {
        console.error('No products found');
        return;
      }
      const productsUsdc = response.products.filter((product) =>
        product.product_id.endsWith('-USDC')
      );
      const products = filterActivePairs(productsUsdc)

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
      setbotIsScanning(false)
      setSignals(signalsList);
    } catch (error) {
      console.error('Error fetching product list:', error.message);
    }


  };

  const checkBollingerBandsSignal = async () => {
    setbotIsScanning(true)
    try {
      const response = await listProducts();
      if (!response || !response.products) {
        console.error('No products found');
        return;
      }
      const productsUsdc = response.products.filter((product) =>
        product.product_id.endsWith('-USDC')
      );
      const products = filterActivePairs(productsUsdc)

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
      setbotIsScanning(false)
    } catch (error) {
      console.error('Error fetching product list:', error.message);
    }


  };

  const runMultipleTimeframeAnalysis = async () => {
    setbotIsScanning(true)
    setSignals([])
    try {
      const response = await listProducts();
      if (!response || !response.products) {
        console.error('No products found');
        return;
      }
      const productsUsdc = response.products.filter((product) =>
        product.product_id.endsWith('-USDC')
      );
      const products = filterActivePairs(productsUsdc)
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
      setbotIsScanning(false)
    } catch (error) {
      console.error('Error fetching product list:', error.message);
    }


  };

  const runReversalSignalDetection = async () => {
    setbotIsScanning(true)
    setSignals([])
    try {
      const response = await listProducts();
      if (!response || !response.products) {
        console.error('No products found');
        return;
      }
      const productsUsdc = response.products.filter((product) =>
        product.product_id.endsWith('-USDC')
      );
      const products = filterActivePairs(productsUsdc)
      const timeframe = frame;
      const signalsList = []; // Temporary array to hold signals
      for (const product of products) {
        try {
          const result = await detectReversalEntrySignal(product.product_id, timeframe);


          if (result && result.signal !== 'None') {
            signalsList.push(result); // Add valid signal to the array
          }
        } catch (error) {
          console.error(`Error processing data for ${product.product_id}:`, error.message);
        }
      }
      setSignals([])
      setSignals(signalsList);
      setbotIsScanning(false)
    } catch (error) {
      console.error('Error fetching product list:', error.message);
    }
  };

  const runCandleSignalDetection = async () => {
    setbotIsScanning(true)
    setSignals([])
    try {
      const response = await listProducts();
      if (!response || !response.products) {
        console.error('No products found');
        return;
      }
      const productsUsdc = response.products.filter((product) =>
        product.product_id.endsWith('-USDC')
      );
      const products = filterActivePairs(productsUsdc)
      const timeframe = frame;
      const signalsList = []; // Temporary array to hold signals

      for (const product of products) {
        try {
          console.log(product.product_id)
          const result = await detectCandlestickReversalSignal(product.product_id, timeframe, candlesH1);

          if (result && result.signal !== 'None') {
            signalsList.push(result); // Add valid signal to the array
          }
        } catch (error) {
          console.error(`Error processing data for ${product.product_id}:`, error.message);
        }
      }

      setSignals(signalsList);
      setbotIsScanning(false)
    } catch (error) {
      console.error('Error fetching product list:', error.message);
    }
  };

  const checkPropability = async () => {
    setbotIsScanning(true)
    setSignals([])
    setSignalsSell([])
    try {
      const response = await listProducts();
      if (!response || !response.products) {
        console.error('No products found');
        return;
      }
      const productsUsdc = response.products.filter((product) =>
        product.product_id.endsWith('-USDC')
      );


      const products = filterActivePairs(productsUsdc)
      const timeframe = frame;
      const signalsList = []; // Temporary array to hold signals
      const signalsListSell = []; // Temporary array to hold signals
      for (const product of products) {
        try {
          const bidask = await fetchbidask(product.product_id)
          if (bidask.spread_bps < 20) {
            const result = await calculateProbabilityBasedSignal(product.product_id, timeframe, candlesH1);

            if (result && result.signal === 'Buy') {
              signalsList.push(result); // Add valid signal to the array
            }
            if (result && result.signal === 'Sell') {
              signalsListSell.push(result); // Add valid signal to the array
            }
          }
        } catch (error) {
          console.error(`Error processing data for ${product.product_id}:`, error.message);
        }
      }

      setSignals(signalsList);
      setSignalsSell(signalsListSell);
      setbotIsScanning(false)
      return signalsList
    } catch (error) {
      console.error('Error fetching product list:', error.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent default action if needed (like form submission)
      setPair(pairtype); // Optionally clear the input after Enter

    }
  };
  const handleRowClick = (currency, balance) => {
    setPair(`${currency}-USDC`)
    setPairtype(`${currency}-USDC`)
    const adjustedAmount = balance * 0.999; // Remove 0.1%
    const roundedAmount = parseFloat(adjustedAmount.toFixed(2)); // Round to 2 decimal places
    setAmmount(roundedAmount); // Set the calculated amount

  };

  const handleOrderClick = (currency, balance) => {
    setPair(currency);
    setPairtype(currency);

    // Calculate adjusted amount
    const adjustedAmount = balance * 0.999; // Remove 0.1%
    const roundedAmount = parseFloat(adjustedAmount.toFixed(2)); // Round to 2 decimal places

    setAmmount(roundedAmount); // Set the calculated amount
  };


  return (
    <div>
      <Row>
        <NotificationToast
          message={toast.message}
          status={toast.status}
          visible={toast.visible}
          onClose={() => setToast({ visible: false, message: '', status: '' })}

        />
        <Col sm="3">
          <h2>{pair}---{latestPrice} </h2>
          <Row>
            <Col>
              <Row><h3> Res : {Srlevels && Srlevels.resistance}---Sup : {Srlevels && Srlevels.support}</h3> </Row>
              <Row> <h5>Fibs 23.6% ---- UP:{Srlevels && Srlevels.extensions[0].level.toFixed(4)} DN: {Srlevels && Srlevels.retracements[0].level.toFixed(4)}</h5></Row>
              <Row> <h5>Fibs 38.2% ---- UP:{Srlevels && Srlevels.extensions[1].level.toFixed(4)} DN: {Srlevels && Srlevels.retracements[1].level.toFixed(4)}</h5></Row>
              <Row> <h5>Fibs 61% ---- UP:{Srlevels && Srlevels.extensions[2].level.toFixed(4)} DN: {Srlevels && Srlevels.retracements[2].level.toFixed(4)}</h5></Row>
            </Col>
          </Row>
          <Row>
            <ADXGauge pair={pair} ></ADXGauge>
          </Row>
          <Row>
            <CompositeTrendGauges pair={pair}></CompositeTrendGauges>
          </Row>
          <Row style={{ marginLeft: 10 }}>
            <TradePanel tradeDetails={{ pair: pair, amount: ammount }} refresh={() => fetchData()}></TradePanel>
          </Row>
          <Row>
            <OrderTotalsTable orderTotals={AllOrdersTotals} onRowClick={handleOrderClick}></OrderTotalsTable>
          </Row>
        </Col>
        <Col sm="5">
          <h3>BTC/USD : {btcprice} -- USCD $: {usdc && usdc[0] && usdc[0].available_balance && Number(usdc[0].available_balance.value).toFixed(2)} {loading && <Spinner></Spinner>} </h3>
          <Row style={{ marginTop: 30 }} className="mb-4">
            <Col sm="4">
              <Input
                type="text"
                value={pairtype}
                onChange={(e) => setPairtype(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Press Enter to submit"
              />
            </Col>

            <Col sm="2">
              <Button color={botActive ? 'danger' : 'primary'} onClick={toggleBot}>
                {botActive ? 'Stop Autorefresh' : 'AutoRefresh'}
              </Button>
            </Col>
            <Col sm="2">
              <Button color={autoClosing ? 'danger' : 'primary'} onClick={() => setAutoClosing(!autoClosing)}>
                {autoClosing ? "Stop Auto Closing" : "Start Auto Closing"}
              </Button>
            </Col>
            {/* <Col>
              <Button  color={autoTrading ? 'danger' : 'primary'}  onClick={() => setAutoTrading(!autoTrading)}>
                {autoTrading ? "Stop Auto Trading" : "Start Auto Trading"}
              </Button>
            </Col> */}



            <Col xs="3">

              <Label for="closingPercent">Closing %</Label>
              <Input
                type="number"
                id="closingPercent"
                value={closingPercent}
                onChange={(e) => setClosingPercent(e.target.value)}
                placeholder="Enter closing %"
              />

            </Col>
            <Col xs="3">

              <Label for="betAmount">Bet Amount</Label>
              <Input
                type="number"
                id="betAmount"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="Enter bet amount"
              />

            </Col>
            <Col xs="3">

              <Label for="betAmount">Bet Propabilty</Label>
              <Input
                type="number"
                id="betAmount"
                value={betPropabilty}
                onChange={(e) => setBetPropability(e.target.value)}
                placeholder="Enter bet amount"
              />

            </Col>

          </Row>
          <Row style={{ marginTop: 40 }}>
            <Col sm="2">
              <Button style={{ maxWidth: 200 }} onClick={() => tradeNow()}>Scalping Signals</Button>

            </Col>
            <Col>
              <Button style={{ maxWidth: 200 }} onClick={() => checkATRSignal()}>ATR Signals</Button>

            </Col>

            <Col>
              <Button style={{ maxWidth: 200 }} onClick={() => checkBollingerBandsSignal()}>Bolinger Signals</Button>

            </Col>
            <Col>
              <Button style={{ maxWidth: 200 }} onClick={() => runMultipleTimeframeAnalysis()}>MF Signals</Button>

            </Col>
            <Col>
              <Button style={{ maxWidth: 200 }} onClick={() => runReversalSignalDetection()}>Reversals Signals</Button>

            </Col>
            <Col>
              <Button style={{ maxWidth: 200 }} onClick={() => runCandleSignalDetection()}>Candle Signals</Button>

            </Col>
            <Col>
              <Button style={{ maxWidth: 200 }} onClick={() => checkPropability()}>Probabilty Buys</Button>

            </Col>



          </Row>
          <Row style={{ marginTop: 10 }}>
            {botisScanning && <Spinneras ></Spinneras>}
          </Row>
          <Row style={{ fontSize: 15 }}>

            <h3>BTC:{TotalAccounts && TotalAccounts.totalInBtc}-- inUSD:{TotalAccounts && TotalAccounts.totalInUsdc} -- USDC $:{usdc.length > 0 && Number(usdc && usdc[0].available_balance.value).toFixed(2)}</h3>
          </Row>
          <Row style={{ marginTop: 30 }}>
            <Col sm="12">
              {/* Account table */}

              <AccountTable
                accounts={accounts}
                prices={prices}
                // refresh={() => setRefresh(true)}
                onRowClick={handleRowClick}
                setusdc={(e) => setUsdc(e)}
              />
            </Col>
          </Row>

          <Row >


            {signals.length > 0 ? (
              <div style={{ marginTop: '20px', maxHeight: '500px', overflowY: 'auto', border: '1px solid #ddd' }}>

                <h3>Signals</h3>
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Pair</th>
                      <th>Signal</th>
                      <th>Reason</th>
                      <th>Weigh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signals.map((signal, index) => (
                      <tr
                        key={index}
                        onClick={() => {
                          setPair(signal.pair)
                          setPairtype(signal.pair)

                        }


                        }
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{signal.pair}</td>
                        <td>{signal.signal}</td>
                        <td>{signal.reason && signal.reason}</td>
                        <td>{signal.probability && signal.probability}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <p>No valid signals found.</p>
            )}

          </Row>


        </Col>

        <Col sm="4">

          <Row style={{ marginTop: 20 }}>
            <TimeFrameToggle style={{ marginTop: 20 }} frame={frame} setFrame={setFrame} />
            <ReactECharts option={generateCandleChartOptions()} style={{ height: 650 }} />
          </Row>

          <Row>

            <div>
              <h4
                style={{
                  color: orderstotals && orderstotals.totalProfitDollars > 0 ? 'green' : 'red',
                }}
              >
                {pair} Orders Totals --- %{orderstotals && orderstotals.profitPercentage} ${orderstotals && orderstotals.totalProfitDollars}
              </h4>
              {mergedBuyOrders.length > 0 ? (
                <Table striped>
                  <thead>
                    <tr>
                      <th>PAIR</th>
                      <th>Coins</th>
                      <th>Price</th>
                      <th>Trade Time</th>
                      <th>Amount</th>
                      <th>Commission</th>
                      <th>Profit (%)</th>
                      <th>Profit (USD)</th>

                    </tr>
                  </thead>
                  <tbody>
                    {mergedBuyOrders.map((order, i) => {
                      const mypayment = order.amount + order.commission
                      const ordercoins = order.amount / order.price;
                      const nowValueusd = ordercoins * latestPrice
                      const nowprofitusd = nowValueusd - mypayment;
                      const isProfit = nowprofitusd > 0
                      const profitPercentage = mypayment ? ((nowprofitusd / mypayment) * 100).toFixed(2) // Avoid divide-by-zero
                        : 0;



                      return (
                        <tr key={i}>
                          <td>{pair}</td>
                          <td>{ordercoins.toFixed(2)}</td>
                          <td>${order.price.toFixed(2)}</td>
                          <td>{order.tradeTime}</td>
                          <td>{order.amount.toFixed(2)}</td>
                          <td>${order.commission.toFixed(2)}</td>
                          <td style={{ color: isProfit ? 'green' : 'red' }}>
                            {isProfit ? '+' : ''}
                            {profitPercentage}%
                          </td>
                          <td style={{ color: isProfit ? 'green' : 'red' }}>

                            {nowprofitusd.toFixed(2)}
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
          </Row>
          <Row>
            <ConsoleLogs></ConsoleLogs>
          </Row>


        </Col>
      </Row>

      <hr />




    </div>
  );
};

export default BotTrading;
