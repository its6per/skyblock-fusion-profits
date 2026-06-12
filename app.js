import { calculateFusion } from "./js/calculator.js";
import { getName, formatNumber } from "./js/shards.js";
import { playerModifiers } from "./js/modifiers.js";

let cachedData = null;

Promise.all([
    fetch("data/fusion-data.json").then(r => r.json()),
    fetch("data/rates.json").then(r => r.json()),
    fetch("data/attribute-affects.json").then(r => r.json()),
    fetch("https://api.hypixel.net/skyblock/bazaar").then(r => r.json())
])
.then((data) => {

    cachedData = data;

    bindModifierUI();
    rerun();
})
.catch(err => console.error("APP ERROR:", err));


// -------------------------
// RARITY COLORS
// -------------------------
function getRarityColor(rarity) {

    switch ((rarity || "").toLowerCase()) {

        case "common":
            return "#FFFFFF";

        case "uncommon":
            return "#55FF55";

        case "rare":
            return "#5555FF";

        case "epic":
            return "#AA00AA";

        case "legendary":
            return "#FFAA00";

        default:
            return "#FFFFFF";
    }
}


// -------------------------
// GET RARITY
// -------------------------
function getRarity(shards, shardId) {

    return shards?.[shardId]?.rarity || "common";
}


// -------------------------
// UI BINDING
// -------------------------
function bindModifierUI() {

    const numberFields = [
        "hunterFortune",

        "newtLevel",
        "salamanderLevel",
        "lizardKingLevel",
        "leviathanLevel",

        "pythonLevel",
        "kingCobraLevel",
        "seaSerpentLevel",
        "tiamatLevel",

        "crocodileLevel"
    ];

    // -------------------------
    // NUMBER INPUTS
    // -------------------------
    for (const field of numberFields) {

        const el = document.getElementById(field);

        if (!el) continue;

        el.addEventListener("input", () => {

            const min = Number(el.min || 0);
            const max = Number(el.max || Infinity);

            let value = Number(el.value) || 0;

            // Clamp value
            value = Math.max(min, Math.min(max, value));

            // Update UI
            el.value = value;

            // Save modifier
            playerModifiers[field] = value;

            rerun();
        });
    }

    // -------------------------
    // CHECKBOXES
    // -------------------------
    const mediumBlackHole =
        document.getElementById("mediumBlackHole");

    if (mediumBlackHole) {

        mediumBlackHole.addEventListener("change", () => {

            playerModifiers.mediumBlackHole =
                mediumBlackHole.checked;

            rerun();
        });
    }
}


// -------------------------
// MAIN RERUN FUNCTION
// -------------------------
function rerun() {

    if (!cachedData) return;

    const [fusionData, ratesData, affectsData, bazaarData] = cachedData;

    const recipes = fusionData.recipes;
    const shards = fusionData.shards;
    const bazaarProducts = bazaarData.products;

    const topResults = calculateFusion({
        recipes,
        ratesData,
        shards,
        bazaarProducts,
        affectsData
    });

    console.log("TOP RESULTS:", topResults);

    let html = `
        <h2>Top 25 Fusion Results</h2>

        <div class="table-header">

            <div class="header-cell">
                Grind Shard
            </div>

            <div class="header-cell">
                Buy Shard
            </div>

            <div class="header-cell">
                Output Shard
            </div>

        </div>
    `;

    for (const r of topResults || []) {

        const grindRarity = getRarity(shards, r.shard1);
        const buyRarity = getRarity(shards, r.shard2);
        const outputRarity = getRarity(shards, r.outputShard);

        const grindColor = getRarityColor(grindRarity);
        const buyColor = getRarityColor(buyRarity);
        const outputColor = getRarityColor(outputRarity);

        html += `
            <div class="result-card">

                <div class="fusion-grid">

                    <div
                        class="fusion-cell"
                        style="color: ${grindColor};"
                    >
                        ${getName(shards, r.shard1)}
                        <br>
                        (${formatNumber(r.grindAmount)})
                    </div>

                    <div
                        class="fusion-cell"
                        style="color: ${buyColor};"
                    >
                        ${getName(shards, r.shard2)}
                        <br>
                        (${formatNumber(r.buyAmount)})
                    </div>

                    <div
                        class="fusion-cell"
                        style="color: ${outputColor};"
                    >
                        ${getName(shards, r.outputShard)}
                        <br>
                        (${formatNumber(r.outputAmountPerHour)})
                    </div>

                </div>

                <div class="stats">

                    Profit/hr:
                    ${formatNumber(r.profitPerHour)}

                    <br>

                    Cost to buy:
                    ${formatNumber(r.costToBuy)}

                    <br>

                    Fusion/hr:
                    ${formatNumber(r.fusionRate)}

                    <br>

                    Buy volume/hr:
                    ${formatNumber(r.hourlyBuyVolume)}

                </div>

            </div>
        `;
    }

    document.getElementById("results").innerHTML = html;
}