export const calculateRSI = (closingPrices, period = 14) => {
    if (closingPrices.length < period) return null;
  
    let gains = 0;
    let losses = 0;
  
    for (let i = 1; i <= period; i++) {
      const change = closingPrices[i] - closingPrices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
  
    const avgGain = gains / period;
    const avgLoss = losses / period;
  
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  };
  