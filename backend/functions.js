
const client = require('./coinbaseClient'); // Import the reusable Coinbase client
const { v4: uuidv4 } = require('uuid');


const fetchCandleData = async (productId, granularity) => {
  const GRANULARITY_MAP = {
    60: 'ONE_MINUTE',
    300: 'FIVE_MINUTE',
    900: 'FIFTEEN_MINUTE',
    1800: 'THIRTY_MINUTE',
    3600: 'ONE_HOUR',
    21600: 'SIX_HOUR',
    86400: 'ONE_DAY',
  };

  // Helper delay function
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    const granularityString = GRANULARITY_MAP[parseInt(granularity, 10)];
    if (!granularityString) {
      throw new Error(`Invalid granularity value: ${granularity}`);
    }

    const now = Math.floor(Date.now() / 1000);
    const end = now;
    const start = now - parseInt(granularity, 10) * 300;


    await delay(500); // 2-secsond delay before making the API call
    const rawResponse = await client.getProductCandles({
      productId,
      granularity: granularityString,
      start: start.toString(),
      end: end.toString(),
    });

    // Parse and process the response
    let candles = [];
    if (typeof rawResponse === 'string') {
      const parsedResponse = JSON.parse(rawResponse);
      candles = parsedResponse.candles || [];
    } else if (rawResponse.candles) {
      candles = rawResponse.candles;
    }

    // Check if candles is an array
    if (!Array.isArray(candles)) {
      throw new Error('Candles data is not an array.');
    }

    // Format candles
    const formattedCandles = candles.map(({ start, low, high, open, close }) => ({
      time: new Date(start * 1000).toISOString(), // Corrected to 1000 (milliseconds)
      low: parseFloat(low),
      high: parseFloat(high),
      open: parseFloat(open),
      close: parseFloat(close),
    }));

    return formattedCandles;
  } catch (error) {
    console.error(`Error fetching candles for ${productId}:`, error.message);
    throw new Error(`Failed to fetch candle data: ${error.message}`);
  }
};

  
const fetchAccounts = async () => {
    try {
      const accounts = await client.listAccounts({limit:250});
      return JSON.parse(accounts);
    } catch (error) {
      console.error('Error fetching accounts:', error.message);
      throw new Error('Failed to fetch accounts');
    }
  };

const fetchProducts = async () => {
    try {
      const products = await client.listProducts({ product_type: "SPOT" ,quote_currency_id: 'USDC',});

      return products;
    } catch (error) {
      console.error('Error fetching products:', error.message);
      throw new Error('Failed to fetch products');
    }
  };

const fetchProductDetails = async (productId) => {
    try {
      // Use the SDK's method to fetch product details
      const product = await client.getProduct({ productId });
      return product; // Return the product details
    } catch (error) {
      console.error(`Error fetching product data for ${productId}:`, error.message);
      throw new Error('Failed to fetch product data');
    }
  };
const fetchOrdersForProduct = async (productId) => {
    try {
      const trades = await client.listFills({ product_id: productId });
      return JSON.parse(trades); // Return parsed trades
    } catch (error) {
      console.error(`Error fetching trades for ${productId}:`, error.message);
      throw new Error('Failed to fetch trades');
    }
  };

  const fetchBidAskForProduct = async (productId) => {
    try {
      const trades = await client.getProductBook({ product_id: productId });
 
      return JSON.parse(trades); // Return parsed bid/ask data
    } catch (error) {
      console.error(`Error fetching bid/ask for ${productId}:`, error.message);
      throw new Error('Failed to fetch bid/ask data');
    }
  };

const createOrders = async ( product_id, side, size, price ) => {

 
    if (!product_id || !side || !size) {
    throw new Error('Missing required parameters: product_id, side, or size');
  }


  const client_order_id = uuidv4(); // Generate a unique ID for the order
  const orderConfiguration =
    side === 'SELL'
      ? {
          market_market_ioc: {
            base_size: Number(size).toFixed(2), // Use base size for market sell
          },
        }
      : {
          market_market_ioc: {
            quote_size: Number(size).toFixed(2), // Use quote size for market buy
          },
        };

  try {


    const order = await client.createOrder({
      client_order_id,
      product_id,
      side,
      order_configuration: orderConfiguration,
    });
    return order; // Return the created order
  } catch (error) {
    console.error('Error creating order:', error.message);
    throw new Error('Failed to create order');
  }
};


const handleFetchOrdersBuys = async (pair) => {
  try {
    // Fetch orders for the given pair
    const ordersRes = await fetchOrdersForProduct(pair);
    const orders = ordersRes?.fills || []; // Ensure fills is defined

    const buysUntilSell = [];
    for (const order of orders) {
      if (order.side === 'SELL') break;
      if (order.side === 'BUY') buysUntilSell.push(order);
    }

    // Merge buy orders by order ID
    const mergedOrders = buysUntilSell.reduce((acc, order) => {
      const { order_id, price, size, trade_time } = order;
      if (!acc[order_id]) {
        acc[order_id] = {
          orderId: order_id,
          price: parseFloat(price),
          amount: parseFloat(size),
          tradeTime: new Date(trade_time).toLocaleString(),
          commission: parseFloat(order.commission || 0), // Include commission if available
        };
      } else {
        acc[order_id].amount += parseFloat(size);
        acc[order_id].commission += parseFloat(order.commission || 0);
      }
      return acc;
    }, {});

    return Object.values(mergedOrders); // Convert merged orders object to array
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    return []; // Return an empty array on error
  }
};

const fetchPrice = async (symbol) => {
 
    const excludeList = ['USDC-USDC', 'EUR-USDC']; // List of pairs to exclude
    if (excludeList.includes(symbol)) {
      console.warn(`Pair "${symbol}" is excluded from fetching price data.`);
      return 0;
    }
  
    try {
      const productDetailsraw = await fetchProductDetails(symbol);
      const productDetails = JSON.parse(productDetailsraw)
    
      if (!productDetails || typeof productDetails.price === 'undefined') {
        throw new Error('Invalid product details or missing price data.');
      }

      return parseFloat(productDetails.price);
    } catch (err) {
      console.error(`Error fetching price for ${symbol}:`, err.message);
      return 0; // Fallback price
    }
  };

const calculatePairProfit = async (pair) => {
    try {
      // Fetch all orders for the given pair
      const orders= await handleFetchOrdersBuys(pair);
    
      if (!orders || orders.length === 0) {
        return {
          orders: 0,
          totalPaymentWithCommission: 0,
          totalProfitDollars: 0,
          profitPercentage: 0,
          isInProfit: false,
          usdcprice:0,
          ordersData:[]
        };
      }
  
      // Fetch the current price of the pair
      const currentPrice = await fetchPrice(pair);
  
      if (!currentPrice || isNaN(currentPrice)) {
        throw new Error(`Invalid current price for pair ${pair}`);
      }
  
      // Initialize totals
      let totalPaymentWithCommission = 0;
      let totalProfit = 0;
  
      // Calculate profit for each order
      orders.forEach((order) => {
        const paymentWithCommission = parseFloat(order.amount || 0) + parseFloat(order.commission || 0);
        const coinsBought = parseFloat(order.amount || 0) / parseFloat(order.price || 1); // Avoid division by zero
        const nowValueUSD = coinsBought * currentPrice;
        const profit = nowValueUSD - paymentWithCommission;
  
        // Aggregate totals
        totalPaymentWithCommission += paymentWithCommission;
        totalProfit += profit;
      });
  
      // Determine profit percentage
      const profitPercentage = totalPaymentWithCommission
        ? (totalProfit / totalPaymentWithCommission) * 100
        : 0;
  
      // Determine if in profit
      const isInProfit = totalProfit > 0;
  
      // Return results
      return {
        pair,
        orders: orders.length,
        totalPaymentWithCommission: parseFloat(totalPaymentWithCommission.toFixed(2)),
        totalProfitDollars: parseFloat(totalProfit.toFixed(2)),
        profitPercentage: parseFloat(profitPercentage.toFixed(2)),
        isInProfit,
        usdcprice:currentPrice,
        orders:orders
      };
    } catch (error) {
      console.error(`Error calculating profit for pair ${pair}:`, error.message);
      return {
        pair,
        orders: 0,
        totalPaymentWithCommission: 0,
        totalProfitDollars: 0,
        profitPercentage: 0,
        isInProfit: false,
        usdcprice:0,
        orders:[]
      };
    }
  };
  

  const getAccountsWithUsdcValueAboveOne = async (accounts) => {
    const result = [];

    for (const account of accounts.accounts) {
      const { currency, available_balance } = account;
      const balance = parseFloat(available_balance.value);
  
      if (balance > 0) {
        const priceInUsdc = await fetchPrice(`${currency}-USDC`);
        const usdcValue = balance * priceInUsdc;
  
        if (usdcValue > 2) {
          result.push({
            uuid: account.uuid,
            name: account.name,
            currency: account.currency,
            USDCValue: parseFloat(usdcValue.toFixed(2)),
            coinsBalance: balance,
            available_balance: account.available_balance,
            default: account.default,
            active: account.active,
            type: account.type,
          });
        }
      }
    }
  
    return result;
  };


  const filterActivePairs = (products) => {
    try {
      const filteredPairs = products.filter((product) => {
        const priceChange = parseFloat(product.price_percentage_change_24h.replace('%', ''));
        const volume = parseFloat(product.volume_24h);
        const volumeChange = parseFloat(product.volume_percentage_change_24h.replace('%', ''));
  
        // Filtering conditions
        const isSignificantPriceChange = Math.abs(priceChange) > 5; // More than ±5% price change
        const isHighVolume = volume > 800000; // Minimum volume threshold
        const isVolumeIncreasing = volumeChange > 10; // More than 10% increase in volume
  
        return isSignificantPriceChange && isHighVolume && isVolumeIncreasing;
      });
  
      return filteredPairs;
    } catch (error) {
      console.error('Error filtering active pairs:', error.message);
      return []; // Return an empty array in case of an error
    }
  };

const calculateRetradeSignal = async (pair, currentPrice, buyOrders, thresholdPercentage = 2) => {
    try {
      // Find the lowest order price
    
      const lowestOrder = buyOrders.reduce((prev, curr) =>
        prev.price < curr.price ? prev : curr
      );
  
      const percentageDifference =
        ((lowestOrder.price - currentPrice) / lowestOrder.price) * 100;
  
      const entrySignal = percentageDifference >= thresholdPercentage; // Check if it's greater than or equal
  
      return {
        currentPrice,
        entrySignal,
        reason: entrySignal
          ? 'Current price is lower than the threshold percentage relative to the lowest order price.'
          : `Current price is not ${thresholdPercentage}% lower than the lowest order.`,
        lowestOrder,
        percentageDifference: percentageDifference.toFixed(2),
      };
    } catch (error) {
      console.error(`Error calculating retrade signal for ${pair}:`, error.message);
      return {
        currentPrice,
        entrySignal: false,
        reason: 'Error calculating retrade signal',
        percentageDifference: null,
      };
    }
  };


module.exports = {calculateRetradeSignal,filterActivePairs,getAccountsWithUsdcValueAboveOne,calculatePairProfit ,fetchPrice,handleFetchOrdersBuys,createOrders, fetchBidAskForProduct,fetchOrdersForProduct,fetchProducts, fetchCandleData,fetchAccounts,fetchProductDetails};
