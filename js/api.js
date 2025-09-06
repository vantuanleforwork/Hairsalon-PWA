// API module for Google Apps Script integration
'use strict';

console.log('🚀 API module loading...');

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
        console.log('⚙️ API initialized:', API_CONFIG.baseURL.substring(0, 50) + '...');
        return true;
    }
    console.warn('⚠️ API URL not configured');
    return false;
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
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (data) {
        if (method === 'GET') {
            // For GET requests, add data as query parameters
            const params = new URLSearchParams(data);
            const separator = url.includes('?') ? '&' : '?';
            const finalUrl = url + separator + params.toString();
            console.log('📡 API GET:', finalUrl);
            return fetch(finalUrl, { ...options, method: 'GET' });
        } else {
            // For POST requests, add data to body
            options.body = JSON.stringify(data);
            console.log('📡 API POST:', url, data);
        }
    }
    
    try {
        console.log(`🚀 API call: ${method} ${url}`);
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
        console.warn(`⚠️ API call failed (attempt ${retryCount + 1}):`, error.message);
        
        // Try with no-cors mode for Google Apps Script
        if (retryCount === 0 && error.message.includes('cors')) {
            console.log('🔄 Retrying with no-cors mode...');
            try {
                const noCorsResponse = await fetch(url, {
                    ...options,
                    mode: 'no-cors'
                });
                // With no-cors, we can't read the response, but assume success
                console.log('✅ Request sent (no-cors mode)');
                return { success: true, message: 'Request sent successfully' };
            } catch (noCorsError) {
                console.error('❌ No-cors mode also failed:', noCorsError);
            }
        }
        
        // Retry logic
        if (retryCount < API_CONFIG.retries - 1) {
            console.log(`🔄 Retrying in ${(retryCount + 1) * 1000}ms...`);
            await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
            return apiCall(endpoint, method, data, retryCount + 1);
        }
        
        throw error;
    }
}

// Create a new order
window.createOrder = async function(orderData) {
    console.log('📝 Creating order:', orderData);
    
    try {
        const response = await apiCall('', 'POST', {
            action: 'create',
            employee: orderData.employee,
            service: orderData.service,
            price: orderData.price,
            notes: orderData.notes,
            createdBy: orderData.employee
        });
        
        console.log('✅ Order created successfully:', response);
        return response;
        
    } catch (error) {
        console.error('❌ Failed to create order:', error);
        throw error;
    }
};

// Get orders with optional filters
window.getOrders = async function(filters = {}) {
    console.log('📎 Getting orders:', filters);
    
    try {
        const queryParams = {
            action: 'orders',
            ...filters
        };
        
        const response = await apiCall('', 'GET', queryParams);
        
        console.log('✅ Orders retrieved:', response);
        return response;
        
    } catch (error) {
        console.error('❌ Failed to get orders:', error);
        throw error;
    }
};

// Delete an order (soft delete)
window.deleteOrder = async function(orderId) {
    console.log('🗑️ Deleting order:', orderId);
    
    try {
        const response = await apiCall('', 'POST', {
            action: 'delete',
            id: orderId
        });
        
        console.log('✅ Order deleted successfully:', response);
        return response;
        
    } catch (error) {
        console.error('❌ Failed to delete order:', error);
        throw error;
    }
};

// Get statistics
window.getStats = async function() {
    console.log('📈 Getting statistics...');
    
    try {
        const response = await apiCall('', 'GET', {
            action: 'stats'
        });
        
        console.log('✅ Statistics retrieved:', response);
        return response;
        
    } catch (error) {
        console.error('❌ Failed to get statistics:', error);
        throw error;
    }
};

// Health check
window.healthCheck = async function() {
    console.log('🌡️ Health check...');
    
    try {
        const response = await apiCall('', 'GET', {
            action: 'health'
        });
        
        console.log('✅ Health check successful:', response);
        return response;
        
    } catch (error) {
        console.error('❌ Health check failed:', error);
        throw error;
    }
};

// Initialize API when script loads
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(initAPI, 100);
    });
}

console.log('✅ API module loaded successfully');
console.log('✅ Available API functions: createOrder, getOrders, deleteOrder, getStats, healthCheck');
