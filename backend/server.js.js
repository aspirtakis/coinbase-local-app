const express = require('express');
const cors = require('cors');
const client = require('./coinbaseClient'); // Import the reusable Coinbase client

const { v4: uuidv4 } = require('uuid');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const fetchCandleData = async (pair, granularity) => {
  try {
    const response = await fetch(
      `http://localhost:4000/api/candles/${pair}?granularity=${granularity}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch candles for ${pair} with granularity ${granularity}`);
    }

    const candles = await response.json();
    return candles;
  } catch (error) {
    console.error(`Error fetching candles: ${error.message}`);
    throw error;
  }
};

// ADX API endpoint




// Endpoint to fetch account data
app.get('/api/accounts', async (req, res) => {
  try {
    

    const accounts = await client.listAccounts({limit:250});
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error.message);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

app.get('/api/listproducts', async (req, res) => {
  try {
    await delay(100);
    const accounts = await client.listProducts({product_type:"SPOT"});
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
    await delay(100);
    // Use the SDK's method to fetch product details
    const product = await client.getProduct({ productId: productId });
    res.json(product); // Return the product details
  } catch (error) {
    console.error(`Error fetching product data for ${productId}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch product data' });
  }
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.get('/api/candles/:productId', async (req, res) => {
  const { productId } = req.params;
  const { granularity } = req.query;

  const GRANULARITY_MAP = {
    60: 'ONE_MINUTE',
    300: 'FIVE_MINUTE',
    900: 'FIFTEEN_MINUTE',
    1800: 'THIRTY_MINUTE',
    3600: 'ONE_HOUR',
    21600: 'SIX_HOUR',
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


    await delay(100);

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


app.get('/api/orders/:product_id', async (req, res) => {
  const { product_id } = req.params;

  try {
    await delay(100);
    const trades = await client.listFills({ product_id });
    res.json(JSON.parse(trades));
  } catch (error) {
    console.error(`Error fetching trades for ${product_id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

app.get('/api/bidask/:product_id', async (req, res) => {
  const { product_id } = req.params;
  try {
    
    await delay(100);
    const trades = await client.getProductBook({ product_id });


    res.json(JSON.parse(trades));
  } catch (error) {
    console.error(`Error fetching trades for ${product_id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});


app.post('/api/create-order',async (req, res) => {
  const { product_id, side, size, price } = req.body;

  if (!product_id || !side || !size) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }


  const client_order_id =  uuidv4(); // Generate a unique ID for the order
  const orderConfiguration =
    side === 'SELL'
      ? {
          market_market_ioc: {
            base_size: size, // Use base size for market sell
          },
        }
      : {
          market_market_ioc: {
            quote_size: size, // Use quote size for market buy
          },
        };
  try {
    const order = await client.createOrder({
      client_order_id,
      product_id,
      side,
      order_configuration: orderConfiguration,
    });
    res.status(200).json(order); // Return the created order
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }

});


// Start server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
