import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { fetchCandleData } from '../api/apiCalls'; // Replace with your actual fetch logic

// Format time for chart x-axis (ISO format)
const formatTimeToXAxis = (time) => new Date(time).toISOString();

const OrderCandlestickChart = ({ pair, orders, timeframe }) => {
  const [candles, setCandles] = useState([]);

  // Fetch candles on component load or when props change
  useEffect(() => {
    const fetchCandles = async () => {
      if (!pair) return;
      try {
        const data = await fetchCandleData(pair, timeframe); // Ensure `fetchCandleData` fetches data in correct format
        setCandles(data.sort((a, b) => new Date(a.time) - new Date(b.time))); // Sort candles by time
      } catch (error) {
        console.error(`Error fetching candles for ${pair}:`, error.message);
      }
    };
    fetchCandles();
  }, [pair, timeframe]);

  // Prepare chart configuration
  const generateChartData = () => {
    if (!candles || candles.length === 0) return {};

    // Prepare candlestick data
    const candlestickData = candles.map((candle) => [
      parseFloat(candle.open),
      parseFloat(candle.close),
      parseFloat(candle.low),
      parseFloat(candle.high),
    ]);
    const timeData = candles.map((candle) => formatTimeToXAxis(candle.time));

    // Prepare buy and sell orders
    const buyOrders = orders
      .filter((order) => order.side === 'BUY')
      .map((order) => ({
        value: [formatTimeToXAxis(order.trade_time), parseFloat(order.price)],
        itemStyle: { color: 'blue' },
        symbolSize: 8,
      }));

    const sellOrders = orders
      .filter((order) => order.side === 'SELL')
      .map((order) => ({
        value: [formatTimeToXAxis(order.trade_time), parseFloat(order.price)],
        itemStyle: { color: 'yellow' },
        symbolSize: 8,
      }));

    // Return the ECharts configuration
    return {
      title: {
        text: `Candlestick & Orders for ${pair}`,
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      xAxis: {
        type: 'category',
        data: timeData,
        boundaryGap: true,
        axisLabel: {
          formatter: (value) => value.split('T')[1].slice(0, 8), // Show only time (HH:mm:ss)
        },
      },
      yAxis: {
        type: 'value',
        scale: true,
      },
      dataZoom: [
        { type: 'inside', start: 80, end: 100 },
        { type: 'slider', start: 80, end: 100 },
      ],
      series: [
        {
          name: 'Candlestick',
          type: 'candlestick',
          data: candlestickData,
          itemStyle: {
            color: '#FF0000', // Red for rising candles
            color0: '#00FF00', // Green for falling candles
            borderColor: '#FF0000',
            borderColor0: '#00FF00',
          },
        },
        {
          name: 'BUY Orders',
          type: 'scatter',
          data: buyOrders,
          symbol: 'circle',
        },
        {
          name: 'SELL Orders',
          type: 'scatter',
          data: sellOrders,
          symbol: 'triangle',
        },
      ],
    };
  };

  return (
    <ReactECharts
      option={generateChartData()}
      style={{ height: 400, width: '100%' }}
      notMerge={true}
      lazyUpdate={true}
    />
  );
};

export default OrderCandlestickChart;
