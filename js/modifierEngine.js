import { playerModifiers } from "./modifiers.js";


// ========================================
// SERPENT STACK
// ========================================
function getSerpentStack() {

    const sea =
        Number(playerModifiers.seaSerpentLevel || 0);

    const tia =
        Number(playerModifiers.tiamatLevel || 0);

    return (
        (1 + sea * 0.02) *
        (1 + tia * 0.05)
    );
}


// ========================================
// SPAWN MODIFIERS
// ========================================
export function applySpawnModifiers(
    baseRate,
    shardId,
    affectsData
) {

    let rate = baseRate;

    const isPython =
        affectsData?.python_affects?.includes(shardId);

    if (!isPython) {
        return {
            effectiveRate: rate
        };
    }

    const serpent =
        getSerpentStack();

    const pythonLevel =
        Number(playerModifiers.pythonLevel || 0);

    rate *= (
        1 +
        (0.05 * pythonLevel * serpent)
    );

    return {
        effectiveRate: rate
    };
}


// ========================================
// FORTUNE MODIFIERS
// ========================================
export function applyFortuneModifiers(
    baseRate,
    shardId,
    affectsData
) {

    if (
        affectsData?.fortune_ignored_shards?.includes(shardId)
    ) {
        return {
            effectiveRate: baseRate
        };
    }

    let fortune =
        Number(playerModifiers.hunterFortune || 0);

    // --------------------
    // ATTRIBUTE FORTUNE
    // --------------------
    if (affectsData?.newt_affects?.includes(shardId)) {
        fortune +=
            Number(playerModifiers.newtLevel || 0) * 2;
    }

    if (affectsData?.salamander_affects?.includes(shardId)) {
        fortune +=
            Number(playerModifiers.salamanderLevel || 0) * 2;
    }

    if (affectsData?.lizard_king_affects?.includes(shardId)) {
        fortune +=
            Number(playerModifiers.lizardKingLevel || 0);
    }

    if (affectsData?.leviathan_affects?.includes(shardId)) {
        fortune +=
            Number(playerModifiers.leviathanLevel || 0);
    }

    // --------------------
    // COBRA MULT
    // --------------------
    let cobraMult = 1;

    const isCobra =
        affectsData?.king_cobra_affects?.includes(shardId);

    if (isCobra) {

        const cobraLevel =
            Number(playerModifiers.kingCobraLevel || 0);

        cobraMult *= (
            1 +
            (0.01 * cobraLevel * getSerpentStack())
        );
    }

    const rate =
        baseRate *
        (1 + fortune / 100) *
        cobraMult;

    return {
        effectiveRate: rate
    };
}


// ========================================
// BLACK HOLE
// ========================================
export function applyBlackHoleModifiers(
    baseRate,
    shardId,
    affectsData
) {

    let rate = baseRate;

    const isPython =
        affectsData?.python_affects?.includes(shardId);

    const isCobra =
        affectsData?.king_cobra_affects?.includes(shardId);

    if (
        playerModifiers.mediumBlackHole &&
        (isPython || isCobra)
    ) {
        rate *= 1.1;
    }

    return {
        effectiveRate: rate
    };
}


// ========================================
// CROCODILE
// ========================================
export function applyFusionModifiers(
    outputAmount,
    shard1,
    shard2,
    affectsData,
    shards
) {

    const family1 =
        shards?.[shard1]?.family || "";

    const family2 =
        shards?.[shard2]?.family || "";

    const reptile =
        family1.includes("Reptile") ||
        family2.includes("Reptile");

    let multiplier = 1;

    if (reptile) {

        multiplier +=
            Number(playerModifiers.crocodileLevel || 0) * 0.02;
    }

    return {
        effectiveOutput:
            outputAmount * multiplier
    };
}