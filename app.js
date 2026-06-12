import { calculateFusion } from "./js/calculator.js";
import { getName, formatNumber } from "./js/shards.js";
import { playerModifiers } from "./js/modifiers.js";

let cachedData = null;

let resultLimit = 10;
let budget = null;

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
    bindBudgetUI();
    rerun();
})
.catch(err => console.error("APP ERROR:", err));


// =========================
// RARITY HELPERS (RESTORED)
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

// FIX: resolves shard ID mismatch (C1 vs internal_id vs name)
function resolveShardKey(shards, id) {
    if (!id) return null;

    return Object.keys(shards).find(k =>
        k === id || shards[k].internal_id === id
    );
}


// =========================
// MODIFIERS
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

            val = Math.max(min, Math.min(max, val));

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
// RESULT LIMIT
// =========================
function bindResultLimitUI() {

    const select = document.getElementById("resultLimitSelect");
    if (!select) return;

    resultLimit = Number(select.value) || 10;

    select.addEventListener("change", (e) => {
        resultLimit = Number(e.target.value) || 10;
        rerun();
    });
}


// =========================
// BUDGET
// =========================
function bindBudgetUI() {

    const panel = document.getElementById("modifier-panel");

    const wrapper = document.createElement("div");
    wrapper.style.marginTop = "15px";

    wrapper.innerHTML = `
        <label style="font-weight:bold; display:block; margin-bottom:5px;">
            Budget (coins)
        </label>
        <input id="budgetInput" type="number" min="0" placeholder="No budget">
    `;

    panel.appendChild(wrapper);

    const input = document.getElementById("budgetInput");

    input.addEventListener("input", () => {

        const val = Number(input.value);

        budget = (!input.value || Number.isNaN(val) || val <= 0)
            ? null
            : val;

        rerun();
    });
}


// =========================
// MAIN RERUN
// =========================
function rerun() {

    if (!cachedData) return;

    const [fusionData, ratesData, affectsData, bazaarData] = cachedData;

    const topResults = calculateFusion({
        recipes: fusionData.recipes,
        ratesData,
        shards: fusionData.shards,
        bazaarProducts: bazaarData.products,
        affectsData,
        budget
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

        const shard1Key = resolveShardKey(fusionData.shards, r.shard1);
        const shard2Key = resolveShardKey(fusionData.shards, r.shard2);
        const outputKey = resolveShardKey(fusionData.shards, r.outputShard);

        const grindColor = getRarityColor(getRarity(fusionData.shards, shard1Key));
        const buyColor = getRarityColor(getRarity(fusionData.shards, shard2Key));
        const outputColor = getRarityColor(getRarity(fusionData.shards, outputKey));

        html += `
            <div class="result-card">

                <div class="fusion-grid">

                    <div class="fusion-cell" style="color:${grindColor}">
                        ${getName(fusionData.shards, r.shard1)}<br>
                        (${formatNumber(r.grindAmount)})
                    </div>

                    <div class="fusion-cell" style="color:${buyColor}">
                        ${getName(fusionData.shards, r.shard2)}<br>
                        (${formatNumber(r.buyAmount)})
                    </div>

                    <div class="fusion-cell" style="color:${outputColor}">
                        ${getName(fusionData.shards, r.outputShard)}<br>
                        (${formatNumber(r.outputAmountPerHour)})
                    </div>

                </div>

                <div class="stats">
                    Profit/hr: ${formatNumber(r.profitPerHour)} <br>
                    Cost to buy: ${formatNumber(r.costToBuy)} <br>
                    Fusion/hr: ${formatNumber(r.fusionRate)} <br>
                </div>

            </div>
        `;
    }

    document.getElementById("results").innerHTML = html;
}