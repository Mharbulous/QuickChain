/**
 * Email formatting utilities
 * Handles formatting of email addresses, recipients, and dates
 */

/**
 * Format an email address
 * @param {string} name - Display name
 * @param {string} email - Email address
 * @returns {string} Formatted address
 */
export function formatAddress(name, email) {
    if (!name && !email) return '';
    if (!email) return name;
    if (!name) return email;
    return `${name} <${email}>`;
}

/**
 * Format recipients list
 * @param {Array} recipients - Recipients array
 * @param {string} type - Recipient type ('to' or 'cc')
 * @returns {string} Formatted recipients string
 */
export function formatRecipients(recipients, type) {
    if (!recipients || !Array.isArray(recipients)) {
        return '';
    }

    const recipientType = type.toLowerCase() === 'cc' ? 2 : 1;

    const filtered = recipients
        .filter(r => r.recipType === recipientType)
        .map(r => formatAddress(r.name, r.email))
        .filter(Boolean);

    return filtered.join(', ');
}

/**
 * Parse date string or object to Date
 * @param {*} dateValue - Date value from .msg file
 * @returns {Date|null} Parsed date or null
 */
export function parseDate(dateValue) {
    if (!dateValue) return null;

    // If already a Date object
    if (dateValue instanceof Date) {
        return dateValue;
    }

    // If it's a string, try to parse it
    if (typeof dateValue === 'string') {
        const parsed = new Date(dateValue);
        return isNaN(parsed) ? null : parsed;
    }

    // If it's a number (timestamp)
    if (typeof dateValue === 'number') {
        return new Date(dateValue);
    }

    return null;
}
