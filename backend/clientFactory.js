const { RESTClient } = require('../advanced-sdk-ts/dist/rest');
const keys = require('./keys.json'); // Load keys from the JSON file

/**
 * Create a RESTClient for a specific account by name.
 * @param {string} accountName - The name identifier for the account.
 * @returns {RESTClient} - The initialized RESTClient.
 */
const getClientByName = (accountName) => {
  const account = keys.accounts[accountName];
  if (!account) {
    throw new Error(`Account "${accountName}" not found.`);
  }

  const { apiKey, apiSecret } = account;
  return new RESTClient(apiKey, apiSecret);
};

module.exports = getClientByName;
