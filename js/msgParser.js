/**
 * .msg file parser
 * Wrapper around @kenjiuno/msgreader library
 */

import * as MsgReader from '@kenjiuno/msgreader';

/**
 * Parse a .msg file
 * @param {File} file - .msg file to parse
 * @returns {Promise<Array<Object>>} Array of parsed email objects
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
            attachments: extractAttachments(fileData.attachments),
            sourceFile: file.name  // Track source filename
        };

        // Check if this is a forwarded email chain and extract individual emails
        const chainEmails = parseForwardedChain(email, file.name);

        // Return array of emails (either the chain or single email wrapped in array)
        return chainEmails.length > 0 ? chainEmails : [email];
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

/**
 * Parse forwarded email chain from email body
 * Detects Outlook-style forwarded emails and extracts individual messages
 * @param {Object} email - Email object with body text
 * @param {string} sourceFile - Name of the source .msg file
 * @returns {Array<Object>} Array of individual email objects, or empty array if not a chain
 */
function parseForwardedChain(email, sourceFile) {
    if (!email.body) {
        return [];
    }

    const body = email.body;

    // Check if this looks like a forwarded email chain
    // Outlook uses separator lines (underscores) and headers like "From:", "Sent:", "To:", "Subject:"
    const hasOutlookSeparator = /_{20,}/.test(body);
    const hasForwardedHeaders = /^(From|Sent):/m.test(body);

    if (!hasOutlookSeparator && !hasForwardedHeaders) {
        // Not a forwarded chain, return empty array
        return [];
    }

    // Split by Outlook separator lines
    const sections = body.split(/_{20,}/);
    const emails = [];

    for (const section of sections) {
        const trimmedSection = section.trim();
        if (!trimmedSection) continue;

        // Try to extract email metadata from this section
        const extractedEmail = extractEmailFromSection(trimmedSection);
        if (extractedEmail) {
            extractedEmail.sourceFile = sourceFile;  // Add source file to each extracted email
            emails.push(extractedEmail);
        }
    }

    // If we successfully extracted multiple emails, return them
    // Otherwise, return empty array to use the original email
    return emails.length > 1 ? emails : [];
}

/**
 * Extract email metadata from a forwarded email section
 * @param {string} section - Text section containing one email
 * @returns {Object|null} Email object or null if parsing fails
 */
function extractEmailFromSection(section) {
    const lines = section.split('\n');
    const email = {
        from: '',
        to: '',
        cc: '',
        date: null,
        subject: '',
        body: '',
        attachments: []
    };

    let bodyStartIndex = 0;
    let foundHeaders = false;

    // Parse headers (From, Sent/Date, To, Cc, Subject)
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Match "From: Name <email>" or "From: email"
        if (/^From:/i.test(line)) {
            email.from = line.replace(/^From:\s*/i, '').trim();
            foundHeaders = true;
            bodyStartIndex = i + 1;
            continue;
        }

        // Match "Sent: Date" (Outlook format)
        if (/^Sent:/i.test(line)) {
            const dateStr = line.replace(/^Sent:\s*/i, '').trim();
            email.date = parseOutlookDate(dateStr);
            bodyStartIndex = i + 1;
            continue;
        }

        // Match "Date: Date" (alternative format)
        if (/^Date:/i.test(line)) {
            const dateStr = line.replace(/^Date:\s*/i, '').trim();
            email.date = parseDate(dateStr);
            bodyStartIndex = i + 1;
            continue;
        }

        // Match "To: recipients"
        if (/^To:/i.test(line)) {
            email.to = line.replace(/^To:\s*/i, '').trim();
            bodyStartIndex = i + 1;
            continue;
        }

        // Match "Cc: recipients"
        if (/^Cc:/i.test(line)) {
            email.cc = line.replace(/^Cc:\s*/i, '').trim();
            bodyStartIndex = i + 1;
            continue;
        }

        // Match "Subject: subject"
        if (/^Subject:/i.test(line)) {
            email.subject = line.replace(/^Subject:\s*/i, '').trim();
            bodyStartIndex = i + 1;
            continue;
        }

        // If we've found headers and hit a non-header line, start body
        if (foundHeaders && line && !/^(From|Sent|Date|To|Cc|Subject):/i.test(line)) {
            bodyStartIndex = i;
            break;
        }
    }

    // Extract body (everything after headers)
    if (bodyStartIndex < lines.length) {
        email.body = lines.slice(bodyStartIndex).join('\n').trim();
    }

    // Only return if we found at least a sender and date
    if (email.from && email.date) {
        return email;
    }

    return null;
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
