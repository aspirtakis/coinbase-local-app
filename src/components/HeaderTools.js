import React from 'react';
import { Row, Col } from 'reactstrap';
import ReactECharts from 'echarts-for-react';
import CandlestickChart from '../components/CandlestickChart';

const HeaderTools = ({ accounts ,selectedPair}) => {
  // Calculate total USD balance
  const totalBalance = accounts.reduce(
    (sum, account) => sum + account.usdValue,
    0
  );

  // Format data for the chart
  const chartData = accounts.map((account) => ({
    name: account.name,
    value: Number(account.usdValue).toFixed(2), // Keep the actual USD value here
  }));

  // Pie chart options
  const pieOption = {
    title: { text: 'Balance Distribution', left: 'center' },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ${c} ({d}%)', // Show actual USD value and percentage
    },
    legend: { orient: 'vertical', left: 'left' },
    series: [
      {
        name: 'Balance',
        type: 'pie',
        radius: '50%',
        data: chartData, // Use actual USD values for the pie chart
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  return (
    <Row className="mb-4">
       
      <Col sm="4">
      Total Balance $: {Number(totalBalance).toFixed(2)}
        <ReactECharts option={pieOption} style={{ height: 300 }} />
      </Col>

      <Col sm="8">
              {/* Candlestick Chart */}
              {selectedPair ? (
                <CandlestickChart pair={selectedPair} />
              ) : (
                <p>Select a currency pair from the table to view its candlestick chart.</p>
              )}
            </Col>
    </Row>
  );
};

export default HeaderTools;
