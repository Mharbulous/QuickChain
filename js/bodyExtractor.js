/**
 * Email body and attachment extraction
 * Handles body extraction (plain text preferred) and attachment processing
 */

/**
 * Extract email body (prefer plain text)
 * @param {Object} fileData - Parsed file data
 * @returns {string} Email body
 */
export function extractBody(fileData) {
    // Prefer plain text body
    if (fileData.body) {
        return fileData.body;
    }

    // Fall back to HTML body converted to plain text
    if (fileData.bodyHTML) {
        return htmlToPlainText(fileData.bodyHTML);
    }

    return '';
}

/**
 * Convert HTML to plain text (simple conversion)
 * @param {string} html - HTML content
 * @returns {string} Plain text
 */
function htmlToPlainText(html) {
    if (!html) return '';

    // Create a temporary element
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Replace <br> and <p> tags with newlines
    temp.querySelectorAll('br').forEach(br => {
        br.replaceWith('\n');
    });

    temp.querySelectorAll('p').forEach(p => {
        p.insertAdjacentText('afterend', '\n');
    });

    temp.querySelectorAll('div').forEach(div => {
        div.insertAdjacentText('afterend', '\n');
    });

    // Get text content
    let text = temp.textContent || temp.innerText || '';

    // Clean up excessive whitespace
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Max 2 consecutive newlines
    text = text.trim();

    return text;
}

/**
 * Extract attachment names
 * @param {Array} attachments - Attachments array
 * @returns {Array<string>} Array of attachment names
 */
export function extractAttachments(attachments) {
    if (!attachments || !Array.isArray(attachments)) {
        return [];
    }

    return attachments
        .map(att => att.fileName || att.name)
        .filter(Boolean);
}
