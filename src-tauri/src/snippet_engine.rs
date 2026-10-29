use chrono::Local;
use uuid::Uuid;

/// Evaluates dynamic snippet placeholders
/// Supported placeholders:
/// - `{cursor}` - Special marker indicating caret landing position
/// - `{date}` - Current date formatted as YYYY-MM-DD
/// - `{time}` - Current time formatted as HH:MM:SS
/// - `{datetime}` - Current timestamp formatted as YYYY-MM-DD HH:MM:SS
/// - `{uuid}` - Standard UUID v4
/// - `{clipboard}` - Current active clipboard content
pub fn expand_placeholders(template: &str, clipboard_content: Option<&str>) -> (String, Option<usize>) {
    let now = Local::now();
    let date_str = now.format("%Y-%m-%d").to_string();
    let time_str = now.format("%H:%M:%S").to_string();
    let datetime_str = now.format("%Y-%m-%d %H:%M:%S").to_string();
    let uuid_str = Uuid::new_v4().to_string();
    let clip_str = clipboard_content.unwrap_or("");

    let mut expanded = template
        .replace("{date}", &date_str)
        .replace("{time}", &time_str)
        .replace("{datetime}", &datetime_str)
        .replace("{uuid}", &uuid_str)
        .replace("{clipboard}", clip_str);

    // Identify {cursor} index and strip it from the inserted text
    if let Some(cursor_pos) = expanded.find("{cursor}") {
        expanded.replace_range(cursor_pos..cursor_pos + 8, "");
        (expanded, Some(cursor_pos))
    } else {
        (expanded, None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_date_and_time_expansion() {
        let template = "Date: {date}, Time: {time}";
        let (res, cursor) = expand_placeholders(template, None);
        assert!(!res.contains("{date}"));
        assert!(!res.contains("{time}"));
        assert!(cursor.is_none());
        assert!(res.starts_with("Date: 20"));
    }

    #[test]
    fn test_uuid_expansion() {
        let template = "ID: {uuid}";
        let (res, _) = expand_placeholders(template, None);
        assert!(!res.contains("{uuid}"));
        assert_eq!(res.len(), 4 + 36);
    }

    #[test]
    fn test_clipboard_expansion() {
        let template = "Copied text: '{clipboard}'";
        let (res, _) = expand_placeholders(template, Some("hello world"));
        assert_eq!(res, "Copied text: 'hello world'");
    }

    #[test]
    fn test_cursor_position_detection() {
        let template = "Hello {cursor} World";
        let (res, cursor) = expand_placeholders(template, None);
        assert_eq!(res, "Hello  World");
        assert_eq!(cursor, Some(6));
    }
}
