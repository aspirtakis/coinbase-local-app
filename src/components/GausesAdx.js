import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ReactECharts from 'echarts-for-react';
import { fetchCandleData } from '../api/apiCalls';
import { ADX } from 'technicalindicators';

const ADXGauge = ({ pair }) => {
  const [adxH1, setAdxH1] = useState(null);
  const [adxD1, setAdxD1] = useState(null);

  // Fetch ADX data
  const fetchADX = async (timeframe, setAdx) => {
    try {
      const candles = await fetchCandleData(pair, timeframe);
      if (candles.length === 0) {
        setAdx('No Data');
        return;
      }

      const highPrices = candles.map((c) => parseFloat(c.high));
      const lowPrices = candles.map((c) => parseFloat(c.low));
      const closePrices = candles.map((c) => parseFloat(c.close));

      const adxValue = ADX.calculate({
        high: highPrices,
        low: lowPrices,
        close: closePrices,
        period: 14,
      }).pop()?.adx;

      setAdx(adxValue || 'No Data');
    } catch (error) {
      console.error(`Error fetching ADX for timeframe ${timeframe}:`, error.message);
      setAdx('Error');
    }
  };

  // Fetch data for H1 and D1
  useEffect(() => {
    if (pair) {
      fetchADX(3600, setAdxH1); // H1 timeframe
      fetchADX(86400, setAdxD1); // D1 timeframe
    }
  }, [pair]);

  // Generate gauge options
  const generateGaugeOptions = (value, title) => ({
    tooltip: {
      formatter: `{a} <br/>{b}: {c}%`, // Add % sign for percentage clarity
    },
    series: [
      {
        name: title,
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        center: ['50%', '60%'],
        radius: '100%',
        min: 0,
        max: 100,
        splitNumber: 5,
        axisLine: {
          lineStyle: {
            width: 10,
            color: [
              [0.25, '#f46a6a'], // Weak trend (Red)
              [0.75, '#f8b425'], // Moderate trend (Yellow)
              [1, '#34c38f'],   // Strong trend (Green)
            ],
          },
        },
        pointer: {
          width: 4,
        },
        title: {
          offsetCenter: [0, '75%'], // Move title closer to center
          fontSize: 14,
          color: '#555', // Subtle text color
        },
        detail: {
          valueAnimation: true,
          formatter: '{value}%', // Show percentage
          offsetCenter: [0, '35%'], // Adjust for better placement
          fontSize: 18,
          color: '#000',
        },
        data: [
          {
            value: parseFloat(value).toFixed(2), // Limit value to 2 decimal places
            name: title,
          },
        ],
      },
    ],
  });
  

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        <div style={{ width: '25%' }}>
            
          <ReactECharts
            option={generateGaugeOptions(adxH1 )}
            style={{ height: '200px' }}
          />
    
        </div>
        <div style={{ width: '25%' }}>
          <ReactECharts
            option={generateGaugeOptions(adxD1)}
            style={{ height: '200px' }}
          />
     
        </div>
      </div>
    </div>
  );
};

ADXGauge.propTypes = {
  pair: PropTypes.string.isRequired,
};

export default ADXGauge;
