const config = require('./config');
const {
  createOrders,
  calculateRetradeSignal,
  fetchAccounts,
  getAccountsWithUsdcValueAboveOne,
  calculatePairProfit,
  fetchCandleData,
} = require('./functions');
const { calculateSupportResistanceFibonacci } = require('./indicators/taindicators');

(async () => {
  const {
    minUSDCValue,
    lossThreshold,
    timeframe,
    fibonacciRange,
    pairProcessingDelay,
    candleProcessingDelay,
    amountmultiplier
  } = config.retrading;

  // Helper delay function
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  console.log("Starting retrading bot...");

  try {
    console.log("Fetching accounts...");
    const accounts = await fetchAccounts();

    // Filter accounts with USDC value > $1
    const usdcAccounts = await getAccountsWithUsdcValueAboveOne(accounts);

    // Filter pairs with more than $30 USDC value
    const tradablePairs = usdcAccounts.filter(
      (account) => account.USDCValue > minUSDCValue
    );

    console.log(`Found ${tradablePairs.length} tradable pairs with USDC > $${minUSDCValue}`);

    for (const pair of tradablePairs) {
      await delay(pairProcessingDelay); // Delay between processing each pair

      try {
        const pairCurrency = `${pair.currency}-USDC`;
        const profitData = await calculatePairProfit(pairCurrency);

        const buyOrders = profitData.orders;
        const lowestBuy = await calculateRetradeSignal(
          pairCurrency,
          profitData.usdcprice,
          buyOrders,
          lossThreshold
        );

        if (lowestBuy.entrySignal && lowestBuy.percentageDifference > lossThreshold) {
          const candlesnrev = await fetchCandleData(pairCurrency, timeframe);
          await delay(candleProcessingDelay);
          const candles = candlesnrev.reverse();

          // Calculate Fibonacci retracements
          const fibs = await calculateSupportResistanceFibonacci(candles);

          // Extract the 61.8% Fibonacci retracement level
          const fib618 = fibs.retracements.find((r) => r.percent === '61.8%');
          if (!fib618) {
            console.error(`61.8% Fibonacci level not found for ${pairCurrency}`);
            continue;
          }

          const fib618Level = fib618.level;

          // Calculate the range around the Fibonacci level
          const lowerBound = fib618Level * (1 - fibonacciRange);
          const upperBound = fib618Level * (1 + fibonacciRange);

          console.log(`Pair: ${pairCurrency}`);
          console.log(`Current Price: ${lowestBuy.currentPrice}`);
          console.log(`61.8% Fibonacci Level: ${fib618Level}`);
          console.log(`Range: ${lowerBound} - ${upperBound}`);
          console.log(`Lowest Order Amount: ${lowestBuy.lowestOrder.amount}`);

          // Check if the current price is within the range
          if (lowestBuy.currentPrice >= lowerBound && lowestBuy.currentPrice <= upperBound) {
            const enterAmount = lowestBuy.lowestOrder.amount * amountmultiplier;

            console.log("Price is within the range. Proceeding with trade...");
            console.log(`Amount to Trade: ${enterAmount}`);

            const trade = await createOrders(
              pairCurrency,
              "BUY",
              Number(enterAmount).toFixed(2),
              []
            );

            console.log("Trade Executed:", trade);
          } else {
            console.log(`Current Price (${lowestBuy.currentPrice}) is not within range. No trade entered.`);
          }
        } else {
          console.log(
            `${pairCurrency} - Threshold not reached. Total Profit: ${profitData.profitPercentage}`
          );
        }
      } catch (innerError) {
        console.error(`Error processing pair ${pair.currency}:`, innerError.message);
      }
    }
  } catch (error) {
    console.error("Error in retrading execution:", error.message);
  }

  console.log("Retrading execution finished. Exiting...");
  process.exit(0); // Exit the script
})();
