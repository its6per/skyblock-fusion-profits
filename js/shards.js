export function getName(shards, id) {
    return shards[id]?.name || id;
}

export function getFuseAmount(shards, id) {
    return shards[id]?.fuse_amount || 1;
}

export function getInternalId(shards, id) {
    return shards[id]?.internal_id || id;
}

export function formatNumber(num) {
    return Math.floor(num).toLocaleString();
}