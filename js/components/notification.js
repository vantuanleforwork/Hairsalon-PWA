/**
 * Notification Component - Toast notification system
 * Features: Multiple types, Auto-dismiss, Queue system, Animations, Actions
 */

import { EventBus } from '../core/eventBus.js';
import { Utils } from '../core/utils.js';

export class NotificationManager {
  constructor(options = {}) {
    this.options = {
      position: 'top-right', // top-left, top-right, top-center, bottom-left, bottom-right, bottom-center
      maxNotifications: 5,
      defaultDuration: 5000,
      animationDuration: 300,
      stackSpacing: 10,
      enableQueue: true,
      enableActions: true,
      enableProgress: true,
      enableSounds: false,
      ...options
    };
    
    this.notifications = new Map();
    this.queue = [];
    this.container = null;
    this.soundEnabled = this.options.enableSounds && 'AudioContext' in window;
    
    this.typeConfig = {
      success: {
        icon: 'check-circle',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        progressColor: 'bg-green-500',
        sound: { frequency: 800, duration: 150 }
      },
      error: {
        icon: 'x-circle',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        progressColor: 'bg-red-500',
        sound: { frequency: 400, duration: 200 }
      },
      warning: {
        icon: 'exclamation-triangle',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        progressColor: 'bg-yellow-500',
        sound: { frequency: 600, duration: 100 }
      },
      info: {
        icon: 'information-circle',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        progressColor: 'bg-blue-500',
        sound: { frequency: 500, duration: 100 }
      }
    };
    
    this.init();
  }
  
  init() {
    this.createContainer();
    this.bindEvents();
    
    EventBus.emit('notification:initialized', {
      component: 'NotificationManager',
      position: this.options.position
    });
  }
  
  createContainer() {
    // Remove existing container if any
    const existing = document.getElementById('notification-container');
    if (existing) existing.remove();
    
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.className = `notification-container fixed z-50 ${this.getPositionClasses()}`;
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-label', 'Notifications');
    
    document.body.appendChild(this.container);
  }
  
  getPositionClasses() {
    const positions = {
      'top-left': 'top-4 left-4',
      'top-right': 'top-4 right-4',
      'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
      'bottom-left': 'bottom-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
    };
    return positions[this.options.position] || positions['top-right'];
  }
  
  bindEvents() {
    // Handle global events
    EventBus.on('notification:show', (data) => {
      this.show(data.message, data.type, data.options);
    });
    
    EventBus.on('notification:clear', () => {
      this.clearAll();
    });
    
    // Handle visibility change for auto-dismiss pause
    document.addEventListener('visibilitychange', () => {
      this.notifications.forEach(notification => {
        if (notification.timer) {
          if (document.hidden) {
            this.pauseNotification(notification.id);
          } else {
            this.resumeNotification(notification.id);
          }
        }
      });
    });
  }
  
  show(message, type = 'info', options = {}) {
    const notification = this.createNotification(message, type, options);
    
    if (this.options.enableQueue && this.notifications.size >= this.options.maxNotifications) {
      this.queue.push(notification);
      return notification.id;
    }
    
    this.displayNotification(notification);
    return notification.id;
  }
  
  createNotification(message, type, options) {
    const id = Utils.generateId();
    const config = this.typeConfig[type] || this.typeConfig.info;
    
    const notification = {
      id,
      message,
      type,
      config,
      options: {
        duration: this.options.defaultDuration,
        persistent: false,
        actions: [],
        data: {},
        ...options
      },
      createdAt: Date.now(),
      timer: null,
      progressTimer: null,
      element: null,
      paused: false,
      pausedTime: 0
    };
    
    return notification;
  }
  
  displayNotification(notification) {
    const element = this.renderNotification(notification);
    notification.element = element;
    
    this.notifications.set(notification.id, notification);
    this.container.appendChild(element);
    
    // Trigger entrance animation
    requestAnimationFrame(() => {
      element.classList.add('notification-enter');
    });
    
    // Position notifications
    this.repositionNotifications();
    
    // Play sound
    if (this.soundEnabled && this.options.enableSounds) {
      this.playNotificationSound(notification.config.sound);
    }
    
    // Auto-dismiss
    if (!notification.options.persistent) {
      this.startAutoHide(notification);
    }
    
    EventBus.emit('notification:shown', {
      id: notification.id,
      type: notification.type,
      message: notification.message
    });
  }
  
  renderNotification(notification) {
    const { config, options } = notification;
    const hasActions = options.actions && options.actions.length > 0;
    
    const element = document.createElement('div');
    element.className = `notification notification-${notification.type} ${config.bgColor} ${config.borderColor} border-l-4 rounded-lg shadow-lg mb-${this.options.stackSpacing/4} max-w-md w-full overflow-hidden`;
    element.setAttribute('data-id', notification.id);
    element.setAttribute('role', 'alert');
    element.setAttribute('aria-describedby', `notification-message-${notification.id}`);
    
    element.innerHTML = `
      <div class="notification-content p-4">
        <div class="flex items-start">
          <div class="notification-icon flex-shrink-0 mr-3">
            <svg class="w-5 h-5 ${config.color}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              ${this.getIconPath(config.icon)}
            </svg>
          </div>
          
          <div class="notification-body flex-1 min-w-0">
            <div class="notification-message text-sm text-gray-900" id="notification-message-${notification.id}">
              ${this.escapeHtml(notification.message)}
            </div>
            
            ${options.title ? `
              <div class="notification-title font-medium text-gray-900 mb-1">
                ${this.escapeHtml(options.title)}
              </div>
            ` : ''}
            
            ${hasActions ? `
              <div class="notification-actions flex items-center space-x-3 mt-3">
                ${options.actions.map(action => `
                  <button 
                    class="action-btn text-sm font-medium ${config.color} hover:underline"
                    data-action="${action.id}"
                  >
                    ${this.escapeHtml(action.label)}
                  </button>
                `).join('')}
              </div>
            ` : ''}
          </div>
          
          <div class="notification-controls flex-shrink-0 ml-3 flex items-center space-x-1">
            ${!notification.options.persistent ? `
              <button class="pause-btn p-1 text-gray-400 hover:text-gray-600 rounded" title="Tạm dừng">
                <svg class="w-4 h-4 pause-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6"></path>
                </svg>
                <svg class="w-4 h-4 play-icon hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15a2 2 0 002-2V9a2 2 0 00-2-2h-1.586l-2.414-2.414A1 1 0 0012.293 4H11a2 2 0 00-2 2v5z"></path>
                </svg>
              </button>
            ` : ''}
            
            <button class="close-btn p-1 text-gray-400 hover:text-gray-600 rounded" title="Đóng">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        
        ${this.options.enableProgress && !notification.options.persistent ? `
          <div class="notification-progress mt-3">
            <div class="progress-track bg-gray-200 rounded-full h-1">
              <div class="progress-bar ${config.progressColor} h-1 rounded-full transition-all duration-100 ease-linear w-full"></div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
    
    this.bindNotificationEvents(element, notification);
    
    return element;
  }
  
  // Phần còn lại của class sẽ được thêm bằng lệnh tiếp theo

  bindNotificationEvents(element, notification) {
    // Close button
    const closeBtn = element.querySelector('.close-btn');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide(notification.id);
    });
    
    // Pause/Resume button
    const pauseBtn = element.querySelector('.pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePause(notification.id);
      });
    }
    
    // Action buttons
    element.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const actionId = e.target.dataset.action;
        const action = notification.options.actions.find(a => a.id === actionId);
        
        if (action && typeof action.handler === 'function') {
          action.handler(notification);
        }
        
        EventBus.emit('notification:action', {
          notificationId: notification.id,
          actionId,
          notification
        });
        
        // Auto-hide after action unless specified otherwise
        if (!action.keepOpen) {
          this.hide(notification.id);
        }
      });
    });
    
    // Hover to pause auto-hide
    if (!notification.options.persistent) {
      element.addEventListener('mouseenter', () => {
        this.pauseNotification(notification.id);
      });
      
      element.addEventListener('mouseleave', () => {
        this.resumeNotification(notification.id);
      });
    }
    
    // Click to dismiss (optional)
    if (notification.options.clickToHide !== false) {
      element.addEventListener('click', () => {
        this.hide(notification.id);
      });
    }
  }

  // Public API methods
  success(message, options = {}) {
    return this.show(message, 'success', options);
  }
  
  error(message, options = {}) {
    return this.show(message, 'error', {
      duration: 8000, // Longer duration for errors
      persistent: false,
      ...options
    });
  }
  
  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }
  
  info(message, options = {}) {
    return this.show(message, 'info', options);
  }
  
  // Helper methods
  hide(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;
    
    const element = notification.element;
    element.classList.add('notification-exit');
    
    setTimeout(() => {
      element.remove();
      this.notifications.delete(id);
    }, this.options.animationDuration);
  }

  clearAll() {
    this.notifications.forEach((notification, id) => {
      this.hide(id);
    });
    this.queue = [];
  }

  getIconPath(iconName) {
    const icons = {
      'check-circle': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
      'x-circle': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
      'exclamation-triangle': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>',
      'information-circle': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
    };
    return icons[iconName] || icons['information-circle'];
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  startAutoHide(notification) {
    const duration = notification.options.duration;
    if (duration <= 0) return;
    
    notification.timer = setTimeout(() => {
      this.hide(notification.id);
    }, duration);
  }

  pauseNotification(id) {
    const notification = this.notifications.get(id);
    if (!notification || notification.paused) return;
    
    notification.paused = true;
    if (notification.timer) {
      clearTimeout(notification.timer);
    }
  }

  resumeNotification(id) {
    const notification = this.notifications.get(id);
    if (!notification || !notification.paused) return;
    
    notification.paused = false;
    this.startAutoHide(notification);
  }

  togglePause(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;
    
    if (notification.paused) {
      this.resumeNotification(id);
    } else {
      this.pauseNotification(id);
    }
  }

  repositionNotifications() {
    // Implementation for repositioning notifications
  }

  playNotificationSound(soundConfig) {
    if (!soundConfig || !this.soundEnabled) return;
    
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = soundConfig.frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + (soundConfig.duration / 1000));
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }
}

// Create global notification instance
let globalNotificationManager = null;

// Export a singleton notification service
export const NotificationService = {
  init(options = {}) {
    if (globalNotificationManager) {
      globalNotificationManager.destroy();
    }
    globalNotificationManager = new NotificationManager(options);
    return globalNotificationManager;
  },
  
  show(message, type = 'info', options = {}) {
    if (!globalNotificationManager) {
      globalNotificationManager = new NotificationManager();
    }
    return globalNotificationManager.show(message, type, options);
  },
  
  success(message, options = {}) {
    return this.show(message, 'success', options);
  },
  
  error(message, options = {}) {
    return this.show(message, 'error', options);
  },
  
  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  },
  
  info(message, options = {}) {
    return this.show(message, 'info', options);
  },
  
  hide(id) {
    if (globalNotificationManager) {
      return globalNotificationManager.hide(id);
    }
  },
  
  clear() {
    if (globalNotificationManager) {
      globalNotificationManager.clearAll();
    }
  }
};

// Initialize default instance
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      NotificationService.init();
    });
  } else {
    NotificationService.init();
  }
}
