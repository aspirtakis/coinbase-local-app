import { fetchPrice, fetchOrdersForPair, listProducts,fetchAccounts } from "../api/apiCalls";
import { ADX, SMA, RSI,ATR,StochasticRSI ,BollingerBands} from 'technicalindicators';
import { fetchCandleData } from '../api/apiCalls';


export const handleFetchPrice = async (pair) => {
  try {
    const price = await fetchPrice(pair);
    return (price);
  } catch (error) {
    console.error('Error fetching price:', error.message);
  }
};




export const getADX = async (pair, timeframe) => {
  try {
    // Fetch candle data for the specified pair and timeframe
    const candles = await fetchCandleData(pair, timeframe);

    if (!candles || candles.length < 14) {
      return { adx: null, reason: 'Not enough data for ADX calculation (minimum 14 candles required).' };
    }
    // Extract high, low, and close prices from the candles
    const highPrices = candles.map((c) => parseFloat(c.high));
    const lowPrices = candles.map((c) => parseFloat(c.low));
    const closePrices = candles.map((c) => parseFloat(c.close));

    // Calculate ADX with smoothing (period 14) and DI Length (14)
    const adxValues = ADX.calculate({
      high: highPrices,
      low: lowPrices,
      close: closePrices,
      period: 14, // ADX Smoothing Period
    });

    if (!adxValues || adxValues.length === 0) {
      return { adx: null, reason: 'Failed to calculate ADX.' };
    }
    // Get the latest ADX value
    const latestAdx = adxValues[adxValues.length - 1]?.adx;

    // Return the calculated ADX value
    return {
      adx: latestAdx || null,
      reason: latestAdx ? 'Success' : 'No Data',
    };
  } catch (error) {
    console.error(`Error fetching ADX for pair ${pair} and timeframe ${timeframe}:`, error.message);
    return { adx: null, reason: 'Error' };
  }
};



export const calculateSupportResistanceFibonacci = async (pair, timeframe,candledata=[]) => {
  try {
    // Fetch candle data
    let candles = candledata.length > 0 ? candledata : await fetchCandleData(pair, timeframe);


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
      const { order_id, price, size, trade_time ,} = order;
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

export const calculateCompositeTrend = async (pair ,candledata=[]) => {
  try {
    const calculateTrendScore = async (timeframe) => {
      let candles = candledata.length > 0 ? candledata : await fetchCandleData(pair, timeframe);

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
        0.6 * adxScore +
        0.1 * rsiScore +
        0.1 * maCrossoverScore +
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



export const calculateTrend = async (candles) => {
  // Format candlestick data into chronological order and extract close prices
  const candlestickData = candles
    .map((c) => [parseFloat(c.open), parseFloat(c.close), parseFloat(c.low), parseFloat(c.high)])
     // Ensure chronological order

  const close = candlestickData.map((c) => c[1]); // Extract the `close` price (index 1)

  if (close.length < 21) {
    return { trendDirection: 'No Data', trendStrength: 0 }; // Ensure enough data for MA calculation
  }

  // Calculate moving averages
  const shortMA = SMA.calculate({ period: 9, values: close });
  const longMA = SMA.calculate({ period: 21, values: close });

  if (shortMA.length === 0 || longMA.length === 0) {
    return { trendDirection: 'No Data', trendStrength: 0 };
  }

  // Determine trend direction based on moving averages
  const maDirection =
    shortMA[shortMA.length - 1] > longMA[longMA.length - 1]
      ? 'UP'
      : shortMA[shortMA.length - 1] < longMA[longMA.length - 1]
      ? 'DOWN'
      : 'SIDEWAYS';

  // Calculate trend strength based on the slope of the short MA
  const maSlope = shortMA[shortMA.length - 1] - shortMA[shortMA.length - 2]; // Difference between the last two points
  const trendStrength = Math.abs(maSlope) * 100; // Normalize strength to 0–100


  return {
    trendDirection: maDirection,
    trendStrength: Math.min(100, Math.max(0, trendStrength.toFixed(2))), // Keep within 0–100 range
  };
};


export const calculateSupportResistanceFibonacci2 = (candles) => {
  if (!candles || candles.length < 20) {
    return { supportLevels: [], resistanceLevels: [] };
  }

  const highPrices = candles.map((c) => parseFloat(c.high));
  const lowPrices = candles.map((c) => parseFloat(c.low));

  const highestHigh = Math.max(...highPrices);
  const lowestLow = Math.min(...lowPrices);

  const range = highestHigh - lowestLow;

  if (range <= 0) {
    return { supportLevels: [], resistanceLevels: [] };
  }

  const supportLevels = [lowestLow, lowestLow + 0.382 * range, lowestLow + 0.618 * range];
  const resistanceLevels = [highestHigh, highestHigh - 0.382 * range, highestHigh - 0.618 * range];

  return { supportLevels, resistanceLevels };
};

export const executeScalpingStrategy = async (pair, timeframe,candledata=[]) => {
  try {
    // Fetch candles for the given pair and timeframe
    let candles = candledata.length > 0 ? candledata : await fetchCandleData(pair, timeframe);

    
    // Ensure enough data exists for the strategy
    if (!candles || candles.length < 20) {
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

export const detectATRSignal = async (pair, timeframe, candledata = []) => {
  try {
    // Fetch candle data if not provided
    let candles = candledata.length > 0 ? candledata : await fetchCandleData(pair, timeframe);

    // Ensure there are at least 20 candles for calculation
    if (!candles || candles.length < 20) {
      return {
        signal: 'None',
        reason: 'Not enough data for ATR calculation (minimum 20 candles required).',
      };
    }

    // Extract high, low, and close data
    const high = candles.map((candle) => parseFloat(candle.high));
    const low = candles.map((candle) => parseFloat(candle.low));
    const close = candles.map((candle) => parseFloat(candle.close));

    // Ensure there are at least 14 periods for ATR calculation
    if (high.length < 14 || low.length < 14 || close.length < 14) {
      return {
        signal: 'None',
        reason: 'Not enough data for ATR calculation (minimum 14 periods required).',
      };
    }

    // Calculate ATR using the `technicalindicators` library
    const atrInput = {
      high,
      low,
      close,
      period: 14, // Common ATR period
    };

    const atrValues = ATR.calculate(atrInput);

    if (!atrValues || atrValues.length === 0) {
      return {
        signal: 'None',
        reason: 'Failed to calculate ATR.',
      };
    }

    const latestATR = atrValues[atrValues.length - 1]; // Latest ATR value

    // Fetch the latest market price
    const latestPrice = await fetchPrice(pair);

    if (!latestPrice || isNaN(latestPrice)) {
      return {
        signal: 'Error',
        reason: 'Failed to fetch the latest price.',
      };
    }

    const prevPrice = close[close.length - 1]; // Last closing price in the candle data
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
        reason: `ATR breakout detected. Price moved ${priceChange.toFixed(
          4
        )} which is greater than ATR ${latestATR.toFixed(4)}.`,
      };
    } else {
      return {
        pair,
        signal: 'None',
        atr: latestATR,
        priceChange,
        latestPrice,
        prevPrice,
        reason: `No breakout. Price moved ${priceChange.toFixed(
          4
        )}, within ATR ${latestATR.toFixed(4)}.`,
      };
    }
  } catch (error) {
    console.error('Error detecting ATR signal:', error.message);
    return {
      signal: 'Error',
      reason: 'Failed to fetch data or calculate ATR.',
    };
  }
};

export const detectBollingerBandsSignal = async (pair, timeframe, candledata = []) => {
  try {
    // Fetch candle data if not provided
    let candles = candledata.length > 0 ? candledata : await fetchCandleData(pair, timeframe);

    // Ensure we have at least 20 candles
    if (!candles || candles.length < 20) {
      return {
        signal: 'None',
        reason: 'Not enough data for Bollinger Bands calculation (minimum 20 candles required).',
      };
    }

    const recentCandles = candles.slice(-20);
    const close = recentCandles.map((candle) => parseFloat(candle.close));

    // Calculate Bollinger Bands
    const bbInput = {
      period: 20, // Fixed period
      values: close,
      stdDev: 2, // Multiplier for standard deviation
    };

    const bbValues = BollingerBands.calculate(bbInput);
    if (!bbValues || bbValues.length === 0) {
      return {
        signal: 'None',
        reason: 'Failed to calculate Bollinger Bands.',
      };
    }

    const latestBB = bbValues[bbValues.length - 1]; // Latest Bollinger Bands values

    // Fetch the latest market price
    const latestPrice = await fetchPrice(pair);

    if (!latestPrice || isNaN(latestPrice)) {
      return {
        signal: 'Error',
        reason: 'Failed to fetch the latest price.',
      };
    }


    // Signal detection based on Bollinger Bands breakout
    if (latestPrice > latestBB.upper) {
      return {
        pair,
        signal: 'Sell',
        latestPrice,
        upperBand: latestBB.upper,
        lowerBand: latestBB.lower,
        reason: `Price above upper Bollinger Band (${latestBB.upper.toFixed(
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
        reason: `Price below lower Bollinger Band (${latestBB.lower.toFixed(
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
        reason: `Price within Bollinger Bands (Upper: ${latestBB.upper.toFixed(
          2
        )}, Lower: ${latestBB.lower.toFixed(2)}). No breakout.`,
      };
    }
  } catch (error) {
    console.error('Error detecting Bollinger Bands signal:', error.message);
    return {
      signal: 'Error',
      reason: 'Failed to fetch data or calculate Bollinger Bands.',
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
          return { timeframe: label, signal: 'None', reason: 'Insufficient data' };
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
        let reason = `RSI: ${rsi}, ADX: ${adx}, Trend: ${trendDirection}`;
        if (rsi < 30 && trendDirection === 'UP') {
          signal = 'Buy';
          reason += ' | RSI is oversold and trend is UP';
        } else if (rsi > 70 && trendDirection === 'DOWN') {
          signal = 'Sell';
          reason += ' | RSI is overbought and trend is DOWN';
        } else {
          reason += ' | No strong reversal detected';
        }

        return { timeframe: label, signal, reason };
      })
    );

    // Combine signals from all timeframes
    const combinedSignals = results.reduce(
      (acc, res) => {
        if (res.signal === 'Buy') acc.buy++;
        if (res.signal === 'Sell') acc.sell++;
        acc.reasons.push(`[${res.timeframe}] ${res.reason}`);
        return acc;
      },
      { buy: 0, sell: 0, reasons: [] }
    );

    const overallSignal =
      combinedSignals.buy > combinedSignals.sell
        ? 'Buy'
        : combinedSignals.sell > combinedSignals.buy
        ? 'Sell'
        : 'Neutral';

    const overallReason = combinedSignals.reasons.join(' | ');

    return {
      pair,
      signal: overallSignal,
      reason: overallReason,
    };
  } catch (error) {
    console.error('Error performing multiple timeframe analysis:', error.message);
    return {
      pair,
      signal: 'Error',
      reason: 'Error during analysis',
    };
  }
};



export const detectReversalEntrySignal = async (pair, timeframe,candledata=[]) => {
  try {
    // Fetch candles for the given pair and timeframe
    let candles = candledata.length > 0 ? candledata : await fetchCandleData(pair, timeframe);


    // Validate candles data
    if (!candles || candles.length < 20) {
      return { pair, signal: 'None', reason: 'Insufficient data for analysis' };
    }

    // Calculate support and resistance levels
    const levels = calculateSupportResistanceFibonacci2(candles);

    // Validate support and resistance levels
    if (!levels || !levels.supportLevels || !levels.resistanceLevels) {
      return { pair, signal: 'None', reason: 'Support/Resistance levels not found' };
    }

    const { supportLevels, resistanceLevels } = levels;

    if (supportLevels.length === 0 || resistanceLevels.length === 0) {
      return { pair, signal: 'None', reason: 'No valid support/resistance levels detected' };
    }

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

    // Optional: Confirm with candlestick patterns
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

export const detectCandlestickReversalSignal = async (pair, timeframe, candledata = []) => {
  try {
    // Fetch or use provided candle data
    const candles =  await fetchCandleData(pair, timeframe);

    // Check if candles data is valid and has enough data points
    if (!candles || candles.length < 2) {
      return { pair, signal: 'None', reason: 'Insufficient data' };
    }

    // Reverse candles to chronological order if necessary
    const chronologicalCandles = candles.slice().reverse();

    // Get the last two candles
    const lastCandle = chronologicalCandles[chronologicalCandles.length - 2];
    const prevCandle = chronologicalCandles[chronologicalCandles.length - 1];

    // Extract required data
    const { open, high, low, close } = lastCandle;
    const { open: prevOpen, close: prevClose, high: prevHigh, low: prevLow } = prevCandle;

    let signal = 'None';
    let reason = '';

    // Helper Functions for Candlestick Patterns
    const isHammer = () => {
      const body = Math.abs(close - open);
      const lowerShadow = Math.min(open, close) - low > 2 * body;
      const upperShadow = high - Math.max(open, close) < body;
      return body > 0 && lowerShadow && upperShadow;
    };

    const isShootingStar = () => {
      const body = Math.abs(close - open);
      const upperShadow = high - Math.max(open, close) > 2 * body;
      const lowerShadow = Math.min(open, close) - low < body;
      return body > 0 && upperShadow && lowerShadow;
    };

    const isBullishEngulfing = () => open < prevClose && close > prevOpen;
    const isBearishEngulfing = () => open > prevClose && close < prevOpen;

    const isDoji = () => {
      const body = Math.abs(close - open);
      const range = high - low;
      return body < 0.1 * range;
    };

    const isMorningStar = () => {
      const firstBody = Math.abs(prevClose - prevOpen);
      const middleBody = Math.abs(prevHigh - prevLow);
      const lastBody = Math.abs(close - open);
      return (
        prevClose < prevOpen &&
        middleBody < firstBody &&
        close > (prevOpen + prevClose) / 2
      );
    };

    const isEveningStar = () => {
      const firstBody = Math.abs(prevClose - prevOpen);
      const middleBody = Math.abs(prevHigh - prevLow);
      const lastBody = Math.abs(close - open);
      return (
        prevClose > prevOpen &&
        middleBody < firstBody &&
        close < (prevOpen + prevClose) / 2
      );
    };

    const isBullishHarami = () => {
      return (
        prevClose < prevOpen &&
        close > open &&
        close <= prevOpen &&
        open >= prevClose
      );
    };

    const isBearishHarami = () => {
      return (
        prevClose > prevOpen &&
        close < open &&
        close >= prevOpen &&
        open <= prevClose
      );
    };

    const isPiercingLine = () => {
      const midpointPrev = (prevOpen + prevClose) / 2;
      return (
        prevClose < prevOpen &&
        open < prevClose &&
        close > midpointPrev &&
        close < prevOpen
      );
    };

    const isDarkCloudCover = () => {
      const midpointPrev = (prevOpen + prevClose) / 2;
      return (
        prevClose > prevOpen &&
        open > prevClose &&
        close < midpointPrev &&
        close > prevOpen
      );
    };

    const isTweezerTop = () => {
      return high === prevHigh;
    };

    const isTweezerBottom = () => {
      return low === prevLow;
    };

    // Pattern Recognition and Signal Assignment
    if (isHammer()) {
      signal = 'Buy';
      reason = 'Hammer pattern detected';
    } else if (isShootingStar()) {
      signal = 'Sell';
      reason = 'Shooting Star pattern detected';
    } else if (isBullishEngulfing()) {
      signal = 'Buy';
      reason = 'Bullish Engulfing pattern detected';
    } else if (isBearishEngulfing()) {
      signal = 'Sell';
      reason = 'Bearish Engulfing pattern detected';
    } else if (isDoji()) {
      signal = 'Indecision';
      reason = 'Doji pattern detected';
    } else if (isMorningStar()) {
      signal = 'Buy';
      reason = 'Morning Star pattern detected';
    } else if (isEveningStar()) {
      signal = 'Sell';
      reason = 'Evening Star pattern detected';
    } else if (isBullishHarami()) {
      signal = 'Buy';
      reason = 'Bullish Harami pattern detected';
    } else if (isBearishHarami()) {
      signal = 'Sell';
      reason = 'Bearish Harami pattern detected';
    } else if (isPiercingLine()) {
      signal = 'Buy';
      reason = 'Piercing Line pattern detected';
    } else if (isDarkCloudCover()) {
      signal = 'Sell';
      reason = 'Dark Cloud Cover pattern detected';
    } else if (isTweezerTop()) {
      signal = 'Sell';
      reason = 'Tweezer Top pattern detected';
    } else if (isTweezerBottom()) {
      signal = 'Buy';
      reason = 'Tweezer Bottom pattern detected';
    } else {
      reason = 'No significant candlestick pattern detected';
    }

    return { pair, signal, reason };
  } catch (error) {
    console.error(`Error detecting candlestick reversal signal for ${pair}:`, error.message);
    return { pair, signal: 'Error', reason: 'Error fetching data or calculations' };
  }
};
export const filterActivePairs = (products) => {
  const filteredPairs = products.filter((product) => {
    const priceChange = parseFloat(product.price_percentage_change_24h.replace('%', ''));
    const volume = parseFloat(product.volume_24h);
    const volumeChange = parseFloat(product.volume_percentage_change_24h.replace('%', ''));

    // Filtering conditions
    const isSignificantPriceChange = Math.abs(priceChange) > 5; // More than ±5% price change
    const isHighVolume = volume > 800000; // Minimum volume threshold
    const isVolumeIncreasing = volumeChange > 10; // More than 10% increase in volume
    return isSignificantPriceChange && isHighVolume && isVolumeIncreasing;
  });

  return filteredPairs;
};

export const calculateAccountTotals = async (accounts) => {
  try {
    let totalInUsdc = 0;
    for (const account of accounts) {
      const currency = account.currency;
      const availableBalance = parseFloat(account.available_balance.value);
      if (availableBalance > 0) {
        const priceInUsdc = await fetchPrice(`${currency}-USDC`);
        totalInUsdc += availableBalance * priceInUsdc;
      }
    }
    const btcPriceInUsdc = await fetchPrice('BTC-USDC');
    const totalInBtc = btcPriceInUsdc > 0 ? totalInUsdc / btcPriceInUsdc : 0;
    return {
      totalInUsdc: parseFloat(totalInUsdc.toFixed(2)), // Rounded to 2 decimal places
      totalInBtc: parseFloat(totalInBtc.toFixed(8)), // Rounded to 8 decimal places
    };
  } catch (error) {
    console.error('Error calculating account totals:', error);
    return { totalInUsdc: 0, totalInBtc: 0 };
  }
};

export const detectThreeLevelSemaforSignal = async (pair, timeframe,candles) => {
  try {
    // Fetch Fibonacci levels using calculateSupportResistanceFibonacci
    const fibData = await calculateSupportResistanceFibonacci(pair, timeframe, candles);

    if (!fibData || !fibData.retracements || !fibData.extensions) {
      return {
        pair,
        signal: 'None',
        reason: 'Fibonacci levels could not be calculated',
        levels: null,
      };
    }

    const { retracements, extensions } = fibData;

    // Validate that there are enough levels
    if (retracements.length < 3 || extensions.length < 3) {
      return {
        pair,
        signal: 'None',
        reason: 'Not enough Fibonacci levels for signal calculation',
        levels: null,
      };
    }

    // Extract Fibonacci Levels for Support (retracements) and Resistance (extensions)
    const supportLevels = retracements.map((r) => r.level); // Fibonacci DN Levels
    const resistanceLevels = extensions.map((e) => e.level); // Fibonacci UP Levels

    // Get the current price of the pair
    const currentPrice = await fetchPrice(pair);

    if (!currentPrice) {
      return {
        pair,
        signal: 'None',
        reason: 'Failed to fetch the current price',
        levels: {
          supportLevels,
          resistanceLevels,
        },
      };
    }

    let signal = 'None';
    let reason = '';

    // Signal Logic for Buy (Support)
    if (currentPrice <= supportLevels[2]) {
      signal = 'Buy';
      reason = `Price is near or below Support Level 3 (${supportLevels[2].toFixed(2)})`;
    } else if (currentPrice <= supportLevels[1]) {
      signal = 'Buy';
      reason = `Price is near or below Support Level 2 (${supportLevels[1].toFixed(2)})`;
    } else if (currentPrice <= supportLevels[0]) {
      signal = 'Buy';
      reason = `Price is near or below Support Level 1 (${supportLevels[0].toFixed(2)})`;
    }

    // Signal Logic for Sell (Resistance)
    if (currentPrice >= resistanceLevels[2]) {
      signal = 'Sell';
      reason = `Price is near or above Resistance Level 3 (${resistanceLevels[2].toFixed(2)})`;
    } else if (currentPrice >= resistanceLevels[1]) {
      signal = 'Sell';
      reason = `Price is near or above Resistance Level 2 (${resistanceLevels[1].toFixed(2)})`;
    } else if (currentPrice >= resistanceLevels[0]) {
      signal = 'Sell';
      reason = `Price is near or above Resistance Level 1 (${resistanceLevels[0].toFixed(2)})`;
    }

    // Return the result with signal, reasoning, and levels
    return {
      pair,
      signal,
      reason,
      levels: {
        supportLevels: {
          level1: supportLevels[0],
          level2: supportLevels[1],
          level3: supportLevels[2],
        },
        resistanceLevels: {
          level1: resistanceLevels[0],
          level2: resistanceLevels[1],
          level3: resistanceLevels[2],
        },
      },
      currentPrice,
      timeframe,
    };
  } catch (error) {
    console.error(`Error detecting 3-Level Semafor signal for ${pair} on ${timeframe}:`, error.message);
    return {
      pair,
      signal: 'Error',
      reason: 'Error during calculations',
      levels: null,
      currentPrice: null,
      timeframe,
    };
  }
};

export const calculatePairProfit = async (pair) => {
  try {
    // Fetch all orders for the given pair
    const orders = await handleFetchOrders(pair);

    if (!orders || orders.length === 0) {
      return {
        orders: 0,
        totalPaymentWithCommission: 0,
        totalProfit: 0,
        profitPercentage: 0,
        isInProfit: false,
      };
    }

    // Fetch the current price of the pair
    const currentPrice = await fetchPrice(pair);

    // Initialize totals
    let totalPaymentWithCommission = 0;
    let totalProfit = 0;

    // Calculate profit for each order
    orders.forEach((order) => {
      const paymentWithCommission = order.amount + order.commission;
      const coinsBought = order.amount / order.price;
      const nowValueUSD = coinsBought * currentPrice;
      const profit = nowValueUSD - paymentWithCommission;

      // Aggregate totals
      totalPaymentWithCommission += paymentWithCommission;
      totalProfit += profit;
    });

    // Determine profit percentage
    const profitPercentage = totalPaymentWithCommission
      ? (totalProfit / totalPaymentWithCommission) * 100
      : 0;

    // Determine if in profit
    const isInProfit = totalProfit > 0;

    // Return results
    return {
      orders: orders.length,
      totalPaymentWithCommission: totalPaymentWithCommission.toFixed(2),
      totalProfitDollars: totalProfit.toFixed(2),
      profitPercentage: profitPercentage.toFixed(2),
      isInProfit,
    };
  } catch (error) {
    console.error(`Error calculating profit for pair ${pair}:`, error.message);
    return {
      orders: 0,
      totalPaymentWithCommission: 0,
      totalProfit: 0,
      profitPercentage: 0,
      isInProfit: false,
    };
  }
};


export const calculateAllPairProfits = async (excludeList = [], accountsData = []) => {
  try {
    // Fetch all accounts
    let profile = accountsData;
    const accounts = profile.accounts;
    // Filter accounts with balances and exclude pairs in the excludeList
    const pairsWithBalances = accounts
      .filter((account) => {
        const balance = parseFloat(account.available_balance.value);
        return balance > 0 && !excludeList.includes(account.currency + "-USDC");
      })
      .map((account) => ({
        pair: account.currency + "-USDC", // Generate pair names like "BTC-USDC"
        balance: parseFloat(account.available_balance.value), // Include the balance
      }));
    const results = [];
    for (const { pair, balance } of pairsWithBalances) {
      const profitData = await calculatePairProfit(pair);
      if (profitData.orders > 0) {
        results.push({
          pair,
          balance, // Include the original pair balance
          ...profitData, // Spread the result of calculatePairProfit into the object
        });
      }
    }
    return results;
  } catch (error) {
    console.error("Error calculating all pair profits:", error.message);
    return [];
  }
};


export const calculateProbabilityBasedSignal = async (pair, timeframe, candledata = []) => {
  try {
    // Fetch or use provided candle data
    const candles = candledata.length > 0 ? candledata : await fetchCandleData(pair, timeframe);

    if (!candles || candles.length < 20) {
      return {
        pair,
        signal: 'None',
        probability: 0,
        reason: 'Insufficient data for analysis.',
      };
    }

    // Reverse candles for chronological order
    const chronologicalCandles = candles.slice().reverse();

    // Step 1: Check ADX for trending market
    const adxSignal = await getADX(pair, timeframe, chronologicalCandles);
    if (adxSignal.adx < 30) {
      return {
        pair,
        signal: 'None',
        probability: 0,
        reason: 'Market is not trending (ADX below 30).',
      };
    }

    // Step 2: Calculate Composite Trend Strength
    const trendSignal = await calculateCompositeTrend(pair, timeframe, chronologicalCandles);
    if (trendSignal.D1 < 25) {
      return {
        pair,
        signal: 'None',
        probability: 0,
        reason: 'Trend strength is weak (below 25).',
      };
    }

    const reasons = [];

    // Step 3: Detect Three-Level Semafor
    const semaforSignal = await detectThreeLevelSemaforSignal(pair, timeframe, candles);

    // Step 4: Bollinger Bands for Reversal Points
    // const bollingerSignal = await detectBollingerBandsSignal(pair, timeframe, candles);
    const reversals = await detectReversalEntrySignal(pair,timeframe,chronologicalCandles)

    // Step 5: Candlestick Patterns
    const candlestickSignal = await detectCandlestickReversalSignal(pair, timeframe, candles);

    // Step 6: Divergence Analysis
    const divergenceSignal = await detectDivergence(pair, timeframe, chronologicalCandles);

    // Updated Weights with ADX and Trend Strength
    const weights = {
      adx: 20,           // 25% weight for strong ADX confirmation
      trendStrength: 20, // 25% weight for trend strength confirmation
      reversal:10,
      candlestick: 20,   // 15% weight
      semafor: 15,       // 10% weight
      divergence: 15,    // 10% weight
    };

    // Calculate the probability
    let probability = 0;

    if (adxSignal.adx >= 30) {
      probability += weights.adx;
      reasons.push(`ADX indicates strong trend (value: ${adxSignal.adx})`);
    }

    if (trendSignal.D1 >= 25) {
      probability += weights.trendStrength;
      reasons.push(`Trend strength is strong (value: ${trendSignal.D1})`);
    }


    if (reversals.signal  === 'Buy') {
      probability += weights.reversal;
      reasons.push(`Reversal Signal (value: ${reversals.reason})`);
    }


    if (candlestickSignal.signal === 'Buy') {
      probability += weights.candlestick;
      reasons.push(`Candlestick pattern signal: ${candlestickSignal.reason}`);
    }

    if (semaforSignal.signal === 'Buy') {
      probability += weights.semafor;
      reasons.push(`Three-Level Semafor signal: ${semaforSignal.reason}`);
    }

    if (divergenceSignal.signal === 'Buy') {
      probability += weights.divergence;
      reasons.push(`Divergence detected: ${divergenceSignal.reason}`);
    }

    // Final Signal Decision
    const finalSignal = probability >= 75 ? 'Buy' : probability >= 35 ? 'Buy' : 'None';

    return {
      pair,
      signal: finalSignal,
      probability,
      reason: reasons.join(' | '),
    };
  } catch (error) {
    console.error(`Error calculating combined signal for ${pair}:`, error.message);
    return {
      pair,
      signal: 'Error',
      probability: 0,
      reason: 'Error during calculations.',
    };
  }
};



export const detectDivergence = async (pair, timeframe, candles) => {
  try {
    // Extract close prices
    const closePrices = candles.map((c) => parseFloat(c.close));
    const highPrices = candles.map((c) => parseFloat(c.high));
    const lowPrices = candles.map((c) => parseFloat(c.low));

    // Calculate RSI
    const rsiValues = RSI.calculate({ values: closePrices, period: 14 });

    if (rsiValues.length < 2) {
      return { signal: 'None', reason: 'Not enough RSI data for divergence.' };
    }

    // Detect divergence
    const lastRSI = rsiValues[rsiValues.length - 1];
    const prevRSI = rsiValues[rsiValues.length - 2];
    const lastPrice = closePrices[closePrices.length - 1];
    const prevPrice = closePrices[closePrices.length - 2];

    if (lastRSI > prevRSI && lastPrice < prevPrice) {
      return {
        signal: 'Buy',
        reason: `Bullish divergence detected (RSI up, price down).`,
      };
    } else if (lastRSI < prevRSI && lastPrice > prevPrice) {
      return {
        signal: 'Sell',
        reason: `Bearish divergence detected (RSI down, price up).`,
      };
    }

    return { signal: 'None', reason: 'No divergence detected.' };
  } catch (error) {
    console.error(`Error detecting divergence for ${pair}:`, error.message);
    return { signal: 'Error', reason: 'Error during divergence analysis.' };
  }
};





