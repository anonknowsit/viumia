pub mod personio;

use serde::Serialize;

/// Parsed job data from a job posting URL
#[derive(Debug, Clone, Serialize)]
pub struct ParsedJob {
    pub title: Option<String>,
    pub company: Option<String>,
    pub location: Option<String>,
    pub description: Option<String>,
}

/// Detect which job board/platform a URL belongs to
pub fn detect_source(url: &str) -> &str {
    let lower = url.to_lowercase();
    if lower.contains("personio.com") {
        "personio"
    } else {
        "generic"
    }
}

/// Clean and normalize extracted text
pub fn clean_text(text: &str) -> String {
    text.split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string()
}
