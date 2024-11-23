import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ReactECharts from 'echarts-for-react';
import { getADX } from '../utils/tradingUtils';
const ADXGauge = ({ pair }) => {
  const [adxH1, setAdxH1] = useState(null);
  const [adxD1, setAdxD1] = useState(null);


  const fetchADX = async (frame) => {
    const { adx, reason } = await getADX(pair, frame);
  
    if (adx) {
      // console.log(`${frame}The ADX value is: ${adx}`);
    } else {
      // console.log(`Failed to fetch ADX: ${reason}`);
    }
    return adx
  };

  useEffect(() => {
    if (pair) {
      fetchADX(3600).then(res => setAdxH1(res)); // H1 timeframe
      fetchADX(86400).then(res => setAdxD1(res)); // D1 timeframe
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
            option={generateGaugeOptions(adxH1 ,"ADX H1")}
            style={{ height: '200px' }}
          />
    
        </div>
        <div style={{ width: '25%' }}>
          <ReactECharts
            option={generateGaugeOptions(adxD1 ,"ADX D1")}
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
