const { performance } = require('perf_hooks');

function fuzzyMatch(pattern, target) {
    if (!pattern) return 0;
    const pLower = pattern.toLowerCase();
    const tLower = target.toLowerCase();

    let pIdx = 0;
    let score = 0;
    let consecutive = 0;
    let prevMatchedIdx = null;

    for (let tIdx = 0; tIdx < tLower.length; tIdx++) {
        if (pIdx < pLower.length && tLower[tIdx] === pLower[pIdx]) {
            let matchScore = 10;
            if (prevMatchedIdx !== null && prevMatchedIdx + 1 === tIdx) {
                consecutive += 1;
                matchScore += consecutive * 15;
            } else {
                consecutive = 0;
            }

            if (tIdx === 0 || ' -_.'.includes(target[tIdx - 1])) {
                matchScore += 25;
            }

            score += matchScore;
            prevMatchedIdx = tIdx;
            pIdx++;
        }
    }

    if (pIdx === pLower.length) {
        score -= (target.length - pattern.length) * 2;
        return score;
    }
    return null;
}

function searchDataset(query, items) {
    const matches = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let bestScore = null;

        const sTitle = fuzzyMatch(query, item.title);
        if (sTitle !== null) bestScore = sTitle + 50;

        const sSub = fuzzyMatch(query, item.subtitle);
        if (sSub !== null) bestScore = bestScore === null ? sSub : Math.max(bestScore, sSub);

        for (let k = 0; k < item.keywords.length; k++) {
            const sKw = fuzzyMatch(query, item.keywords[k]);
            if (sKw !== null) bestScore = bestScore === null ? sKw + 20 : Math.max(bestScore, sKw + 20);
        }

        if (bestScore !== null) {
            matches.push({ item, score: bestScore });
        }
    }
    matches.sort((a, b) => b.score - a.score);
    return matches;
}

console.log("=== EMPIRICAL FUZZY SEARCH BENCHMARK IN JAVASCRIPT / V8 ===");
const datasetSizes = [1000, 5000, 20000];
const queries = ["ray", "calc", "term", "visual studio code", "git", "chrome", "settings:wifi", "p"];

for (const size of datasetSizes) {
    console.log(`\n--- Dataset Size: ${size} items ---`);
    const items = [];
    for (let i = 0; i < size; i++) {
        let title = "";
        switch (i % 8) {
            case 0: title = `Visual Studio Code ${i}`; break;
            case 1: title = `Google Chrome Canary ${i}`; break;
            case 2: title = `Windows Terminal Preview ${i}`; break;
            case 3: title = `Calculator Utility ${i}`; break;
            case 4: title = `Raycast Launcher Clone ${i}`; break;
            case 5: title = `Git Bash Environment ${i}`; break;
            case 6: title = `Settings: Network & Wi-Fi Configuration ${i}`; break;
            default: title = `Application Process Item ${i}`; break;
        }
        items.push({
            id: `app-${i}`,
            title,
            subtitle: `C:\\Program Files\\Apps\\Application_${i}\\app.exe`,
            keywords: [`app${i}`, "productivity", "tool"],
        });
    }

    for (const query of queries) {
        const t0 = performance.now();
        const results = searchDataset(query, items);
        const elapsed = performance.now() - t0;
        console.log(`  Query: '${query.padEnd(20)}' -> Matches: ${String(results.length).padStart(5)} | Elapsed: ${elapsed.toFixed(3).padStart(8)} ms (Pass: ${elapsed < 50})`);
    }
}
console.log("\n=== BENCHMARK COMPLETED ===");
