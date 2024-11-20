import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { fetchCandleData } from '../api/apiCalls';
import { ButtonGroup, Button, Label, Form, FormGroup, Input, Row, Col } from 'reactstrap';




const CandlestickChart = ({ pair }) => {
  const [candles, setCandles] = useState([]);
  const [timeframe, setTimeframe] = useState('3600'); // Default to H1 (1-hour)
  const [inputPair, setInputPair] = useState(pair); // State to store the user input

  const handleInputChange = (e) => {
    setInputPair(e.target.value);
  };

  const handleUpdatePair = async () => {
    if (inputPair.trim() !== '') {
      const data = await fetchCandleData(inputPair, timeframe);
      setCandles(data.reverse()); // Reverse to ensure chronological order
    }
  };
  // Map timeframes to human-readable labels
  const timeframeMapping = {

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
    setInputPair(pair)
  }, [pair, timeframe]);


  // ECharts candlestick chart options
  const options = {
    title: {
      text: `${inputPair} Candlestick Chart`,
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
      

      <Row>
        <Col style={{marginLeft:50}}>
        
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
      </ButtonGroup></Col>
        <Col>
          <Input
            type="text"
            id="pairInput"
            placeholder="e.g., BTC-USD"
            value={inputPair}
            onChange={handleInputChange}
          />

        </Col>
        <Col>
          <Button color="primary" className="ml-2" onClick={handleUpdatePair}>
            Update Chart
          </Button>
        </Col>
        <Col>

        </Col>

      </Row>



      <ReactECharts option={options} style={{ height: 300 }} />

    </div>
  );
};

export default CandlestickChart;
