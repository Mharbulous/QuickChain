/**
 * QuickChain - Main Application
 * Email chain viewer for .msg files
 */

import { toastManager } from './toast.js';
import { ProcessingQueue } from './queue.js';
import { EmailChain } from './emailChain.js';
import { parseMsgFile } from './msgParser.js';

class QuickChainApp {
    constructor() {
        this.emailChain = new EmailChain();
        this.queue = new ProcessingQueue(this.processFile.bind(this));

        this.initializeElements();
        this.initializeEventListeners();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.initialDropZone = document.getElementById('initialDropZone');
        this.emailChainEl = document.getElementById('emailChain');
        this.dragOverlay = document.getElementById('dragOverlay');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.fileInput = document.getElementById('fileInput');
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Clear All button
        this.clearAllBtn.addEventListener('click', () => this.clearAll());

        // Initial drop zone click to browse files
        this.initialDropZone.addEventListener('click', () => {
            this.fileInput.click();
        });

        // File input change
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
            // Reset file input so same file can be selected again
            e.target.value = '';
        });

        // Drag and drop for initial drop zone
        this.initialDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.initialDropZone.classList.add('drag-over');
        });

        this.initialDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.initialDropZone.classList.remove('drag-over');
        });

        this.initialDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.initialDropZone.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });

        // Drag and drop for email chain area
        this.emailChainEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.showDragOverlay();
        });

        this.emailChainEl.addEventListener('dragleave', (e) => {
            e.preventDefault();
            // Only hide if leaving the email chain area entirely
            if (e.target === this.emailChainEl) {
                this.hideDragOverlay();
            }
        });

        this.emailChainEl.addEventListener('drop', (e) => {
            e.preventDefault();
            this.hideDragOverlay();
            this.handleFiles(e.dataTransfer.files);
        });

        // Prevent default drag behavior on document
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
        });
    }

    /**
     * Show drag overlay
     */
    showDragOverlay() {
        this.dragOverlay.classList.remove('hidden');
        this.emailChainEl.classList.add('drag-over');
    }

    /**
     * Hide drag overlay
     */
    hideDragOverlay() {
        this.dragOverlay.classList.add('hidden');
        this.emailChainEl.classList.remove('drag-over');
    }

    /**
     * Handle dropped or selected files
     * @param {FileList} files - Files to handle
     */
    handleFiles(files) {
        if (!files || files.length === 0) {
            return;
        }

        // Filter for .msg files only
        const msgFiles = Array.from(files).filter(file => {
            const isMsgFile = file.name.toLowerCase().endsWith('.msg');
            if (!isMsgFile) {
                toastManager.showError(
                    'Invalid File Type',
                    `"${file.name}" is not a .msg file and will be ignored.`
                );
            }
            return isMsgFile;
        });

        if (msgFiles.length === 0) {
            return;
        }

        // Add files to processing queue
        this.queue.addFiles(msgFiles);
    }

    /**
     * Process a single .msg file
     * @param {File} file - File to process
     */
    async processFile(file) {
        try {
            // Parse the .msg file (returns array of emails)
            const emails = await parseMsgFile(file);

            // Track how many were added vs duplicates
            let addedCount = 0;
            let duplicateCount = 0;

            // Add each email to the chain
            for (const email of emails) {
                const added = this.emailChain.addEmail(email);
                if (added) {
                    addedCount++;
                } else {
                    duplicateCount++;
                }
            }

            // Show notification if there were duplicates
            if (duplicateCount > 0) {
                const emailWord = duplicateCount === 1 ? 'email' : 'emails';
                toastManager.showError(
                    'Duplicate Email',
                    `"${file.name}" contained ${duplicateCount} ${emailWord} that ${duplicateCount === 1 ? 'has' : 'have'} already been added.`
                );
            }
        } catch (error) {
            // Show error toast
            toastManager.showError(
                'Parsing Error',
                error.message || `Failed to parse "${file.name}".`
            );
        }
    }

    /**
     * Clear all emails and reset the app
     */
    clearAll() {
        // Confirm with user
        const count = this.emailChain.getCount();
        if (count === 0) {
            return;
        }

        const confirmed = confirm(
            `Are you sure you want to clear all ${count} email${count !== 1 ? 's' : ''}?`
        );

        if (!confirmed) {
            return;
        }

        // Clear email chain
        this.emailChain.clear();

        // Clear queue
        this.queue.clear();

        // Clear any toasts
        toastManager.closeAll();
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new QuickChainApp();
    });
} else {
    new QuickChainApp();
}
