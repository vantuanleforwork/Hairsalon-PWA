// API module for Google Apps Script integration
'use strict';

// API module initialized

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
            try { 
                delete window[cb]; 
            } catch (err) { 
                window[cb] = undefined; 
            }
            if (script && script.parentNode) script.parentNode.removeChild(script);
            if (timer) clearTimeout(timer);
        };

        window[cb] = (data) => {
            try {
                if (data && (data.error === 'Unauthorized' || data.error === 'Forbidden')) {
                    if (typeof window.onAuthExpired === 'function') {
                        window.onAuthExpired();
                    }
                    cleanup();
                    reject(new Error(data.error));
                    return;
                }
            } catch (err) {
                // Ignore parse errors for non-auth responses
            }
            cleanup();
            resolve(data);
        };
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
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                try { if (typeof window.onAuthExpired === 'function') window.onAuthExpired(); } catch (_) {}
            }
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
            const data = await res.json();
            if (data && (data.error === 'Unauthorized' || data.error === 'Forbidden')) {
                try { if (typeof window.onAuthExpired === 'function') window.onAuthExpired(); } catch (_) {}
                throw new Error(data.error);
            }
            return data;
        }
        const text = await res.text();
        try { 
            const data = JSON.parse(text);
            if (data && (data.error === 'Unauthorized' || data.error === 'Forbidden')) {
                try { if (typeof window.onAuthExpired === 'function') window.onAuthExpired(); } catch (_) {}
                throw new Error(data.error);
            }
            return data;
        } catch (_) { return { data: text, success: true }; }
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
            // API GET request
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
            // API POST request
        }
    }
    
    try {
        // API call initiated
        const response = await fetch(url, options);
        
        // Handle different response types
        if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const json = await response.json();
                if (json && (json.error === 'Unauthorized' || json.error === 'Forbidden')) {
                    try { if (typeof window.onAuthExpired === 'function') window.onAuthExpired(); } catch (_) {}
                    throw new Error(json.error);
                }
                return json;
            } else {
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    if (data && (data.error === 'Unauthorized' || data.error === 'Forbidden')) {
                        try { if (typeof window.onAuthExpired === 'function') window.onAuthExpired(); } catch (_) {}
                        throw new Error(data.error);
                    }
                    return data;
                } catch (e) {
                    return { data: text, success: true };
                }
            }
        } else {
            if (response.status === 401 || response.status === 403) {
                try { if (typeof window.onAuthExpired === 'function') window.onAuthExpired(); } catch (_) {}
            }
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
    console.log('Getting orders (POST form):', filters);
    const payload = { action: 'orders', ...(filters || {}) };
    try {
        const res = await postForm('', payload);
        if (res && Array.isArray(res.orders)) {
            console.log('Orders retrieved via POST:', res);
            return res;
        }
        console.warn('POST orders response missing orders array, falling back to JSONP');
    } catch (err) {
        console.warn('POST orders failed, fallback to JSONP:', err?.message);
    }
    // Fallback to JSONP (will include idToken in URL)
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const idToken = getIdToken();
    const queryParams = { action: 'orders', origin, ...(idToken ? { idToken } : {}), ...(filters || {}) };
    return jsonpGet(queryParams);
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
    console.log('Getting statistics (POST form)...');
    try {
        const res = await postForm('', { action: 'stats' });
        if (res && (typeof res.todayCount !== 'undefined')) {
            console.log('Statistics retrieved via POST:', res);
            return res;
        }
        console.warn('POST stats response invalid, falling back to JSONP');
    } catch (err) {
        console.warn('POST stats failed, fallback to JSONP:', err?.message);
    }
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const idToken = getIdToken();
    const queryParams = { action: 'stats', origin, ...(idToken ? { idToken } : {}) };
    return jsonpGet(queryParams);
};

// Health check
window.healthCheck = async function() {
    console.log('Health check...');
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const idToken = getIdToken();
    const queryParams = { action: 'health', origin, ...(idToken ? { idToken } : {}) };
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
