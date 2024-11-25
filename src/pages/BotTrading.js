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
import { filterAndAddUSDPrices, sumAllUsdcAndBtcValues, calculateAllPairProfits, calculatePairProfit, detectThreeLevelSemaforSignal, detectCandlestickReversalSignal, calculateProbabilityBasedSignal, filterActivePairs } from '../utils/tradingUtils';
import AccountTable from '../components/AccountTable';
import TimeFrameToggle from '../components/timeframes';
import OrderTotalsTable from '../components/orderTotals';
import Spinneras from '../components/spinner';
import NotificationToast from '../components/ToastNotificator';
import ConsoleLogs from '../components/consoles';
import CandlestickChart from '../components/CandlestickChart';
const BotTrading = () => {
  const [accounts, setAccounts] = useState([]);
  // const [currentTrade, setCurrentTrade] = useState();
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

  const [prices, setPrices] = useState({});
  const [error, setError] = useState(null);
  // const [refresh, setRefresh] = useState(false)
  const [botisScanning, setbotIsScanning] = useState(false)
  const [usdc, setUsdc] = useState([])
  const [orderstotals, setOrdersTotals] = useState([])
  const [AllOrdersTotals, setAllOrdersTotals] = useState([])
  const [btcprice, setBtcprice] = useState([])
  // const [accountsData, setAccountsData] = useState([])
  const [loading, setLoading] = useState(false)
  const [botActive, setBotActive] = useState(false);
  const [closingPercent, setClosingPercent] = useState(5);
  const [betAmount, setBetAmount] = useState(10);
  const [betPropabilty, setBetPropability] = useState(75);
  const toggleBot = () => setBotActive((prevState) => !prevState);
  const [ammount, setAmmount] = useState(0);
  const [autoClosing, setAutoClosing] = useState(false);
  const closepercent = closingPercent

  // const [autoTrading, setAutoTrading] = useState(false);

  // useEffect(() => {
  //   let interval;
  //   const fetchData = async () => {
  //     setLoading(true)
  //     const btcprice = await fetchPrice("BTC-USDC");
  //     setBtcprice(btcprice);
  //     await initializeData();
  //     const candles =  await fetchCandleData(pair, frame); // Fetch H1 candles
  //     setCandlesH1(candles)
  //     setLoading(false)
  //   };
  //   if (botActive) {
  //     interval = setInterval(() => {
  //       fetchData();
  //     },15000);
  //   } else {
  //     clearInterval(interval);
  //   }
  //   return () => clearInterval(interval);
  // }, [botActive]);






  useEffect(() => {
    fetchData()
  }, []);

  useEffect(() => {
    onPairFrameChange();
  }, [pair, frame]);


  // useEffect(() => {
  //   let isRunning = false; // Flag to track if the bot is already running
  
  //   const handleClosing = async () => {
  //     while (autoClosing) { // Continue looping as long as autoClosing is true
  //       if (isRunning) return; // Prevent overlapping runs
  //       isRunning = true; // Mark as running
  //       try {
  //         await closing(); // Wait for the closing function to complete
  //       } catch (error) {
  //         console.error("Error in handleClosing:", error.message);
  //       } finally {
  //         isRunning = false; // Reset the flag after the run completes
  //       }
  //       // Wait before the next iteration
  //       await new Promise((resolve) => setTimeout(resolve, 10000)); // 10-second delay
  //     }
  //   };
  
  //   if (autoClosing) {
  //     handleClosing(); // Start the loop
  //   }
  
  //   return () => {
  //     isRunning = false; // Cleanup on unmount or when autoClosing changes
  //   };
  // }, [autoClosing]);
  


  const fetchData = async () => {
    await initializeData();
  };

  const executeTrade = async (pair, side, amount) => {
    try {
      const response = await handleTrade(pair, side, Number(amount).toFixed(0));
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



  const onPairFrameChange = async () => {
    setLoading(true)
    setMergedBuyOrders([])
    setOrdersTotals([])
    try {
      const candles = await fetchCandleData(pair, frame); // Fetch H1 candles(pair,frame);
      setCandlesH1(candles);
      if (candles.length > 0) {
 
        const latestPrice = await handleFetchPrice(pair);
        setLatestPrice(latestPrice);
        const mergedOrders = await handleFetchOrders(pair);
        setMergedBuyOrders(mergedOrders);
        const ordersTotals = await calculatePairProfit(pair);
        setOrdersTotals(ordersTotals);
        const trend = await calculateTrend(candles);
        setDirection(trend.trendDirection);
        settrendStrength(trend.trendStrength);
        const srLevels = await calculateSupportResistanceFibonacci(pair, frame, candles);
        setSrlevels(srLevels);

      }
    } catch (error) {
      console.error("Error during data initialization:", error);
    } finally {
      setLoading(false)
    }
  };

  const initializeData = async () => {
    try {
      setLoading(true)
      const btcprice = await fetchPrice("BTC-USDC");
      setBtcprice(btcprice);
       await onPairFrameChange()
      const data = await fetchAccounts();
      const usdcAccount = data.accounts.filter((account) =>
        account.currency === "USDC"
      );
      const usdcbalance = usdcAccount[0].available_balance.value
      const filterwithValues = await filterAndAddUSDPrices(data.accounts)
      setAccounts(filterwithValues)
      const above2dollars = filterwithValues.filter((account) => {
        return account.usdcValue > 2; // Only include if balance in USD > 2
      });
      const allOrdersTotals = await calculateAllPairProfits([], above2dollars);
      setAllOrdersTotals(allOrdersTotals);
      const accountTotals = await sumAllUsdcAndBtcValues(filterwithValues, usdcbalance);
      setTotalAccounts(accountTotals);
      setLoading(false)
    } catch (err) {
      setError(err.message);
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

  const handleRefreshOrders = async () => {
    await initializeData()

  }
  const closing = async () => {
    setbotIsScanning(true)
    try {
      const data = await fetchAccounts();
      const allOrdersTotals = await calculateAllPairProfits([], data.accounts);
  
      await Promise.all(
        allOrdersTotals.map(async (order) => {
 
          const currency = order.pair.replace("-USDC", "");
          const fullBalanceValue = data.accounts.filter((acc) => acc.currency === currency)
   
          // console.log("PAIRBALANCE:"+fullBalanceValue[0].available_balance.value)
          const adjustedAmount2 = fullBalanceValue[0].available_balance.value; // Remove 0.1%
          const adjustedAmount = adjustedAmount2 * 0.999;
     
          if (order.profitPercentage > closepercent && adjustedAmount) {
      
            const SRS = await calculateSupportResistanceFibonacci(order.pair, frame);
            const price = await fetchPrice(order.pair);
            const reversals = await detectCandlestickReversalSignal(order.pair, frame);
            const power = await calculateCompositeTrend(order.pair, frame);
            const resistance = SRS.resistance;
            const tolerance = resistance * 0.01; // 1% of resistance
            if (
              price > resistance - tolerance &&
              price < resistance + tolerance &&
              (reversals.signal === "Sell" || reversals.signal === "None") &&
              power.H1 < 35 

            ) {
              console.log("EXECUTING CLOSING FOR " + order.pair);
              await executeTrade(order.pair, "SELL", Number(adjustedAmount).toFixed(0));
            
            }
       
            
            else {
              console.log(order.pair + " -- ABORTING CLOSING " + "AT : " + price);
              console.log("Candles Signal is : " + reversals.signal);
              console.log("RESISTANCE:" + SRS.resistance);
              console.log("Power - H1:" + power.H1);
              console.log("Power - D1:" + power.D1);

            }
          }
        if (order.profitPercentage > 10) {
       
          console.log("EXECUTING TOP CLOSING " + order.pair);
          await executeTrade(order.pair, "SELL", Number(adjustedAmount).toFixed(0));

        }
          else{
            console.log(order.pair+"UNDER PROFIX")
    
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
            const result = await calculateProbabilityBasedSignal(product.product_id, timeframe);
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
    const adjustedAmount = balance; // Remove 0.1%
    const roundedAmount = parseFloat(adjustedAmount.toFixed(2)); // Round to 2 decimal places
    setAmmount(roundedAmount); // Set the calculated amount
  };

  const handleOrderClick = (currency, balance) => {
    setPair(currency);
    setPairtype(currency);
    // Calculate adjusted amount
    const adjustedAmount = balance ; // Remove 0.1%
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
            <OrderTotalsTable handlerefresh={handleRefreshOrders}orderTotals={AllOrdersTotals} onRowClick={handleOrderClick}></OrderTotalsTable>
          </Row>
        </Col>
        <Col sm="5">
        <Row style={{color:"blue"}}>   <h2>BTC/USD : {btcprice} </h2></Row>

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
            <Col sm="2">
              <Button  onClick={() => closing()}>
                CheckClose
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
          <Row style={{ fontSize: 15 ,color:"blue"}}>

            <h3>BTC:{TotalAccounts && TotalAccounts.totalInBtc}-- inUSD:{TotalAccounts && TotalAccounts.totalPocket} -- USDC $:{TotalAccounts && TotalAccounts.totalUSDC}</h3>
          </Row>
          <Row style={{ marginTop: 30 }}>
            <Col sm="12">
              <AccountTable
                accounts={accounts}
                prices={prices}
                onRowClick={handleRowClick}
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

          <Row style={{ marginTop: 20 ,color:"green" }}>
            <Col sm="1">
              {loading && <Spinner></Spinner>}
            </Col>
            <Col sm="6">
              <h2>{pair}-{latestPrice}</h2>
            </Col>
            <Col sm="5">
            <TimeFrameToggle style={{ marginTop: 20 }} frame={frame} setFrame={setFrame} />
            </Col>

          </Row>
          <Row>
 
              <Row><h3> Res : {Srlevels && Srlevels.resistance}---Sup : {Srlevels && Srlevels.support}</h3> </Row>
              <Row> <h5>Fibs 23.6% ---- UP:{Srlevels && Srlevels.extensions[0].level.toFixed(4)} DN: {Srlevels && Srlevels.retracements[0].level.toFixed(4)}</h5></Row>
              <Row> <h5>Fibs 38.2% ---- UP:{Srlevels && Srlevels.extensions[1].level.toFixed(4)} DN: {Srlevels && Srlevels.retracements[1].level.toFixed(4)}</h5></Row>
              <Row> <h5>Fibs 61% ---- UP:{Srlevels && Srlevels.extensions[2].level.toFixed(4)} DN: {Srlevels && Srlevels.retracements[2].level.toFixed(4)}</h5></Row>
    
          </Row>
          <Row>

            {/* <CandlestickChart style={{ height: 620 }} pair={pair}></CandlestickChart> */}
          <ReactECharts option={generateCandleChartOptions()} style={{ height: 620 }} />
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
                            {nowprofitusd.toFixed(2)}
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
