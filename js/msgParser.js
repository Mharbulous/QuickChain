/**
 * .msg file parser
 * Wrapper around @kenjiuno/msgreader library
 */

import * as MsgReader from '@kenjiuno/msgreader';

/**
 * Parse a .msg file
 * @param {File} file - .msg file to parse
 * @returns {Promise<Object>} Parsed email object
 * @throws {Error} If parsing fails
 */
export async function parseMsgFile(file) {
    try {
        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Parse using MsgReader
        const msgReader = new MsgReader.default(arrayBuffer);
        const fileData = msgReader.getFileData();

        // Extract email data
        const email = {
            subject: fileData.subject || '',
            from: formatAddress(fileData.senderName, fileData.senderEmail),
            to: formatRecipients(fileData.recipients, 'to'),
            cc: formatRecipients(fileData.recipients, 'cc'),
            date: parseDate(fileData.messageDeliveryTime || fileData.clientSubmitTime),
            body: extractBody(fileData),
            attachments: extractAttachments(fileData.attachments)
        };

        return email;
    } catch (error) {
        console.error('Error parsing .msg file:', error);
        throw new Error(`Failed to parse ${file.name}: ${error.message}`);
    }
}

/**
 * Format an email address
 * @param {string} name - Display name
 * @param {string} email - Email address
 * @returns {string} Formatted address
 */
function formatAddress(name, email) {
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
function formatRecipients(recipients, type) {
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
function parseDate(dateValue) {
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

/**
 * Extract email body (prefer plain text)
 * @param {Object} fileData - Parsed file data
 * @returns {string} Email body
 */
function extractBody(fileData) {
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
function extractAttachments(attachments) {
    if (!attachments || !Array.isArray(attachments)) {
        return [];
    }

    return attachments
        .map(att => att.fileName || att.name)
        .filter(Boolean);
}
