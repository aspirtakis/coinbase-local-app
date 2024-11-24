const config = require('./config');
const {
  fetchCandleData,
  getAccountsWithUsdcValueAboveOne,
  fetchAccounts,
  calculatePairProfit,
  fetchPrice,
  createOrders,
} = require('./functions');
const {
  detectCandlestickReversalSignal,
  calculateSupportResistanceFibonacci,
} = require('./indicators/taindicators');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)); // Helper delay function

const closing = async () => {
  console.log("Starting closing process...");

  try {
    const accounts = await fetchAccounts();

    // Filter accounts with USDC value > $1 and exclude BTC
    const usdcAccounts = await getAccountsWithUsdcValueAboveOne(accounts);
    const filteredAccounts = usdcAccounts.filter((acc) => acc.currency !== "BTC");

    for (const account of filteredAccounts) {
      await delay(config.closing.accountProcessingDelay); // Delay between processing accounts

      try {
        const pair = `${account.currency}-USDC`;
        const pairProfit = await calculatePairProfit(pair);

        if (!pairProfit) {
          console.log(`No profit data available for ${pair}`);
          continue;
        }

        const adjustedAmount = account.available_balance.value * 0.999; // Remove 0.1%

        // Check if pair is in profit and exceeds closePercent
        if (pairProfit.isInProfit && pairProfit.profitPercentage > config.closing.closePercent) {
          // Top-level closure if profit exceeds topClosePercent
          if (pairProfit.profitPercentage > config.closing.topClosePercent) {
            console.log(`EXECUTING TOP CLOSE 30% for ${pair}`);
            const order = await createOrders(pair, "SELL", Number(adjustedAmount).toFixed(0));
            console.log("Order Executed:", order);
            continue; // Move to the next account
          }

          const price = await fetchPrice(pair);
          const candlesnrev = await fetchCandleData(pair, config.closing.frame);
          await delay(config.closing.candleProcessingDelay);

          const candles = candlesnrev.reverse();
          const SRS = await calculateSupportResistanceFibonacci(candles);
          const reversals = await detectCandlestickReversalSignal(pair, candles);

          if (!SRS || !reversals) {
            console.log(`Insufficient data for ${pair} to calculate resistance or reversal signals.`);
            continue;
          }

          const resistance = SRS.resistance;
          const tolerance = resistance * config.closing.resistanceTolerance; // Tolerance around resistance

          // Check if the price is within the resistance range and has a sell signal
          if (
            price > resistance - tolerance &&
            price < resistance + tolerance &&
            (reversals.signal === "Sell" || reversals.signal === "None")
          ) {
            console.log(`EXECUTING CLOSING FOR ${pair}`);
            const order = await createOrders(pair, "SELL", Number(adjustedAmount).toFixed(0));
            console.log("Order Executed:", order);
          } else {
            console.log(`${pair} -- ABORTING CLOSING with profit at ${price}`);
            console.log(`Resistance: ${resistance}`);
            console.log(`Reversal Signal: ${reversals.signal}`);
          }
        } else {
          console.log(
            `${pair} - NOT IN PROFIT (${pairProfit.profitPercentage}%). Closing Amount: ${Number(adjustedAmount).toFixed(0)}`
          );
        }
      } catch (innerError) {
        console.error(`Error processing ${account.currency}:`, innerError.message);
      }
    }

    console.log("All orders processed");
    return "End_Closing";
  } catch (error) {
    console.error("Error in closing function:", error.message);
    return "Error";
  }
};

// Execute the script once and exit
(async () => {
  try {
    const result = await closing();
    console.log("Closing script finished with result:", result);
    process.exit(0); // Exit after completing the task
  } catch (error) {
    console.error("Error in closing script:", error.message);
    process.exit(1); // Exit with error status
  }
})();
