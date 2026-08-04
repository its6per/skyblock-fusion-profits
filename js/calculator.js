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
    grindingBonuses,
    budget = null
}) {

    const results = [];

    // =========================
    // GLOBAL MODIFIERS
    // =========================

    const seaBonus = (playerModifiers.seaSerpentLevel || 0) * 0.02;
    const tiamatBonus = (playerModifiers.tiamatLevel || 0) * 0.05;

    const serpentStack = 1 + (seaBonus * (1 + tiamatBonus));

    const pythonSpeedBonus =
        (playerModifiers.pythonLevel || 0) *
        0.05 *
        serpentStack;

    const cobraMult =
        1 + ((playerModifiers.kingCobraLevel || 0) * 0.01 * serpentStack);

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

                // Pocket Black Hole bonus

                if (
                    affectsData?.black_hole_affects?.includes(shard1) &&
                    playerModifiers.pocketBlackHole
                ) {

                    const blackHoleBonus =
                        grindingBonuses.tools
                            .pocket_black_hole
                            .options[playerModifiers.pocketBlackHole]
                            ?.hunting_fortune || 0;

                    totalFortune += blackHoleBonus;

                }

                // Lasso bonus

                if (
                    affectsData?.lasso_affects?.includes(shard1) &&
                    playerModifiers.lasso
                ) {

                    const lassoBonus =
                        grindingBonuses.tools
                            .lasso
                            .options[playerModifiers.lasso]
                            ?.hunting_fortune || 0;

                    totalFortune += lassoBonus;

                }

                // Fishing Net bonus

                if (
                    affectsData?.fishing_net_affects?.includes(shard1) &&
                    playerModifiers.fishingNet !== "none"
                ) {

                    const fishingNetBonus =
                        grindingBonuses.tools
                            .fishing_net
                            .options[playerModifiers.fishingNet]
                            ?.hunting_fortune || 0;

                    totalFortune += fishingNetBonus;

                }

                // Sticky Reforge bonus

                if (
                    affectsData?.fishing_net_affects?.includes(shard1) &&
                    playerModifiers.fishingNet !== "none" &&
                    playerModifiers.fishingNetReforge
                ) {

                    const stickyBonus =
                        grindingBonuses.tools
                            .fishing_net
                            .reforges
                            .sticky
                            ?.hunting_fortune || 0;

                    totalFortune += stickyBonus;

                }

                const fortuneMult = 1 + totalFortune / 100;

                // =========================
                // CONDITIONAL MODS
                // =========================

                let totalSpeedBonus = 0;

                if (affectsData?.python_affects?.includes(shard1))
                    totalSpeedBonus += pythonSpeedBonus;

                if (
                    affectsData?.accretion_accessory_affects?.includes(shard1)
                ) {

                    const accessoryBonus =
                        grindingBonuses.bonuses
                            .accretion
                            .options[playerModifiers.accretionAccessory]
                            ?.black_hole_speed || 0;

                    totalSpeedBonus += accessoryBonus;

                }

                if (
                    affectsData?.desert_temple_affects?.includes(shard1) &&
                    playerModifiers.desertTempleBenefactor
                ) {

                    const desertBonus =
                        grindingBonuses.bonuses
                            .desert_temple_benefactor
                            ?.black_hole_speed || 0;

                    totalSpeedBonus += desertBonus;

                }

                const speedMult = 1 + totalSpeedBonus;

                const kingCobraBuff =
                    affectsData?.king_cobra_affects?.includes(shard1)
                        ? cobraMult
                        : 1;

                const unaffectedShard =
                    affectsData?.fortune_ignored_shards?.includes(shard1);

                const finalRate =
                    unaffectedShard
                        ? baseRate
                        : baseRate *
                        fortuneMult *
                        kingCobraBuff *
                        speedMult;

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

                const crocodileMult =
                    reptile
                        ? 1 + ((playerModifiers.crocodileLevel || 0) * 0.02)
                        : 1;

                outputAmountPerHour =
                    fusionRate *
                    outputAmount *
                    crocodileMult;

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
                    outputAmountPerHour =
                        fusionRate *
                        outputAmount *
                        crocodileMult;

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