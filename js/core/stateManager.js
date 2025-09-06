/**
 * State Manager - Centralized State Management
 * Simple state management system for the Hair Salon PWA
 */

import EventBus from './eventBus.js';

export class StateManager {
  constructor() {
    this.state = {};
    this.subscribers = new Map();
    this.history = [];
    this.maxHistorySize = 50;
    
    this.init();
  }

  init() {
    // Initialize default state
    this.state = {
      app: {
        initialized: false,
        loading: false,
        error: null,
        route: null,
        online: navigator.onLine
      },
      user: {
        authenticated: false,
        profile: null,
        session: null,
        permissions: []
      },
      orders: {
        items: [],
        loading: false,
        filter: 'all',
        selectedOrder: null
      },
      ui: {
        sidebarOpen: false,
        theme: 'light',
        notifications: []
      }
    };

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.set('app.online', true);
    });

    window.addEventListener('offline', () => {
      this.set('app.online', false);
    });
  }

  /**
   * Get state value by path
   * @param {string} path - Dot notation path (e.g., 'user.profile.name')
   * @returns {any} State value
   */
  get(path) {
    if (!path) return this.state;
    
    return path.split('.').reduce((obj, key) => {
      return obj && obj[key];
    }, this.state);
  }

  /**
   * Set state value by path
   * @param {string} path - Dot notation path
   * @param {any} value - New value
   * @param {boolean} silent - Don't emit events
   */
  set(path, value, silent = false) {
    const oldValue = this.get(path);
    
    // Don't update if value is the same
    if (oldValue === value) return;
    
    // Update state
    this.setNestedValue(this.state, path, value);
    
    // Add to history
    this.addToHistory(path, oldValue, value);
    
    if (!silent) {
      // Notify subscribers
      this.notifySubscribers(path, value, oldValue);
      
      // Emit global state change event
      EventBus.emit('state:change', {
        path,
        value,
        oldValue,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Update state by merging with existing value
   * @param {string} path - Dot notation path
   * @param {object} updates - Object to merge
   */
  update(path, updates) {
    const currentValue = this.get(path);
    
    if (typeof currentValue === 'object' && currentValue !== null) {
      this.set(path, { ...currentValue, ...updates });
    } else {
      this.set(path, updates);
    }
  }

  /**
   * Subscribe to state changes
   * @param {string} path - Path to watch
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, []);
    }
    
    this.subscribers.get(path).push(callback);
    
    // Call immediately with current value
    callback(this.get(path));
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(path);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Unsubscribe from all listeners for a path
   * @param {string} path - Path to unsubscribe from
   */
  unsubscribe(path) {
    this.subscribers.delete(path);
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this.init();
    EventBus.emit('state:reset', { timestamp: Date.now() });
  }

  /**
   * Get state history
   * @returns {Array} State change history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clear state history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Set nested value in object by path
   * @private
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    keys.reduce((current, key) => {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj)[lastKey] = value;
  }

  /**
   * Notify subscribers of state changes
   * @private
   */
  notifySubscribers(path, value, oldValue) {
    // Notify exact path subscribers
    const exactSubscribers = this.subscribers.get(path);
    if (exactSubscribers) {
      exactSubscribers.forEach(callback => {
        try {
          callback(value, oldValue);
        } catch (error) {
          console.error('State subscriber error:', error);
        }
      });
    }

    // Notify parent path subscribers
    const pathParts = path.split('.');
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.');
      const parentSubscribers = this.subscribers.get(parentPath);
      
      if (parentSubscribers) {
        const parentValue = this.get(parentPath);
        parentSubscribers.forEach(callback => {
          try {
            callback(parentValue);
          } catch (error) {
            console.error('State parent subscriber error:', error);
          }
        });
      }
    }
  }

  /**
   * Add state change to history
   * @private
   */
  addToHistory(path, oldValue, newValue) {
    this.history.push({
      path,
      oldValue,
      newValue,
      timestamp: Date.now()
    });

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Create computed state that updates automatically
   * @param {Function} computeFn - Function that computes the value
   * @param {string[]} dependencies - State paths this computed value depends on
   * @returns {any} Computed value
   */
  computed(computeFn, dependencies = []) {
    let cachedValue;
    let isValid = false;

    const recompute = () => {
      try {
        cachedValue = computeFn(this.state);
        isValid = true;
      } catch (error) {
        console.error('Computed state error:', error);
        isValid = false;
      }
    };

    // Subscribe to dependencies
    dependencies.forEach(dep => {
      this.subscribe(dep, recompute);
    });

    // Initial computation
    recompute();

    return {
      get value() {
        if (!isValid) recompute();
        return cachedValue;
      }
    };
  }
}

// Export singleton instance
export default new StateManager();
