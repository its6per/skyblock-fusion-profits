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
    affectsData
}) {

    const results = [];

    // =====================================
    // GLOBAL MODIFIERS
    // =====================================

    // Sea Serpent:
    // +2% per level
    const seaBonus =
        (playerModifiers.seaSerpentLevel || 0) * 0.02;

    // Tiamat:
    // +5% effectiveness to Sea Serpent per level
    const tiamatBonus =
        (playerModifiers.tiamatLevel || 0) * 0.05;

    // FINAL:
    // 1 + (sea serpent bonus * tiamat scaling)
    //
    // Example:
    // level 10 serpent = 20%
    // level 10 tiamat = 50%
    //
    // 1 + (0.20 * 1.5)
    // = 1.30
    const serpentStack =
        1 + (seaBonus * (1 + tiamatBonus));

    // Python speed multiplier
    const pythonSpeedMult =
        1 + (
            (playerModifiers.pythonLevel || 0)
            * 0.05
            * serpentStack
        );

    // Cobra fortune multiplier
    const cobraMult =
        1 + (
            (playerModifiers.kingCobraLevel || 0)
            * 0.01
            * serpentStack
        );

    // Medium Black Hole EV
    const blackHoleEV =
        playerModifiers.mediumBlackHole
            ? 1.1
            : 1;

    // =====================================
    // RECIPES
    // =====================================

    for (const outputShard in recipes) {

        const outputRecipes = recipes[outputShard];

        for (const outputAmountKey in outputRecipes) {

            const recipeList =
                outputRecipes[outputAmountKey];

            const outputAmount =
                Number(outputAmountKey) || 0;

            for (const recipe of recipeList) {

                const shard1 = recipe[0];
                const shard2 = recipe[1];

                // =====================================
                // BASE RATE
                // =====================================

                const baseRate =
                    Number(ratesData?.[shard1]) || 0;

                if (baseRate <= 0) continue;

                // =====================================
                // FORTUNE
                // =====================================

                let totalFortune =
                    Number(playerModifiers.hunterFortune || 0);

                if (affectsData?.newt_affects?.includes(shard1)) {
                    totalFortune +=
                        (playerModifiers.newtLevel || 0) * 2;
                }

                if (affectsData?.salamander_affects?.includes(shard1)) {
                    totalFortune +=
                        (playerModifiers.salamanderLevel || 0) * 2;
                }

                if (affectsData?.lizard_king_affects?.includes(shard1)) {
                    totalFortune +=
                        (playerModifiers.lizardKingLevel || 0);
                }

                if (affectsData?.leviathan_affects?.includes(shard1)) {
                    totalFortune +=
                        (playerModifiers.leviathanLevel || 0);
                }

                const fortuneMult =
                    1 + totalFortune / 100;

                // =====================================
                // CONDITIONAL MODIFIERS
                // =====================================

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

                // =====================================
                // FINAL RATE
                // =====================================

                const finalRate =
                    baseRate *
                    fortuneMult *
                    kingCobraBuff *
                    blackHoleMult *
                    pythonMult;

                // =====================================
                // BUY LIMIT
                // =====================================

                const internalBuyId =
                    getInternalId(shards, shard2);

                const weeklySellVolume =
                    Number(
                        getWeeklySellVolume(
                            bazaarProducts,
                            internalBuyId
                        )
                    ) || 0;

                const hourlyBuyVolume =
                    weeklySellVolume / 168;

                const fuseAmount1 =
                    Number(getFuseAmount(shards, shard1)) || 1;

                const fuseAmount2 =
                    Number(getFuseAmount(shards, shard2)) || 1;

                const grindUnits =
                    finalRate / fuseAmount1;

                const marketUnits =
                    hourlyBuyVolume / fuseAmount2;

                const fusionRate =
                    Math.floor(
                        Math.min(
                            grindUnits,
                            marketUnits
                        )
                    );

                if (fusionRate <= 0) continue;

                // =====================================
                // AMOUNTS
                // =====================================

                const grindAmount =
                    fusionRate * fuseAmount1;

                const buyAmount =
                    fusionRate * fuseAmount2;

                let outputAmountPerHour =
                    fusionRate * outputAmount;

                // =====================================
                // CROCODILE
                // =====================================

                const fam1 =
                    shards?.[shard1]?.family || "";

                const fam2 =
                    shards?.[shard2]?.family || "";

                const reptile =
                    fam1.includes("Reptile") ||
                    fam2.includes("Reptile");

                if (reptile) {
                    outputAmountPerHour *=
                        1 + (
                            (playerModifiers.crocodileLevel || 0)
                            * 0.02
                        );
                }

                // =====================================
                // PRICES
                // =====================================

                const outputInternalId =
                    getInternalId(shards, outputShard);

                const buyPrice =
                    Number(
                        getBuyPrice(
                            bazaarProducts,
                            internalBuyId
                        )
                    ) || 0;

                const sellPrice =
                    Number(
                        getSellPrice(
                            bazaarProducts,
                            outputInternalId
                        )
                    ) || 0;

                const costToBuy =
                    buyAmount * buyPrice;

                const revenue =
                    outputAmountPerHour * sellPrice;

                const profitPerHour =
                    revenue - costToBuy;

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

    return results
        .sort(
            (a, b) =>
                b.profitPerHour - a.profitPerHour
        )
        .slice(0, 25);
}