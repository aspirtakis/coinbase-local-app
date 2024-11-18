const express = require('express');

const createCoinbaseRoutes = (client) => {
  const router = express.Router();

  // Route to fetch product details using the client
  router.get('/product/:productId', async (req, res) => {
    const { productId } = req.params;

    try {
      // Use the client to fetch the product data
      const product = await client.getProduct({ product_id: productId }); // Adjust this based on client API method
      res.json(product);
    } catch (error) {
      console.error('Error fetching product data:', error.message);
      res.status(500).json({ error: 'Failed to fetch product data' });
    }
  });

  return router;
};

module.exports = createCoinbaseRoutes;
