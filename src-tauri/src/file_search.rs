use std::fs;
use std::path::Path;
use crate::models::FileResult;

/// Search files matching query within target directories
pub fn search_local_files(query: &str, directories: &[String], limit: usize) -> Vec<FileResult> {
    if query.trim().is_empty() {
        return Vec::new();
    }

    let q_lower = query.to_lowercase();
    let mut results = Vec::new();

    for dir_str in directories {
        let root = Path::new(dir_str);
        if root.exists() && root.is_dir() {
            crawl_directory(root, &q_lower, &mut results, limit);
            if results.len() >= limit {
                break;
            }
        }
    }

    results
}

fn crawl_directory(dir: &Path, q_lower: &str, results: &mut Vec<FileResult>, limit: usize) {
    if results.len() >= limit {
        return;
    }

    // Read dir with error tolerance
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        if results.len() >= limit {
            break;
        }

        let path = entry.path();
        let file_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };

        // Skip hidden files, system folders, node_modules, .git
        if file_name.starts_with('.') || file_name == "node_modules" || file_name == "$RECYCLE.BIN" {
            continue;
        }

        let is_dir = entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false);

        if file_name.to_lowercase().contains(q_lower) {
            let metadata = entry.metadata().ok();
            let size_bytes = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
            let modified_at = metadata
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);

            let extension = path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or(if is_dir { "folder" } else { "" })
                .to_string();

            results.push(FileResult {
                path: path.to_string_lossy().to_string(),
                file_name,
                extension,
                size_bytes,
                modified_at,
            });
        }

        if is_dir {
            crawl_directory(&path, q_lower, results, limit);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use tempfile::tempdir;

    #[test]
    fn test_search_local_files() {
        let dir = tempdir().unwrap();
        let file1 = dir.path().join("document_report.pdf");
        let file2 = dir.path().join("invoice_october.xlsx");
        let sub = dir.path().join("subfolder");
        std::fs::create_dir(&sub).unwrap();
        let file3 = sub.join("report_summary.docx");

        File::create(&file1).unwrap();
        File::create(&file2).unwrap();
        File::create(&file3).unwrap();

        let search_dirs = vec![dir.path().to_string_lossy().to_string()];
        let found = search_local_files("report", &search_dirs, 10);

        assert_eq!(found.len(), 2);
        assert!(found.iter().any(|f| f.file_name == "document_report.pdf"));
        assert!(found.iter().any(|f| f.file_name == "report_summary.docx"));
    }
}
