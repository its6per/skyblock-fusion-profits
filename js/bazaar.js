export function getBuyPrice(bazaarProducts, internalId) {

    const product = bazaarProducts[internalId];
    if (!product) return 0;

    const sellSummary = product.sell_summary;

    if (
        sellSummary &&
        sellSummary.length > 0 &&
        sellSummary[0].pricePerUnit
    ) {
        return sellSummary[0].pricePerUnit + 0.1;
    }

    return product.quick_status.sellPrice || 0;
}

export function getSellPrice(bazaarProducts, internalId) {

    const product = bazaarProducts[internalId];
    if (!product) return 0;

    const buySummary = product.buy_summary;

    if (
        buySummary &&
        buySummary.length > 0 &&
        buySummary[0].pricePerUnit
    ) {
        return buySummary[0].pricePerUnit - 0.1;
    }

    return product.quick_status.buyPrice || 0;
}

export function getWeeklySellVolume(bazaarProducts, internalId) {

    const product = bazaarProducts[internalId];
    if (!product) return 0;

    return product.quick_status.sellMovingWeek || 0;
}