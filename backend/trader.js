const { calculateProbabilityBasedSignal, detectCandlestickReversalSignal, multipleTimeframeAnalysis, getADX, calculateSupportResistanceFibonacci, calculateCompositeTrend, calculateTrend, detectATRSignal, detectBollingerBandsSignal } = require('./indicators/taindicators');
const { createOrders, fetchProducts, filterActivePairs, getAccountsWithUsdcValueAboveOne, fetchAccounts, calculatePairProfit, fetchCandleData, handleFetchOrdersBuys, fetchPrice } = require('./functions');

(async () => {
    const config = { enterPropability: 50, enterAmmount: 50 };

    const frame = 3600;

    // Helper delay function
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    console.log("Starting trading bot...");
    while (true) {
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

                if (usdcbalance > config.enterAmmount) {
                    console.log("THERE IS FREE BALANCE START TRADING");

                    // Use for...of to enable delay between products
                    for (const product of usdctradeblepairs) {
                        await delay(5000); // 3-second delay between each product

                        try {
                            const candlesnrev = await fetchCandleData(product.product_id, frame);
                            const candles = candlesnrev.reverse();
                            const signal = await calculateProbabilityBasedSignal(product.product_id, frame, candles);

                            if (signal.signal === "Buy" && signal.probability > config.enterPropability) {
                                const openbuys = await handleFetchOrdersBuys(signal.pair);
                                if (openbuys.length > 0) {
                                    console.log(openbuys.length + " = THERE ARE OPEN BUYS ABORT TRADING");
                                } else {
                                    console.log("ENTERING TRADE FOR " + signal.pair);
                                     await createOrders(signal.pair, "BUY", 10,[]);
                                
                                }
                            } else {
                                console.log("NO SIGNAL FOR " + product.product_id);
                            }
                        } catch (error) {
                            console.error(`Error processing product ${product.product_id}:`, error.message);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error in trading loop:", error.message);
        }

        console.log("Waiting 10 seconds before starting next iteration...");
        await delay(350000); // 10-second delay after all processing is complete
    }
})();


