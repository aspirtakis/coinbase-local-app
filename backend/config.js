module.exports = {
    trading: {
        enterPropability: 50, // Minimum probability for entering a trade
        enterAmmount: 25, // Amount to trade
        timeframe: 3600, // Timeframe for candles (e.g., H1)
        delayBetweenProducts: 500, // Delay between product checks (ms)
        apiRateLimitDelay: 100, // Additional delay for API rate limiting (ms)
    },
    account: {
        minUSDCBalance: 25, // Minimum USDC balance required to start trading
    },
    retrading: {
        minUSDCValue: 30, // Minimum USDC value to consider
        lossThreshold: 8, // Loss threshold percentage
        timeframe: 3600, // Timeframe in seconds
        fibonacciRange: 0.02, // 2% range for Fibonacci retracement
        pairProcessingDelay: 500, // Delay between processing pairs
        candleProcessingDelay: 100, // Delay during candle data fetch
      },

      closing: {
        closePercent: 10, // Profit percentage threshold for closing
        topClosePercent: 30, // Threshold for aggressive closure
        frame: 3600, // Timeframe in seconds
        accountProcessingDelay: 500, // Delay between processing accounts
        candleProcessingDelay: 300, // Delay during candle data fetch
        resistanceTolerance: 0.01, // 1% tolerance around resistance
      },
};
