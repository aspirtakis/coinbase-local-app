const WebSocket = require('ws');
const crypto = require('crypto');



const keys = {
    "name": "organizations/0dd6ee11-0100-4223-ae4b-b1a7a47ed36a/apiKeys/7cfff769-62d2-44cc-8cbe-07eaa7cd2a31",
    "privateKey": "-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEIJQ6B1UFZtXcEqkrZ6aMH/IOzYVsbWVQNpj9F08mgAk2oAoGCCqGSM49\nAwEHoUQDQgAEA5qlLpTZuz7sEQPJT+N218o5M+HjDYoeeT5REGUrnFVDk7Yy9SX3\ntNtFelGWF+JBQtRkcG6Uq9GacH8ytfFdfA==\n-----END EC PRIVATE KEY-----\n"
  }
  const ACCESS_KEY = keys.name;

  const PASSPHRASE = "7cfff769-62d2-44cc-8cbe-07eaa7cd2a31";
  const SECRET_KEY = keys.privateKey;


  const WebSocket = require('ws');
  const crypto = require('crypto');
  require('dotenv').config(); // To load environment variables from a `.env` file
  
  // Load environment variables


  const SVC_ACCOUNTID = process.env.SVC_ACCOUNTID;
  
  // WebSocket URI and other configuration
  const URI = 'wss://ws-feed.prime.coinbase.com';
  const CHANNEL = 'l2_data';
  const PRODUCT_IDS = ['ETH-USD'];
  
  // Function to generate the signature
  function generateSignature(channel, key, secret, accountId, productIds, timestamp) {
      const message = channel + key + accountId + timestamp + productIds.join('');
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(message);
      return hmac.digest('base64');
  }
  
  // WebSocket listener function
  async function startWebSocket() {
      const timestamp = Math.floor(Date.now() / 1000).toString();
  
      // Generate the signature
      const signature = generateSignature(CHANNEL, ACCESS_KEY, SECRET_KEY, SVC_ACCOUNTID, PRODUCT_IDS, timestamp);
  
      // Subscription message
      const subscribeMessage = {
          type: 'subscribe',
          channel: CHANNEL,
          access_key: ACCESS_KEY,
          api_key_id: SVC_ACCOUNTID,
          timestamp: timestamp,
          passphrase: PASSPHRASE,
          signature: signature,
          venue_filtering: false,
          product_ids: PRODUCT_IDS
      };
  
      const ws = new WebSocket(URI);
  
      ws.on('open', () => {
          console.log('WebSocket connected');
          console.log('Sending subscription message...');
          ws.send(JSON.stringify(subscribeMessage));
      });
  
      ws.on('message', (data) => {
          try {
              const parsedData = JSON.parse(data);
              console.log('Received message:', JSON.stringify(parsedData, null, 2));
          } catch (err) {
              console.error('Error parsing message:', err.message);
          }
      });
  
      ws.on('close', (code, reason) => {
          console.log(`WebSocket closed. Code: ${code}, Reason: ${reason}`);
          console.log('Reconnecting...');
          setTimeout(startWebSocket, 1000); // Reconnect after 1 second
      });
  
      ws.on('error', (error) => {
          console.error('WebSocket error:', error.message);
      });
  }
  
  // Start the WebSocket listener
  startWebSocket();
  