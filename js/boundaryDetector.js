/**
 * Message boundary detection
 * Identifies where individual messages start in a forwarded email chain
 */

/**
 * Identify all message boundaries in an email body
 * Looks for patterns like "From:", "On [date] ... wrote:", and separator lines
 * @param {string} body - Email body text
 * @returns {Array<number>} Array of character positions where messages start
 */
export function identifyMessageBoundaries(body) {
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
