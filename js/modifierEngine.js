import { playerModifiers } from "./modifiers.js";

export function applyHunterFortune(baseRate, shardId, affectsData) {

    // Ignore shards that cannot use fortune
    if (
        affectsData?.fortune_ignored_shards?.includes(shardId)
    ) {
        return {
            effectiveRate: baseRate,
            fortune: 0
        };
    }

    // Base hunter fortune
    let totalFortune = Number(playerModifiers?.hunterFortune || 0);

    // -------------------------
    // NEWT (common)
    // -------------------------
    if (affectsData?.newt_affects?.includes(shardId)) {
        totalFortune += (playerModifiers?.newtLevel || 0) * 2;
    }

    // -------------------------
    // SALAMANDER (uncommon)
    // -------------------------
    if (affectsData?.salamander_affects?.includes(shardId)) {
        totalFortune += (playerModifiers?.salamanderLevel || 0) * 2;
    }

    // -------------------------
    // LIZARD KING (rare)
    // -------------------------
    if (affectsData?.lizard_king_affects?.includes(shardId)) {
        totalFortune += (playerModifiers?.lizardKingLevel || 0) * 1;
    }

    // -------------------------
    // LEVIATHAN (epic)
    // -------------------------
    if (affectsData?.leviathan_affects?.includes(shardId)) {
        totalFortune += (playerModifiers?.leviathanLevel || 0) * 1;
    }

    // -------------------------
    // Convert fortune → multiplier
    // -------------------------
    const multiplier = 1 + (totalFortune / 100);

    const effectiveRate = baseRate * multiplier;

    return {
        effectiveRate,
        fortune: totalFortune
    };
}