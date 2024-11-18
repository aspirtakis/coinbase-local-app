const express = require('express');
const cors = require('cors');
const client = require('./coinbaseClient'); // Import the reusable Coinbase client

const app = express();
app.use(cors());
app.use(express.json());



// Endpoint to fetch account data
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await client.listAccounts({});
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error.message);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Endpoint to fetch product details
app.get('/api/product/:productId', async (req, res) => {
  const { productId } = req.params;
  try {
    // Use the SDK's method to fetch product details
    const product = await client.getProduct({ productId: productId });
    res.json(product); // Return the product details
  } catch (error) {
    console.error(`Error fetching product data for ${productId}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch product data' });
  }
});

app.get('/api/candles/:productId', async (req, res) => {
  const { productId } = req.params;
  const { granularity } = req.query;

  const GRANULARITY_MAP = {
    60: 'ONE_MINUTE',
    300: 'FIVE_MINUTES',
    900: 'FIFTEEN_MINUTES',
    3600: 'ONE_HOUR',
    86400: 'ONE_DAY',
  };

  try {
    const granularityString = GRANULARITY_MAP[parseInt(granularity, 10)];
    if (!granularityString) {
      throw new Error(`Invalid granularity value: ${granularity}`);
    }

    const now = Math.floor(Date.now() / 1000);
    const end = now;
    const start = now - parseInt(granularity, 10) * 300;

    console.log('Fetching candles with:', { productId, start, end, granularity: granularityString });

    // Fetch candles
    const rawResponse = await client.getPublicProductCandles({
      productId,
      granularity: granularityString,
      start: start.toString(),
      end: end.toString(),
    });

    console.log('Raw response from SDK:', rawResponse);

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
      time: new Date(start * 1000).toISOString(),
      low: parseFloat(low),
      high: parseFloat(high),
      open: parseFloat(open),
      close: parseFloat(close),
    }));

    res.json(formattedCandles);
  } catch (error) {
    console.error(`Error fetching candles for ${productId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});




// Start server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
