/**
 * .msg file parser
 * Wrapper around @kenjiuno/msgreader library
 * Main coordinator for parsing .msg files and extracting email data
 */

import * as MsgReader from '@kenjiuno/msgreader';
import { formatAddress, formatRecipients, parseDate } from './formatters.js';
import { extractBody, extractAttachments } from './bodyExtractor.js';
import { parseForwardedChain } from './chainParser.js';

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
