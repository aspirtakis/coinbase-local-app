import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import PropTypes from 'prop-types';
import { fetchCandleData } from '../api/apiCalls';
import { ADX, SMA, RSI } from 'technicalindicators';

const CompositeTrendGauges = ({ pair }) => {
  const [h1CompositeScore, setH1CompositeScore] = useState(0);
  const [d1CompositeScore, setD1CompositeScore] = useState(0);

  const calculateCompositeTrend = async (timeframe, setCompositeScore) => {
    try {
      const candles = await fetchCandleData(pair, timeframe);

      if (!candles.length) {
        setCompositeScore(0);
        return;
      }

      const high = candles.map((c) => parseFloat(c.high));
      const low = candles.map((c) => parseFloat(c.low));
      const close = candles.map((c) => parseFloat(c.close));
      const volume = candles.map((c) => parseFloat(c.volume));

      // ADX Calculation
      const adxInput = { high, low, close, period: 14 };
      const adxValues = ADX.calculate(adxInput);
      const adxScore = adxValues.length ? adxValues[adxValues.length - 1].adx : 0;

      // RSI Calculation
      const rsiValues = RSI.calculate({ values: close, period: 14 });
      const rsiScore = rsiValues.length ? rsiValues[rsiValues.length - 1] : 0;

      // Moving Averages Crossover
      const shortMA = SMA.calculate({ period: 9, values: close });
      const longMA = SMA.calculate({ period: 21, values: close });
      const maCrossoverScore =
        shortMA.length && longMA.length
          ? (shortMA[shortMA.length - 1] > longMA[longMA.length - 1] ? 1 : -1) * 50 + 50
          : 0;

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
      setCompositeScore(normalizedScore);
    } catch (error) {
      console.error(`Error calculating trend for ${pair}:`, error.message);
      setCompositeScore(0);
    }
  };

  useEffect(() => {
    calculateCompositeTrend(3600, setH1CompositeScore); // H1
    calculateCompositeTrend(86400, setD1CompositeScore); // D1
  }, [pair]);

  const generateGaugeOption = (value, title) => ({
    title: {
      text: title,
      left: 'center',
      textStyle: {
        fontSize: 14,
      },
    },
    series: [
      {
        type: 'gauge',
        progress: {
          show: true,
          width: 12,
        },
        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [0.33, '#f46a6a'], // Red (weak trend)
              [0.66, '#f8c200'], // Yellow (moderate trend)
              [1, '#34c38f'], // Green (strong trend)
            ],
          },
        },
        pointer: {
          width: 5,
          length: '70%',
        },
        detail: {
          valueAnimation: true,
          fontSize: 16,
          formatter: '{value}%', // Show percentage value
          offsetCenter: [0, '60%'], // Adjust text position
        },
        data: [
          {
            value: parseFloat(value).toFixed(2), // Limit decimals
            name: 'Trend',
          },
        ],
      },
    ],
  });
  

  return (
    <div>

      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        <div style={{ width: '35%' }}>
          <ReactECharts
            option={generateGaugeOption(h1CompositeScore, 'H1 Composite Trend')}
            style={{ height: 250 }}
          />
        </div>
        <div style={{ width: '35%' }}>
          <ReactECharts
            option={generateGaugeOption(d1CompositeScore, 'D1 Composite Trend')}
            style={{ height: 250 }}
          />
        </div>
      </div>
    </div>
  );
};

CompositeTrendGauges.propTypes = {
  pair: PropTypes.string.isRequired,
};

export default CompositeTrendGauges;
