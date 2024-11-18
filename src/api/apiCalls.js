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

export const fetchPrice = async (symbol) => {
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

export const fetchCandleData = async (pair ,timeframe) => {
console.log(pair)
  try {
    const response = await fetch("http://localhost:4000/api/candles/"+pair+"?granularity="+timeframe);
    if (!response.ok) throw new Error(`Error fetching candles for timeframe ${timeframe}`);
    const data = await response.json();
    // Transform data to match chart.js candlestick format
    return data.map((candle) => ({
      time: candle.time, // X-axis label
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
    }));
  } catch (err) {
    console.error(`Error fetching candlestick data: ${err.message}`);
    return [];
  }
};