import { calculateFusion } from "./js/calculator.js";
import { getName, formatNumber } from "./js/shards.js";
import { playerModifiers } from "./js/modifiers.js";

let cachedData = null;

// single source of truth
let resultLimit = 10;

// =========================
// LOAD DATA
// =========================
Promise.all([
    fetch("data/fusion-data.json").then(r => r.json()),
    fetch("data/rates.json").then(r => r.json()),
    fetch("data/attribute-affects.json").then(r => r.json()),
    fetch("https://api.hypixel.net/skyblock/bazaar").then(r => r.json())
])
.then((data) => {
    cachedData = data;

    bindModifierUI();
    bindResultLimitUI();
    rerun();
})
.catch(err => console.error("APP ERROR:", err));


// =========================
// RARITY HELPERS
// =========================
function getRarityColor(rarity) {
    switch ((rarity || "").toLowerCase()) {
        case "common": return "#FFFFFF";
        case "uncommon": return "#55FF55";
        case "rare": return "#5555FF";
        case "epic": return "#AA00AA";
        case "legendary": return "#FFAA00";
        default: return "#FFFFFF";
    }
}

function getRarity(shards, shardId) {
    return shards?.[shardId]?.rarity || "common";
}


// =========================
// SAFE CLAMP
// =========================
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}


// =========================
// MODIFIERS (CAP SAFE)
// =========================
function bindModifierUI() {

    const fields = [
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

    for (const id of fields) {
        const el = document.getElementById(id);
        if (!el) continue;

        el.addEventListener("input", () => {

            const min = Number(el.min || 0);
            const max = Number(el.max || Infinity);

            let val = Number(el.value);

            if (Number.isNaN(val)) val = 0;

            val = clamp(val, min, max);

            el.value = val;
            playerModifiers[id] = val;

            rerun();
        });
    }

    const bh = document.getElementById("mediumBlackHole");
    if (bh) {
        bh.addEventListener("change", () => {
            playerModifiers.mediumBlackHole = bh.checked;
            rerun();
        });
    }
}


// =========================
// RESULT LIMIT UI (FIXED SAFE INIT)
// =========================
function bindResultLimitUI() {

    const select = document.getElementById("resultLimitSelect");

    // 🚨 HARD FIX: prevent crash if DOM not ready / missing element
    if (!select) {
        console.warn("resultLimitSelect not found - skipping init");
        return;
    }

    // sync initial value safely
    const initial = Number(select.value);
    resultLimit = Number.isNaN(initial) ? 10 : initial;

    select.addEventListener("change", (e) => {
        const val = Number(e.target.value);
        resultLimit = Number.isNaN(val) ? 10 : val;
        rerun();
    });
}


// =========================
// MAIN RERUN
// =========================
function rerun() {

    if (!cachedData) return;

    const [fusionData, ratesData, affectsData, bazaarData] = cachedData;

    const recipes = fusionData.recipes;
    const shards = fusionData.shards;

    const topResults = calculateFusion({
        recipes,
        ratesData,
        shards,
        bazaarProducts: bazaarData.products,
        affectsData
    });

    const sliced = (topResults || []).slice(0, resultLimit);

    let html = `
        <h2>Top ${resultLimit} Fusion Results</h2>

        <div class="table-header">
            <div class="header-cell">Grind Shard</div>
            <div class="header-cell">Buy Shard</div>
            <div class="header-cell">Output Shard</div>
        </div>
    `;

    for (const r of sliced) {

        const grindColor = getRarityColor(getRarity(shards, r.shard1));
        const buyColor = getRarityColor(getRarity(shards, r.shard2));
        const outputColor = getRarityColor(getRarity(shards, r.outputShard));

        html += `
            <div class="result-card">

                <div class="fusion-grid">

                    <div class="fusion-cell" style="color:${grindColor};">
                        ${getName(shards, r.shard1)}<br>
                        (${formatNumber(r.grindAmount)})
                    </div>

                    <div class="fusion-cell" style="color:${buyColor};">
                        ${getName(shards, r.shard2)}<br>
                        (${formatNumber(r.buyAmount)})
                    </div>

                    <div class="fusion-cell" style="color:${outputColor};">
                        ${getName(shards, r.outputShard)}<br>
                        (${formatNumber(r.outputAmountPerHour)})
                    </div>

                </div>

                <div class="stats">
                    Profit/hr: ${formatNumber(r.profitPerHour)} <br>
                    Cost to buy: ${formatNumber(r.costToBuy)} <br>
                    Fusion/hr: ${formatNumber(r.fusionRate)} <br>
                    Buy volume/hr: ${formatNumber(r.hourlyBuyVolume)}
                </div>

            </div>
        `;
    }

    document.getElementById("results").innerHTML = html;
}