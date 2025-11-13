/**
 * DragDropManager - Elegant drag-and-drop file handling
 *
 * Provides reliable drag-and-drop functionality with visual feedback.
 * Uses a counter-based approach to handle nested elements correctly.
 */

export class DragDropManager {
    /**
     * Create a new DragDropManager
     * @param {HTMLElement} dropZone - The element to enable drag-and-drop on
     * @param {Function} onFilesDropped - Callback when files are dropped: (files) => void
     * @param {Object} options - Configuration options
     * @param {string} options.activeClass - CSS class to add when dragging over (default: 'drag-over')
     * @param {string[]} options.allowedExtensions - Allowed file extensions (e.g., ['.msg'])
     * @param {Function} options.onInvalidFile - Callback for invalid files: (file) => void
     */
    constructor(dropZone, onFilesDropped, options = {}) {
        this.dropZone = dropZone;
        this.onFilesDropped = onFilesDropped;
        this.activeClass = options.activeClass || 'drag-over';
        this.allowedExtensions = options.allowedExtensions || [];
        this.onInvalidFile = options.onInvalidFile || null;

        // Counter to track nested drag enter/leave events
        this.dragCounter = 0;

        // Bound event handlers (for proper removal later)
        this.boundHandlers = {
            dragEnter: this.handleDragEnter.bind(this),
            dragOver: this.handleDragOver.bind(this),
            dragLeave: this.handleDragLeave.bind(this),
            drop: this.handleDrop.bind(this)
        };

        this.enable();
    }

    /**
     * Enable drag-and-drop on the drop zone
     */
    enable() {
        this.dropZone.addEventListener('dragenter', this.boundHandlers.dragEnter);
        this.dropZone.addEventListener('dragover', this.boundHandlers.dragOver);
        this.dropZone.addEventListener('dragleave', this.boundHandlers.dragLeave);
        this.dropZone.addEventListener('drop', this.boundHandlers.drop);
    }

    /**
     * Disable drag-and-drop on the drop zone
     */
    disable() {
        this.dropZone.removeEventListener('dragenter', this.boundHandlers.dragEnter);
        this.dropZone.removeEventListener('dragover', this.boundHandlers.dragOver);
        this.dropZone.removeEventListener('dragleave', this.boundHandlers.dragLeave);
        this.dropZone.removeEventListener('drop', this.boundHandlers.drop);
        this.deactivate();
    }

    /**
     * Handle drag enter - increment counter and show visual feedback
     */
    handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();

        this.dragCounter++;

        // Only add active class on first enter
        if (this.dragCounter === 1) {
            this.activate();
        }
    }

    /**
     * Handle drag over - required to allow drop
     */
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();

        // Set the drop effect
        e.dataTransfer.dropEffect = 'copy';
    }

    /**
     * Handle drag leave - decrement counter and hide visual feedback when counter reaches 0
     */
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();

        this.dragCounter--;

        // Only remove active class when all drags have left
        if (this.dragCounter === 0) {
            this.deactivate();
        }
    }

    /**
     * Handle drop - process files and reset state
     */
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        // Reset counter and deactivate
        this.dragCounter = 0;
        this.deactivate();

        // Get dropped files
        const files = Array.from(e.dataTransfer.files);

        if (files.length === 0) {
            return;
        }

        // Filter files if extensions are specified
        if (this.allowedExtensions.length > 0) {
            const validFiles = [];

            for (const file of files) {
                const isValid = this.allowedExtensions.some(ext =>
                    file.name.toLowerCase().endsWith(ext.toLowerCase())
                );

                if (isValid) {
                    validFiles.push(file);
                } else if (this.onInvalidFile) {
                    this.onInvalidFile(file);
                }
            }

            if (validFiles.length > 0) {
                this.onFilesDropped(validFiles);
            }
        } else {
            // No filtering, accept all files
            this.onFilesDropped(files);
        }
    }

    /**
     * Activate visual feedback
     */
    activate() {
        this.dropZone.classList.add(this.activeClass);
    }

    /**
     * Deactivate visual feedback
     */
    deactivate() {
        this.dropZone.classList.remove(this.activeClass);
    }

    /**
     * Destroy the manager and clean up
     */
    destroy() {
        this.disable();
        this.dragCounter = 0;
    }
}
