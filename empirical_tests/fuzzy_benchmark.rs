use std::time::Instant;

#[derive(Clone)]
struct SearchItem {
    id: String,
    title: String,
    subtitle: String,
    keywords: Vec<String>,
}

fn fuzzy_match(pattern: &str, target: &str) -> Option<i64> {
    if pattern.is_empty() {
        return Some(0);
    }
    let p_lower: Vec<char> = pattern.to_lowercase().chars().collect();
    let t_lower: Vec<char> = target.to_lowercase().chars().collect();

    let mut p_idx = 0;
    let mut score: i64 = 0;
    let mut consecutive = 0;
    let mut prev_matched_idx = None;

    for (t_idx, &t_char) in t_lower.iter().enumerate() {
        if p_idx < p_lower.len() && t_char == p_lower[p_idx] {
            let mut match_score = 10;

            // Consecutive match bonus
            if let Some(prev) = prev_matched_idx {
                if prev + 1 == t_idx {
                    consecutive += 1;
                    match_score += consecutive * 15;
                } else {
                    consecutive = 0;
                }
            }

            // Word boundary bonus
            if t_idx == 0 || target.chars().nth(t_idx - 1).map_or(false, |c| c == ' ' || c == '-' || c == '_' || c == '.') {
                match_score += 25;
            }

            score += match_score;
            prev_matched_idx = Some(t_idx);
            p_idx += 1;
        }
    }

    if p_idx == p_lower.len() {
        // Shorter target penalty
        score -= (target.len() as i64 - pattern.len() as i64) * 2;
        Some(score)
    } else {
        None
    }
}

fn search_dataset<'a>(query: &str, items: &'a [SearchItem]) -> Vec<(&'a SearchItem, i64)> {
    let mut matches = Vec::new();
    for item in items {
        let mut best_score = None;
        if let Some(s) = fuzzy_match(query, &item.title) {
            best_score = Some(s + 50); // Title bonus
        }
        if let Some(s) = fuzzy_match(query, &item.subtitle) {
            best_score = Some(best_score.map_or(s, |b| b.max(s)));
        }
        for kw in &item.keywords {
            if let Some(s) = fuzzy_match(query, kw) {
                best_score = Some(best_score.map_or(s + 20, |b| b.max(s + 20)));
            }
        }
        if let Some(score) = best_score {
            matches.push((item, score));
        }
    }
    matches.sort_by(|a, b| b.1.cmp(&a.1));
    matches
}

fn main() {
    println!("=== EMPIRICAL FUZZY SEARCH BENCHMARK ===");

    // Generate datasets of varying sizes: 1,000, 5,000, 20,000 items
    let dataset_sizes = [1_000, 5_000, 20_000];
    let queries = ["ray", "calc", "term", "visual studio code", "git", "chrome", "settings:wifi", "p"];

    for &size in &dataset_sizes {
        println!("\n--- Dataset Size: {} items ---", size);
        let items: Vec<SearchItem> = (0..size).map(|i| {
            let title = match i % 8 {
                0 => format!("Visual Studio Code {}", i),
                1 => format!("Google Chrome Canary {}", i),
                2 => format!("Windows Terminal Preview {}", i),
                3 => format!("Calculator Utility {}", i),
                4 => format!("Raycast Launcher Clone {}", i),
                5 => format!("Git Bash Environment {}", i),
                6 => format!("Settings: Network & Wi-Fi Configuration {}", i),
                _ => format!("Application Process Item {}", i),
            };
            SearchItem {
                id: format!("app-{}", i),
                title,
                subtitle: format!("C:\\Program Files\\Apps\\Application_{}\\app.exe", i),
                keywords: vec![format!("app{}", i), "productivity".to_string(), "tool".to_string()],
            }
        }).collect();

        for &query in &queries {
            let start = Instant::now();
            let results = search_dataset(query, &items);
            let elapsed = start.elapsed();
            println!("  Query: '{:20}' -> Matches: {:5} | Elapsed: {:8.3} ms (Pass: {})",
                query, results.len(), elapsed.as_secs_f64() * 1000.0, elapsed.as_millis() < 50);
        }
    }

    println!("\n=== BENCHMARK COMPLETED ===");
}
