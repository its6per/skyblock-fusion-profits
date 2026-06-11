import { calculateFusion } from "./js/calculator.js";
import { getName, formatNumber } from "./js/shards.js";

Promise.all([
    fetch("data/fusion-data.json").then(r => r.json()),
    fetch("data/rates.json").then(r => r.json()),
    fetch("https://api.hypixel.net/skyblock/bazaar").then(r => r.json())
])

.then(([fusionData, ratesData, bazaarData]) => {

    const recipes = fusionData.recipes;
    const shards = fusionData.shards;
    const bazaarProducts = bazaarData.products;

    // 🔥 THIS IS THE MISSING PIECE YOU DIDN'T HAVE
    const topResults = calculateFusion({
        recipes,
        ratesData,
        shards,
        bazaarProducts
    });

    // -------------------------
    // Render
    // -------------------------

    let html = "<h2>Top 25 Fusion Results</h2>";

    for (const r of topResults) {

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

})

.catch(err => console.error(err));