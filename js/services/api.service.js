/**
 * API Service for Hair Salon Management System
 * Handles communication with Google Apps Script backend
 *
 * @version 1.0.0
 */

// Ensure config globals are available and import state manager for usage
import '../core/config.js';
import State from '../core/stateManager.js';
import Auth from './auth.service.js';

class ApiService {
  constructor() {
    this.baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.APPS_SCRIPT_URL) ? CONFIG.APPS_SCRIPT_URL : '';
    this.defaultTimeout = CONFIG?.API?.TIMEOUT ?? 10000;
    this.retryAttempts = CONFIG?.API?.RETRY_ATTEMPTS ?? 2;
    this.retryDelay = CONFIG?.API?.RETRY_DELAY ?? 1000;

    // Request/response interceptors
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }

  // Optional runtime init to override defaults
  init(options = {}) {
    if (options.baseURL) this.baseUrl = options.baseURL;
    if (options.timeout) this.defaultTimeout = options.timeout;
    if (typeof options.retries === 'number') this.retryAttempts = options.retries;
    if (typeof options.retryDelay === 'number') this.retryDelay = options.retryDelay;
    return this;
  }

  /**
   * Make Apps Script request
   */
  async request(action, data = {}, options = {}) {
    const requestOptions = { timeout: this.defaultTimeout, retries: this.retryAttempts, ...options };

    // Gather auth info if available (do not hard-fail when absent)
    const stateUser = (typeof State?.get === 'function') ? (State.get('user') || {}) : {};
    const email = Auth?.currentUser?.email || stateUser.profile?.email || stateUser.email || '';
    const idToken = Auth?.currentSession?.token || stateUser.idToken || '';

    const requestData = {
      action,
      email,
      idToken,
      data: JSON.stringify(data)
    };

    // Interceptors
    const processed = await this.applyRequestInterceptors(requestData);
    const resp = await this.makeRequestWithRetry(processed, requestOptions);
    const out = await this.applyResponseInterceptors(resp, action);

    if (out && out.success === false) {
      throw new ApiError(out.error || 'API error', out.code ?? 500, action);
    }
    return out;
  }

  async makeRequestWithRetry(data, options) {
    let lastError;
    for (let attempt = 0; attempt <= options.retries; attempt++) {
      try {
        return await this.makeHttpRequest(data, options);
      } catch (err) {
        lastError = err;
        if (err.code === 401 || err.code === 403) break;
        if (err.code >= 400 && err.code < 500) break;
        if (attempt < options.retries) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }
    throw lastError;
  }

  async makeHttpRequest(data, options) {
    if (!this.baseUrl) throw new ApiError('Base URL not configured', 500, data.action);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);
    try {
      const formData = new FormData();
      Object.keys(data).forEach(k => formData.append(k, data[k]));

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit'
      });

      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status, data.action);
      }

      const ct = response.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        return await response.json();
      } else {
        const text = await response.text();
        try { return JSON.parse(text); } catch { throw new ApiError('Invalid JSON response', 500, data.action); }
      }

    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') throw new ApiError('Request timeout', 408, data.action);
      if (error instanceof ApiError) throw error;
      throw new ApiError(error.message || 'Network error', 0, data.action);
    }
  }

  // =============  API METHODS =============
  async validateUser(email) { return this.request('validateUser', { email }); }
  async createOrder(orderData) { return this.request('createOrder', orderData); }
  async getOrders(filters = {}) { return this.request('getOrders', filters); }
  async updateOrder(orderId, updates) { return this.request('updateOrder', { id: orderId, updates }); }
  async deleteOrder(orderId) { return this.request('deleteOrder', { id: orderId }); }
  async getStaffInfo(email) { return this.request('getStaffInfo', { email }); }
  async getDailyStats(date = null) { return this.request('getDailyStats', date ? { date } : {}); }

  // =============  INTERCEPTORS =============
  addRequestInterceptor(i) { this.requestInterceptors.push(i); }
  addResponseInterceptor(i) { this.responseInterceptors.push(i); }
  async applyRequestInterceptors(data) {
    let d = { ...data };
    for (const i of this.requestInterceptors) {
      try { d = await i(d); } catch (e) { console.error('Request interceptor error:', e); }
    }
    return d;
  }
  async applyResponseInterceptors(resp, action) {
    let r = { ...resp };
    for (const i of this.responseInterceptors) {
      try { r = await i(r, action); } catch (e) { console.error('Response interceptor error:', e); }
    }
    return r;
  }

  // =============  ERROR/UTILS =============
  handleError(error, action, data) {
    if (CONFIG?.DEV?.ENABLE_LOGS) {
      console.error('API Error:', { action, data, error: error.message, code: error.code, timestamp: new Date().toISOString() });
    }
  }

  isOfflineCapable(action) {
    return ['createOrder', 'updateOrder', 'deleteOrder'].includes(action);
  }

  delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  isOnline() { try { return State.get('ui.isOnline'); } catch { return navigator.onLine; } }
  getStats() { return { baseUrl: this.baseUrl, timeout: this.defaultTimeout, retries: this.retryAttempts, requestInterceptors: this.requestInterceptors.length, responseInterceptors: this.responseInterceptors.length }; }
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

// Default interceptors
function requestLoggingInterceptor(data) {
  if (CONFIG?.DEV?.ENABLE_LOGS && CONFIG?.DEV?.LOG_LEVEL === 'DEBUG') {
    console.log('API Request:', data.action, data);
  }
  return data;
}
function responseLoggingInterceptor(response, action) {
  if (CONFIG?.DEV?.ENABLE_LOGS && CONFIG?.DEV?.LOG_LEVEL === 'DEBUG') {
    console.log('API Response:', action, response);
  }
  return response;
}
function performanceInterceptor(data) { data._requestStart = performance.now(); return data; }
function performanceResponseInterceptor(response, action, requestData) {
  if (requestData && requestData._requestStart) {
    const duration = performance.now() - requestData._requestStart;
    if (CONFIG?.DEV?.SHOW_PERFORMANCE) {
      console.log(`API ${action}: ${duration.toFixed(2)}ms`);
    }
    if (duration > 5000) {
      console.warn(`Slow API request: ${action} took ${duration.toFixed(2)}ms`);
    }
  }
  return response;
}

// Create global instance
const API = new ApiService();
if (CONFIG?.DEV?.ENABLE_LOGS) {
  API.addRequestInterceptor(requestLoggingInterceptor);
  API.addResponseInterceptor(responseLoggingInterceptor);
}
if (CONFIG?.DEV?.SHOW_PERFORMANCE) {
  API.addRequestInterceptor(performanceInterceptor);
  API.addResponseInterceptor(performanceResponseInterceptor);
}

// Make available globally and via ESM
window.API = API;
window.ApiError = ApiError;
export { ApiService, ApiError };
export default API;

