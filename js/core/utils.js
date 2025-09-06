/**
 * Utility Functions for Hair Salon Management System
 * Common helper functions and utilities
 * 
 * @version 1.0.0
 */

const Utils = {
  
  // =============  DATE/TIME UTILITIES =============
  
  /**
   * Format date to Vietnamese locale
   * @param {Date|string} date - Date to format
   * @param {string} format - Format type: 'date', 'time', 'datetime', 'relative'
   * @returns {string} - Formatted date string
   */
  formatDate(date, format = 'datetime') {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const options = {
      timeZone: CONFIG.DATETIME.TIMEZONE
    };
    
    switch (format) {
      case 'date':
        options.year = 'numeric';
        options.month = '2-digit';
        options.day = '2-digit';
        return d.toLocaleDateString('vi-VN', options);
        
      case 'time':
        options.hour = '2-digit';
        options.minute = '2-digit';
        return d.toLocaleTimeString('vi-VN', options);
        
      case 'datetime':
        options.year = 'numeric';
        options.month = '2-digit';
        options.day = '2-digit';
        options.hour = '2-digit';
        options.minute = '2-digit';
        return d.toLocaleString('vi-VN', options);
        
      case 'relative':
        return this.getRelativeTime(d);
        
      default:
        return d.toLocaleString('vi-VN', options);
    }
  },
  
  /**
   * Get relative time (e.g., "2 minutes ago")
   * @param {Date} date - Date to compare
   * @returns {string} - Relative time string
   */
  getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 60) {
      return 'Vừa xong';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} phút trước`;
    } else if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    } else if (diffDays < 7) {
      return `${diffDays} ngày trước`;
    } else {
      return this.formatDate(date, 'date');
    }
  },
  
  /**
   * Check if date is today
   * @param {Date|string} date - Date to check
   * @returns {boolean} - True if date is today
   */
  isToday(date) {
    if (!date) return false;
    const d = new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  },
  
  /**
   * Get today's date string (YYYY-MM-DD)
   * @returns {string} - Today's date string
   */
  getTodayString() {
    return new Date().toISOString().split('T')[0];
  },
  
  // =============  NUMBER/CURRENCY UTILITIES =============
  
  /**
   * Format number with thousands separator
   * @param {number} num - Number to format
   * @returns {string} - Formatted number
   */
  formatNumber(num) {
    if (typeof num !== 'number') {
      num = parseFloat(num) || 0;
    }
    
    return new Intl.NumberFormat('vi-VN').format(num);
  },
  
  /**
   * Parse number from string (removes formatting)
   * @param {string} str - String to parse
   * @returns {number} - Parsed number
   */
  parseNumber(str) {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    
    // Remove all non-digit characters except dot and comma
    const cleaned = str.toString()
      .replace(/[₫,.\s]/g, '')
      .replace(/[^\d]/g, '');
    
    return parseInt(cleaned) || 0;
  },
  
  /**
   * Format currency (already available in config, but included for completeness)
   * @param {number} amount - Amount to format
   * @returns {string} - Formatted currency
   */
  formatCurrency(amount) {
    return formatCurrency(amount); // Use global function from config
  },

  /**
   * Format date-time (shortcut used across app)
   */
  formatDateTime(date) {
    return this.formatDate(date, 'datetime');
  },
  
  /**
   * Parse currency (already available in config)
   * @param {string} currencyString - Currency string to parse
   * @returns {number} - Parsed amount
   */
  parseCurrency(currencyString) {
    return parseCurrency(currencyString); // Use global function from config
  },
  
  // =============  STRING UTILITIES =============
  
  /**
   * Capitalize first letter of each word
   * @param {string} str - String to capitalize
   * @returns {string} - Capitalized string
   */
  capitalizeWords(str) {
    if (!str) return '';
    
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },
  
  /**
   * Truncate string with ellipsis
   * @param {string} str - String to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} - Truncated string
   */
  truncate(str, maxLength = 50) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    
    return str.substring(0, maxLength - 3) + '...';
  },
  
  /**
   * Generate unique ID
   * @param {string} prefix - Optional prefix
   * @returns {string} - Unique ID
   */
  generateId(prefix = 'id') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  },
  
  /**
   * Slugify string (make URL-friendly)
   * @param {string} str - String to slugify
   * @returns {string} - Slugified string
   */
  slugify(str) {
    if (!str) return '';
    
    return str
      .toString()
      .toLowerCase()
      .normalize('NFD') // Decompose Vietnamese characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  },
  
  // =============  VALIDATION UTILITIES =============
  
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} - True if valid email
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },
  
  /**
   * Validate phone number (Vietnamese format)
   * @param {string} phone - Phone number to validate
   * @returns {boolean} - True if valid phone
   */
  isValidPhone(phone) {
    if (!phone) return false;
    
    const phoneRegex = /^(\+84|84|0)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}$/;
    return phoneRegex.test(phone.replace(/[\s\-\.]/g, ''));
  },
  
  /**
   * Validate price range
   * @param {number} price - Price to validate
   * @returns {object} - Validation result
   */
  validatePrice(price) {
    const num = this.parseNumber(price);
    
    return {
      isValid: num >= CONFIG.PRICE.MIN && num <= CONFIG.PRICE.MAX,
      isTooLow: num < CONFIG.VALIDATION.PRICE_WARNINGS.LOW_THRESHOLD,
      isTooHigh: num > CONFIG.VALIDATION.PRICE_WARNINGS.HIGH_THRESHOLD,
      value: num
    };
  },
  
  // =============  DOM UTILITIES =============
  
  /**
   * Get element by ID with error handling
   * @param {string} id - Element ID
   * @returns {Element|null} - Element or null
   */
  getElementById(id) {
    const element = document.getElementById(id);
    if (!element && CONFIG.DEV.ENABLE_LOGS) {
      console.warn(`Element with ID '${id}' not found`);
    }
    return element;
  },
  
  /**
   * Add event listener with cleanup
   * @param {Element} element - Target element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @returns {Function} - Cleanup function
   */
  addEventListener(element, event, handler) {
    if (!element || !event || !handler) {
      console.error('Invalid parameters for addEventListener');
      return () => {};
    }
    
    element.addEventListener(event, handler);
    
    // Return cleanup function
    return () => {
      element.removeEventListener(event, handler);
    };
  },
  
  /**
   * Toggle class on element
   * @param {Element} element - Target element
   * @param {string} className - Class name
   * @param {boolean} force - Force add/remove
   */
  toggleClass(element, className, force = null) {
    if (!element || !className) return;
    
    if (force !== null) {
      element.classList.toggle(className, force);
    } else {
      element.classList.toggle(className);
    }
  },
  
  /**
   * Show/hide element
   * @param {Element} element - Target element
   * @param {boolean} show - Show or hide
   */
  toggleVisibility(element, show) {
    if (!element) return;
    
    element.style.display = show ? '' : 'none';
  },
  
  // =============  ARRAY UTILITIES =============
  
  /**
   * Sort array by property
   * @param {Array} array - Array to sort
   * @param {string} property - Property to sort by
   * @param {string} order - 'asc' or 'desc'
   * @returns {Array} - Sorted array
   */
  sortBy(array, property, order = 'asc') {
    if (!Array.isArray(array)) return [];
    
    return [...array].sort((a, b) => {
      let aValue = a[property];
      let bValue = b[property];
      
      // Handle dates
      if (property === 'timestamp' || property === 'date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      // Handle numbers
      if (typeof aValue === 'string' && !isNaN(aValue)) {
        aValue = parseFloat(aValue);
        bValue = parseFloat(bValue);
      }
      
      if (order === 'desc') {
        return aValue < bValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });
  },
  
  /**
   * Group array by property
   * @param {Array} array - Array to group
   * @param {string} property - Property to group by
   * @returns {Object} - Grouped object
   */
  groupBy(array, property) {
    if (!Array.isArray(array)) return {};
    
    return array.reduce((groups, item) => {
      const key = item[property];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  },
  
  /**
   * Remove duplicates from array
   * @param {Array} array - Array with duplicates
   * @param {string} property - Property to check for uniqueness (optional)
   * @returns {Array} - Array without duplicates
   */
  removeDuplicates(array, property = null) {
    if (!Array.isArray(array)) return [];
    
    if (property) {
      const seen = new Set();
      return array.filter(item => {
        const value = item[property];
        if (seen.has(value)) {
          return false;
        }
        seen.add(value);
        return true;
      });
    } else {
      return [...new Set(array)];
    }
  },
  
  // =============  OBJECT UTILITIES =============
  
  /**
   * Deep clone object
   * @param {Object} obj - Object to clone
   * @returns {Object} - Cloned object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    
    return cloned;
  },
  
  /**
   * Check if object is empty
   * @param {Object} obj - Object to check
   * @returns {boolean} - True if empty
   */
  isEmpty(obj) {
    if (obj == null) return true;
    if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
    return Object.keys(obj).length === 0;
  },
  
  // =============  PERFORMANCE UTILITIES =============
  
  /**
   * Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} - Debounced function
   */
  debounce(func, delay = 300) {
    let timeoutId;
    
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  },
  
  /**
   * Throttle function
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} - Throttled function
   */
  throttle(func, limit = 100) {
    let inThrottle;
    
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  /**
   * Measure execution time
   * @param {Function} func - Function to measure
   * @returns {Object} - Result and execution time
   */
  async measureTime(func) {
    const start = performance.now();
    const result = await func();
    const end = performance.now();
    
    return {
      result,
      executionTime: end - start
    };
  },
  
  // =============  STORAGE UTILITIES =============
  
  /**
   * Safe localStorage get with JSON parsing
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if not found
   * @returns {any} - Stored value or default
   */
  getStorageItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      
      return JSON.parse(item);
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return defaultValue;
    }
  },
  
  /**
   * Safe localStorage set with JSON stringifying
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   */
  setStorageItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error);
    }
  },
  
  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   */
  removeStorageItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
    }
  },
  
  // =============  DEVICE/BROWSER UTILITIES =============
  
  /**
   * Detect if running on mobile device
   * @returns {boolean} - True if mobile
   */
  isMobile() {
    return window.innerWidth < CONFIG.BREAKPOINTS.MOBILE || 
           /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },
  
  /**
   * Detect if running as PWA
   * @returns {boolean} - True if PWA
   */
  isPWA() {
    return window.navigator.standalone || 
           window.matchMedia('(display-mode: standalone)').matches;
  },
  
  /**
   * Check if browser supports feature
   * @param {string} feature - Feature to check
   * @returns {boolean} - True if supported
   */
  supportsFeature(feature) {
    switch (feature) {
      case 'serviceWorker':
        return 'serviceWorker' in navigator;
      case 'push':
        return 'PushManager' in window;
      case 'notification':
        return 'Notification' in window;
      case 'geolocation':
        return 'geolocation' in navigator;
      case 'camera':
        return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
      default:
        return false;
    }
  },
  
  // =============  ERROR HANDLING UTILITIES =============
  
  /**
   * Safe function execution with error handling
   * @param {Function} func - Function to execute
   * @param {any} defaultValue - Default value on error
   * @returns {any} - Function result or default value
   */
  safe(func, defaultValue = null) {
    try {
      return func();
    } catch (error) {
      console.error('Safe execution error:', error);
      return defaultValue;
    }
  },
  
  /**
   * Log error with context
   * @param {Error} error - Error object
   * @param {string} context - Context description
   * @param {Object} metadata - Additional metadata
   */
  logError(error, context = '', metadata = {}) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      metadata,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.error('Application Error:', errorInfo);
    
    // Could send to error tracking service here
    // sendToErrorTracker(errorInfo);
  }
};

// =============  GLOBAL EXPORTS =============

// Make Utils available both as ESM and global
export default Utils;
window.Utils = Utils;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}

console.log('🛠️ Utils ready');
