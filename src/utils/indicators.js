// utils/indicators.js
export const calculateRSI = (prices, period = 14) => {
    if (prices.length < period) return null;
    let gains = 0, losses = 0;
  
    for (let i = 1; i < period + 1; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
  
    const avgGain = gains / period;
    const avgLoss = losses / period;
  
    if (avgLoss === 0) return 100; // RSI = 100 if no losses
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  };
  
  // Simple Moving Average
  export const calculateSMA = (prices, period) => {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  };
  
  // Exponential Moving Average
  export const calculateEMA = (prices, period) => {
    if (prices.length < period) return null;
    const multiplier = 2 / (period + 1);
    let ema = calculateSMA(prices.slice(0, period), period);
  
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
  
    return ema;
  };
  
  // MACD
  export const calculateMACD = (prices, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) => {
    const shortEMA = calculateEMA(prices, shortPeriod);
    const longEMA = calculateEMA(prices, longPeriod);
    const macdLine = shortEMA - longEMA;
    const signalLine = calculateEMA([macdLine], signalPeriod);
    const histogram = macdLine - signalLine;
  
    return { macdLine, signalLine, histogram };
  };
  
  // Bollinger Bands
  export const calculateBollingerBands = (prices, period = 20, stdDevMultiplier = 2) => {
    if (prices.length < period) return null;
    const sma = calculateSMA(prices, period);
    const stdDev = Math.sqrt(prices.slice(-period).reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period);
    return {
      upperBand: sma + stdDevMultiplier * stdDev,
      lowerBand: sma - stdDevMultiplier * stdDev,
      middleBand: sma,
    };
  };
  
  // Pivot Points
  export const calculatePivotPoints = (candles) => {
    const lastCandle = candles[candles.length - 1];
    const { high, low, close } = lastCandle;
    const pivot = (high + low + close) / 3;
    return {
      pivot,
      resistance1: 2 * pivot - low,
      resistance2: pivot + (high - low),
      support1: 2 * pivot - high,
      support2: pivot - (high - low),
    };
  };
  