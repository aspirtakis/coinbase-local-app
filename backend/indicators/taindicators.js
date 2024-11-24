
const { ADX, RSI, SMA ,ATR} = require('technicalindicators'); // Import required indicators
const {fetchCandleData,fetchPrice} = require('../functions'); // Import your candle fetching function
const { BollingerBands } = require('technicalindicators');


const getADX = async (candles) => {
  try {
    // Fetch candle dat

    if (!candles || candles.length < 14) {
      return { adx: null, reason: 'Not enough data for ADX calculation (minimum 14 candles required).' };
    }

    // Extract high, low, and close prices
    const highPrices = candles.map((c) => parseFloat(c.high));
    const lowPrices = candles.map((c) => parseFloat(c.low));
    const closePrices = candles.map((c) => parseFloat(c.close));

    // Calculate ADX
    const adxValues = ADX.calculate({
      high: highPrices,
      low: lowPrices,
      close: closePrices,
      period: 14, // ADX period
    });

    if (!adxValues || adxValues.length === 0) {
      return { adx: null, reason: 'Failed to calculate ADX.' };
    }

    // Return the latest ADX value
    const latestAdx = adxValues[adxValues.length - 1]?.adx;
    return {
      adx: latestAdx || null,
      reason: latestAdx ? 'Success' : 'No Data',
    };
  } catch (error) {
    console.error(`Error calculating ADX for pair ${pair} and timeframe ${timeframe}:`, error.message);
    return { adx: null, reason: 'Error' };
  }
};


const calculateSupportResistanceFibonacci = async (candles) => {
    try {
      if (!candles || candles.length === 0) {
        throw new Error('No candles provided for calculation');
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
      console.error(`Error calculating support/resistance and Fibonacci:`, error.message);
      return null;
    }
  };
  
  const calculateTrend = async (candles) => {
    try {
      // Ensure candles are in chronological order and have enough data
      if (!candles || candles.length < 21) {
        return {
          trendDirection: 'No Data',
          trendStrength: '0%',
          details: { shortMA: null, longMA: null, adx: null, slope: null },
        };
      }
  
      // Extract price data
      const high = candles.map((c) => parseFloat(c.high));
      const low = candles.map((c) => parseFloat(c.low));
      const close = candles.map((c) => parseFloat(c.close));
  
      // Moving Averages
      const shortMA = SMA.calculate({ period: 9, values: close });
      const longMA = SMA.calculate({ period: 21, values: close });
  
      // Ensure both MAs are available
      if (shortMA.length < 2 || longMA.length < 1) {
        return {
          trendDirection: 'No Data',
          trendStrength: '0%',
          details: { shortMA: shortMA[shortMA.length - 1] || null, longMA: null, adx: null, slope: null },
        };
      }
  
      // Determine trend direction based on moving averages
      const maDirection =
        shortMA[shortMA.length - 1] > longMA[longMA.length - 1]
          ? 'UP'
          : shortMA[shortMA.length - 1] < longMA[longMA.length - 1]
          ? 'DOWN'
          : 'SIDEWAYS';
  
      // ADX (Average Directional Index) for trend strength
      const adxValues = ADX.calculate({ high, low, close, period: 14 });
      const adxScore = adxValues.length > 0 ? adxValues[adxValues.length - 1].adx : 0;
  
      // Calculate the slope of the short moving average
      const shortMASlope =
        (shortMA[shortMA.length - 1] - shortMA[shortMA.length - 2]) /
        ((shortMA[shortMA.length - 1] + shortMA[shortMA.length - 2]) / 2); // Normalize by average MA
  
      // Scale slope to percentage
      const slopeScore = Math.abs(shortMASlope) * 100;
  
      // Combine ADX and slope into a composite trend strength
      const trendStrength = Math.min(
        100,
        adxScore * 0.7 + slopeScore * 0.3 // ADX contributes 70%, slope contributes 30%
      );
  
      return {
        trendDirection: maDirection,
        trendStrength: `${trendStrength.toFixed(2)}%`, // Format as percentage
        details: {
          shortMA: shortMA[shortMA.length - 1],
          longMA: longMA[longMA.length - 1],
          adx: adxScore.toFixed(2),
          slope: slopeScore.toFixed(2),
        },
      };
    } catch (error) {
      console.error("Error calculating trend:", error.message);
      return { trendDirection: 'Error', trendStrength: '0%', details: {} };
    }
  };


  const calculateCompositeTrend = async (pair) => {
    try {
      const calculateTrendScore = async (timeframe) => {
        // Fetch candle data for the specific timeframe
        const candlesraw = await fetchCandleData(pair, timeframe);
        const candles = candlesraw.sort((a, b) => new Date(a.time) - new Date(b.time));

        // const timestamps = candles.map((c) => c.time); // Extract timestamps
        // console.log("First Candle:", timestamps[0]);
        // console.log("Last Candle:", timestamps[timestamps.length - 1]);
  
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
  

 





 



const detectATRSignal = async (pair, timeframe) => {
  try {
    // Fetch candle data
    const candlesraw = await fetchCandleData(pair, timeframe);
    const candles = candlesraw.sort((a, b) => new Date(a.time) - new Date(b.time));

    if (!candles || candles.length < 20) {
      return {
        pair,
        signal: 'None',
        reason: 'Not enough data for ATR calculation (minimum 20 candles required).',
      };
    }

    // Extract high, low, and close prices
    const high = candles.map((c) => parseFloat(c.high));
    const low = candles.map((c) => parseFloat(c.low));
    const close = candles.map((c) => parseFloat(c.close));

    // Ensure there are at least 14 periods for ATR calculation
    if (high.length < 14 || low.length < 14 || close.length < 14) {
      return {
        pair,
        signal: 'None',
        reason: 'Not enough data for ATR calculation (minimum 14 periods required).',
      };
    }

    // Calculate ATR
    const atrValues = ATR.calculate({ high, low, close, period: 14 });

    if (!atrValues || atrValues.length === 0) {
      return {
        pair,
        signal: 'None',
        reason: 'Failed to calculate ATR.',
      };
    }

    const latestATR = atrValues[atrValues.length - 1]; // Latest ATR value

    // Fetch the latest market price
    const latestPrice = await fetchPrice(pair);

    if (!latestPrice || isNaN(latestPrice)) {
      return {
        pair,
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
        priceChange: priceChange.toFixed(4),
        latestPrice: latestPrice.toFixed(4),
        prevPrice: prevPrice.toFixed(4),
        reason: `ATR breakout detected. Price moved ${priceChange.toFixed(
          4
        )} which is greater than ATR ${latestATR.toFixed(4)}.`,
      };
    } else {
      return {
        pair,
        signal: 'None',
        atr: latestATR,
        priceChange: priceChange.toFixed(4),
        latestPrice: latestPrice.toFixed(4),
        prevPrice: prevPrice.toFixed(4),
        reason: `No breakout. Price moved ${priceChange.toFixed(
          4
        )}, within ATR ${latestATR.toFixed(4)}.`,
      };
    }
  } catch (error) {
    console.error(`Error detecting ATR signal for ${pair}:`, error.message);
    return {
      pair,
      signal: 'Error',
      reason: 'Failed to fetch data or calculate ATR.',
    };
  }
};

const detectBollingerBandsSignal = async (pair, timeframe, candledata = []) => {
  try {
    const TIMEFRAMES = {
      H1: 3600,
      H6: 21600,
      D1: 86400,
    };

    // Helper to calculate Bollinger Bands signal for a single timeframe
    const calculateBollingerSignal = async (candles, frame) => {



      if (!candles || candles.length < 20) {
        return {
          frame,
          signal: 'None',
          reason: `Not enough data for Bollinger Bands calculation (minimum 20 candles required) on ${frame}.`,
          bands: null,
        };
      }

      const close = candles.slice(-20).map((c) => parseFloat(c.close));

      const bbInput = {
        period: 20,
        values: close,
        stdDev: 2,
      };

      const bbValues = BollingerBands.calculate(bbInput);
      if (!bbValues || bbValues.length === 0) {
        return {
          frame,
          signal: 'None',
          reason: `Failed to calculate Bollinger Bands on ${frame}.`,
          bands: null,
        };
      }

      const latestBB = bbValues[bbValues.length - 1];
      const latestPrice = parseFloat(candles[candles.length - 1].close);

      const bands = {
        upper: latestBB.upper,
        middle: latestBB.middle,
        lower: latestBB.lower,
      };

      if (latestPrice > latestBB.upper) {
        return {
          frame,
          signal: 'Sell',
          reason: `Price above upper band (${latestBB.upper.toFixed(2)}) on ${frame}.`,
          bands,
        };
      } else if (latestPrice < latestBB.lower) {
        return {
          frame,
          signal: 'Buy',
          reason: `Price below lower band (${latestBB.lower.toFixed(2)}) on ${frame}.`,
          bands,
        };
      } else {
        return {
          frame,
          signal: 'None',
          reason: `Price within Bollinger Bands (Upper: ${latestBB.upper.toFixed(
            2
          )}, Lower: ${latestBB.lower.toFixed(2)}, Middle: ${latestBB.middle.toFixed(
            2
          )}) on ${frame}.`,
          bands,
        };
      }
    };

    // Process multi-frame analysis
    const results = await Promise.all(
      Object.entries(TIMEFRAMES).map(async ([frame, seconds]) => {
        const candlesraw = candledata.length > 0 ? candledata : await fetchCandleData(pair, seconds);
        const candles = candlesraw.sort((a, b) => new Date(a.time) - new Date(b.time));
        return await calculateBollingerSignal(candles, frame);
      })
    );

    // Combine results using weighted scoring
    const weights = { H1: 0.4, H6: 0.3, D1: 0.3 };
    const signalScores = { Buy: 0, Sell: 0 };

    results.forEach(({ signal, frame }) => {
      if (signal === 'Buy' || signal === 'Sell') {
        signalScores[signal] += weights[frame];
      }
    });

    const combinedSignal =
      signalScores.Buy > signalScores.Sell
        ? { signal: 'Buy', confidence: (signalScores.Buy * 100).toFixed(2) }
        : signalScores.Sell > signalScores.Buy
        ? { signal: 'Sell', confidence: (signalScores.Sell * 100).toFixed(2) }
        : { signal: 'None', confidence: '0.00' };

    return {
      pair,
      combinedSignal,
      details: results,
    };
  } catch (error) {
    console.error('Error detecting Bollinger Bands signal:', error.message);
    return {
      signal: 'Error',
      reason: 'Failed to calculate Bollinger Bands for multiple timeframes.',
    };
  }
};




const multipleTimeframeAnalysis = async (pair) => {

const config = {
    timeframes: {
      H1: 3600, // 1 hour
      H6: 21600, // 6 hours
      D1: 86400, // 1 day
    },
    thresholds: {
      rsiOverbought: 80,
      rsiOversold: 35,
      adxStrong: 30, // Minimum ADX to consider a strong trend
    },
    weights: {
      H1: 0.2, // Weight for H1 signals
      H6: 0.4, // Weight for H6 signals
      D1: 0.4, // Weight for D1 signals
    },
  };
  try {
    const results = await Promise.all(
      Object.entries(config.timeframes).map(async ([label, timeframe]) => {
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
        if (rsi < config.thresholds.rsiOversold && trendDirection === 'UP' && adx > config.thresholds.adxStrong) {
          signal = 'Buy';
          reason += ' | RSI is oversold, trend is UP, and ADX indicates strong trend';
        } else if (rsi > config.thresholds.rsiOverbought && trendDirection === 'DOWN' && adx > config.thresholds.adxStrong) {
          signal = 'Sell';
          reason += ' | RSI is overbought, trend is DOWN, and ADX indicates strong trend';
        } else {
          reason += ' | No strong signal detected';
        }

        return { timeframe: label, signal, reason, rsi, adx, trendDirection };
      })
    );

    // Combine signals from all timeframes
    const combinedSignals = results.reduce(
      (acc, res) => {
        const weight = config.weights[res.timeframe] || 0;
        if (res.signal === 'Buy') acc.buy += weight;
        if (res.signal === 'Sell') acc.sell += weight;
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

    const overallConfidence = Math.max(combinedSignals.buy, combinedSignals.sell) * 100;

    const overallReason = combinedSignals.reasons.join(' | ');

    return {
      pair,
      combinedSignal: { signal: overallSignal, confidence: overallConfidence.toFixed(2) },
      details: results,
      reason: overallReason,
    };
  } catch (error) {
    console.error('Error performing multiple timeframe analysis:', error.message);
    return {
      pair,
      combinedSignal: { signal: 'Error', confidence: 0 },
      details: [],
      reason: 'Error during analysis',
    };
  }
};



const detectCandlestickReversalSignal = async (pair, candles) => {
  try {

    // Check if candles data is valid and has enough data points
    if (!candles || candles.length < 2) {
      return { pair, signal: 'None', reason: 'Insufficient data' };
    }
    const chronologicalCandles = candles
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

    const isTweezerTop = () => high === prevHigh;
    const isTweezerBottom = () => low === prevLow;

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


const calculateProbabilityBasedSignal = async (pair, frame, candles) => {
    try {
      // Configuration for thresholds and weights
      const config = {
        thresholds: {
          compositeTrendH1: 30, // Composite trend strength threshold for H1
          probabilityBuy: 30,   // Probability required for "Buy" signal
          probabilityNeutral: 5, // Probability required for "Neutral" signal
        },
        weights: {
          compositeTrend: 25, // Trend strength and ADX combined
          atrSignal: 15,      // ATR breakout
          bollingerSignal: 10, // Bollinger Band Reversal
          multipleFrameAnalysis: 20, // Multi-timeframe Confirmation
          candlestickSignal: 30, // Reversal Patterns
        },
      };
  
      // Step 1: Fetch all required signals
      const compositeTrend = await calculateCompositeTrend(pair);
      const atrSignal = await detectATRSignal(pair, frame);
      const bollingerSignal = await detectBollingerBandsSignal(pair);
      const multipleFrameAnalysis = await multipleTimeframeAnalysis(pair);
      const candlestickReversalSignal = await detectCandlestickReversalSignal(pair, candles);
  
      const reasons = [];
      let probability = 0;
  
      // Composite Trend Signal
      if (compositeTrend.H1 > config.thresholds.compositeTrendH1) {
        probability += config.weights.compositeTrend;
        reasons.push(`Composite Trend is strong on H1: ${compositeTrend.details.H1.trend}`);
      }
  
      // ATR Signal
      if (atrSignal.signal === "Buy") {
        probability += config.weights.atrSignal;
        reasons.push(`ATR breakout detected: ${atrSignal.reason}`);
      }
  
      // Bollinger Bands Signal
      if (bollingerSignal.signal === "Buy") {
        probability += config.weights.bollingerSignal;
        reasons.push(`Bollinger Band reversal detected: ${bollingerSignal.reason}`);
      }
  
      // Multi-timeframe Analysis
      if (multipleFrameAnalysis.signal === "Buy") {
        probability += config.weights.multipleFrameAnalysis;
        reasons.push(`Multi-timeframe confirmation: ${multipleFrameAnalysis.reason}`);
      }
  
      // Candlestick Reversal Patterns
      if (candlestickReversalSignal.signal === "Buy") {
        probability += config.weights.candlestickSignal;
        reasons.push(`Candlestick reversal pattern detected: ${candlestickReversalSignal.reason}`);
      }
  
      // Final Signal Decision
      const finalSignal =
        probability >= config.thresholds.probabilityBuy
          ? "Buy"
          : probability >= config.thresholds.probabilityNeutral
          ? "Neutral"
          : "None";
  
      // Return final signal, probability, and reasoning
      return {
        pair,
        signal: finalSignal,
        probability: probability.toFixed(2),
        reasons: reasons.join(" | "),
        details: {
          compositeTrend,
          atrSignal,
          bollingerSignal,
          multipleFrameAnalysis,
          candlestickReversalSignal,
        },
      };
    } catch (error) {
      console.error(`Error calculating probability-based signal for ${pair}:`, error.message);
      return {
        pair,
        signal: "Error",
        probability: 0,
        reasons: "Error during calculations.",
      };
    }
  };
  
  
  
module.exports = {calculateProbabilityBasedSignal ,detectCandlestickReversalSignal,multipleTimeframeAnalysis,detectBollingerBandsSignal,detectATRSignal,calculateTrend,calculateCompositeTrend,calculateSupportResistanceFibonacci,getADX };
