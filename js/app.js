// Main App Logic for Salon Manager PWA
'use strict';

// Register minimal Service Worker (no offline caching)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        var __ver = (window.APP_CONFIG && window.APP_CONFIG.APP_VERSION) ? window.APP_CONFIG.APP_VERSION : '1.0.0';
        navigator.serviceWorker.register('sw.js?v=' + encodeURIComponent(__ver), { scope: './' })
            .then(function(reg) {
                console.log('Service Worker registered:', reg.scope);

                let pendingReload = false;

                function getBannerEls() {
                    return {
                        banner: document.getElementById('updateBanner'),
                        btn: document.getElementById('reloadAppBtn')
                    };
                }

                function showUpdateBanner() {
                    const { banner, btn } = getBannerEls();
                    if (!banner || !btn) return;
                    banner.classList.remove('hidden');
                    btn.disabled = false;
                    btn.textContent = 'Tải lại';
                    btn.onclick = function() {
                        const waiting = reg.waiting;
                        if (!waiting) return;
                        pendingReload = true;
                        try { btn.disabled = true; btn.textContent = 'Đang cập nhật...'; } catch (_) {}
                        waiting.postMessage({ type: 'SKIP_WAITING' });
                    };
                }

                function hideUpdateBanner() {
                    const { banner } = getBannerEls();
                    banner?.classList.add('hidden');
                }

                // If there's an update already waiting when page loads
                if (reg.waiting && navigator.serviceWorker.controller) {
                    showUpdateBanner();
                }

                // When a new worker is found, show banner after it's installed
                reg.addEventListener('updatefound', function() {
                    const newSW = reg.installing;
                    if (!newSW) return;
                    newSW.addEventListener('statechange', function() {
                        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateBanner();
                        }
                    });
                });

                // Reload only when user requested and the new SW takes control
                navigator.serviceWorker.addEventListener('controllerchange', function() {
                    hideUpdateBanner();
                    if (pendingReload) {
                        try { console.log('New service worker active, reloading (user-initiated)...'); } catch (_) {}
                        window.location.reload();
                    }
                });

                // Proactively check for updates now and periodically
                try { reg.update(); } catch (_) {}
                setInterval(function(){ try { reg.update(); } catch (_) {} }, 60 * 60 * 1000); // every hour
            })
            .catch(function(err) { console.warn('Service Worker registration failed:', err); });
    });
}

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

// Initialize App (works even if DOMContentLoaded already fired)
function bootstrapApp() {
    if (window.__APP_BOOTSTRAPPED__) return;
    window.__APP_BOOTSTRAPPED__ = true;

    try {
        initializeElements();
        // Remove search UI for simplified app
        removeSearchUI();
        setupEventListeners();

        // Delay to ensure all modules are loaded
        setTimeout(() => {
            try { initializeAuth(); } catch (e) { console.warn('Auth init error:', e); }
        }, 500);

        updateDateTime();
        // Update date/time every minute
        setInterval(updateDateTime, 60000);
    } catch (err) {
        console.error('Bootstrap error:', err);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
    // DOM already ready (e.g., scripts loaded dynamically) → bootstrap immediately
    setTimeout(bootstrapApp, 0);
}

// Remove search and filter UI elements (keep app simple)
function removeSearchUI() {
    try {
        // Remove advanced search toggle button
        document.getElementById('advancedSearchToggle')?.remove();

        // Remove search input and its container
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            const wrapper = searchInput.closest('.mb-4') || searchInput.parentElement?.parentElement || searchInput.parentElement;
            wrapper?.remove();
        }

        // Remove advanced search panel and search stats
        document.getElementById('advancedSearchPanel')?.remove();
        document.getElementById('searchStats')?.remove();

        // Remove clear button if present
        document.getElementById('clearSearch')?.remove();
    } catch (err) {
        console.warn('Search UI cleanup warning:', err);
    }
}

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
        accountEmail: document.getElementById('accountEmail'),
        
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
    } else if (false) {
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
        employee: APP_STATE.user?.email || 'unknown'
    };
    
    // Show loading
    showLoading(true);
    
    try {
        // Save order via API (realtime only)
        const savedOrder = await saveOrderRealtime(order);
        
        // Clear form
        elements.orderForm.reset();
        elements.otherServiceInput.classList.add('hidden');
        elements.otherServiceInput.required = false;
        // Clear service button selection
        document.querySelectorAll('.service-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Update UI:
        // - If backend returned the saved order with a real ID, add immediately.
        // - If not (e.g., no-cors, missing ID), refresh from server to sync.
        try {
            if (savedOrder) {
                const normalizedSaved = {
                    ...savedOrder,
                    timestamp: normalizeTimestamp(savedOrder.timestamp || savedOrder.date || new Date())
                };
                addOrderToList(normalizedSaved);
            } else if (typeof refreshOrders === 'function') {
                await refreshOrders();
            }
        } catch (uiErr) {
            console.warn('Add-to-list failed, will rely on manual refresh:', uiErr);
        }
        
        // Keep UI responsive: avoid auto-refresh overwriting the new item
        // Users can tap refresh if needed
        
        showToast('Đã lưu đơn hàng thành công!', 'success');
    } catch (error) {
        console.error('Error saving order:', error);
        showToast('Có lỗi xảy ra. Vui lòng thử lại.', 'error');
    } finally {
        showLoading(false);
    }
}

// Save order to Google Sheets via API
// Legacy offline save (unused in realtime mode)
async function saveOrderLegacyOffline(order) {
    console.log('📥 Saving order to backend...');
    
    try {
        // Check if API is available
        if (typeof window.createOrder === 'function' && 
            APP_CONFIG && APP_CONFIG.API_BASE_URL && 
            !APP_CONFIG.API_BASE_URL.includes('DEMO_ID')) {
            
            console.log('⚙️ Using Google Sheets API');
            
            // Call real API with timeout
            const response = await Promise.race([
                window.createOrder({
                    employee: order.employee,
                    service: order.service,
                    price: order.price,
                    notes: order.notes
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('API timeout after 10s')), 10000)
                )
            ]);
            
            if (response && (response.success || response.id)) {
                console.log('✅ Order saved to Google Sheets:', response);
                
                // Also save locally for immediate UI update
                APP_STATE.orders.unshift(order);
                // No offline storage in realtime mode
                
                // Refresh stats from server
                setTimeout(() => {
                    refreshStatsFromAPI();
                }, 1000);
                
                showToast('✅ Đã lưu và đồng bộ thành công!', 'success');
                return order;
            } else {
                throw new Error('Invalid API response');
            }
            
        } else {
            console.log('📋 Using local storage (API not configured)');
            
            // Fallback to localStorage
            await new Promise(resolve => setTimeout(resolve, 300));
            APP_STATE.orders.unshift(order);
            // No offline storage in realtime mode
            
            // removed: offline/local save toast
            return order;
        }
        
    } catch (error) {
        console.error('❌ Error saving to API:', error.message);
        
        // Always fallback to localStorage - never fail completely
        APP_STATE.orders.unshift(order);
        // No offline storage in realtime mode
        
        // Show appropriate message based on error
        showToast('Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.', 'error');
        if (false && error.message.includes('timeout')) {
            showToast('⚠️ API chậm, đã lưu local. Tự động đồng bộ sau.', 'warning');
        } else if (error.message.includes('CORS') || error.message.includes('network')) {
            showToast('📏 Mạng có vấn đề, đã lưu local.', 'warning');
        } else if (false) {
            // removed: offline mode toast
        }
        
        return order;
    }
}

// Add order to list UI
function addOrderToList(order) {
    const shortId = order && order.id ? String(order.id).slice(-4) : '----';
    const orderHtml = `
        <div class="order-card bg-gray-50 rounded-lg p-4 order-item" data-order-id="${order?.id || ''}">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-1">
                        <span class="text-xs text-gray-500">${formatTime(order?.timestamp)}</span>
                        <span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">#${shortId}</span>
                    </div>
                    <div class="font-medium text-gray-800">${order?.service || '—'}</div>
                    <div class="text-green-600 font-semibold">${formatCurrency(order?.price || 0)}</div>
                    ${order?.employeeName ? `<div class="text-sm text-gray-600 mt-1">👤 ${order.employeeName}</div>` : ''}
                    ${order?.notes ? `<div class="text-sm text-gray-500 mt-1">${order.notes}</div>` : ''}
                </div>
                <button onclick="onDeleteOrderClick('${order?.id || ''}')" class="text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
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
// Deprecated local-only delete (not used in realtime mode)
window._deleteOrderLocal = async function(orderId) {
    if (!confirm('Bạn có chắc muốn xóa đơn hàng này?')) {
        return;
    }
    
    showLoading(true);
    
    try {
        // Remove from state
        APP_STATE.orders = APP_STATE.orders.filter(o => o.id !== orderId);
        
        // No offline storage in realtime mode
        
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

// Refresh orders list from API or localStorage
async function refreshOrders() {
    showLoading(true);
    
    try {
        // Try to load from API first
        if (typeof window.getOrders === 'function' && 
            APP_CONFIG && APP_CONFIG.API_BASE_URL && 
            !APP_CONFIG.API_BASE_URL.includes('DEMO_ID')) {
            
            console.log('📥 Loading orders from API...');
            
            // Add timeout for API call
            const todayIso = new Date().toISOString();
            const currentUserEmail = (APP_STATE && APP_STATE.user && APP_STATE.user.email) ? APP_STATE.user.email : undefined;
            const filters = Object.assign({ date: todayIso, limit: 100 }, currentUserEmail ? { employee: currentUserEmail } : {});
            const response = await Promise.race([
                window.getOrders(filters),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('API timeout')), 8000)
                )
            ]);
            
            if (response && response.orders && Array.isArray(response.orders)) {
                // Transform API data if needed
                const apiOrders = response.orders.map(order => ({
                    id: order.id || generateOrderId(),
                    timestamp: normalizeTimestamp(order.timestamp || order.date || ''),
                    service: order.service || 'Unknown Service',
                    price: parsePrice(order.price),
                    notes: order.notes || '',
                    employee: order.employee || 'unknown',
                    employeeName: order.employeeName || ''
                }));
                
                // Client-side filter: only by today to ensure visibility
                const todayKey = toDateKey(new Date());
                const filtered = apiOrders.filter(o => toDateKey(o.timestamp) === todayKey);
                APP_STATE.orders = apiOrders;
                // No offline storage in realtime mode
                console.log(`✅ Loaded ${apiOrders.length} orders from API`);
                
            } else {
                console.warn('⚠️ API response invalid');
                // APP_STATE.orders left unchanged on invalid response
            }
            
        } else {
            console.warn('⚠️ API not configured');
            // APP_STATE.orders left unchanged on invalid response
        }
        
        displayOrders();
        
        // Try to refresh stats
        try {
            await refreshStatsFromAPI();
        } catch (statsError) {
            console.warn('⚠️ Stats refresh failed, using local calculation');
            updateStatistics();
        }
        
        // Build filter options with new data
        if (typeof buildFilterOptions === 'function') {
            buildFilterOptions();
        }
        
    } catch (error) {
        console.error('❌ Error refreshing from API:', error.message);
        // No offline storage fallback in realtime mode
        displayOrders();
        updateStatistics();
        
        // Show user-friendly message
        if (error.message.includes('timeout')) {
            // removed: offline/local data toast
        } else {
            // removed: offline/local data toast
        }
    } finally {
        showLoading(false);
    }
}

// Load orders from localStorage
// Offline storage disabled: keep orders empty if API fails
function loadOrdersFromLocalStorage() {
    // APP_STATE.orders left unchanged on invalid response
}

// Refresh statistics from API
async function refreshStatsFromAPI() {
    try {
        if (typeof window.getStats === 'function' && 
            APP_CONFIG && APP_CONFIG.API_BASE_URL && 
            !APP_CONFIG.API_BASE_URL.includes('DEMO_ID')) {
            
            console.log('📈 Loading stats from API...');
            
            const response = await window.getStats();
            
            if (response) {
                // Update UI with server stats
                elements.todayCount.textContent = response.todayCount || 0;
                elements.todayRevenue.textContent = formatCurrency(response.todayRevenue || 0, true);
                elements.monthRevenue.textContent = formatCurrency(response.monthRevenue || 0, true);
                
                console.log('✅ Stats updated from API:', response);
            }
        }
    } catch (error) {
        console.error('❌ Error loading stats from API:', error);
        // Fallback to local calculation
        updateStatistics();
    }
}

// Display all orders
function displayOrders() {
    // Filter today's orders using robust date key
    const todayKey = toDateKey(new Date());
    const todayOrders = APP_STATE.orders.filter(order => toDateKey(order.timestamp) === todayKey);

    let listToShow = todayOrders;
    let note = '';
    if (todayOrders.length === 0 && APP_STATE.orders.length > 0) {
        // Fallback: show newest recent orders when today has none
        listToShow = [...APP_STATE.orders].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);
        note = '<div class="text-xs text-gray-500 mb-2">Hiển thị đơn gần đây (không có đơn hôm nay)</div>';
    }

    if (listToShow.length === 0) {
        elements.ordersList.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <svg class="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p>Chưa có đơn hàng để hiển thị</p>
            </div>
        `;
        return;
    }

    // Clear list and add orders
    elements.ordersList.innerHTML = note;
    listToShow.forEach(order => addOrderToList(order));
}

// Update statistics
function updateStatistics() {
    const todayKey = toDateKey(new Date());
    const current = new Date();
    const currentMonth = current.getMonth();
    const currentYear = current.getFullYear();
    
    // Calculate today's stats
    const todayOrders = APP_STATE.orders.filter(order => toDateKey(order.timestamp) === todayKey);
    
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.price, 0);
    
    // Calculate month's stats
    const monthOrders = APP_STATE.orders.filter(order => {
        const d = new Date(order.timestamp);
        return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    
    const monthRevenue = monthOrders.reduce((sum, order) => sum + order.price, 0);
    
    // Update UI
    elements.todayCount.textContent = todayOrders.length;
    elements.todayRevenue.textContent = formatCurrency(todayRevenue, true);
    elements.monthRevenue.textContent = formatCurrency(monthRevenue, true);
}

// Simple auth initialization
function initializeAuth() {
    console.log('🔑 Starting auth initialization...');
    
    // REMOVED: Force fresh login has been disabled
    // localStorage.removeItem('user'); // This was preventing auto-login
    
    // Check if auth functions exist
    if (typeof window.initAuth === 'function') {
        console.log('✅ Auth functions available, initializing...');
        
        // Initialize auth with callbacks
        window.initAuth({
            onLoginSuccess: (user) => {
                console.log('🎉 Login success:', user.email);
                APP_STATE.user = user;
                showMainApp();
                showToast(`Xin chào ${user.name || user.email}!`, 'success');
            },
            onLoginError: (error) => {
                console.error('❌ Login error:', error);
                showToast(error, 'error');
                showLoginScreen();
            },
            onLogout: () => {
                console.log('💪 User logged out');
                APP_STATE.user = null;
                showLoginScreen();
                showToast('Đã đăng xuất', 'info');
            }
        });
    } else {
        console.error('❌ Auth module not loaded!');
        showLoginScreen();
    }
}


// Handle login button click
function handleLogin() {
    console.log('🚀 Login button clicked');
    
    if (typeof window.loginWithGoogle === 'function') {
        window.loginWithGoogle();
    } else {
        console.warn('⚠️ Login function not available');
        alert('Login function not available. Please refresh the page.');
    }
}

// Handle logout button click
function handleLogout() {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
        console.log('💪 Logout button clicked');
        
        if (typeof window.logoutUser === 'function') {
            window.logoutUser();
        } else {
            // Fallback logout
            APP_STATE.user = null;
            localStorage.removeItem('user');
            showLoginScreen();
            showToast('Đã đăng xuất', 'info');
        }
    }
}


// Show main app
function showMainApp() {
    elements.loginScreen.classList.add('hidden');
    elements.mainApp.classList.remove('hidden');
    
    if (APP_STATE.user) {
        elements.userEmail.textContent = APP_STATE.user.email;
        if (elements.accountEmail) elements.accountEmail.textContent = APP_STATE.user.email;
    }
    
    // Show app status to user
    const hasRealAPI = APP_CONFIG && APP_CONFIG.API_BASE_URL && 
                       !APP_CONFIG.API_BASE_URL.includes('DEMO_ID');
    
    if (hasRealAPI) {
        console.log('⚙️ App mode: Production with Google Sheets API');
    } else {
        console.log('🎭 App mode: Demo/Offline mode');
        // removed: offline mode toast
    }
    
    refreshOrders();
    
    // Build filter options after orders are loaded
    setTimeout(() => {
        if (typeof buildFilterOptions === 'function') {
            buildFilterOptions();
        }
    }, 1000);
}

// Show login screen
function showLoginScreen() {
    elements.loginScreen.classList.remove('hidden');
    elements.mainApp.classList.add('hidden');
    
    console.log('🔑 Login screen shown');
}

// Handle auth expiry from API layer
window.onAuthExpired = function() {
    try {
        showToast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', 'warning');
    } catch (_) {}
    try {
        if (typeof window.logoutUser === 'function') {
            window.logoutUser();
        } else {
            // Fallback: clear local session and show login
            localStorage.removeItem('user');
            APP_STATE.user = null;
            showLoginScreen();
        }
    } catch (_) {}
};




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
    if (isNaN(date.getTime())) return '--:--';
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

// Normalize various timestamp formats to local ISO-like string (YYYY-MM-DDTHH:mm:ss, no Z)
function normalizeTimestamp(input) {
    if (!input) return formatLocalISO(new Date());
    if (input instanceof Date) return formatLocalISO(new Date(input.getTime()));
    if (typeof input === 'number') return formatLocalISO(new Date(input));

    const s = String(input).trim();
    // Already ISO-like
    if (/\d{4}-\d{2}-\d{2}T/.test(s)) {
        const d = new Date(s);
        return isNaN(d.getTime()) ? formatLocalISO(new Date()) : formatLocalISO(d);
    }
    // Match dd/MM/yyyy or dd-MM-yyyy with optional time HH:mm[:ss]
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
        let [, dd, MM, yyyy, hh, mm, ss] = m;
        if (yyyy.length === 2) yyyy = '20' + yyyy;
        const d = new Date(
            parseInt(yyyy, 10),
            parseInt(MM, 10) - 1,
            parseInt(dd, 10),
            parseInt(hh || '0', 10),
            parseInt(mm || '0', 10),
            parseInt(ss || '0', 10)
        );
        return isNaN(d.getTime()) ? formatLocalISO(new Date()) : formatLocalISO(d);
    }
    // Match time-first formats: HH:mm[:ss] dd/MM/yyyy or dd-MM-yyyy
    const t = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?[\s,]+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (t) {
        let [, hh, mm, ss, dd, MM, yyyy] = t;
        if (yyyy.length === 2) yyyy = '20' + yyyy;
        const d = new Date(
            parseInt(yyyy, 10),
            parseInt(MM, 10) - 1,
            parseInt(dd, 10),
            parseInt(hh || '0', 10),
            parseInt(mm || '0', 10),
            parseInt(ss || '0', 10)
        );
        return isNaN(d.getTime()) ? formatLocalISO(new Date()) : formatLocalISO(d);
    }

    // Fallback: let Date try to parse
    const d2 = new Date(s);
    return isNaN(d2.getTime()) ? formatLocalISO(new Date()) : formatLocalISO(d2);
}

// Build a YYYY-MM-DD key in local time for day comparisons
function toDateKey(input) {
    const d = (input instanceof Date) ? input : new Date(input);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Parse price values from API/Sheet (supports "60000", "60.000", "60.000 đ", "60,000", etc.)
function parsePrice(value) {
    if (typeof value === 'number') return value;
    if (value == null) return 0;
    const s = String(value).trim();
    const digits = s.replace(/\D+/g, '');
    if (!digits) return 0;
    const n = parseInt(digits, 10);
    return isNaN(n) ? 0 : n;
}

function formatLocalISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day}T${hh}:${mm}:${ss}`;
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
    // Ensure toast is visible before slide-in
    elements.toast.classList.remove('hidden');
    elements.toast.classList.add('toast-show');
    
    setTimeout(() => {
        elements.toast.classList.remove('toast-show');
        // Hide after slide-out completes
        setTimeout(() => { elements.toast.classList.add('hidden'); }, 320);
    }, 3000);
}

// Normalize legacy mojibake Vietnamese in messages and wrap showToast
(function wrapShowToast() {
    try {
        const orig = showToast;
        function normalizeVN(s) {
            try {
                return String(s || '')
                    .replace(/Vui lA�ng/gi, 'Vui lòng')
                    .replace(/Nh��-p/gi, 'Nhập')
                    .replace(/d��<ch v���|d��<ch v��̀|d��<ch/gi, 'dịch vụ')
                    .replace(/GiA�/g, 'Giá')
                    .replace(/khA'ng/gi, 'không')
                    .replace(/tri���u/gi, 'triệu')
                    .replace(/th��- l���i/gi, 'thử lại')
                    .replace(/�`��n hA�ng/gi, 'đơn hàng')
                    .replace(/�`��ng nh��-p/gi, 'đăng nhập')
                    .replace(/nA�t/gi, 'nút')
                    .replace(/th���y/gi, 'thấy')
                    .replace(/tA�m/gi, 'tìm')
                    .replace(/ngA�y/gi, 'ngày')
                    .replace(/L��u/gi, 'Lưu')
                    .replace(/�?ang/gi, 'Đang')
                    .replace(/�?��ng xu���t/gi, 'Đăng xuất');
            } catch (_) {
                return s;
            }
        }
        // Override the global function identifier (use our own UI update)
        window.showToast = function(message, type = 'info') {
            const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
            const msg = normalizeVN(message);
            try {
                elements.toastIcon.textContent = icons[type] || '';
                elements.toastMessage.textContent = msg;
                elements.toast.classList.remove('hidden');
                elements.toast.classList.add('toast-show');
                setTimeout(() => {
                    elements.toast.classList.remove('toast-show');
                    setTimeout(() => { elements.toast.classList.add('hidden'); }, 320);
                }, 3000);
            } catch (_) {
                try { orig(msg, type); } catch (_) { /* ignore */ }
            }
        };
    } catch (_) {}
})();

// Force emoji icons for toast (final override)
(function forceEmojiToast(){
    try {
        const previous = window.showToast;
        window.showToast = function(message, type = 'info') {
            const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
            try {
                elements.toastIcon.textContent = icons[type] || '';
                elements.toastMessage.textContent = message;
                elements.toast.classList.remove('hidden');
                elements.toast.classList.add('toast-show');
                setTimeout(() => {
                    elements.toast.classList.remove('toast-show');
                    setTimeout(() => { elements.toast.classList.add('hidden'); }, 320);
                }, 3000);
            } catch (e) {
                if (typeof previous === 'function') return previous(message, type);
            }
        };
    } catch (_) {}
})();
