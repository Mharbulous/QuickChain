/**
 * Toast notification system
 * Handles error notifications with auto-dismiss and manual close
 */

class ToastManager {
    constructor() {
        this.container = document.getElementById('toastContainer');
        this.toasts = new Map();
    }

    /**
     * Show an error toast
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {number} duration - Duration in milliseconds (default: 10000)
     * @returns {string} Toast ID
     */
    showError(title, message, duration = 10000) {
        const id = `toast-${Date.now()}-${Math.random()}`;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.id = id;

        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-title">${this.escapeHtml(title)}</div>
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            <button class="toast-close" aria-label="Close">×</button>
        `;

        // Add close button listener
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.close(id));

        // Add to container
        this.container.appendChild(toast);

        // Set auto-dismiss timer
        const timer = setTimeout(() => this.close(id), duration);

        // Store toast reference
        this.toasts.set(id, { element: toast, timer });

        return id;
    }

    /**
     * Close a toast
     * @param {string} id - Toast ID
     */
    close(id) {
        const toast = this.toasts.get(id);
        if (!toast) return;

        // Clear timer
        clearTimeout(toast.timer);

        // Add hiding animation
        toast.element.classList.add('hiding');

        // Remove after animation
        setTimeout(() => {
            if (toast.element.parentNode) {
                toast.element.parentNode.removeChild(toast.element);
            }
            this.toasts.delete(id);
        }, 300);
    }

    /**
     * Close all toasts
     */
    closeAll() {
        const ids = Array.from(this.toasts.keys());
        ids.forEach(id => this.close(id));
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export singleton instance
export const toastManager = new ToastManager();
