use super::{clean_text, ParsedJob};
use scraper::{Html, Selector};

/// Parse a Personio job posting
/// Uses heuristics: get meta tags + find the largest content block
pub fn parse_personio(html: &str) -> ParsedJob {
    let document = Html::parse_document(html);

    // Get title from og:title or H1 (reliable)
    let title = extract_og_title(&document).or_else(|| extract_h1(&document));

    // Get company from og:site_name (reliable)
    let company = extract_og_site_name(&document);

    // Get description: find the largest text block that looks like job content
    let description = extract_largest_content_block(&document);

    // Get location from meta tags or heuristics
    let location = None; // Hard to extract reliably across layouts

    ParsedJob {
        title,
        company,
        location,
        description,
    }
}

fn extract_og_title(document: &Html) -> Option<String> {
    let selector = Selector::parse("meta[property='og:title']").ok()?;
    document
        .select(&selector)
        .next()
        .and_then(|el| el.value().attr("content"))
        .map(|c| c.trim().to_string())
        .filter(|s| !s.is_empty())
}

fn extract_h1(document: &Html) -> Option<String> {
    let selector = Selector::parse("h1").ok()?;
    document
        .select(&selector)
        .next()
        .map(|el| clean_text(&el.text().collect::<Vec<_>>().join(" ")))
        .filter(|s| !s.is_empty())
}

fn extract_og_site_name(document: &Html) -> Option<String> {
    let selector = Selector::parse("meta[property='og:site_name']").ok()?;
    document
        .select(&selector)
        .next()
        .and_then(|el| el.value().attr("content"))
        .map(|c| c.trim().to_string())
        .filter(|s| !s.is_empty())
}

/// Find the largest content block on the page that looks like job description.
/// Strategy: examine all divs, find the one with the most substantial text,
/// and strip out navigation/footer noise.
fn extract_largest_content_block(document: &Html) -> Option<String> {
    let div_selector = Selector::parse("div").ok()?;

    let mut best_text = String::new();
    let mut best_length = 0usize;

    for div in document.select(&div_selector) {
        let text = extract_text_from_element(&div);

        // Skip if too short or too long
        if text.len() < 300 || text.len() > 50000 {
            continue;
        }

        // Skip navigation/footer content
        if looks_like_noise(&text) {
            continue;
        }

        // This looks like job content - keep the largest one
        if text.len() > best_length {
            best_length = text.len();
            best_text = text;
        }
    }

    if !best_text.is_empty() {
        Some(best_text)
    } else {
        // Fallback: try og:description
        extract_og_description(document)
    }
}

fn extract_text_from_element(element: &scraper::ElementRef) -> String {
    // Get direct text content (not from nested divs)
    let text: String = element
        .text()
        .filter(|t| {
            let s = t.trim();
            !s.is_empty()
        })
        .collect::<Vec<_>>()
        .join("\n");

    // Normalize whitespace
    text.split_whitespace()
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string()
}

fn looks_like_noise(text: &str) -> bool {
    let lower = text.to_lowercase();

    // Skip if it's mostly navigation/footer/legal content
    let noise_keywords = [
        "datenschutzerklärung",
        "impressum",
        "cookie",
        "nutzungsbedingungen",
        "agb",
        "powered by",
        "zurück zu allen stellen",
        "auf diese stelle bewerben",
        "menu",
        "navigation",
        "karriere",
        "privacy policy",
        "terms of use",
    ];

    let noise_count = noise_keywords
        .iter()
        .filter(|k| lower.contains(**k))
        .count();

    // If more than 2 noise keywords found, it's probably not the job content
    noise_count >= 2
}

fn extract_og_description(document: &Html) -> Option<String> {
    let selector = Selector::parse("meta[property='og:description']").ok()?;
    document
        .select(&selector)
        .next()
        .and_then(|el| el.value().attr("content"))
        .map(|c| c.trim().to_string())
        .filter(|s| !s.is_empty())
}
