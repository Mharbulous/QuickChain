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
 * Detects email threads and extracts individual messages
 * @param {Object} email - Email object with body text
 * @param {string} sourceFile - Name of the source .msg file
 * @returns {Array<Object>} Array of individual email objects, or empty array if not a chain
 */
function parseForwardedChain(email, sourceFile) {
    if (!email.body) {
        return [];
    }

    const body = email.body;

    // Find all message boundaries in the email body
    const boundaries = identifyMessageBoundaries(body);

    // If no boundaries found, this is not a chain
    if (boundaries.length === 0) {
        return [];
    }

    const emails = [];

    // Extract each message section
    for (let i = 0; i < boundaries.length; i++) {
        const startPos = boundaries[i];
        const endPos = i < boundaries.length - 1 ? boundaries[i + 1] : body.length;
        const section = body.substring(startPos, endPos).trim();

        if (!section) continue;

        // Try to extract email metadata from this section
        const extractedEmail = extractEmailFromSection(section);
        if (extractedEmail) {
            extractedEmail.sourceFile = sourceFile;
            emails.push(extractedEmail);
        }
    }

    // If we successfully extracted multiple emails, return them
    // Otherwise, return empty array to use the original email
    return emails.length > 1 ? emails : [];
}

/**
 * Identify all message boundaries in an email body
 * Looks for patterns like "From:", "On [date] ... wrote:", and separator lines
 * @param {string} body - Email body text
 * @returns {Array<number>} Array of character positions where messages start
 */
function identifyMessageBoundaries(body) {
    const boundaries = [];
    const lines = body.split('\n');
    let charPosition = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Pattern 1: "From:" at start of line (common email header)
        // Make sure there's content after "From:" and check next few lines for other headers
        if (/^From:\s*\S/i.test(trimmedLine)) {
            // Look ahead to see if this is followed by To:/Date:/Cc: within next 5 lines
            const hasOtherHeaders = lines.slice(i + 1, i + 6).some(nextLine =>
                /^(To|Date|Sent|Cc|Subject):/i.test(nextLine.trim())
            );

            if (hasOtherHeaders || boundaries.length === 0) {
                boundaries.push(charPosition);
            }
        }

        // Pattern 2: "On [date] ... wrote:" (reply/forward indicator)
        // Examples: "On Jul 11, 2025, at 11:22 AM, CENTERLANE TOWING <email> wrote:"
        if (/^On\s+.+\s+wrote:\s*$/i.test(trimmedLine)) {
            boundaries.push(charPosition);
        }

        // Pattern 3: Separator lines (20+ underscores or dashes)
        if (/^[_-]{20,}$/.test(trimmedLine)) {
            // The message starts after the separator
            boundaries.push(charPosition + line.length + 1);
        }

        // Update character position (add line length + newline)
        charPosition += line.length + 1;
    }

    return boundaries;
}

/**
 * Extract email metadata from a forwarded email section
 * Handles multi-line headers and various formats
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

    let i = 0;
    let foundHeaders = false;
    let lastHeaderType = null;

    // Skip "On ... wrote:" line if present
    if (lines[0] && /^On\s+.+\s+wrote:\s*$/i.test(lines[0].trim())) {
        i = 1;
    }

    // Parse headers - can be multi-line
    while (i < lines.length) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Check if this line starts a new header
        const headerMatch = trimmedLine.match(/^(From|To|Cc|Date|Sent|Subject):\s*(.*)/i);

        if (headerMatch) {
            const headerType = headerMatch[1].toLowerCase();
            let headerValue = headerMatch[2].trim();

            // If the header value is empty or very short, check next lines
            if (!headerValue || headerValue.length < 3) {
                i++;
                // Collect continuation lines until we hit another header or empty line
                while (i < lines.length) {
                    const nextLine = lines[i].trim();
                    if (!nextLine || /^(From|To|Cc|Date|Sent|Subject):/i.test(nextLine)) {
                        break;
                    }
                    headerValue += (headerValue ? ' ' : '') + nextLine;
                    i++;
                }
                i--; // Step back one since we'll increment at the end
            }

            // Clean up the header value
            headerValue = cleanEmailText(headerValue);

            // Store the header value
            switch (headerType) {
                case 'from':
                    email.from = headerValue;
                    foundHeaders = true;
                    break;
                case 'to':
                    email.to = headerValue;
                    break;
                case 'cc':
                    email.cc = headerValue;
                    break;
                case 'date':
                case 'sent':
                    email.date = parseFlexibleDate(headerValue);
                    break;
                case 'subject':
                    email.subject = headerValue;
                    break;
            }

            lastHeaderType = headerType;
        } else if (foundHeaders && !trimmedLine) {
            // Empty line after headers means body starts next
            i++;
            break;
        } else if (foundHeaders && !/^(From|To|Cc|Date|Sent|Subject):/i.test(trimmedLine)) {
            // Non-header line after we've found headers
            // Could be the subject (if no Subject: label found) or start of body
            if (!email.subject && trimmedLine && trimmedLine.length < 200) {
                // Likely a subject line without "Subject:" label
                email.subject = trimmedLine;
            } else {
                // Start of body
                break;
            }
        }

        i++;
    }

    // Extract body (everything after headers)
    if (i < lines.length) {
        email.body = lines.slice(i).join('\n').trim();
    }

    // Only return if we found at least a sender or a date
    if ((email.from || email.to) && (email.date || email.subject)) {
        return email;
    }

    return null;
}

/**
 * Clean email text by removing mailto: links and extra whitespace
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
function cleanEmailText(text) {
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
function parseFlexibleDate(dateStr) {
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
