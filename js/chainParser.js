/**
 * Forwarded email chain parser
 * Coordinates detection and extraction of individual emails from forwarded chains
 */

import { identifyMessageBoundaries } from './boundaryDetector.js';
import { extractEmailFromSection } from './emailExtractor.js';

/**
 * Parse forwarded email chain from email body
 * Detects email threads and extracts individual messages
 * @param {Object} email - Email object with body text
 * @param {string} sourceFile - Name of the source .msg file
 * @returns {Array<Object>} Array of individual email objects, or empty array if not a chain
 */
export function parseForwardedChain(email, sourceFile) {
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
