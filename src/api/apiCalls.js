import { ENDPOINTS } from './urls';

// Function to fetch accounts
export const fetchAccounts = async () => {
  try {
    const response = await fetch(ENDPOINTS.ACCOUNTS);
    if (!response.ok) throw new Error(`Error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (err) {
    console.error('Error fetching accounts:', err.message);
    throw err;
  }
};

export const listProducts = async () => {
  try {
    const response = await fetch(ENDPOINTS.LISTPRODUCT);
    if (!response.ok) throw new Error(`Error fetching price for`);
    const res = await response.json();
    const data = JSON.parse(res)

    return data;
  } catch (err) {
    console.error(`Error fetching price for `, err.message);
    return 0; // Fallback price
  }
};


export const fetchPrice = async (symbol) => {
  const excludeList = ['USDC-USDC', 'EUR-USDC']; // List of pairs to exclude
  if (excludeList.includes(symbol)) {
    // console.warn(`Pair "${symbol}" is excluded from fetching candle data.`);
    return [];
  }

  try {
    const response = await fetch(`${ENDPOINTS.PRODUCT}/${symbol}`);
    if (!response.ok) throw new Error(`Error fetching price for ${symbol}`);
    const res = await response.json();
    const data = JSON.parse(res)
    return parseFloat(data.price || 0);
  } catch (err) {
    console.error(`Error fetching price for ${symbol}:`, err.message);
    return 0; // Fallback price
  }
};

export const fetchbidask = async (symbol) => {

    const excludeList = ['USDC-USDC', 'EUR-USDC']; // List of pairs to exclude
  
    if (excludeList.includes(symbol)) {
      console.warn(`Pair "${symbol}" is excluded from fetching candle data.`);
      return [];
    }
  
    try {
      const response = await fetch(`${ENDPOINTS.BIDASK}/${symbol}`);
      if (!response.ok) throw new Error(`Error fetching price for ${symbol}`);
      const res = await response.json();
      return res
    } catch (err) {
      console.error(`Error fetching price for ${symbol}:`, err.message);
      return 0; // Fallback price
    }
  };

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)); // Utility function for delay

export const fetchCandleData = async (pair, timeframe, delayMs = 100) => {
  const excludeList = ['USDC-USDC', 'EUR-USDC', 'EUR-USD']; // List of pairs to exclude
  if (excludeList.includes(pair)) {
    console.warn(`Pair "${pair}" is excluded from fetching candle data.`);
    return [];
  }
  try {
    await delay(delayMs); // Introduce a delay before making the API call
    const response = await fetch(`http://192.168.1.22:4000/api/candles/${pair}?granularity=${timeframe}`);
    if (!response.ok) throw new Error(`Error fetching candles for pair ${pair} and timeframe ${timeframe}`);
    const data = await response.json();
    return data.map((candle) => ({
      time: candle.time, // X-axis label
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
    })).reverse();;
    
  } catch (err) {
    console.error(`Error fetching candlestick data for ${pair}: ${err.message}`);
    return [];
  }
};



export const fetchOrdersForPair = async (productId) => {

  try {
    const response = await fetch(`${ENDPOINTS.ORDERS}/${productId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch orders for pair: ${productId}`);
    }
    const data = await response.json();

    return data; // Assuming the response includes the `fills` array
  } catch (error) {
    console.error(`Error fetching orders for ${productId}:`, error.message);
    throw error;
  }
};

export const handleTrade = async (baseCurrency, side, size,price) => {
  const product_id = baseCurrency;


  try {
    const response = await fetch(ENDPOINTS.CREATEORDER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id,
        side,
        size,
        price
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create order');
    }

    const order = await response.json();
    const parsed = JSON.parse(order)
    return parsed
  } catch (error) {
    console.error('Error executing trade:', error.message);
  }
};
