import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { fetchCandleData } from '../api/apiCalls';
import { ButtonGroup, Button } from 'reactstrap';

const CandlestickChart = ({ pair }) => {
  const [candles, setCandles] = useState([]);
  const [timeframe, setTimeframe] = useState('3600'); // Default to H1 (1-hour)

  // Map timeframes to human-readable labels
  const timeframeMapping = {
    '900': 'M15', // 15 minutes
    '3600': 'H1', // 1 hour
    '86400': 'D1', // 1 day
  };

  // Fetch candlestick data when the pair or timeframe changes
  useEffect(() => {
    const fetchCandles = async () => {
      const data = await fetchCandleData(pair, timeframe);
      setCandles(data.reverse()); // Reverse to ensure chronological order
    };

    fetchCandles();
  }, [pair, timeframe]);

  // ECharts candlestick chart options
  const options = {
    title: {
      text: `${pair} Candlestick Chart`,
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
    },
    xAxis: {
      type: 'category',
      data: candles.map((candle) => candle.time),
      boundaryGap: true,
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitArea: {
        show: true,
      },
    },
    dataZoom: [
      {
        type: 'inside', // Zoom with mouse scroll or pinch gestures
        start: 70,
        end: 100,
      },
      {
        type: 'slider', // Adds a slider below the chart
        start: 70,
        end: 100,
      },
    ],
    series: [
      {
        name: 'Price',
        type: 'candlestick',
        data: candles.map((candle) => [candle.open, candle.close, candle.low, candle.high]),
        itemStyle: {
          color: '#00C49F', // Green for rising prices
          color0: '#FF6384', // Red for falling prices
          borderColor: '#00C49F',
          borderColor0: '#FF6384',
        },
      },
    ],
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <ButtonGroup>
          {Object.entries(timeframeMapping).map(([key, label]) => (
            <Button
              key={key}
              color={timeframe === key ? 'primary' : 'secondary'}
              onClick={() => setTimeframe(key)}
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
      </div>
      <ReactECharts option={options} style={{ height: 400 }} />
    </div>
  );
};

export default CandlestickChart;
