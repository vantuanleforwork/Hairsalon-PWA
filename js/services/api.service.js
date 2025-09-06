/**
 * API Service for Hair Salon Management System
 * Handles communication with Google Apps Script backend
 * 
 * @version 1.0.0
 */

class ApiService {
  constructor() {
    this.baseUrl = CONFIG.APPS_SCRIPT_URL;
    this.defaultTimeout = CONFIG.API.TIMEOUT;
    this.retryAttempts = CONFIG.API.RETRY_ATTEMPTS;
    this.retryDelay = CONFIG.API.RETRY_DELAY;
    
    // Request interceptors
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    
    console.log('🌐 API Service initialized');
  }
  
  /**
   * Make HTTP request to Apps Script
   * @param {string} action - API action name
   * @param {Object} data - Request data
   * @param {Object} options - Request options
   * @returns {Promise} - API response
   */
  async request(action, data = {}, options = {}) {
    const requestOptions = {
      timeout: this.defaultTimeout,
      retries: this.retryAttempts,
      ...options
    };
    
    try {
      // Get current user for authentication
      const user = State.get('user');
      if (!user.isAuthenticated) {
        throw new Error('User not authenticated');
      }
      
      // Prepare request data
      const requestData = {
        action: action,
        email: user.email,
        idToken: user.idToken || '',
        data: JSON.stringify(data)
      };
      
      // Apply request interceptors
      const processedData = await this.applyRequestInterceptors(requestData);
      
      // Make request with retry logic
      const response = await this.makeRequestWithRetry(processedData, requestOptions);
      
      // Apply response interceptors
      const processedResponse = await this.applyResponseInterceptors(response, action);
      
      // Handle API response format
      if (processedResponse.success === false) {
        throw new ApiError(processedResponse.error, processedResponse.code, action);
      }
      
      return processedResponse;
      
    } catch (error) {
      this.handleError(error, action, data);
      throw error;
    }
  }
  
  /**
   * Make request with retry logic
   * @private
   */
  async makeRequestWithRetry(data, options) {
    let lastError;
    
    for (let attempt = 0; attempt <= options.retries; attempt++) {
      try {
        return await this.makeHttpRequest(data, options);
      } catch (error) {
        lastError = error;
        
        // Don't retry on authentication errors
        if (error.code === 401 || error.code === 403) {
          break;
        }
        
        // Don't retry on client errors (400-499)
        if (error.code >= 400 && error.code < 500) {
          break;
        }
        
        // Wait before retry
        if (attempt < options.retries) {
          await this.delay(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
          console.log(`🔄 Retrying request (attempt ${attempt + 2}/${options.retries + 1})`);
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Make actual HTTP request
   * @private
   */
  async makeHttpRequest(data, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);
    
    try {
      // Create FormData for Apps Script
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
      });
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        // Note: mode 'no-cors' is often required for Apps Script
        mode: 'cors',
        credentials: 'omit'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          data.action
        );
      }
      
      // Parse response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          throw new ApiError('Invalid JSON response', 500, data.action);
        }
      }
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408, data.action);
      }
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or other errors
      throw new ApiError(
        error.message || 'Network error',
        0,
        data.action
      );
    }
  }
  
  // =============  API METHODS =============
  
  /**
   * Validate user authentication
   */
  async validateUser(email) {
    return this.request('validateUser', { email });
  }
  
  /**
   * Create new order
   */
  async createOrder(orderData) {
    const response = await this.request('createOrder', orderData);
    
    // Add to state immediately for better UX
    if (response.success && response.data) {
      State.addOrder(response.data);
    }
    
    return response;
  }
  
  /**
   * Get orders with optional filters
   */
  async getOrders(filters = {}) {
    const response = await this.request('getOrders', filters);
    
    // Update state with fetched orders
    if (response.success && response.data) {
      State.setOrders(response.data);
    }
    
    return response;
  }
  
  /**
   * Update existing order
   */
  async updateOrder(orderId, updates) {
    const response = await this.request('updateOrder', {
      id: orderId,
      updates: updates
    });
    
    // Update state immediately
    if (response.success && response.data) {
      State.updateOrder(orderId, response.data);
    }
    
    return response;
  }
  
  /**
   * Delete order (soft delete)
   */
  async deleteOrder(orderId) {
    const response = await this.request('deleteOrder', { id: orderId });
    
    // Remove from state immediately
    if (response.success) {
      State.removeOrder(orderId);
    }
    
    return response;
  }
  
  /**
   * Get staff information
   */
  async getStaffInfo(email) {
    return this.request('getStaffInfo', { email });
  }
  
  /**
   * Get daily statistics
   */
  async getDailyStats(date = null) {
    const requestData = {};
    if (date) {
      requestData.date = date;
    }
    
    return this.request('getDailyStats', requestData);
  }
  
  // =============  BATCH OPERATIONS =============
  
  /**
   * Sync offline queue
   */
  async syncOfflineQueue() {
    const queue = State.get('offline.queue') || [];
    if (queue.length === 0) {
      return { success: true, synced: 0 };
    }
    
    State.setSyncStatus('syncing');
    
    const results = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };
    
    for (const item of queue) {
      try {
        await this.request(item.action, item.data);
        State.removeFromOfflineQueue(item.id);
        results.synced++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          item: item,
          error: error.message
        });
        
        // If it's a permanent error, remove from queue
        if (error.code >= 400 && error.code < 500) {
          State.removeFromOfflineQueue(item.id);
        }
      }
    }
    
    State.setSyncStatus(
      results.failed === 0 ? 'success' : 'error',
      new Date().toISOString()
    );
    
    return results;
  }
  
  // =============  INTERCEPTORS =============
  
  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }
  
  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }
  
  /**
   * Apply request interceptors
   * @private
   */
  async applyRequestInterceptors(data) {
    let processedData = { ...data };
    
    for (const interceptor of this.requestInterceptors) {
      try {
        processedData = await interceptor(processedData);
      } catch (error) {
        console.error('Request interceptor error:', error);
      }
    }
    
    return processedData;
  }
  
  /**
   * Apply response interceptors
   * @private
   */
  async applyResponseInterceptors(response, action) {
    let processedResponse = { ...response };
    
    for (const interceptor of this.responseInterceptors) {
      try {
        processedResponse = await interceptor(processedResponse, action);
      } catch (error) {
        console.error('Response interceptor error:', error);
      }
    }
    
    return processedResponse;
  }
  
  // =============  ERROR HANDLING =============
  
  /**
   * Handle API errors
   * @private
   */
  handleError(error, action, data) {
    const errorInfo = {
      action,
      data,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    };
    
    // Log error
    if (CONFIG.DEV.ENABLE_LOGS) {
      console.error('API Error:', errorInfo);
    }
    
    // Handle specific error codes
    switch (error.code) {
      case 401:
        // Unauthorized - redirect to login
        State.logout();
        State.showNotification({
          type: 'error',
          message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
          duration: 5000
        });
        break;
        
      case 403:
        // Forbidden
        State.showNotification({
          type: 'error',
          message: 'Bạn không có quyền thực hiện thao tác này.',
          duration: 5000
        });
        break;
        
      case 429:
        // Rate limited
        State.showNotification({
          type: 'warning',
          message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
          duration: 4000
        });
        break;
        
      case 0:
        // Network error - add to offline queue if supported
        if (isFeatureEnabled('OFFLINE_MODE') && this.isOfflineCapable(action)) {
          State.addToOfflineQueue({
            action,
            data,
            timestamp: new Date().toISOString()
          });
          
          State.showNotification({
            type: 'info',
            message: 'Không có kết nối. Yêu cầu đã được lưu để đồng bộ sau.',
            duration: 4000
          });
        }
        break;
    }
  }
  
  /**
   * Check if action can be queued for offline sync
   * @private
   */
  isOfflineCapable(action) {
    const offlineCapableActions = [
      'createOrder',
      'updateOrder',
      'deleteOrder'
    ];
    
    return offlineCapableActions.includes(action);
  }
  
  // =============  UTILITY METHODS =============
  
  /**
   * Delay execution
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Check if online
   */
  isOnline() {
    return State.get('ui.isOnline');
  }
  
  /**
   * Get request statistics
   */
  getStats() {
    return {
      baseUrl: this.baseUrl,
      timeout: this.defaultTimeout,
      retries: this.retryAttempts,
      requestInterceptors: this.requestInterceptors.length,
      responseInterceptors: this.responseInterceptors.length
    };
  }
}

// =============  API ERROR CLASS =============

class ApiError extends Error {
  constructor(message, code = 500, action = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.action = action;
  }
}

// =============  DEFAULT INTERCEPTORS =============

/**
 * Request logging interceptor
 */
function requestLoggingInterceptor(data) {
  if (CONFIG.DEV.ENABLE_LOGS && CONFIG.DEV.LOG_LEVEL === 'DEBUG') {
    console.log('🚀 API Request:', data.action, data);
  }
  return data;
}

/**
 * Response logging interceptor
 */
function responseLoggingInterceptor(response, action) {
  if (CONFIG.DEV.ENABLE_LOGS && CONFIG.DEV.LOG_LEVEL === 'DEBUG') {
    console.log('📥 API Response:', action, response);
  }
  return response;
}

/**
 * Performance monitoring interceptor
 */
function performanceInterceptor(data) {
  data._requestStart = performance.now();
  return data;
}

function performanceResponseInterceptor(response, action, requestData) {
  if (requestData && requestData._requestStart) {
    const duration = performance.now() - requestData._requestStart;
    
    if (CONFIG.DEV.SHOW_PERFORMANCE) {
      console.log(`⏱️ API ${action}: ${duration.toFixed(2)}ms`);
    }
    
    // Log slow requests
    if (duration > 5000) {
      console.warn(`🐌 Slow API request: ${action} took ${duration.toFixed(2)}ms`);
    }
  }
  
  return response;
}

// =============  CREATE GLOBAL INSTANCE =============

const API = new ApiService();

// Add default interceptors
if (CONFIG.DEV.ENABLE_LOGS) {
  API.addRequestInterceptor(requestLoggingInterceptor);
  API.addResponseInterceptor(responseLoggingInterceptor);
}

if (CONFIG.DEV.SHOW_PERFORMANCE) {
  API.addRequestInterceptor(performanceInterceptor);
  API.addResponseInterceptor(performanceResponseInterceptor);
}

// Make available globally
window.API = API;
window.ApiError = ApiError;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API, ApiError };
}

console.log('🌐 API Service ready');
