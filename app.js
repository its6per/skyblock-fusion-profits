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
// UI BINDING
// -------------------------
function bindModifierUI() {

    const fields = [
        "hunterFortune",
        "newtLevel",
        "salamanderLevel",
        "lizardKingLevel",
        "leviathanLevel"
    ];

    for (const field of fields) {

        const el = document.getElementById(field);

        if (!el) continue;

        el.addEventListener("input", () => {

            const min = Number(el.min || 0);
            const max = Number(el.max || Infinity);

            let value = Number(el.value) || 0;

            // Clamp value to allowed range
            value = Math.max(min, Math.min(max, value));

            // Update UI field
            el.value = value;

            // Save modifier
            playerModifiers[field] = value;

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

    let html = "<h2>Top 25 Fusion Results</h2>";

    for (const r of topResults || []) {

        html += `
            <div class="result-card">

                <div class="fusion-line">

                    <span class="grind">
                        ${getName(shards, r.shard1)}
                        (${formatNumber(r.grindAmount)})
                    </span>

                    +

                    <span class="buy">
                        ${getName(shards, r.shard2)}
                        (${formatNumber(r.buyAmount)})
                    </span>

                    →

                    <span class="output">
                        ${getName(shards, r.outputShard)}
                        (${formatNumber(r.outputAmountPerHour)})
                    </span>

                </div>

                <div class="stats">

                    Profit/hr: ${formatNumber(r.profitPerHour)}<br>
                    Cost to buy: ${formatNumber(r.costToBuy)}<br>
                    Fusion/hr: ${formatNumber(r.fusionRate)}<br>
                    Buy volume/hr: ${formatNumber(r.hourlyBuyVolume)}

                </div>

            </div>
        `;
    }

    document.getElementById("results").innerHTML = html;
}