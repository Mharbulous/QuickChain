/**
 * File processing queue
 * Manages sequential processing of .msg files
 */

export class ProcessingQueue {
    constructor(processor) {
        this.processor = processor;
        this.queue = [];
        this.isProcessing = false;
        this.currentFile = null;

        // DOM elements
        this.queueStatusEl = document.getElementById('queueStatus');
        this.queueCountEl = document.getElementById('queueCount');
        this.queueStateEl = document.getElementById('queueState');
        this.queueDetailsEl = document.getElementById('queueDetails');
        this.currentFileEl = document.getElementById('currentFile');
        this.nextFileEl = document.getElementById('nextFile');
    }

    /**
     * Add files to the queue
     * @param {File[]} files - Array of files to process
     */
    addFiles(files) {
        this.queue.push(...files);
        this.updateUI();

        if (!this.isProcessing) {
            this.processNext();
        }
    }

    /**
     * Process the next file in the queue
     */
    async processNext() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            this.currentFile = null;
            this.updateUI();
            return;
        }

        this.isProcessing = true;
        this.currentFile = this.queue.shift();
        this.updateUI();

        try {
            await this.processor(this.currentFile);
        } catch (error) {
            console.error('Error processing file:', error);
        }

        // Process next file
        this.processNext();
    }

    /**
     * Clear the queue
     */
    clear() {
        this.queue = [];
        this.currentFile = null;
        this.isProcessing = false;
        this.updateUI();
    }

    /**
     * Update the queue UI
     */
    updateUI() {
        const totalInQueue = this.queue.length + (this.currentFile ? 1 : 0);

        // Show/hide queue status
        if (totalInQueue === 0 && !this.currentFile) {
            this.queueStatusEl.classList.add('hidden');
            return;
        }

        this.queueStatusEl.classList.remove('hidden');

        // Update count
        this.queueCountEl.textContent = totalInQueue;

        // Update state
        if (this.isProcessing && this.currentFile) {
            this.queueStateEl.textContent = 'Processing';
            this.queueStateEl.classList.add('processing');
            this.queueDetailsEl.classList.remove('hidden');

            // Update current file
            this.currentFileEl.textContent = this.currentFile.name;

            // Update next file
            if (this.queue.length > 0) {
                this.nextFileEl.textContent = this.queue[0].name;
            } else {
                this.nextFileEl.textContent = '-';
            }
        } else {
            this.queueStateEl.textContent = 'Ready';
            this.queueStateEl.classList.remove('processing');
            this.queueDetailsEl.classList.add('hidden');
        }
    }

    /**
     * Get the current queue size
     * @returns {number} Number of files in queue
     */
    getSize() {
        return this.queue.length + (this.currentFile ? 1 : 0);
    }

    /**
     * Check if queue is processing
     * @returns {boolean} True if processing
     */
    isActive() {
        return this.isProcessing;
    }
}
