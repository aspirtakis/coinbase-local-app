const config = require('./config');
const {
    calculateProbabilityBasedSignal,
    detectCandlestickReversalSignal,
    multipleTimeframeAnalysis,
    getADX,
    calculateSupportResistanceFibonacci,
    calculateCompositeTrend,
    calculateTrend,
    detectATRSignal,
    detectBollingerBandsSignal,
} = require('./indicators/taindicators');
const {
    createOrders,
    fetchProducts,
    filterActivePairs,
    getAccountsWithUsdcValueAboveOne,
    fetchAccounts,
    calculatePairProfit,
    fetchCandleData,
    handleFetchOrdersBuys,
    fetchPrice,
} = require('./functions');

(async () => {
    const { enterPropability, enterAmmount, timeframe, delayBetweenProducts, apiRateLimitDelay } = config.trading;
    const { minUSDCBalance } = config.account;

    // Helper delay function
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    console.log("Starting trading bot...");

    try {
        console.log("Fetching accounts and products...");

        const accounts = await fetchAccounts();
        const usdcbalan = accounts.accounts.filter((acc) => acc.currency === "USDC")[0].available_balance.value;
        const usdcbalance = Number(usdcbalan).toFixed(2);

        const allproducts = await fetchProducts();
        const parsed = JSON.parse(allproducts);
        const tradablepairs = await filterActivePairs(parsed.products);
        const usdctradeblepairs = tradablepairs.filter((pairs2) => pairs2.quote_currency_id === 'USDC');

        if (tradablepairs) {
            console.log("FREE-USDC=" + usdcbalance);

            if (usdcbalance > minUSDCBalance) {
                console.log("THERE IS FREE BALANCE START TRADING");

                // Use for...of to enable delay between products
                for (const product of usdctradeblepairs) {
                    await delay(delayBetweenProducts); // Delay between each product

                    try {
                        const candlesnrev = await fetchCandleData(product.product_id, timeframe);
                        await delay(apiRateLimitDelay); // Delay for API rate limiting
                        const candles = candlesnrev.reverse();
                        const signal = await calculateProbabilityBasedSignal(product.product_id, timeframe, candles);
                        await delay(apiRateLimitDelay);

                        if (signal.signal === "Buy" && signal.probability > enterPropability) {
                            const openbuys = await handleFetchOrdersBuys(signal.pair);
                            if (openbuys.length > 0) {
                                console.log(`${signal.pair} -- ${openbuys.length} = THERE ARE OPEN BUYS Entering Re TRADING`);
                            } else {
                                console.log(`ENTERING TRADE FOR ${signal.pair} PROB: ${signal.probability}`);
                                const trade = await createOrders(signal.pair, "BUY", enterAmmount, []);
                                console.log(trade);
                            }
                        } else {
                            console.log(`NO SIGNAL FOR ${product.product_id}`);
                        }
                    } catch (error) {
                        console.error(`Error processing product ${product.product_id}:`, error.message);
                    }
                }
            } else {
                console.log(`Not enough USDC balance. Minimum required: $${minUSDCBalance}`);
            }
        }
    } catch (error) {
        console.error("Error in trading execution:", error.message);
    }

    console.log("Trading execution finished. Exiting...");
    process.exit(0); // Exit the script
})();
