// API module for Google Apps Script integration
'use strict';

console.log('dYs? API module loading...');

// API Configuration
const API_CONFIG = {
    baseURL: null,
    timeout: 30000, // 30 seconds
    retries: 3
};

// Initialize API with config
function initAPI() {
    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.API_BASE_URL) {
        API_CONFIG.baseURL = APP_CONFIG.API_BASE_URL;
        console.log('API initialized:', API_CONFIG.baseURL.substring(0, 50) + '...');
        return true;
    }
    console.warn('API URL not configured');
    return false;
}

// Helper: JSONP GET (bypass CORS)
function jsonpGet(params) {
    return new Promise((resolve, reject) => {
        if (!API_CONFIG.baseURL && !initAPI()) {
            return reject(new Error('API not configured'));
        }
        const cb = '__jsonp_cb_' + Math.random().toString(36).slice(2);
        const qs = new URLSearchParams({ ...(params || {}) });
        const sep = API_CONFIG.baseURL.includes('?') ? '&' : '?';
        const src = API_CONFIG.baseURL + sep + qs.toString() + (qs.toString() ? '&' : '') + 'callback=' + cb;

        const cleanup = () => {
            try { delete window[cb]; } catch (_) { window[cb] = undefined; }
            if (script && script.parentNode) script.parentNode.removeChild(script);
            if (timer) clearTimeout(timer);
        };

        window[cb] = (data) => { cleanup(); resolve(data); };
        const script = document.createElement('script');
        script.src = src;
        script.onerror = () => { cleanup(); reject(new Error('JSONP load error')); };
        document.head.appendChild(script);
        const timer = setTimeout(() => { cleanup(); reject(new Error('JSONP timeout')); }, 10000);
    });
}

// Helper: get idToken from auth/localStorage
function getIdToken() {
    try {
        const fromAuth = (window.AUTH && typeof window.AUTH.getCurrentUser === 'function')
            ? window.AUTH.getCurrentUser()?.idToken
            : null;
        if (fromAuth) return fromAuth;
        const saved = JSON.parse(localStorage.getItem('user') || '{}');
        return saved.idToken || null;
    } catch (_) {
        return null;
    }
}

// Helper: POST as x-www-form-urlencoded and parse JSON/text
async function postForm(endpoint, payload) {
    if (!API_CONFIG.baseURL) {
        if (!initAPI()) throw new Error('API not configured');
    }
    const url = endpoint.startsWith('http') ? endpoint : API_CONFIG.baseURL + endpoint;
    const idToken = getIdToken();
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const formParams = { ...(payload || {}), origin, ...(idToken ? { idToken } : {}) };
    const body = new URLSearchParams(formParams).toString();
    const options = {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    };
    try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) return res.json();
        const text = await res.text();
        try { return JSON.parse(text); } catch (_) { return { data: text, success: true }; }
    } catch (err) {
        // Fallback one attempt with no-cors for GAS
        try {
            await fetch(url, { ...options, mode: 'no-cors' });
            return { success: true, message: 'Request sent (no-cors)' };
        } catch (_) {
            throw err;
        }
    }
}

// Generic API call function
async function apiCall(endpoint, method = 'GET', data = null, retryCount = 0) {
    if (!API_CONFIG.baseURL) {
        if (!initAPI()) {
            throw new Error('API not configured');
        }
    }
    
    const url = endpoint.startsWith('http') ? endpoint : API_CONFIG.baseURL + endpoint;
    
    const options = {
        method: method,
        mode: 'cors', // Try CORS first
        headers: {}
    };
    
    if (data) {
        if (method === 'GET') {
            // For GET requests, add data as query parameters but keep unified parsing
            const params = new URLSearchParams(data);
            const separator = url.includes('?') ? '&' : '?';
            const finalUrl = url + (params.toString() ? (separator + params.toString()) : '');
            console.log('API GET:', finalUrl);
            try {
                const response = await fetch(finalUrl, { ...options, method: 'GET' });
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        return await response.json();
                    } else {
                        const text = await response.text();
                        try { return JSON.parse(text); } catch (e) { return { data: text, success: true }; }
                    }
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (err) {
                console.warn('GET fetch failed, will try fallback flow:', err?.message);
            }
        } else {
            // For POST requests, add data to body as JSON (legacy)
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
            console.log('API POST (json):', url, Object.keys(data));
        }
    }
    
    try {
        console.log(`dYs? API call: ${method} ${url}`);
        const response = await fetch(url, options);
        
        // Handle different response types
        if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                const text = await response.text();
                try {
                    return JSON.parse(text);
                } catch (e) {
                    return { data: text, success: true };
                }
            }
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.warn(`API call failed (attempt ${retryCount + 1}):`, error.message);
        
        // Try with no-cors mode for Google Apps Script
        if (retryCount === 0 && String(error.message || '').toLowerCase().includes('cors')) {
            console.log('Retrying with no-cors mode...');
            try {
                await fetch(url, {
                    ...options,
                    mode: 'no-cors'
                });
                // With no-cors, we can't read the response, but assume success
                console.log('Request sent (no-cors mode)');
                return { success: true, message: 'Request sent successfully' };
            } catch (noCorsError) {
                console.error('No-cors mode also failed:', noCorsError);
            }
        }
        
        // Extra fallback: GAS POST with no-cors (handles common CORS/network failures)
        try {
            const isGas = (typeof url === 'string') && (url.includes('script.google.com') || url.includes('googleusercontent.com'));
            const isNonGet = method !== 'GET';
            if (retryCount === 0 && isGas && isNonGet) {
                console.log('Retrying Apps Script POST with no-cors mode...');
                await fetch(url, { ...options, mode: 'no-cors' });
                console.log('Request sent (no-cors assumed success)');
                return { success: true, message: 'Request sent successfully (no-cors)' };
            }
        } catch (noCorsError) {
            console.error('No-cors retry failed:', noCorsError);
        }

        // Retry logic
        if (retryCount < API_CONFIG.retries - 1) {
            console.log(`Retrying in ${(retryCount + 1) * 1000}ms...`);
            await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
            return apiCall(endpoint, method, data, retryCount + 1);
        }
        
        throw error;
    }
}

// Create a new order
window.createOrder = async function(orderData) {
    console.log('Creating order:', orderData);
    
    try {
        const response = await postForm('', {
            action: 'create',
            employee: orderData.employee,
            service: orderData.service,
            price: orderData.price,
            notes: orderData.notes,
            createdBy: orderData.employee
        });
        
        console.log('Order created successfully:', response);
        return response;
        
    } catch (error) {
        console.error('Failed to create order:', error);
        throw error;
    }
};

// Get orders with optional filters
window.getOrders = async function(filters = {}) {
    console.log('Getting orders:', filters);
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const queryParams = { action: 'orders', origin, ...filters };
    const qs = new URLSearchParams(queryParams).toString();
    // Try fetch first, fallback to JSONP in case of CORS
    try {
        const response = await apiCall('?' + qs, 'GET', null);
        console.log('Orders retrieved via fetch:', response);
        return response;
    } catch (err) {
        console.warn('Fetch orders failed, fallback to JSONP:', err?.message);
        const response = await jsonpGet(queryParams);
        console.log('Orders retrieved via JSONP:', response);
        return response;
    }
};

// Delete an order (server-side)
window.deleteOrder = async function(orderId) {
    console.log('Deleting order:', orderId);
    
    try {
        const response = await postForm('', {
            action: 'delete',
            id: orderId
        });
        
        console.log('Order deleted successfully:', response);
        return response;
        
    } catch (error) {
        console.error('Failed to delete order:', error);
        throw error;
    }
};

// Get statistics
window.getStats = async function() {
    console.log('Getting statistics...');
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const queryParams = { action: 'stats', origin };
    const qs = new URLSearchParams(queryParams).toString();
    try {
        const response = await apiCall('?' + qs, 'GET', null);
        console.log('Statistics retrieved via fetch:', response);
        return response;
    } catch (err) {
        console.warn('Fetch stats failed, fallback to JSONP:', err?.message);
        const response = await jsonpGet(queryParams);
        console.log('Statistics retrieved via JSONP:', response);
        return response;
    }
};

// Health check
window.healthCheck = async function() {
    console.log('Health check...');
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const queryParams = { action: 'health', origin };
    const qs = new URLSearchParams(queryParams).toString();
    try {
        const response = await apiCall('?' + qs, 'GET', null);
        console.log('Health check successful via fetch:', response);
        return response;
    } catch (err) {
        console.warn('Fetch health failed, fallback to JSONP:', err?.message);
        const response = await jsonpGet(queryParams);
        console.log('Health check successful via JSONP:', response);
        return response;
    }
};

// Initialize API when script loads
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(initAPI, 100);
    });
}

console.log('API module loaded successfully');
console.log('Available API functions: createOrder, getOrders, deleteOrder, getStats, healthCheck');
