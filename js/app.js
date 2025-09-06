// Main App Logic for Salon Manager PWA
'use strict';

// App State
const APP_STATE = {
    user: null,
    orders: [],
    stats: {
        todayCount: 0,
        todayRevenue: 0,
        monthRevenue: 0
    },
    isOnline: navigator.onLine
};

// DOM Elements
let elements = {};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    setupEventListeners();
    
    // Delay to ensure all modules are loaded
    setTimeout(() => {
        initializeAuth();
    }, 100);
    
    updateDateTime();
    
    // Update date/time every minute
    setInterval(updateDateTime, 60000);
    
    // Check online status
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
});

// Initialize DOM elements
function initializeElements() {
    elements = {
        // Screens
        loginScreen: document.getElementById('loginScreen'),
        mainApp: document.getElementById('mainApp'),
        
        // Auth elements
        loginBtn: document.getElementById('loginBtn'),
        googleLoginContainer: document.getElementById('googleLoginContainer'),
        logoutBtn: document.getElementById('logoutBtn'),
        userEmail: document.getElementById('userEmail'),
        
        // Form elements
        orderForm: document.getElementById('orderForm'),
        serviceInput: document.getElementById('service'),
        serviceButtons: document.getElementById('serviceButtons'),
        otherServiceInput: document.getElementById('otherService'),
        priceInput: document.getElementById('price'),
        pricePreview: document.getElementById('pricePreview'),
        notesInput: document.getElementById('notes'),
        
        // Statistics
        todayCount: document.getElementById('todayCount'),
        todayRevenue: document.getElementById('todayRevenue'),
        monthRevenue: document.getElementById('monthRevenue'),
        
        // Orders list
        ordersList: document.getElementById('ordersList'),
        refreshBtn: document.getElementById('refreshBtn'),
        
        // Other
        currentDate: document.getElementById('currentDate'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toastMessage'),
        toastIcon: document.getElementById('toastIcon')
    };
}

// Setup event listeners
function setupEventListeners() {
    // Auth events
    elements.loginBtn?.addEventListener('click', handleLogin);
    elements.logoutBtn?.addEventListener('click', handleLogout);
    
    // Form events
    elements.orderForm?.addEventListener('submit', handleOrderSubmit);
    elements.refreshBtn?.addEventListener('click', refreshOrders);
    
    // Service buttons
    const serviceButtons = document.querySelectorAll('.service-btn');
    serviceButtons.forEach(btn => {
        btn.addEventListener('click', handleServiceButtonClick);
    });
    
    // Price formatting
    elements.priceInput?.addEventListener('input', handlePriceInput);
}

// Handle service button click
function handleServiceButtonClick(e) {
    const button = e.currentTarget;
    const service = button.dataset.service;
    
    // Remove selected class from all buttons
    document.querySelectorAll('.service-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Add selected class to clicked button
    button.classList.add('selected');
    
    // Set the hidden input value
    elements.serviceInput.value = service;
    
    // Handle "other" service
    const isOther = service === 'other';
    elements.otherServiceInput.classList.toggle('hidden', !isOther);
    if (isOther) {
        elements.otherServiceInput.focus();
        elements.otherServiceInput.required = true;
    } else {
        elements.otherServiceInput.required = false;
        elements.otherServiceInput.value = '';
    }
}

// Handle price input formatting
function handlePriceInput(e) {
    // Remove non-numeric characters
    let value = e.target.value.replace(/[^0-9]/g, '');
    
    // Limit to max 50000 (50 million in thousands)
    if (value && parseInt(value) > 50000) {
        value = '50000';
        showToast('Giá tiền tối đa là 50 triệu', 'warning');
    }
    
    // Update input value
    e.target.value = value;
    
    // Show formatted preview
    if (value && parseInt(value) > 0) {
        const amount = parseInt(value) * 1000;
        elements.pricePreview.textContent = `= ${formatCurrency(amount)}`;
        elements.pricePreview.classList.remove('hidden');
    } else {
        elements.pricePreview.classList.add('hidden');
    }
}

// Handle order form submission
async function handleOrderSubmit(e) {
    e.preventDefault();
    
    // Get form data
    const serviceValue = elements.serviceInput.value;
    const service = serviceValue === 'other' 
        ? elements.otherServiceInput.value 
        : serviceValue;
    
    // Get price in thousands and convert to actual amount
    const priceInThousands = parseInt(elements.priceInput.value.replace(/\D/g, ''));
    const price = priceInThousands * 1000; // Convert to actual VND
    const notes = elements.notesInput.value.trim();
    
    // Validate
    if (!service) {
        showToast('Vui lòng chọn dịch vụ', 'error');
        return;
    }
    
    if (!priceInThousands || priceInThousands <= 0) {
        showToast('Vui lòng nhập giá tiền hợp lệ', 'error');
        return;
    }
    
    if (priceInThousands > 50000) {
        showToast('Giá tiền không được vượt quá 50 triệu', 'error');
        return;
    }
    
    // Create order object
    const order = {
        id: generateOrderId(),
        timestamp: new Date().toISOString(),
        service: service,
        price: price,
        notes: notes,
        employee: APP_STATE.user?.email || 'unknown',
        status: 'active'
    };
    
    // Show loading
    showLoading(true);
    
    try {
        // In Phase 1, we'll just add to local state
        // In Phase 4, this will call the API
        await saveOrder(order);
        
        // Clear form
        elements.orderForm.reset();
        elements.otherServiceInput.classList.add('hidden');
        elements.otherServiceInput.required = false;
        // Clear service button selection
        document.querySelectorAll('.service-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Update UI
        addOrderToList(order);
        updateStatistics();
        
        showToast('Đã lưu đơn hàng thành công!', 'success');
    } catch (error) {
        console.error('Error saving order:', error);
        showToast('Có lỗi xảy ra. Vui lòng thử lại.', 'error');
    } finally {
        showLoading(false);
    }
}

// Save order (mock function for Phase 1)
async function saveOrder(order) {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Add to local state
    APP_STATE.orders.unshift(order);
    
    // Save to localStorage for persistence
    localStorage.setItem('orders', JSON.stringify(APP_STATE.orders));
    
    return order;
}

// Add order to list UI
function addOrderToList(order) {
    const orderHtml = `
        <div class="order-card bg-gray-50 rounded-lg p-4 order-item" data-order-id="${order.id}">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-1">
                        <span class="text-xs text-gray-500">${formatTime(order.timestamp)}</span>
                        <span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">#${order.id.slice(-4)}</span>
                    </div>
                    <div class="font-medium text-gray-800">${order.service}</div>
                    <div class="text-green-600 font-semibold">${formatCurrency(order.price)}</div>
                    ${order.notes ? `<div class="text-sm text-gray-500 mt-1">${order.notes}</div>` : ''}
                </div>
                <button onclick="deleteOrder('${order.id}')" class="text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    // Remove empty state if exists
    const emptyState = elements.ordersList.querySelector('.text-center');
    if (emptyState) {
        emptyState.remove();
    }
    
    // Add new order at the top
    elements.ordersList.insertAdjacentHTML('afterbegin', orderHtml);
}

// Delete order
window.deleteOrder = async function(orderId) {
    if (!confirm('Bạn có chắc muốn xóa đơn hàng này?')) {
        return;
    }
    
    showLoading(true);
    
    try {
        // Remove from state
        APP_STATE.orders = APP_STATE.orders.filter(o => o.id !== orderId);
        
        // Update localStorage
        localStorage.setItem('orders', JSON.stringify(APP_STATE.orders));
        
        // Remove from UI
        const orderElement = document.querySelector(`[data-order-id="${orderId}"]`);
        if (orderElement) {
            orderElement.remove();
        }
        
        // Check if list is empty
        if (APP_STATE.orders.length === 0) {
            elements.ordersList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <svg class="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p>Chưa có đơn hàng nào hôm nay</p>
                </div>
            `;
        }
        
        updateStatistics();
        showToast('Đã xóa đơn hàng', 'success');
    } catch (error) {
        console.error('Error deleting order:', error);
        showToast('Không thể xóa đơn hàng', 'error');
    } finally {
        showLoading(false);
    }
};

// Refresh orders list
async function refreshOrders() {
    showLoading(true);
    
    try {
        // Load from localStorage for now
        const savedOrders = localStorage.getItem('orders');
        if (savedOrders) {
            APP_STATE.orders = JSON.parse(savedOrders);
            displayOrders();
            updateStatistics();
        }
        
        showToast('Đã cập nhật danh sách', 'success');
    } catch (error) {
        console.error('Error refreshing orders:', error);
        showToast('Không thể cập nhật', 'error');
    } finally {
        showLoading(false);
    }
}

// Display all orders
function displayOrders() {
    // Filter today's orders
    const today = new Date().toDateString();
    const todayOrders = APP_STATE.orders.filter(order => {
        return new Date(order.timestamp).toDateString() === today;
    });
    
    if (todayOrders.length === 0) {
        elements.ordersList.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <svg class="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p>Chưa có đơn hàng nào hôm nay</p>
            </div>
        `;
        return;
    }
    
    // Clear list and add orders
    elements.ordersList.innerHTML = '';
    todayOrders.forEach(order => addOrderToList(order));
}

// Update statistics
function updateStatistics() {
    const today = new Date().toDateString();
    const currentMonth = new Date().getMonth();
    
    // Calculate today's stats
    const todayOrders = APP_STATE.orders.filter(order => {
        return new Date(order.timestamp).toDateString() === today;
    });
    
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.price, 0);
    
    // Calculate month's stats
    const monthOrders = APP_STATE.orders.filter(order => {
        return new Date(order.timestamp).getMonth() === currentMonth;
    });
    
    const monthRevenue = monthOrders.reduce((sum, order) => sum + order.price, 0);
    
    // Update UI
    elements.todayCount.textContent = todayOrders.length;
    elements.todayRevenue.textContent = formatCurrency(todayRevenue, true);
    elements.monthRevenue.textContent = formatCurrency(monthRevenue, true);
}

// Initialize authentication
function initializeAuth() {
    console.log('🔑 Initializing auth...');
    console.log('AUTH available:', typeof AUTH);
    console.log('AUTH.init available:', typeof AUTH?.init);
    
    // Initialize Google Auth
    if (typeof AUTH !== 'undefined' && typeof AUTH.init === 'function') {
        console.log('✅ Using AUTH module');
        AUTH.init({
            onLoginSuccess: (user) => {
                console.log('User logged in:', user);
                APP_STATE.user = user;
                showMainApp();
                showToast(`Xin chào ${user.name || user.email}!`, 'success');
            },
            onLoginError: (error) => {
                console.error('Login error:', error);
                showToast(error, 'error');
                showLoginScreen();
            },
            onLogout: () => {
                console.log('User logged out');
                APP_STATE.user = null;
                showLoginScreen();
                showToast('Đã đăng xuất', 'info');
            }
        });
    } else {
        console.warn('⚠️ AUTH module not available, using fallback');
        checkLocalAuth();
    }
}

// Fallback auth check
function checkLocalAuth() {
    const user = localStorage.getItem('user');
    if (user) {
        APP_STATE.user = JSON.parse(user);
        showMainApp();
    } else {
        showLoginScreen();
    }
}

// Handle login with Google OAuth
function handleLogin() {
    if (typeof AUTH !== 'undefined') {
        AUTH.login();
    } else {
        console.warn('AUTH module not available, using mock login');
        mockLoginFallback();
    }
}

// Handle logout
function handleLogout() {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
        if (typeof AUTH !== 'undefined') {
            AUTH.logout();
        } else {
            // Fallback logout
            APP_STATE.user = null;
            localStorage.removeItem('user');
            showLoginScreen();
            showToast('Đã đăng xuất', 'info');
        }
    }
}

// Mock login fallback for development
function mockLoginFallback() {
    showLoading(true);
    
    setTimeout(() => {
        const mockUser = {
            id: 'demo-123',
            email: 'demo@salon.com',
            name: 'Demo User',
            picture: null
        };
        
        APP_STATE.user = mockUser;
        localStorage.setItem('user', JSON.stringify(mockUser));
        showMainApp();
        showToast('Đăng nhập demo thành công!', 'success');
        showLoading(false);
    }, 1000);
}

// Show main app
function showMainApp() {
    elements.loginScreen.classList.add('hidden');
    elements.mainApp.classList.remove('hidden');
    
    if (APP_STATE.user) {
        elements.userEmail.textContent = APP_STATE.user.email;
    }
    
    refreshOrders();
}

// Show login screen
function showLoginScreen() {
    elements.loginScreen.classList.remove('hidden');
    elements.mainApp.classList.add('hidden');
    
    // Try to render Google OAuth button
    setTimeout(() => {
        renderGoogleLoginButton();
    }, 1000);
}

// Render Google OAuth button
function renderGoogleLoginButton() {
    if (typeof google === 'undefined' || !google.accounts) {
        console.warn('Google Identity Services not loaded yet');
        // Show fallback button
        elements.loginBtn.style.display = 'flex';
        return;
    }
    
    // Check if we have valid client ID
    if (typeof APP_CONFIG === 'undefined' || 
        !APP_CONFIG.GOOGLE_CLIENT_ID || 
        APP_CONFIG.GOOGLE_CLIENT_ID.includes('DEMO_CLIENT_ID')) {
        console.warn('No valid Google Client ID, showing fallback');
        elements.loginBtn.style.display = 'flex';
        return;
    }
    
    try {
        // Initialize Google OAuth if not done
        google.accounts.id.initialize({
            client_id: APP_CONFIG.GOOGLE_CLIENT_ID,
            callback: (response) => {
                // Handle login response
                if (typeof AUTH !== 'undefined') {
                    AUTH.handleCredentialResponse?.(response);
                } else {
                    handleGoogleResponse(response);
                }
            }
        });
        
        // Render Google button
        google.accounts.id.renderButton(elements.googleLoginContainer, {
            type: 'standard',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            theme: 'outline',
            width: '100%'
        });
        
        // Hide fallback button
        elements.loginBtn.style.display = 'none';
        
        console.log('Google OAuth button rendered');
        
    } catch (error) {
        console.error('Error rendering Google button:', error);
        // Show fallback button
        elements.loginBtn.style.display = 'flex';
    }
}

// Handle Google OAuth response (fallback)
function handleGoogleResponse(response) {
    console.log('Handling Google OAuth response');
    
    if (!response || !response.credential) {
        showToast('Lỗi đăng nhập. Vui lòng thử lại.', 'error');
        return;
    }
    
    try {
        // Parse JWT token
        const token = response.credential;
        const payload = parseJwt(token);
        
        console.log('User email:', payload.email);
        
        // Check if email is allowed
        if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.ALLOWED_EMAILS) {
            if (!APP_CONFIG.ALLOWED_EMAILS.includes(payload.email)) {
                showToast(`Email ${payload.email} không được phép truy cập. Liên hệ admin.`, 'error');
                return;
            }
        }
        
        // Create user object
        const user = {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            token: token
        };
        
        // Save user
        APP_STATE.user = user;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Show main app
        showMainApp();
        showToast(`Xin chào ${user.name || user.email}!`, 'success');
        
    } catch (error) {
        console.error('Error processing Google response:', error);
        showToast('Lỗi xử lý đăng nhập. Vui lòng thử lại.', 'error');
    }
}

// Parse JWT token
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        throw new Error('Error parsing JWT token');
    }
}

// Handle online status
function handleOnline() {
    APP_STATE.isOnline = true;
    showToast('Đã kết nối mạng', 'success');
    // Sync pending data if any
}

// Handle offline status
function handleOffline() {
    APP_STATE.isOnline = false;
    showToast('Mất kết nối mạng', 'warning');
}

// Quick price setter
window.setQuickPrice = function(priceInThousands) {
    elements.priceInput.value = priceInThousands;
    // Trigger input event to show preview
    const event = new Event('input', { bubbles: true });
    elements.priceInput.dispatchEvent(event);
};

// Utility Functions
function generateOrderId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(amount, short = false) {
    if (short && amount >= 1000000000) {
        return (amount / 1000000000).toFixed(1) + 'Tỷ';
    }
    if (short && amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'Tr';
    }
    if (short && amount >= 1000) {
        return (amount / 1000).toFixed(0) + 'k';
    }
    return amount.toLocaleString('vi-VN') + 'đ';
}

function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'numeric', 
        day: 'numeric' 
    };
    elements.currentDate.textContent = now.toLocaleDateString('vi-VN', options);
}

function showLoading(show) {
    elements.loadingOverlay.classList.toggle('hidden', !show);
}

function showToast(message, type = 'info') {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    elements.toastIcon.textContent = icons[type];
    elements.toastMessage.textContent = message;
    elements.toast.classList.add('toast-show');
    
    setTimeout(() => {
        elements.toast.classList.remove('toast-show');
    }, 3000);
}
