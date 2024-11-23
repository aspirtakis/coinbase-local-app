const talib = require('talib');

/**
 * Calculates ADX using TA-Lib.
 * @param {Array} candles - Array of candle objects with high, low, close prices.
 * @returns {Promise<number>} - The latest ADX value.
 */
const calculateADX = async (candles) => {
  try {
    if (candles.length < 14) {
      throw new Error('Not enough data for ADX calculation (minimum 14 candles required).');
    }

    // Extract high, low, and close prices
    const highPrices = candles.map((c) => c.high);
    const lowPrices = candles.map((c) => c.low);
    const closePrices = candles.map((c) => c.close);

    // Use TA-Lib to calculate ADX
    const result = await new Promise((resolve, reject) => {
      talib.execute(
        {
          name: 'ADX',
          startIdx: 0,
          endIdx: highPrices.length - 1,
          high: highPrices,
          low: lowPrices,
          close: closePrices,
          optInTimePeriod: 14, // ADX period
        },
        (err, res) => {
          if (err) reject(err);
          else resolve(res);
        }
      );
    });

    // Return the latest ADX value
    const latestAdx = result.result.outReal[result.result.outReal.length - 1];

    return latestAdx;
  } catch (error) {
    console.error(`Error calculating ADX: ${error.message}`);
    throw error;
  }
};

module.exports = { calculateADX };
