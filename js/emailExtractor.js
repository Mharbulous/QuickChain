/**
 * Email metadata extraction from forwarded message sections
 * Extracts from, to, cc, date, subject, and body from text sections
 */

import { cleanEmailText, parseFlexibleDate } from './textUtils.js';

/**
 * Extract email metadata from a forwarded email section
 * Handles multi-line headers and various formats
 * @param {string} section - Text section containing one email
 * @returns {Object|null} Email object or null if parsing fails
 */
export function extractEmailFromSection(section) {
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
