/**
 * Email chain management
 * Handles chronological ordering, deduplication, and display of emails
 */

export class EmailChain {
    constructor() {
        this.emails = new Map(); // Use Map for deduplication by message ID
        this.container = document.getElementById('emailChain');
        this.initialDropZone = document.getElementById('initialDropZone');
    }

    /**
     * Add an email to the chain
     * @param {Object} email - Parsed email object
     * @returns {boolean} True if added, false if duplicate
     */
    addEmail(email) {
        // Generate a unique identifier for the email
        const emailId = this.generateEmailId(email);

        // Check for duplicates
        if (this.emails.has(emailId)) {
            return false; // Duplicate, ignore
        }

        // Add to collection
        this.emails.set(emailId, email);

        // Re-render the entire chain in chronological order
        this.render();

        return true;
    }

    /**
     * Generate a unique identifier for an email
     * Uses combination of date, subject, from, and first 100 chars of body
     * @param {Object} email - Email object
     * @returns {string} Unique identifier
     */
    generateEmailId(email) {
        const parts = [
            email.date?.toISOString() || '',
            email.subject || '',
            email.from || '',
            (email.body || '').substring(0, 100)
        ];
        return parts.join('|||');
    }

    /**
     * Clear all emails
     */
    clear() {
        this.emails.clear();
        this.render();
    }

    /**
     * Get sorted emails (chronologically, earliest first)
     * @returns {Array} Sorted array of emails
     */
    getSortedEmails() {
        const emailArray = Array.from(this.emails.values());

        return emailArray.sort((a, b) => {
            const dateA = a.date || new Date(0);
            const dateB = b.date || new Date(0);
            return dateA - dateB; // Ascending order (earliest first)
        });
    }

    /**
     * Render the email chain
     */
    render() {
        const sortedEmails = this.getSortedEmails();

        // Toggle visibility of initial drop zone and email chain
        if (sortedEmails.length === 0) {
            this.initialDropZone.classList.remove('hidden');
            this.container.classList.add('hidden');
            return;
        }

        this.initialDropZone.classList.add('hidden');
        this.container.classList.remove('hidden');

        // Clear container
        this.container.innerHTML = '';

        // Render each email as an individual card with alternating alignment
        sortedEmails.forEach((email, index) => {
            const emailCard = this.createEmailCard(email, index);
            this.container.appendChild(emailCard);
        });
    }

    /**
     * Create an individual email card with alternating alignment
     * @param {Object} email - Email object
     * @param {number} index - Index of the email for alternating alignment
     * @returns {HTMLElement} Email card element
     */
    createEmailCard(email, index) {
        const cardDiv = document.createElement('div');
        // Alternate between left and right alignment
        const alignmentClass = index % 2 === 0 ? 'email-card-left' : 'email-card-right';
        cardDiv.className = `email-card ${alignmentClass}`;

        // Add source file badge
        const sourceFile = email.sourceFile || 'Unknown';
        const sourceBadge = document.createElement('div');
        sourceBadge.className = 'email-source-badge';
        sourceBadge.textContent = sourceFile;
        cardDiv.appendChild(sourceBadge);

        // Add email content
        const emailContent = this.createEmailElement(email);
        cardDiv.appendChild(emailContent);

        return cardDiv;
    }

    /**
     * Create an email element
     * @param {Object} email - Email object
     * @returns {HTMLElement} Email element
     */
    createEmailElement(email) {
        const div = document.createElement('div');
        div.className = 'email-item';

        const headerHtml = this.createHeaderHtml(email);
        const bodyHtml = this.createBodyHtml(email);
        const attachmentsHtml = this.createAttachmentsHtml(email);

        div.innerHTML = `
            <div class="email-header">
                ${headerHtml}
            </div>
            ${bodyHtml}
            ${attachmentsHtml}
        `;

        return div;
    }

    /**
     * Create header HTML
     * @param {Object} email - Email object
     * @returns {string} Header HTML
     */
    createHeaderHtml(email) {
        const meta = [];

        if (email.from) {
            meta.push({ label: 'From:', value: email.from });
        }

        if (email.to) {
            meta.push({ label: 'To:', value: email.to });
        }

        if (email.cc) {
            meta.push({ label: 'Cc:', value: email.cc });
        }

        if (email.date) {
            meta.push({
                label: 'Date:',
                value: this.formatDate(email.date)
            });
        }

        const metaHtml = meta
            .map(({ label, value }) => `
                <div class="email-meta-row">
                    <span class="email-meta-label">${this.escapeHtml(label)}</span>
                    <span class="email-meta-value">${this.escapeHtml(value)}</span>
                </div>
            `)
            .join('');

        return `
            <div class="email-meta">
                ${metaHtml}
            </div>
            <div class="email-subject">${this.escapeHtml(email.subject || '(No Subject)')}</div>
        `;
    }

    /**
     * Create body HTML
     * @param {Object} email - Email object
     * @returns {string} Body HTML
     */
    createBodyHtml(email) {
        if (!email.body) {
            return '';
        }

        return `<div class="email-body">${this.escapeHtml(email.body)}</div>`;
    }

    /**
     * Create attachments HTML
     * @param {Object} email - Email object
     * @returns {string} Attachments HTML
     */
    createAttachmentsHtml(email) {
        if (!email.attachments || email.attachments.length === 0) {
            return '';
        }

        const attachmentsList = email.attachments
            .map(name => `<li>${this.escapeHtml(name)}</li>`)
            .join('');

        return `
            <div class="email-attachments">
                <div class="email-attachments-label">Attachments:</div>
                <ul class="email-attachments-list">
                    ${attachmentsList}
                </ul>
            </div>
        `;
    }

    /**
     * Format date for display
     * @param {Date} date - Date object
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        if (!date || !(date instanceof Date) || isNaN(date)) {
            return 'Unknown Date';
        }

        // Format: "Mon, Jan 15, 2024 at 3:45 PM"
        const options = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };

        return date.toLocaleString('en-US', options);
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }

        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    /**
     * Get the number of emails in the chain
     * @returns {number} Number of emails
     */
    getCount() {
        return this.emails.size;
    }
}
