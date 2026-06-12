import {
    getBuyPrice,
    getSellPrice,
    getWeeklySellVolume
} from "./bazaar.js";

import {
    getFuseAmount,
    getInternalId
} from "./shards.js";

import { playerModifiers } from "./modifiers.js";

export function calculateFusion({
    recipes,
    ratesData,
    shards,
    bazaarProducts,
    affectsData,
    budget = null
}) {

    const results = [];

    // =========================
    // GLOBAL MODIFIERS
    // =========================

    const seaBonus = (playerModifiers.seaSerpentLevel || 0) * 0.02;
    const tiamatBonus = (playerModifiers.tiamatLevel || 0) * 0.05;

    const serpentStack = 1 + (seaBonus * (1 + tiamatBonus));

    const pythonSpeedMult =
        1 + ((playerModifiers.pythonLevel || 0) * 0.05 * serpentStack);

    const cobraMult =
        1 + ((playerModifiers.kingCobraLevel || 0) * 0.01 * serpentStack);

    const blackHoleEV = playerModifiers.mediumBlackHole ? 1.1 : 1;

    // =========================
    // RECIPES LOOP
    // =========================

    for (const outputShard in recipes) {

        const outputRecipes = recipes[outputShard];

        for (const outputAmountKey in outputRecipes) {

            const recipeList = outputRecipes[outputAmountKey];

            const outputAmount = Number(outputAmountKey) || 0;

            for (const recipe of recipeList) {

                const shard1 = recipe[0];
                const shard2 = recipe[1];

                const baseRate = Number(ratesData?.[shard1]) || 0;
                if (baseRate <= 0) continue;

                // =========================
                // FORTUNE
                // =========================

                let totalFortune = Number(playerModifiers.hunterFortune || 0);

                if (affectsData?.newt_affects?.includes(shard1))
                    totalFortune += (playerModifiers.newtLevel || 0) * 2;

                if (affectsData?.salamander_affects?.includes(shard1))
                    totalFortune += (playerModifiers.salamanderLevel || 0) * 2;

                if (affectsData?.lizard_king_affects?.includes(shard1))
                    totalFortune += (playerModifiers.lizardKingLevel || 0);

                if (affectsData?.leviathan_affects?.includes(shard1))
                    totalFortune += (playerModifiers.leviathanLevel || 0);

                const fortuneMult = 1 + totalFortune / 100;

                // =========================
                // CONDITIONAL MODS
                // =========================

                const pythonMult =
                    affectsData?.python_affects?.includes(shard1)
                        ? pythonSpeedMult
                        : 1;

                const kingCobraBuff =
                    affectsData?.king_cobra_affects?.includes(shard1)
                        ? cobraMult
                        : 1;

                const blackHoleMult =
                    (
                        playerModifiers.mediumBlackHole &&
                        (
                            affectsData?.python_affects?.includes(shard1) ||
                            affectsData?.king_cobra_affects?.includes(shard1)
                        )
                    )
                        ? blackHoleEV
                        : 1;

                const finalRate =
                    baseRate *
                    fortuneMult *
                    kingCobraBuff *
                    blackHoleMult *
                    pythonMult;

                // =========================
                // BUY LIMIT
                // =========================

                const internalBuyId = getInternalId(shards, shard2);

                const weeklySellVolume =
                    Number(getWeeklySellVolume(bazaarProducts, internalBuyId)) || 0;

                const hourlyBuyVolume = weeklySellVolume / 168;

                const fuseAmount1 = Number(getFuseAmount(shards, shard1)) || 1;
                const fuseAmount2 = Number(getFuseAmount(shards, shard2)) || 1;

                const grindUnits = finalRate / fuseAmount1;
                const marketUnits = hourlyBuyVolume / fuseAmount2;

                let fusionRate = Math.floor(Math.min(grindUnits, marketUnits));

                if (fusionRate <= 0) continue;

                // =========================
                // AMOUNTS
                // =========================

                let grindAmount = fusionRate * fuseAmount1;
                let buyAmount = fusionRate * fuseAmount2;
                let outputAmountPerHour = fusionRate * outputAmount;

                // =========================
                // OUTPUT MULTIPLIER
                // =========================

                const fam1 = shards?.[shard1]?.family || "";
                const fam2 = shards?.[shard2]?.family || "";

                const reptile =
                    fam1.includes("Reptile") ||
                    fam2.includes("Reptile");

                if (reptile) {
                    outputAmountPerHour *=
                        1 + ((playerModifiers.crocodileLevel || 0) * 0.02);
                }

                // =========================
                // PRICES (IMPORTANT FIX)
                // =========================

                const outputInternalId = getInternalId(shards, outputShard);

                const rawBuyPrice = getBuyPrice(bazaarProducts, internalBuyId);
                const rawSellPrice = getSellPrice(bazaarProducts, outputInternalId);

                // 🚫 CRITICAL FIX: treat 0 / missing as invalid liquidity
                if (!Number.isFinite(rawBuyPrice) || rawBuyPrice <= 0) continue;
                if (!Number.isFinite(rawSellPrice) || rawSellPrice <= 0) continue;

                const buyPrice = rawBuyPrice;
                const sellPrice = rawSellPrice;

                let costToBuy = buyAmount * buyPrice;
                let revenue = outputAmountPerHour * sellPrice;
                let profitPerHour = revenue - costToBuy;

                // =========================
                // BUDGET SYSTEM (REAL SCALING)
                // =========================

                if (budget && costToBuy > budget) {

                    const scale = budget / costToBuy;

                    fusionRate = Math.floor(fusionRate * scale);

                    if (fusionRate <= 0) continue;

                    grindAmount = fusionRate * fuseAmount1;
                    buyAmount = fusionRate * fuseAmount2;
                    outputAmountPerHour = fusionRate * outputAmount;

                    costToBuy = buyAmount * buyPrice;
                    revenue = outputAmountPerHour * sellPrice;
                    profitPerHour = revenue - costToBuy;
                }

                results.push({
                    shard1,
                    shard2,
                    outputShard,

                    grindRate: finalRate,
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

    return results.sort((a, b) => b.profitPerHour - a.profitPerHour);
}