import { fetchPrice, fetchOrdersForPair, listProducts } from "../api/apiCalls";
import { ADX, SMA, RSI,ATR } from 'technicalindicators';
import { fetchCandleData } from '../api/apiCalls';
import { StochasticRSI } from 'technicalindicators';
import { BollingerBands } from 'technicalindicators'; // Import Bollinger Bands from technicalindicators


// Function to calculate VWAP
const calculateVWAP = (candles) => {
  let cumulativeVolume = 0;
  let cumulativeVolumeWeightedPrice = 0;

  candles.forEach((candle) => {
    const typicalPrice = (parseFloat(candle.high) + parseFloat(candle.low) + parseFloat(candle.close)) / 3;
    const volume = parseFloat(candle.volume);

    cumulativeVolume += volume;
    cumulativeVolumeWeightedPrice += typicalPrice * volume;
  });

  return cumulativeVolume ? cumulativeVolumeWeightedPrice / cumulativeVolume : 0;
};

// Function to calculate Scalping Strategy
const scalpingStrategy = (candles, stochasticPeriod = 14, kPeriod = 3, dPeriod = 3) => {
  const closePrices = candles.map((candle) => parseFloat(candle.close));
  const vwap = calculateVWAP(candles);

  // Calculate Stochastic RSI
  const stochasticRSI = StochasticRSI.calculate({
    values: closePrices,
    rsiPeriod: stochasticPeriod,
    stochasticPeriod: stochasticPeriod,
    kPeriod: kPeriod,
    dPeriod: dPeriod,
  });

  const lastStochasticRSI = stochasticRSI[stochasticRSI.length - 1];
  const price = closePrices[closePrices.length - 1];

  if (!lastStochasticRSI) return { signal: 'No Data', vwap };

  const { k, d } = lastStochasticRSI;

  // Determine Signal
  let signal = 'None';

  if (price > vwap && k < 20 && d < 20 && k > d) {
    signal = 'Long'; // Price above VWAP and Stochastic RSI crosses upwards in oversold
  } else if (price < vwap && k > 80 && d > 80 && k < d) {
    signal = 'Short'; // Price below VWAP and Stochastic RSI crosses downwards in overbought
  }

  return { signal, vwap, stochasticRSI: lastStochasticRSI };
};

export const executeScalpingStrategy = async (pair, timeframe) => {
  try {
    // Fetch candles for the given pair and timeframe
    const candles = await fetchCandleData(pair, timeframe);
    
    // Ensure enough data exists for the strategy
    if (!candles || candles.length < 20) {
      console.log(`Not enough data for scalping strategy on ${pair}`);
      return null; // Return null when data is insufficient
    }
    const result = scalpingStrategy(candles);

    
    if (result.signal) {
      return {
        pair,
        signal: result.signal,
        vwap: result.vwap,
        stochasticRSI: result.stochasticRSI,
      };
    }
    return null;
  } catch (error) {
    console.error(`Error executing scalping strategy for ${pair}:`, error.message);
    return null; // Return null on error
  }
};
export const handleFetchPrice = async (pair) => {
  try {
    const price = await fetchPrice(pair);
    return (price);
  } catch (error) {
    console.error('Error fetching price:', error.message);
  }
};

export const handleFetchOrders = async (pair) => {
  try {
    const ordersRes = await fetchOrdersForPair(pair);
    const orders = ordersRes.fills;

    const buysUntilSell = [];
    for (const order of orders) {
      if (order.side === 'SELL') break;
      if (order.side === 'BUY') buysUntilSell.push(order);
    }

    const mergedOrders = buysUntilSell.reduce((acc, order) => {
      const { order_id, price, size, trade_time } = order;
      if (!acc[order_id]) {
        acc[order_id] = {
          orderId: order_id,
          price: parseFloat(price),
          amount: parseFloat(size),
          tradeTime: new Date(trade_time).toLocaleString(),
          commission: parseFloat(order.commission || 0), // Include commission if available
        };
      } else {
        acc[order_id].amount += parseFloat(size);
        acc[order_id].commission += parseFloat(order.commission || 0);
      }
      return acc;
    }, {});
    const makis = Object.values(mergedOrders)
    return makis;
  } catch (error) {
    console.error('Error fetching orders:', error.message);
  }
};

export const calculateCompositeTrend = async (pair) => {
  try {
    // Helper to calculate individual trend scores
    const calculateTrendScore = async (timeframe) => {
      const candles = await fetchCandleData(pair, timeframe);

      if (candles.length === 0) {
        return { trend: 0, details: {} }; // Return 0 if no data is available
      }

      const high = candles.map((candle) => parseFloat(candle.high));
      const low = candles.map((candle) => parseFloat(candle.low));
      const close = candles.map((candle) => parseFloat(candle.close));
      const volume = candles.map((candle) => parseFloat(candle.volume));

      // ADX Calculation
      const adxInput = { high, low, close, period: 14 };
      const adxValues = ADX.calculate(adxInput);
      const adxScore = adxValues.length > 0 ? adxValues[adxValues.length - 1].adx : 0;

      // RSI Calculation
      const rsiValues = RSI.calculate({ values: close, period: 14 });
      const rsiScore = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : 0;

      // Moving Averages Crossover
      const shortMA = SMA.calculate({ period: 9, values: close });
      const longMA = SMA.calculate({ period: 21, values: close });
      const maCrossoverScore =
        shortMA.length > 0 && longMA.length > 0
          ? (shortMA[shortMA.length - 1] > longMA[longMA.length - 1] ? 1 : -1) * 50 + 50
          : 0; // Normalize to range 0-100

      // Volume Trend
      const avgVolume = volume.reduce((sum, v) => sum + v, 0) / volume.length;
      const volumeTrendScore = volume[volume.length - 1] > avgVolume ? 100 : 0;

      // Composite Score
      const compositeScore =
        0.3 * adxScore +
        0.2 * rsiScore +
        0.3 * maCrossoverScore +
        0.2 * volumeTrendScore;

      // Normalize to 0–100
      const normalizedScore = Math.min(100, Math.max(0, compositeScore));

      return {
        trend: normalizedScore,
        details: {
          adx: adxScore,
          rsi: rsiScore,
          maCrossover: maCrossoverScore,
          volumeTrend: volumeTrendScore,
        },
      };
    };

    // Calculate trends for H1 and D1
    const h1Result = await calculateTrendScore(3600); // H1 (1 hour in seconds)
    const d1Result = await calculateTrendScore(86400); // D1 (1 day in seconds)

    return {
      H1: h1Result.trend,
      D1: d1Result.trend,
      details: {
        H1: h1Result.details,
        D1: d1Result.details,
      },
    };
  } catch (error) {
    console.error(`Error calculating composite trends for ${pair}:`, error.message);
    return { H1: 0, D1: 0, details: {} }; // Return 0 if an error occurs
  }
};



export const calculateTrend = async (pair, timeframe) => {
  try {
    const candles = await fetchCandleData(pair, timeframe);

    if (candles.length === 0) {
      return { trendStrength: 0, trendDirection: 'No Data' };
    }

    const high = candles.map((candle) => parseFloat(candle.high));
    const low = candles.map((candle) => parseFloat(candle.low));
    const close = candles.map((candle) => parseFloat(candle.close));
    const volume = candles.map((candle) => parseFloat(candle.volume));

    // ADX Calculation
    const adxInput = { high, low, close, period: 14 };
    const adxValues = ADX.calculate(adxInput);
    const lastAdx = adxValues.length > 0 ? adxValues[adxValues.length - 1] : {};
    const adxScore = lastAdx.adx || 0;

    // +DI and -DI from ADX
    const trendDirection =
      lastAdx.plusDI > lastAdx.minusDI
        ? 'UP'
        : lastAdx.minusDI > lastAdx.plusDI
          ? 'DOWN'
          : 'SIDEWAYS';

    // RSI Calculation
    const rsiValues = RSI.calculate({ values: close, period: 14 });
    const rsiScore = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : 0;

    // Moving Averages Crossover
    const shortMA = SMA.calculate({ period: 9, values: close });
    const longMA = SMA.calculate({ period: 21, values: close });
    const maCrossoverDirection =
      shortMA.length > 0 && longMA.length > 0
        ? shortMA[shortMA.length - 1] > longMA[longMA.length - 1]
          ? 'UP'
          : 'DOWN'
        : 'UNKNOWN';

    // Volume Trend
    const avgVolume = volume.reduce((sum, v) => sum + v, 0) / volume.length;
    const volumeTrend = volume[volume.length - 1] > avgVolume ? 'UP' : 'DOWN';

    // Composite Trend Strength
    const compositeStrength =
      0.3 * adxScore +
      0.2 * rsiScore +
      0.3 * (maCrossoverDirection === 'UP' ? 100 : 0) +
      0.2 * (volumeTrend === 'UP' ? 100 : 0);

    return {
      trendStrength: Math.min(100, Math.max(0, compositeStrength)), // Normalize to 0–100
      trendDirection, // Primary direction from ADX
    };
  } catch (error) {
    console.error(`Error calculating trend for ${pair}:`, error.message);
    return { trendStrength: 0, trendDirection: 'Error' };
  }
};


export const calculateSupportResistanceFibonacci = async (pair, timeframe) => {
  try {
    // Fetch candle data
    const candles = await fetchCandleData(pair, timeframe);

    if (!candles || candles.length === 0) {
      throw new Error('No candles found for the specified pair and timeframe');
    }

    // Extract highs and lows
    const highPrices = candles.map((c) => parseFloat(c.high));
    const lowPrices = candles.map((c) => parseFloat(c.low));

    // Calculate recent high and low
    const recentHigh = Math.max(...highPrices);
    const recentLow = Math.min(...lowPrices);

    // Support and Resistance Levels
    const resistance = recentHigh; // Main resistance level (most recent high)
    const support = recentLow; // Main support level (most recent low)

    // Fibonacci Retracement Levels
    const fibLevels = [0.236, 0.382, 0.5, 0.618, 0.786];
    const retracements = fibLevels.map((level) => ({
      level: (recentHigh - recentLow) * level + recentLow, // Below the high
      percent: `${(level * 100).toFixed(1)}%`,
    }));

    // Fibonacci Extension Levels
    const extensions = fibLevels.map((level) => ({
      level: recentHigh + (recentHigh - recentLow) * level, // Above the high
      percent: `${(level * 100).toFixed(1)}%`,
    }));

    // Return the calculated levels
    return {
      resistance,
      support,
      retracements, // Fibonacci retracement levels
      extensions, // Fibonacci extension levels
    };
  } catch (error) {
    console.error(`Error calculating support/resistance and Fibonacci for ${pair}:`, error.message);
    return null;
  }
};



export const detectATRSignal = async (pair, timeframe) => {
  try {
    const candles = await fetchCandleData(pair, timeframe);

    if (!candles || candles.length < 20) {
      return {
        signal: 'None',
        message: 'Not enough data for ATR calculation.',
      };
    }

    // Extract high, low, and close data
    const high = candles.map((candle) => parseFloat(candle.high));
    const low = candles.map((candle) => parseFloat(candle.low));
    const close = candles.map((candle) => parseFloat(candle.close));

    // Calculate ATR
    const atrInput = {
      high,
      low,
      close,
      period: 14, // Common ATR period
    };

    const atrValues = ATR.calculate(atrInput);

    if (atrValues.length === 0) {
      return {
        signal: 'None',
        message: 'Failed to calculate ATR.',
      };
    }

    const latestATR = atrValues[atrValues.length - 1]; // Latest ATR value
    const latestPrice = close[close.length - 1];
    const prevPrice = close[close.length - 2];
    const priceChange = Math.abs(latestPrice - prevPrice);

    // Signal detection based on ATR breakout
    if (priceChange > latestATR) {
      return {
        pair,
        signal: latestPrice > prevPrice ? 'Buy' : 'Sell',
        atr: latestATR,
        priceChange,
        latestPrice,
        prevPrice,
        message: `ATR breakout detected. Price moved ${priceChange.toFixed(
          2
        )} which is greater than ATR ${latestATR.toFixed(2)}.`,
      };
    } else {
      return {
        pair,
        signal: 'None',
        atr: latestATR,
        priceChange,
        latestPrice,
        prevPrice,
        message: `No breakout. Price moved ${priceChange.toFixed(
          2
        )}, within ATR ${latestATR.toFixed(2)}.`,
      };
    }
  } catch (error) {
    console.error('Error detecting ATR signal:', error.message);
    return {
      signal: 'Error',
      message: 'Failed to fetch data or calculate ATR.',
    };
  }
};




export const detectBollingerBandsSignal = async (pair, timeframe) => {
  try {
    const candles = await fetchCandleData(pair, timeframe);

    if (!candles || candles.length < 20) {
      return {
        signal: 'None',
        message: 'Not enough data for Bollinger Bands calculation.',
      };
    }

    // Extract closing prices
    const close = candles.map((candle) => parseFloat(candle.close));

    // Calculate Bollinger Bands
    const bbInput = {
      period: 20, // Common Bollinger Bands period
      values: close,
      stdDev: 2, // Standard deviation multiplier
    };

    const bbValues = BollingerBands.calculate(bbInput);

    if (bbValues.length === 0) {
      return {
        signal: 'None',
        message: 'Failed to calculate Bollinger Bands.',
      };
    }

    const latestBB = bbValues[bbValues.length - 1]; // Latest Bollinger Bands values
    const latestPrice = close[close.length - 1];

    // Signal detection based on Bollinger Bands breakout
    if (latestPrice > latestBB.upper) {
      return {
        pair,
        signal: 'Sell',
        latestPrice,
        upperBand: latestBB.upper,
        lowerBand: latestBB.lower,
        message: `Price above upper Bollinger Band (${latestBB.upper.toFixed(
          2
        )}). Consider selling.`,
      };
    } else if (latestPrice < latestBB.lower) {
      return {
        pair,
        signal: 'Buy',
        latestPrice,
        upperBand: latestBB.upper,
        lowerBand: latestBB.lower,
        message: `Price below lower Bollinger Band (${latestBB.lower.toFixed(
          2
        )}). Consider buying.`,
      };
    } else {
      return {
        pair,
        signal: 'None',
        latestPrice,
        upperBand: latestBB.upper,
        lowerBand: latestBB.lower,
        message: `Price within Bollinger Bands (Upper: ${latestBB.upper.toFixed(
          2
        )}, Lower: ${latestBB.lower.toFixed(2)}). No breakout.`,
      };
    }
  } catch (error) {
    console.error('Error detecting Bollinger Bands signal:', error.message);
    return {
      signal: 'Error',
      message: 'Failed to fetch data or calculate Bollinger Bands.',
    };
  }
};



export const multipleTimeframeAnalysis = async (pair) => {
  const timeframes = {
    H1: 3600, // 1 hour
    H6: 21600, // 6 hours
    D1: 86400, // 1 day
  };

  try {
    const results = await Promise.all(
      Object.entries(timeframes).map(async ([label, timeframe]) => {
        const candles = await fetchCandleData(pair, timeframe);

        if (!candles || candles.length < 20) {
          return { timeframe: label, signal: 'None' };
        }

        // Extract high, low, close
        const high = candles.map((candle) => parseFloat(candle.high));
        const low = candles.map((candle) => parseFloat(candle.low));
        const close = candles.map((candle) => parseFloat(candle.close));

        // RSI Calculation
        const rsiValues = RSI.calculate({ values: close, period: 14 });
        const rsi = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;

        // ADX Calculation
        const adxValues = ADX.calculate({ high, low, close, period: 14 });
        const adx = adxValues.length > 0 ? adxValues[adxValues.length - 1].adx : null;

        // Trend Direction
        const lastPrice = close[close.length - 1];
        const prevPrice = close[close.length - 2];
        const trendDirection = lastPrice > prevPrice ? 'UP' : 'DOWN';

        // Signal Detection Logic
        let signal = 'None';
        if (rsi < 30 && trendDirection === 'UP') {
          signal = 'Buy';
        } else if (rsi > 70 && trendDirection === 'DOWN') {
          signal = 'Sell';
        }

        return { timeframe: label, signal };
      })
    );

    // Combine signals from all timeframes
    const combinedSignals = results.reduce(
      (acc, res) => {
        if (res.signal === 'Buy') acc.buy++;
        if (res.signal === 'Sell') acc.sell++;
        return acc;
      },
      { buy: 0, sell: 0 }
    );

    const overallSignal =
      combinedSignals.buy > combinedSignals.sell
        ? 'Buy'
        : combinedSignals.sell > combinedSignals.buy
        ? 'Sell'
        : 'Neutral';

    return {
      pair,
      signal: overallSignal,
    };
  } catch (error) {
    console.error('Error performing multiple timeframe analysis:', error.message);
    return {
      pair,
      signal: 'Error',
    };
  }
};


export const detectReversalEntrySignal = async (pair, timeframe) => {
  try {
    const candles = await fetchCandleData(pair, timeframe);
    if (!candles || candles.length < 20) {
      return { pair, signal: 'None', reason: 'Insufficient data' };
    }

    // Calculate support and resistance levels
    const { supportLevels, resistanceLevels } = calculateSupportResistanceFibonacci(candles);

    const lastCandle = candles[candles.length - 1];
    const close = parseFloat(lastCandle.close);
    const high = parseFloat(lastCandle.high);
    const low = parseFloat(lastCandle.low);

    let signal = 'None';
    let reason = '';

    // Reversal Detection Logic
    if (close >= supportLevels[supportLevels.length - 1]) {
      signal = 'Buy';
      reason = `Price rebounded from support level ${supportLevels[supportLevels.length - 1].toFixed(2)}`;
    } else if (close <= resistanceLevels[0]) {
      signal = 'Sell';
      reason = `Price rejected at resistance level ${resistanceLevels[0].toFixed(2)}`;
    } else {
      reason = 'No significant reversal detected';
    }

    // Optional: Confirm with candlestick pattern (e.g., hammer, shooting star)
    const isHammer = low < close && close > (high + low) / 2 && (high - close) / (high - low) < 0.4;
    const isShootingStar = high > close && close < (high + low) / 2 && (close - low) / (high - low) < 0.4;

    if (signal === 'Buy' && isHammer) {
      reason += ' | Confirmed by Hammer pattern';
    } else if (signal === 'Sell' && isShootingStar) {
      reason += ' | Confirmed by Shooting Star pattern';
    } else if (signal !== 'None') {
      reason += ' | No strong candlestick pattern for confirmation';
    }

    return { pair, signal, reason };
  } catch (error) {
    console.error(`Error detecting reversal signal for ${pair}:`, error.message);
    return { pair, signal: 'Error', reason: 'Error fetching data or calculations' };
  }
};





export const detectCandlestickReversalSignal = async (pair, timeframe) => {
  try {
    const candles = await fetchCandleData(pair, timeframe);
    if (!candles || candles.length < 20) {
      return { pair, signal: 'None', reason: 'Insufficient data' };
    }

    const { supportLevels, resistanceLevels } = calculateSupportResistanceFibonacci(candles);

    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    const close = parseFloat(lastCandle.close);
    const open = parseFloat(lastCandle.open);
    const high = parseFloat(lastCandle.high);
    const low = parseFloat(lastCandle.low);
    const prevClose = parseFloat(prevCandle.close);
    const prevOpen = parseFloat(prevCandle.open);

    let signal = 'None';
    let reason = '';

    // Helper Functions for Candlestick Patterns
    const isHammer = () => {
      const body = Math.abs(close - open);
      const lowerShadow = open - low > 2 * body;
      const upperShadow = high - Math.max(close, open) < body;
      return body > 0 && lowerShadow && upperShadow;
    };

    const isShootingStar = () => {
      const body = Math.abs(close - open);
      const upperShadow = high - Math.max(close, open) > 2 * body;
      const lowerShadow = Math.min(close, open) - low < body;
      return body > 0 && upperShadow && lowerShadow;
    };

    const isEngulfingBullish = () => open < prevClose && close > prevOpen;
    const isEngulfingBearish = () => open > prevClose && close < prevOpen;

    const isMorningStar = () =>
      prevClose < prevOpen &&
      Math.abs(close - open) < Math.abs(prevClose - prevOpen) &&
      close > prevClose;

    const isEveningStar = () =>
      prevClose > prevOpen &&
      Math.abs(close - open) < Math.abs(prevClose - prevOpen) &&
      close < prevClose;

    // Pattern Recognition and Signal Assignment
    if (isHammer() && close >= supportLevels[supportLevels.length - 1]) {
      signal = 'Buy';
      reason = 'Hammer pattern near support level';
    } else if (isShootingStar() && close <= resistanceLevels[0]) {
      signal = 'Sell';
      reason = 'Shooting Star pattern near resistance level';
    } else if (isEngulfingBullish() && close >= supportLevels[supportLevels.length - 1]) {
      signal = 'Buy';
      reason = 'Bullish Engulfing pattern near support level';
    } else if (isEngulfingBearish() && close <= resistanceLevels[0]) {
      signal = 'Sell';
      reason = 'Bearish Engulfing pattern near resistance level';
    } else if (isMorningStar() && close >= supportLevels[supportLevels.length - 1]) {
      signal = 'Buy';
      reason = 'Morning Star pattern near support level';
    } else if (isEveningStar() && close <= resistanceLevels[0]) {
      signal = 'Sell';
      reason = 'Evening Star pattern near resistance level';
    } else {
      reason = 'No significant candlestick pattern detected';
    }

    return { pair, signal, reason };
  } catch (error) {
    console.error(`Error detecting candlestick reversal signal for ${pair}:`, error.message);
    return { pair, signal: 'Error', reason: 'Error fetching data or calculations' };
  }
};



