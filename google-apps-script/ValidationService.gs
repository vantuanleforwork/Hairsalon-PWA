/**
 * Validation Service for Hair Salon Management System
 * Handles data validation and sanitization
 * 
 * @version 1.0.0
 */

const ValidationService = {
  /**
   * Validate order data
   * @param {object} orderData - Order data to validate
   * @returns {object} - Validation result with isValid flag and errors array
   */
  validateOrder: function(orderData) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    try {
      Logger.debug('Validating order data', orderData);
      
      // Required field validation
      if (!orderData.service || orderData.service.trim() === '') {
        result.errors.push('Service is required');
        result.isValid = false;
      }
      
      if (!orderData.price && orderData.price !== 0) {
        result.errors.push('Price is required');
        result.isValid = false;
      }
      
      if (!orderData.staff || orderData.staff.trim() === '') {
        result.errors.push('Staff email is required');
        result.isValid = false;
      }
      
      // Service validation
      if (orderData.service) {
        const service = orderData.service.trim();
        
        // Check if service is in allowed list (except "Khác")
        if (service !== 'Khác' && !CONFIG.SERVICES.includes(service)) {
          result.errors.push(`Invalid service: ${service}. Allowed services: ${CONFIG.SERVICES.join(', ')}`);
          result.isValid = false;
        }
        
        // Length validation
        if (service.length > 100) {
          result.errors.push('Service name too long (max 100 characters)');
          result.isValid = false;
        }
      }
      
      // Price validation
      if (orderData.price !== undefined && orderData.price !== null) {
        const price = this.parseNumber(orderData.price);
        
        if (isNaN(price)) {
          result.errors.push('Price must be a valid number');
          result.isValid = false;
        } else {
          // Check price range
          if (price < CONFIG.PRICE.MIN) {
            result.errors.push(`Price cannot be less than ${formatCurrency(CONFIG.PRICE.MIN)}`);
            result.isValid = false;
          }
          
          if (price > CONFIG.PRICE.MAX) {
            result.errors.push(`Price cannot exceed ${formatCurrency(CONFIG.PRICE.MAX)}`);
            result.isValid = false;
          }
          
          // Warning for unusual prices
          if (price < 10000) {
            result.warnings.push('Price seems unusually low');
          } else if (price > 5000000) {
            result.warnings.push('Price seems unusually high');
          }
          
          // Check for decimal places (VND typically doesn't use decimals)
          if (price % 1000 !== 0) {
            result.warnings.push('Price should typically be rounded to thousands (VND)');
          }
        }
      }
      
      // Staff email validation
      if (orderData.staff) {
        const email = orderData.staff.trim().toLowerCase();
        
        if (!this.isValidEmail(email)) {
          result.errors.push('Invalid email format for staff');
          result.isValid = false;
        } else if (!CONFIG.ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(email)) {
          result.errors.push('Staff email not in allowed list');
          result.isValid = false;
        }
      }
      
      // Note validation
      if (orderData.note) {
        const note = orderData.note.trim();
        
        if (note.length > CONFIG.ORDER.MAX_NOTE_LENGTH) {
          result.errors.push(`Note too long (max ${CONFIG.ORDER.MAX_NOTE_LENGTH} characters)`);
          result.isValid = false;
        }
        
        // Check for potentially harmful content
        if (this.containsHarmfulContent(note)) {
          result.errors.push('Note contains potentially harmful content');
          result.isValid = false;
        }
      }
      
      // Timestamp validation (if provided)
      if (orderData.timestamp) {
        const timestamp = new Date(orderData.timestamp);
        
        if (isNaN(timestamp.getTime())) {
          result.errors.push('Invalid timestamp format');
          result.isValid = false;
        } else {
          const now = new Date();
          const diffHours = Math.abs(now - timestamp) / (1000 * 60 * 60);
          
          // Check if timestamp is too far in the future
          if (timestamp > now && diffHours > 24) {
            if (CONFIG.ORDER.ALLOW_FUTURE_ORDERS) {
              result.warnings.push('Order timestamp is more than 24 hours in the future');
            } else {
              result.errors.push('Future orders are not allowed');
              result.isValid = false;
            }
          }
          
          // Check if timestamp is too far in the past (more than 30 days)
          if (timestamp < now && diffHours > 30 * 24) {
            result.warnings.push('Order timestamp is more than 30 days in the past');
          }
        }
      }
      
      // Business logic validation
      if (result.isValid) {
        // Check daily order limit for staff
        if (orderData.staff) {
          const today = new Date().toISOString().split('T')[0];
          const todayOrders = OrderService.getTodayOrders(orderData.staff);
          
          if (todayOrders.length >= CONFIG.ORDER.MAX_ORDERS_PER_DAY) {
            result.errors.push(`Daily order limit reached (${CONFIG.ORDER.MAX_ORDERS_PER_DAY} orders per day)`);
            result.isValid = false;
          }
        }
      }
      
      Logger.debug('Order validation completed', { 
        isValid: result.isValid, 
        errorCount: result.errors.length,
        warningCount: result.warnings.length
      });
      
      return result;
      
    } catch (error) {
      Logger.error('Order validation failed', { error: error.toString() });
      return {
        isValid: false,
        errors: ['Validation failed: ' + error.toString()],
        warnings: []
      };
    }
  },
  
  /**
   * Validate staff data
   * @param {object} staffData - Staff data to validate
   * @returns {object} - Validation result
   */
  validateStaff: function(staffData) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    try {
      // Email validation
      if (!staffData.email || staffData.email.trim() === '') {
        result.errors.push('Email is required');
        result.isValid = false;
      } else if (!this.isValidEmail(staffData.email)) {
        result.errors.push('Invalid email format');
        result.isValid = false;
      }
      
      // Name validation
      if (staffData.name) {
        const name = staffData.name.trim();
        
        if (name.length < 2) {
          result.errors.push('Name must be at least 2 characters long');
          result.isValid = false;
        }
        
        if (name.length > 100) {
          result.errors.push('Name too long (max 100 characters)');
          result.isValid = false;
        }
        
        if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(name)) {
          result.warnings.push('Name contains special characters or numbers');
        }
      }
      
      // Role validation
      if (staffData.role) {
        const validRoles = ['Admin', 'Staff', 'Manager', 'Intern'];
        if (!validRoles.includes(staffData.role)) {
          result.warnings.push(`Unusual role: ${staffData.role}. Common roles: ${validRoles.join(', ')}`);
        }
      }
      
      return result;
      
    } catch (error) {
      Logger.error('Staff validation failed', { error: error.toString() });
      return {
        isValid: false,
        errors: ['Validation failed: ' + error.toString()],
        warnings: []
      };
    }
  },
  
  /**
   * Sanitize input string
   * @param {string} input - Input string to sanitize
   * @returns {string} - Sanitized string
   */
  sanitizeString: function(input) {
    if (typeof input !== 'string') {
      return String(input || '');
    }
    
    return input
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove potentially harmful HTML characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .substring(0, 1000); // Limit length
  },
  
  /**
   * Sanitize order data
   * @param {object} orderData - Order data to sanitize
   * @returns {object} - Sanitized order data
   */
  sanitizeOrderData: function(orderData) {
    const sanitized = {};
    
    if (orderData.service) {
      sanitized.service = this.sanitizeString(orderData.service);
    }
    
    if (orderData.price !== undefined && orderData.price !== null) {
      sanitized.price = Math.max(0, Math.min(CONFIG.PRICE.MAX, this.parseNumber(orderData.price)));
    }
    
    if (orderData.note) {
      sanitized.note = this.sanitizeString(orderData.note).substring(0, CONFIG.ORDER.MAX_NOTE_LENGTH);
    }
    
    if (orderData.staff) {
      sanitized.staff = orderData.staff.trim().toLowerCase();
    }
    
    if (orderData.timestamp) {
      const timestamp = new Date(orderData.timestamp);
      if (!isNaN(timestamp.getTime())) {
        sanitized.timestamp = timestamp.toISOString();
      }
    }
    
    return sanitized;
  },
  
  /**
   * Check if email format is valid
   * @param {string} email - Email to validate
   * @returns {boolean} - True if valid email format
   */
  isValidEmail: function(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },
  
  /**
   * Parse number from string or number
   * @param {any} value - Value to parse as number
   * @returns {number} - Parsed number or NaN
   */
  parseNumber: function(value) {
    if (typeof value === 'number') {
      return value;
    }
    
    if (typeof value === 'string') {
      // Remove currency symbols, commas, spaces
      const cleaned = value.replace(/[₫,\s]/g, '').replace(/\./g, '');
      return parseFloat(cleaned);
    }
    
    return NaN;
  },
  
  /**
   * Check if text contains potentially harmful content
   * @param {string} text - Text to check
   * @returns {boolean} - True if contains harmful content
   */
  containsHarmfulContent: function(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }
    
    const harmfulPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /eval\s*\(/i,
      /document\./i,
      /window\./i
    ];
    
    return harmfulPatterns.some(pattern => pattern.test(text));
  },
  
  /**
   * Validate API request parameters
   * @param {object} params - Request parameters
   * @param {array} requiredParams - Array of required parameter names
   * @returns {object} - Validation result
   */
  validateApiRequest: function(params, requiredParams = []) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    try {
      // Check required parameters
      for (const param of requiredParams) {
        if (!params[param]) {
          result.errors.push(`Missing required parameter: ${param}`);
          result.isValid = false;
        }
      }
      
      // Validate email parameter if present
      if (params.email && !this.isValidEmail(params.email)) {
        result.errors.push('Invalid email format');
        result.isValid = false;
      }
      
      // Validate action parameter
      if (params.action) {
        const validActions = [
          'validateUser', 'createOrder', 'getOrders', 'updateOrder', 'deleteOrder',
          'getStaffInfo', 'getDailyStats'
        ];
        
        if (!validActions.includes(params.action)) {
          result.errors.push(`Invalid action: ${params.action}`);
          result.isValid = false;
        }
      }
      
      // Validate data parameter if present
      if (params.data) {
        try {
          if (typeof params.data === 'string') {
            JSON.parse(params.data);
          }
        } catch (error) {
          result.errors.push('Invalid JSON in data parameter');
          result.isValid = false;
        }
      }
      
      return result;
      
    } catch (error) {
      Logger.error('API request validation failed', { error: error.toString() });
      return {
        isValid: false,
        errors: ['Request validation failed: ' + error.toString()],
        warnings: []
      };
    }
  },
  
  /**
   * Validate date string
   * @param {string} dateString - Date string to validate (YYYY-MM-DD format)
   * @returns {boolean} - True if valid date
   */
  isValidDate: function(dateString) {
    if (!dateString || typeof dateString !== 'string') {
      return false;
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }
    
    const date = new Date(dateString + 'T00:00:00Z');
    return !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
  },
  
  /**
   * Validate price range for specific service
   * @param {string} service - Service name
   * @param {number} price - Price to validate
   * @returns {object} - Validation result with suggestions
   */
  validateServicePrice: function(service, price) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestedRange: null
    };
    
    // Define typical price ranges for services (in VND)
    const servicePriceRanges = {
      'Cắt tóc': { min: 50000, max: 300000, typical: { min: 80000, max: 150000 } },
      'Xả': { min: 20000, max: 150000, typical: { min: 30000, max: 80000 } },
      'Uốn': { min: 200000, max: 1500000, typical: { min: 300000, max: 800000 } },
      'Nhuộm': { min: 150000, max: 2000000, typical: { min: 200000, max: 1000000 } },
      'Tẩy': { min: 100000, max: 1000000, typical: { min: 150000, max: 500000 } },
      'Duỗi': { min: 300000, max: 2000000, typical: { min: 400000, max: 1200000 } }
    };
    
    const priceRange = servicePriceRanges[service];
    if (priceRange) {
      result.suggestedRange = priceRange.typical;
      
      if (price < priceRange.min) {
        result.warnings.push(`Price seems low for ${service}. Typical range: ${formatCurrency(priceRange.typical.min)} - ${formatCurrency(priceRange.typical.max)}`);
      } else if (price > priceRange.max) {
        result.warnings.push(`Price seems high for ${service}. Typical range: ${formatCurrency(priceRange.typical.min)} - ${formatCurrency(priceRange.typical.max)}`);
      } else if (price < priceRange.typical.min || price > priceRange.typical.max) {
        result.warnings.push(`Price is outside typical range for ${service}: ${formatCurrency(priceRange.typical.min)} - ${formatCurrency(priceRange.typical.max)}`);
      }
    }
    
    return result;
  },
  
  /**
   * Get validation summary for multiple orders
   * @param {array} orders - Array of order data to validate
   * @returns {object} - Validation summary
   */
  validateOrdersBatch: function(orders) {
    const summary = {
      totalOrders: orders.length,
      validOrders: 0,
      invalidOrders: 0,
      totalErrors: 0,
      totalWarnings: 0,
      results: []
    };
    
    orders.forEach((order, index) => {
      const validation = this.validateOrder(order);
      
      summary.results.push({
        index: index,
        orderId: order.id || `Order ${index + 1}`,
        ...validation
      });
      
      if (validation.isValid) {
        summary.validOrders++;
      } else {
        summary.invalidOrders++;
      }
      
      summary.totalErrors += validation.errors.length;
      summary.totalWarnings += validation.warnings.length;
    });
    
    return summary;
  }
};
