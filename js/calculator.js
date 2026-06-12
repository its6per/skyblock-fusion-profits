import {
    getBuyPrice,
    getSellPrice,
    getWeeklySellVolume
} from "./bazaar.js";

import {
    getFuseAmount,
    getInternalId
} from "./shards.js";

import { applyHunterFortune } from "./modifierEngine.js";

export function calculateFusion({
    recipes,
    ratesData,
    shards,
    bazaarProducts,
    affectsData
}) {

    const results = [];

    for (const outputShard in recipes) {

        const outputRecipes = recipes[outputShard];

        for (const outputAmount in outputRecipes) {

            const recipeList = outputRecipes[outputAmount];

            for (const recipe of recipeList) {

                const shard1 = recipe[0];
                const shard2 = recipe[1];

                // -------------------------
                // BASE RATE
                // -------------------------
                const baseRateRaw = ratesData?.[shard1];
                if (baseRateRaw === undefined) continue;

                const baseRate = Number(baseRateRaw);
                if (!isFinite(baseRate)) continue;

                // -------------------------
                // HUNTER FORTUNE
                // -------------------------
                const fortuneResult = applyHunterFortune(
                    baseRate,
                    shard1,
                    affectsData
                );

                if (!fortuneResult) continue;

                const grindRate = Number(fortuneResult.effectiveRate);
                if (!isFinite(grindRate)) continue;

                // -------------------------
                // BUY VOLUME (shard2 demand)
                // -------------------------
                const internalBuyId = getInternalId(shards, shard2);

                const weeklySellVolume =
                    Number(getWeeklySellVolume(bazaarProducts, internalBuyId)) || 0;

                const hourlyBuyVolume = weeklySellVolume / 168;

                if (!isFinite(hourlyBuyVolume)) continue;

                // -------------------------
                // FUSE AMOUNTS
                // -------------------------
                const fuseAmount1 = Number(getFuseAmount(shards, shard1)) || 1;
                const fuseAmount2 = Number(getFuseAmount(shards, shard2)) || 1;

                // -------------------------
                // NORMALIZE TO FUSION UNITS
                // (THIS is what fixes your confusion)
                // -------------------------
                const grindUnitsPerHour = grindRate / fuseAmount1;
                const marketUnitsPerHour = hourlyBuyVolume / fuseAmount2;

                const bottleneckUnits = Math.min(
                    grindUnitsPerHour,
                    marketUnitsPerHour
                );

                const fusionRate = Math.floor(bottleneckUnits);

                if (fusionRate <= 0) continue;

                // -------------------------
                // OUTPUT
                // -------------------------
                const grindAmount = fusionRate * fuseAmount1;
                const buyAmount = fusionRate * fuseAmount2;

                const outputAmountPerHour =
                    fusionRate * Number(outputAmount || 0);

                // -------------------------
                // PRICES
                // -------------------------
                const internalOutputId = getInternalId(shards, outputShard);

                const buyPrice =
                    Number(getBuyPrice(bazaarProducts, internalBuyId)) || 0;

                const sellPrice =
                    Number(getSellPrice(bazaarProducts, internalOutputId)) || 0;

                const costToBuy = buyAmount * buyPrice;
                const revenue = outputAmountPerHour * sellPrice;

                const profitPerHour = revenue - costToBuy;

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

    return results
        .sort((a, b) => b.profitPerHour - a.profitPerHour)
        .slice(0, 25);
}