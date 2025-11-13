/**
 * Text processing utilities
 * Handles text cleaning and date parsing
 */

/**
 * Clean email text by removing mailto: links and extra whitespace
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
export function cleanEmailText(text) {
    if (!text) return '';

    // Remove mailto: links - pattern: <mailto:email>
    text = text.replace(/<mailto:([^>]+)>/g, '');

    // Remove duplicate email addresses in angle brackets if they appear twice
    // Example: "email <email>" -> "email"
    text = text.replace(/(\S+@\S+)\s+<\1>/g, '$1');

    // Clean up extra spaces
    text = text.replace(/\s+/g, ' ').trim();

    return text;
}

/**
 * Parse dates in various formats
 * Handles: "Mon, Jan 6, 2025, 9:26 AM", "January 9, 2025 7:06 PM", etc.
 * @param {string} dateStr - Date string
 * @returns {Date|null} Parsed date or null
 */
export function parseFlexibleDate(dateStr) {
    if (!dateStr) return null;

    // Try standard parsing first
    let parsed = new Date(dateStr);
    if (!isNaN(parsed)) {
        return parsed;
    }

    // Try removing day of week prefix (Mon, Tuesday, etc.)
    const withoutDay = dateStr.replace(/^[A-Za-z]+,\s*/, '');
    parsed = new Date(withoutDay);
    if (!isNaN(parsed)) {
        return parsed;
    }

    // Try parsing Outlook-style format
    return parseOutlookDate(dateStr);
}

/**
 * Parse Outlook-style date format
 * Examples: "Thursday, January 9, 2025 7:06 PM" or "Monday, January 6, 2025 9:26:12 AM"
 * @param {string} dateStr - Date string from Outlook
 * @returns {Date|null} Parsed date or null
 */
function parseOutlookDate(dateStr) {
    if (!dateStr) return null;

    // Outlook format: "Day, Month Date, Year Time AM/PM"
    // Example: "Thursday, January 9, 2025 7:06 PM"

    // Try to parse directly first
    const parsed = new Date(dateStr);
    if (!isNaN(parsed)) {
        return parsed;
    }

    // Try removing the day of week
    const withoutDay = dateStr.replace(/^[A-Za-z]+,\s*/, '');
    const parsedWithoutDay = new Date(withoutDay);
    if (!isNaN(parsedWithoutDay)) {
        return parsedWithoutDay;
    }

    return null;
}
