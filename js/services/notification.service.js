/**
 * Notification Service - Toast Notifications System
 * Handles all notification types: success, error, warning, info
 */

import EventBus from '../core/eventBus.js';

export class NotificationService {
  constructor() {
    this.notifications = new Map();
    this.container = null;
    this.maxNotifications = 5;
    this.init();
  }

  init() {
    this.createContainer();
    this.bindEvents();
    console.log('NotificationService initialized');
  }

  createContainer() {
    this.container = document.getElementById('notification-container');
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.className = 'notification-container';
      this.container.setAttribute('role', 'region');
      this.container.setAttribute('aria-label', 'Thông báo');
      this.container.setAttribute('aria-live', 'polite');
      
      document.body.appendChild(this.container);
    }
  }

  bindEvents() {
    // Listen for global events
    EventBus.on('notification:show', (data) => {
      this.show(data.message, data.type, data.options);
    });

    EventBus.on('notification:clear', () => {
      this.clear();
    });
  }

  /**
   * Show notification
   * @param {string} message - Notification message
   * @param {string} type - success, error, warning, info
   * @param {object} options - Additional options
   */
  show(message, type = 'info', options = {}) {
    const id = this.generateId();
    const notification = this.createNotification(id, message, type, options);
    
    // Add to container
    this.container.appendChild(notification.element);
    
    // Store reference
    this.notifications.set(id, notification);
    
    // Remove excess notifications
    this.limitNotifications();
    
    // Auto dismiss
    if (options.duration !== 0) {
      const duration = options.duration || this.getDefaultDuration(type);
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    // Emit event
    EventBus.emit('notification:shown', {
      id,
      message,
      type,
      options
    });

    return id;
  }

  /**
   * Show success notification
   */
  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  /**
   * Show error notification
   */
  error(message, options = {}) {
    return this.show(message, 'error', { duration: 6000, ...options });
  }

  /**
   * Show warning notification
   */
  warning(message, options = {}) {
    return this.show(message, 'warning', { duration: 5000, ...options });
  }

  /**
   * Show info notification
   */
  info(message, options = {}) {
    return this.show(message, 'info', options);
  }

  /**
   * Create notification element
   */
  createNotification(id, message, type, options) {
    const element = document.createElement('div');
    element.className = `notification notification--${type}`;
    element.setAttribute('role', 'alert');
    element.setAttribute('aria-live', 'polite');
    
    const icon = this.getIcon(type);
    const colors = this.getColors(type);
    
    element.innerHTML = `
      <div class="notification__content">
        <div class="notification__icon">
          ${icon}
        </div>
        <div class="notification__message">
          ${this.escapeHtml(message)}
        </div>
        <div class="notification__actions">
          ${this.renderActions(options.actions || [])}
          <button class="notification__close" aria-label="Đóng thông báo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="notification__progress"></div>
    `;

    // Add custom styles
    element.style.cssText = `
      --notification-bg: ${colors.background};
      --notification-border: ${colors.border};
      --notification-text: ${colors.text};
      --notification-icon: ${colors.icon};
    `;

    // Bind events
    this.bindNotificationEvents(element, id, options);
    
    // Animation
    this.animateIn(element);

    return {
      id,
      element,
      message,
      type,
      options,
      createdAt: Date.now()
    };
  }

  /**
   * Bind notification-specific events
   */
  bindNotificationEvents(element, id, options) {
    // Close button
    const closeBtn = element.querySelector('.notification__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.dismiss(id);
      });
    }

    // Action buttons
    const actionBtns = element.querySelectorAll('.notification__action');
    actionBtns.forEach((btn, index) => {
      const action = options.actions?.[index];
      if (action && action.action) {
        btn.addEventListener('click', () => {
          try {
            action.action();
            if (action.dismissOnAction !== false) {
              this.dismiss(id);
            }
          } catch (error) {
            console.error('Notification action error:', error);
          }
        });
      }
    });

    // Progress bar animation
    if (options.duration && options.duration > 0) {
      const progress = element.querySelector('.notification__progress');
      if (progress) {
        progress.style.animationDuration = `${options.duration}ms`;
        progress.classList.add('notification__progress--active');
      }
    }

    // Sound notification
    if (options.sound) {
      this.playSound(options.sound);
    }
  }

  /**
   * Dismiss notification
   */
  dismiss(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    this.animateOut(notification.element, () => {
      if (this.container.contains(notification.element)) {
        this.container.removeChild(notification.element);
      }
      this.notifications.delete(id);
      
      EventBus.emit('notification:dismissed', {
        id,
        notification
      });
    });
  }

  /**
   * Clear all notifications
   */
  clear() {
    const ids = Array.from(this.notifications.keys());
    ids.forEach(id => this.dismiss(id));
  }

  /**
   * Get notification icon
   */
  getIcon(type) {
    const icons = {
      success: `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      `,
      error: `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      `,
      warning: `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      `,
      info: `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4"></path>
          <path d="M12 8h.01"></path>
        </svg>
      `
    };
    
    return icons[type] || icons.info;
  }

  /**
   * Get notification colors
   */
  getColors(type) {
    const colors = {
      success: {
        background: '#f0fdf4',
        border: '#16a34a',
        text: '#15803d',
        icon: '#16a34a'
      },
      error: {
        background: '#fef2f2',
        border: '#dc2626',
        text: '#dc2626',
        icon: '#dc2626'
      },
      warning: {
        background: '#fffbeb',
        border: '#d97706',
        text: '#92400e',
        icon: '#d97706'
      },
      info: {
        background: '#eff6ff',
        border: '#2563eb',
        text: '#1d4ed8',
        icon: '#2563eb'
      }
    };
    
    return colors[type] || colors.info;
  }

  /**
   * Render action buttons
   */
  renderActions(actions) {
    if (!actions || actions.length === 0) return '';
    
    return actions.map(action => `
      <button class="notification__action" type="button">
        ${this.escapeHtml(action.text)}
      </button>
    `).join('');
  }

  /**
   * Get default duration for notification type
   */
  getDefaultDuration(type) {
    const durations = {
      success: 3000,
      error: 5000,
      warning: 4000,
      info: 3000
    };
    
    return durations[type] || 3000;
  }

  /**
   * Animate notification in
   */
  animateIn(element) {
    element.style.cssText += `
      transform: translateX(100%);
      opacity: 0;
    `;
    
    // Force reflow
    element.offsetHeight;
    
    element.style.cssText += `
      transform: translateX(0);
      opacity: 1;
      transition: all 0.3s ease;
    `;
  }

  /**
   * Animate notification out
   */
  animateOut(element, callback) {
    element.style.cssText += `
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s ease;
    `;
    
    setTimeout(callback, 300);
  }

  /**
   * Limit number of notifications
   */
  limitNotifications() {
    const notifications = Array.from(this.notifications.values())
      .sort((a, b) => a.createdAt - b.createdAt);
    
    while (notifications.length > this.maxNotifications) {
      const oldest = notifications.shift();
      this.dismiss(oldest.id);
    }
  }

  /**
   * Play sound notification
   */
  playSound(soundType) {
    try {
      // You can add actual sound files here
      const sounds = {
        success: 'success.mp3',
        error: 'error.mp3',
        warning: 'warning.mp3',
        info: 'info.mp3'
      };
      
      const soundFile = sounds[soundType];
      if (soundFile) {
        const audio = new Audio(`./assets/sounds/${soundFile}`);
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Ignore errors if sound can't play
        });
      }
    } catch (error) {
      // Ignore sound errors
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get notification count
   */
  getCount() {
    return this.notifications.size;
  }

  /**
   * Get all notifications
   */
  getAll() {
    return Array.from(this.notifications.values());
  }

  /**
   * Check if notifications are supported
   */
  isSupported() {
    return 'Notification' in window;
  }

  /**
   * Request notification permission
   */
  async requestPermission() {
    if (!this.isSupported()) return false;
    
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Notification permission error:', error);
      return false;
    }
  }

  /**
   * Show browser notification
   */
  async showBrowserNotification(title, options = {}) {
    if (!this.isSupported()) return null;
    
    try {
      const permission = await this.requestPermission();
      if (!permission) return null;
      
      const notification = new Notification(title, {
        icon: './assets/icons/icon-192x192.png',
        badge: './assets/icons/icon-72x72.png',
        ...options
      });
      
      return notification;
    } catch (error) {
      console.error('Browser notification error:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new NotificationService();
