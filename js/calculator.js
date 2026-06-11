import { getBuyPrice, getSellPrice, getWeeklySellVolume } from "./bazaar.js";
import { getFuseAmount, getInternalId } from "./shards.js";

export function calculateFusion({
    recipes,
    ratesData,
    shards,
    bazaarProducts
}) {

    const results = [];

    for (const outputShard in recipes) {

        const outputRecipes = recipes[outputShard];

        for (const outputAmount in outputRecipes) {

            const recipeList = outputRecipes[outputAmount];

            for (const recipe of recipeList) {

                // LEFT = GRIND
                const shard1 = recipe[0];

                // RIGHT = BUY
                const shard2 = recipe[1];

                // -------------------------
                // Rates
                // -------------------------

                const grindRate =
                    ratesData[shard1] || 0;

                const weeklySellVolume =
                    getWeeklySellVolume(
                        bazaarProducts,
                        getInternalId(shards, shard2)
                    );

                const hourlyBuyVolume =
                    weeklySellVolume / 168;

                // -------------------------
                // Fuse amounts
                // -------------------------

                const fuseAmount1 =
                    getFuseAmount(shards, shard1);

                const fuseAmount2 =
                    getFuseAmount(shards, shard2);

                // -------------------------
                // REAL bottleneck
                // -------------------------

                const bottleneckAmount =
                    Math.min(
                        grindRate,
                        hourlyBuyVolume
                    );

                // -------------------------
                // REAL whole fusions
                // -------------------------

                const fusionRate =
                    Math.floor(
                        bottleneckAmount /
                        fuseAmount1
                    );

                // Whole amounts only
                const grindAmount =
                    fusionRate * fuseAmount1;

                const buyAmount =
                    fusionRate * fuseAmount2;

                const outputAmountPerHour =
                    fusionRate *
                    Number(outputAmount);

                // -------------------------
                // Prices
                // -------------------------

                const buyPrice =
                    getBuyPrice(
                        bazaarProducts,
                        getInternalId(shards, shard2)
                    );

                const sellPrice =
                    getSellPrice(
                        bazaarProducts,
                        getInternalId(shards, outputShard)
                    );

                // -------------------------
                // Profit
                // -------------------------

                const costToBuy =
                    buyAmount *
                    buyPrice;

                const revenue =
                    outputAmountPerHour *
                    sellPrice;

                const profitPerHour =
                    revenue - costToBuy;

                results.push({

                    shard1,
                    shard2,
                    outputShard,

                    grindRate,
                    hourlyBuyVolume,

                    fusionRate,

                    grindAmount,
                    buyAmount,
                    outputAmountPerHour,

                    costToBuy,
                    revenue,
                    profitPerHour

                });
            }
        }
    }

    // -------------------------
    // BEST -> WORST
    // -------------------------

    results.sort((a, b) =>
        b.profitPerHour - a.profitPerHour
    );

    // TOP 25
    return results.slice(0, 25);
}