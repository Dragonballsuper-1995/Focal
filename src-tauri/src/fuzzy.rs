use std::collections::HashMap;
use crate::models::{AppCacheItem, SearchResult, SearchSensitivity};

pub const SCORE_EXACT_MATCH: f64 = 500.0;
pub const SCORE_EXACT_PREFIX: f64 = 250.0;
pub const SCORE_WORD_BOUNDARY: f64 = 45.0;
pub const SCORE_CAMEL_CASE: f64 = 35.0;
pub const SCORE_SEPARATOR: f64 = 30.0;
pub const SCORE_CONSECUTIVE: f64 = 25.0;
pub const SCORE_MATCH_BASE: f64 = 10.0;
pub const PENALTY_GAP: f64 = 2.0;
pub const PENALTY_UNMATCHED: f64 = 0.5;

/// High-performance in-memory fuzzy subsequence scoring.
/// Returns Some(score) if `query` is a case-insensitive subsequence of `target`, otherwise None.
pub fn fuzzy_match(query: &str, target: &str) -> Option<f64> {
    if query.is_empty() {
        return Some(0.0);
    }
    if target.is_empty() {
        return None;
    }

    // Fast-path: Zero-heap-allocation byte scanning for ASCII strings (over 99% of app names)
    if query.is_ascii() && target.is_ascii() {
        return fuzzy_match_ascii(query.as_bytes(), target.as_bytes());
    }

    fuzzy_match_unicode(query, target)
}

fn fuzzy_match_ascii(q_bytes: &[u8], t_bytes: &[u8]) -> Option<f64> {
    let m = q_bytes.len();
    let n = t_bytes.len();

    if m > n {
        return None;
    }

    // Exact match bonus
    if m == n && q_bytes.eq_ignore_ascii_case(t_bytes) {
        return Some(SCORE_EXACT_MATCH + (m as f64 * SCORE_MATCH_BASE));
    }

    // Exact prefix bonus check
    let is_prefix = t_bytes[..m].eq_ignore_ascii_case(q_bytes);

    // Fast rejection: quick subsequence existence check before scoring
    {
        let mut qi = 0;
        let mut ti = 0;
        while qi < m && ti < n {
            if q_bytes[qi].to_ascii_lowercase() == t_bytes[ti].to_ascii_lowercase() {
                qi += 1;
            }
            ti += 1;
        }
        if qi < m {
            return None;
        }
    }

    let mut score = 0.0;
    let mut t_idx = 0;
    let mut prev_matched_idx: Option<usize> = None;
    let mut consecutive_streak = 0;

    for &qc_raw in q_bytes {
        let qc = qc_raw.to_ascii_lowercase();
        let mut found = false;
        let mut best_idx = None;
        let mut best_bonus = -1000.0;

        for j in t_idx..n {
            let tc = t_bytes[j].to_ascii_lowercase();
            if tc == qc {
                let mut bonus = 0.0;

                // Boundary bonuses
                if j == 0 {
                    bonus += SCORE_WORD_BOUNDARY;
                } else {
                    let prev_orig = t_bytes[j - 1];
                    let curr_orig = t_bytes[j];

                    if prev_orig == b' ' || prev_orig == b'\t' {
                        bonus += SCORE_WORD_BOUNDARY;
                    } else if prev_orig == b'_'
                        || prev_orig == b'-'
                        || prev_orig == b'/'
                        || prev_orig == b'\\'
                        || prev_orig == b'.'
                        || prev_orig == b':'
                    {
                        bonus += SCORE_SEPARATOR;
                    } else if prev_orig.is_ascii_lowercase() && curr_orig.is_ascii_uppercase() {
                        bonus += SCORE_CAMEL_CASE;
                    }
                }

                // Consecutive match bonus or gap penalty
                if let Some(prev) = prev_matched_idx {
                    if j == prev + 1 {
                        bonus += SCORE_CONSECUTIVE + (consecutive_streak as f64 * 10.0);
                    } else {
                        let gap = (j - prev - 1) as f64;
                        bonus -= gap * PENALTY_GAP;
                    }
                }

                if bonus > best_bonus || best_idx.is_none() {
                    best_bonus = bonus;
                    best_idx = Some(j);
                    if bonus > 0.0 {
                        break;
                    }
                }
            }
        }

        if let Some(chosen_idx) = best_idx {
            score += SCORE_MATCH_BASE + best_bonus;
            if let Some(prev) = prev_matched_idx {
                if chosen_idx == prev + 1 {
                    consecutive_streak += 1;
                } else {
                    consecutive_streak = 0;
                }
            }
            prev_matched_idx = Some(chosen_idx);
            t_idx = chosen_idx + 1;
            found = true;
        }

        if !found {
            return None;
        }
    }

    if is_prefix {
        score += SCORE_EXACT_PREFIX;
    }

    let unmatched = (n - m) as f64;
    score -= unmatched * PENALTY_UNMATCHED;

    Some(score.max(1.0))
}

fn fuzzy_match_unicode(query: &str, target: &str) -> Option<f64> {
    let q_lower: Vec<char> = query.to_lowercase().chars().collect();
    let t_lower: Vec<char> = target.to_lowercase().chars().collect();

    let m = q_lower.len();
    let n = t_lower.len();

    if m > n {
        return None;
    }

    if m == n && q_lower == t_lower {
        return Some(SCORE_EXACT_MATCH + (m as f64 * SCORE_MATCH_BASE));
    }

    let is_prefix = t_lower.starts_with(&q_lower);

    // Fast rejection: quick subsequence existence check before scoring
    {
        let mut qi = 0;
        let mut ti = 0;
        while qi < m && ti < n {
            if q_lower[qi] == t_lower[ti] {
                qi += 1;
            }
            ti += 1;
        }
        if qi < m {
            return None;
        }
    }

    let mut score = 0.0;
    let mut t_idx = 0;
    let mut prev_matched_idx: Option<usize> = None;
    let mut consecutive_streak = 0;

    for (_qi, &qc) in q_lower.iter().enumerate() {
        let mut found = false;
        let mut best_idx = None;
        let mut best_bonus = -1000.0;

        for j in t_idx..n {
            if t_lower[j] == qc {
                let mut bonus = 0.0;

                if j == 0 {
                    bonus += SCORE_WORD_BOUNDARY;
                } else {
                    let prev_c = t_lower[j - 1];

                    if prev_c == ' ' || prev_c == '\t' {
                        bonus += SCORE_WORD_BOUNDARY;
                    } else if prev_c == '_'
                        || prev_c == '-'
                        || prev_c == '/'
                        || prev_c == '\\'
                        || prev_c == '.'
                        || prev_c == ':'
                    {
                        bonus += SCORE_SEPARATOR;
                    }
                }

                if let Some(prev) = prev_matched_idx {
                    if j == prev + 1 {
                        bonus += SCORE_CONSECUTIVE + (consecutive_streak as f64 * 10.0);
                    } else {
                        let gap = (j - prev - 1) as f64;
                        bonus -= gap * PENALTY_GAP;
                    }
                }

                if bonus > best_bonus || best_idx.is_none() {
                    best_bonus = bonus;
                    best_idx = Some(j);
                    if bonus > 0.0 {
                        break;
                    }
                }
            }
        }

        if let Some(chosen_idx) = best_idx {
            score += SCORE_MATCH_BASE + best_bonus;
            if let Some(prev) = prev_matched_idx {
                if chosen_idx == prev + 1 {
                    consecutive_streak += 1;
                } else {
                    consecutive_streak = 0;
                }
            }
            prev_matched_idx = Some(chosen_idx);
            t_idx = chosen_idx + 1;
            found = true;
        }

        if !found {
            return None;
        }
    }

    if is_prefix {
        score += SCORE_EXACT_PREFIX;
    }

    let unmatched = (n - m) as f64;
    score -= unmatched * PENALTY_UNMATCHED;

    Some(score.max(1.0))
}

/// Matches query as an acronym against word initials of target (e.g. "ndm" in "Neat Download Manager")
/// Zero-heap-allocation byte scanner for ASCII strings
pub fn acronym_match(query: &str, target: &str) -> Option<f64> {
    let q_trimmed = query.trim();
    let q_len = q_trimmed.len();
    if q_len < 2 || q_len > 6 {
        return None;
    }

    if q_trimmed.is_ascii() && target.is_ascii() {
        return acronym_match_ascii(q_trimmed.as_bytes(), target.as_bytes());
    }

    acronym_match_unicode(q_trimmed, target)
}

fn acronym_match_ascii(q_bytes: &[u8], t_bytes: &[u8]) -> Option<f64> {
    let q_len = q_bytes.len();
    let mut qi = 0;
    let mut is_prefix_match = true;
    let mut initial_count = 0;
    let mut prev_is_sep = true;

    for i in 0..t_bytes.len() {
        let b = t_bytes[i];
        let is_sep = b == b' '
            || b == b'-'
            || b == b'_'
            || b == b'.'
            || b == b'/'
            || b == b'\\'
            || b == b'('
            || b == b')';
        let is_upper = b.is_ascii_uppercase();
        let prev_lower = if i > 0 {
            t_bytes[i - 1].is_ascii_lowercase()
        } else {
            false
        };

        if !is_sep && (prev_is_sep || (is_upper && prev_lower)) {
            let initial = b.to_ascii_lowercase();
            if qi < q_len {
                if initial == q_bytes[qi].to_ascii_lowercase() {
                    qi += 1;
                } else if qi == initial_count {
                    is_prefix_match = false;
                }
            }
            initial_count += 1;
        }

        prev_is_sep = is_sep;
    }

    if qi == q_len {
        if is_prefix_match && initial_count >= q_len {
            Some(SCORE_EXACT_PREFIX + 180.0 + (q_len as f64 * 20.0))
        } else {
            Some(SCORE_WORD_BOUNDARY * 3.0 + 50.0)
        }
    } else {
        None
    }
}

fn acronym_match_unicode(query: &str, target: &str) -> Option<f64> {
    let q_chars: Vec<char> = query.to_lowercase().chars().collect();
    let q_len = q_chars.len();
    let mut qi = 0;
    let mut is_prefix_match = true;
    let mut initial_count = 0;
    let mut prev_char: Option<char> = None;

    for c in target.chars() {
        let is_sep = c.is_whitespace()
            || c == '-'
            || c == '_'
            || c == '.'
            || c == '/'
            || c == '\\'
            || c == '('
            || c == ')';
        let prev_sep = prev_char.map_or(true, |p| {
            p.is_whitespace()
                || p == '-'
                || p == '_'
                || p == '.'
                || p == '/'
                || p == '\\'
                || p == '('
                || p == ')'
        });
        let camel = prev_char.map_or(false, |p| p.is_lowercase()) && c.is_uppercase();

        if !is_sep && (prev_sep || camel) {
            let initial = c.to_ascii_lowercase();
            if qi < q_len {
                if initial == q_chars[qi] {
                    qi += 1;
                } else if qi == initial_count {
                    is_prefix_match = false;
                }
            }
            initial_count += 1;
        }

        prev_char = Some(c);
    }

    if qi == q_len {
        if is_prefix_match && initial_count >= q_len {
            Some(SCORE_EXACT_PREFIX + 180.0 + (q_len as f64 * 20.0))
        } else {
            Some(SCORE_WORD_BOUNDARY * 3.0 + 50.0)
        }
    } else {
        None
    }
}

/// Checks if string appears to be a raw filesystem path
pub fn is_raw_filesystem_path(text: &str) -> bool {
    let t = text.trim();
    (t.len() >= 3 && t.as_bytes()[1] == b':' && (t.as_bytes()[2] == b'\\' || t.as_bytes()[2] == b'/'))
        || t.starts_with(r"\\")
        || t.starts_with('/')
        || t.starts_with("./")
        || t.starts_with(r".\")
}

/// Matches query against title, subtitle, and optional keywords, returning highest score
pub fn score_candidate(
    query: &str,
    title: &str,
    subtitle: Option<&str>,
    keywords: &[&str],
) -> Option<f64> {
    // 1. Direct fuzzy match against title
    let mut best_score = fuzzy_match(query, title);

    // 2. Acronym match against title (e.g. "ndm" -> "Neat Download Manager")
    if let Some(acronym_score) = acronym_match(query, title) {
        best_score = Some(best_score.map_or(acronym_score, |s| s.max(acronym_score)));
    }

    // 3. Subtitle match (ONLY for non-path descriptive subtitles like "Windows Setting",
    // never against raw filesystem paths or generic package tags)
    if let Some(sub) = subtitle {
        if !is_raw_filesystem_path(sub) && sub != "Windows Packaged App" {
            if let Some(sub_score) = fuzzy_match(query, sub) {
                let discounted = sub_score * 0.7;
                best_score = Some(best_score.map_or(discounted, |s| s.max(discounted)));
            }
        }
    }

    // 4. Keywords match
    for kw in keywords {
        if let Some(kw_score) = fuzzy_match(query, kw) {
            let discounted = kw_score * 0.85;
            best_score = Some(best_score.map_or(discounted, |s| s.max(discounted)));
        }
    }

    best_score
}

/// Sensitivity cutoff matching Raycast's Root Search Sensitivity filter
pub fn meets_sensitivity_threshold(
    query_len: usize,
    score: f64,
    sensitivity: SearchSensitivity,
) -> bool {
    let min_score = match sensitivity {
        SearchSensitivity::Low => (query_len as f64) * SCORE_MATCH_BASE,
        SearchSensitivity::Medium => {
            if query_len == 1 {
                SCORE_WORD_BOUNDARY + SCORE_MATCH_BASE
            } else if query_len <= 3 {
                SCORE_WORD_BOUNDARY + (query_len as f64 * SCORE_MATCH_BASE)
            } else {
                (query_len as f64 * SCORE_MATCH_BASE * 1.5) + 15.0
            }
        }
        SearchSensitivity::High => {
            if query_len <= 3 {
                (SCORE_WORD_BOUNDARY * 1.5) + (query_len as f64 * SCORE_MATCH_BASE * 1.5)
            } else {
                (query_len as f64 * SCORE_MATCH_BASE * 2.2) + 25.0
            }
        }
    };

    score >= min_score
}

/// Combines fuzzy match score with SQLite frecency scoring
pub fn apply_frecency(match_score: f64, frecency: f64) -> f64 {
    if frecency <= 0.0 {
        return match_score;
    }
    let boost = (1.0 + (1.0 + frecency).ln() * 0.4).min(2.5);
    (match_score * boost) + (frecency * 10.0)
}

/// Global search over all registered apps, built-in commands, and settings (default Medium sensitivity)
pub fn search_all(
    query: &str,
    apps: &[AppCacheItem],
    frecency_map: &HashMap<String, f64>,
    limit: usize,
) -> Vec<SearchResult> {
    search_all_with_sensitivity(query, apps, frecency_map, limit, SearchSensitivity::Medium)
}

/// Global search with customizable sensitivity threshold
pub fn search_all_with_sensitivity(
    query: &str,
    apps: &[AppCacheItem],
    frecency_map: &HashMap<String, f64>,
    limit: usize,
    sensitivity: SearchSensitivity,
) -> Vec<SearchResult> {
    let query_trimmed = query.trim();
    let is_empty = query_trimmed.is_empty();

    let mut results: Vec<SearchResult> = Vec::with_capacity(apps.len() + 10);

    // 1. Built-in root commands
    for cmd in get_root_commands() {
        let frecency = frecency_map.get(&cmd.id).copied().unwrap_or(0.0);
        if is_empty {
            let mut c = cmd;
            c.score = 100.0 + (frecency * 10.0);
            results.push(c);
        } else if let Some(score) = score_candidate(query_trimmed, &cmd.title, Some(&cmd.subtitle), &[]) {
            if meets_sensitivity_threshold(query_trimmed.len(), score, sensitivity) {
                let mut c = cmd;
                c.score = apply_frecency(score, frecency);
                results.push(c);
            }
        }
    }

    // 2. Applications & Settings from app_cache
    for app in apps {
        let frecency = frecency_map.get(&app.app_id).copied().unwrap_or(0.0);
        let category = match app.content_type {
            2 => "setting",
            _ => "app",
        };
        let subtitle = match app.content_type {
            0 => app.path.clone(),
            1 => "Windows Packaged App".to_string(),
            2 => "Windows Setting".to_string(),
            _ => "".to_string(),
        };

        if is_empty {
            // Include frequently used apps on empty query
            if frecency > 0.0 {
                results.push(SearchResult {
                    id: app.app_id.clone(),
                    title: app.name.clone(),
                    subtitle,
                    category: category.to_string(),
                    icon: app.icon_path.clone(),
                    action: format!("launch:{}", app.path),
                    score: 50.0 + (frecency * 10.0),
                });
            }
        } else {
            let keywords = if app.content_type == 2 {
                crate::app_scanner::get_setting_keywords(&app.path)
            } else {
                &[]
            };

            let mut matched_score = score_candidate(query_trimmed, &app.name, Some(&subtitle), keywords);

            if let Some(ref loc) = app.localized_name {
                if let Some(loc_score) = score_candidate(query_trimmed, loc, Some(&subtitle), keywords) {
                    matched_score = Some(matched_score.map_or(loc_score, |s| s.max(loc_score)));
                }
            }

            if let Some(score) = matched_score {
                if meets_sensitivity_threshold(query_trimmed.len(), score, sensitivity) {
                    results.push(SearchResult {
                        id: app.app_id.clone(),
                        title: app.name.clone(),
                        subtitle,
                        category: category.to_string(),
                        icon: app.icon_path.clone(),
                        action: format!("launch:{}", app.path),
                        score: apply_frecency(score, frecency),
                    });
                }
            }
        }
    }

    // Sort descending by score, tie-break alphabetically by title
    results.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.title.cmp(&b.title))
    });

    results.truncate(limit);
    results
}

pub fn get_root_commands() -> Vec<SearchResult> {
    vec![
        SearchResult {
            id: "cmd-clipboard".into(),
            title: "Clipboard History".into(),
            subtitle: "Search copied items and paste".into(),
            category: "command".into(),
            icon: Some("clipboard".into()),
            action: "view:clipboard".into(),
            score: 100.0,
        },
        SearchResult {
            id: "cmd-snippets".into(),
            title: "Snippets".into(),
            subtitle: "Create and expand text snippets".into(),
            category: "command".into(),
            icon: Some("file-text".into()),
            action: "view:snippets".into(),
            score: 95.0,
        },
        SearchResult {
            id: "cmd-files".into(),
            title: "Search Files".into(),
            subtitle: "Search documents and folders on disk".into(),
            category: "command".into(),
            icon: Some("search".into()),
            action: "view:files".into(),
            score: 90.0,
        },
        SearchResult {
            id: "cmd-settings".into(),
            title: "Settings".into(),
            subtitle: "Configure hotkeys, theme, and search preferences".into(),
            category: "setting".into(),
            icon: Some("settings".into()),
            action: "view:settings".into(),
            score: 85.0,
        },
        SearchResult {
            id: "cmd-lock".into(),
            title: "Lock Workstation".into(),
            subtitle: "Lock the current Windows session".into(),
            category: "command".into(),
            icon: Some("lock".into()),
            action: "system:lock".into(),
            score: 70.0,
        },
        SearchResult {
            id: "cmd-sleep".into(),
            title: "Sleep".into(),
            subtitle: "Put computer into low-power sleep state".into(),
            category: "command".into(),
            icon: Some("moon".into()),
            action: "system:sleep".into(),
            score: 68.0,
        },
        SearchResult {
            id: "cmd-restart".into(),
            title: "Restart Computer".into(),
            subtitle: "Reboot Windows".into(),
            category: "command".into(),
            icon: Some("rotate-ccw".into()),
            action: "system:restart".into(),
            score: 65.0,
        },
        SearchResult {
            id: "cmd-shutdown".into(),
            title: "Shut Down Computer".into(),
            subtitle: "Power off Windows".into(),
            category: "command".into(),
            icon: Some("power".into()),
            action: "system:shutdown".into(),
            score: 60.0,
        },
    ]
}
