import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import Trading from './pages/Trading';
import BotTrading from './pages/BotTrading';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/trading" element={<Trading />} />
          <Route path="/bot-trading" element={<BotTrading />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
