// Search and Filter Module for Salon Manager
'use strict';

// Search state
const SEARCH_STATE = {
    query: '',
    dateRange: 'today',
    service: 'all',
    employee: 'all',
    sortBy: 'newest',
    isActive: false
};

// Initialize search functionality
function initializeSearch() {
    console.log('🔍 Initializing search module...');
    
    // Setup search event listeners
    setupSearchEventListeners();
    
    console.log('✅ Search module initialized');
}

// Setup search event listeners
function setupSearchEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    }
    
    // Date range filter
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', handleDateFilter);
    }
    
    // Service filter
    const serviceFilter = document.getElementById('serviceFilter');
    if (serviceFilter) {
        serviceFilter.addEventListener('change', handleServiceFilter);
    }
    
    // Employee filter
    const employeeFilter = document.getElementById('employeeFilter');
    if (employeeFilter) {
        employeeFilter.addEventListener('change', handleEmployeeFilter);
    }
    
    // Sort options
    const sortOptions = document.getElementById('sortOptions');
    if (sortOptions) {
        sortOptions.addEventListener('change', handleSortChange);
    }
    
    // Clear search button
    const clearSearchBtn = document.getElementById('clearSearch');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }
    
    // Advanced search toggle
    const advancedToggle = document.getElementById('advancedSearchToggle');
    if (advancedToggle) {
        advancedToggle.addEventListener('click', toggleAdvancedSearch);
    }
}

// Handle search input
function handleSearchInput(e) {
    SEARCH_STATE.query = e.target.value.trim().toLowerCase();
    SEARCH_STATE.isActive = SEARCH_STATE.query.length > 0 || hasActiveFilters();
    performSearch();
}

// Handle date filter
function handleDateFilter(e) {
    SEARCH_STATE.dateRange = e.target.value;
    SEARCH_STATE.isActive = SEARCH_STATE.query.length > 0 || hasActiveFilters();
    performSearch();
}

// Handle service filter
function handleServiceFilter(e) {
    SEARCH_STATE.service = e.target.value;
    SEARCH_STATE.isActive = SEARCH_STATE.query.length > 0 || hasActiveFilters();
    performSearch();
}

// Handle employee filter
function handleEmployeeFilter(e) {
    SEARCH_STATE.employee = e.target.value;
    SEARCH_STATE.isActive = SEARCH_STATE.query.length > 0 || hasActiveFilters();
    performSearch();
}

// Handle sort change
function handleSortChange(e) {
    SEARCH_STATE.sortBy = e.target.value;
    performSearch();
}

// Check if any filters are active
function hasActiveFilters() {
    return SEARCH_STATE.dateRange !== 'today' ||
           SEARCH_STATE.service !== 'all' ||
           SEARCH_STATE.employee !== 'all';
}

// Perform search and filter
function performSearch() {
    if (!APP_STATE || !APP_STATE.orders) {
        console.warn('⚠️ APP_STATE.orders not available for search');
        return;
    }
    
    console.log('🔍 Performing search...', SEARCH_STATE);
    
    let filteredOrders = [...APP_STATE.orders];
    
    // Apply text search
    if (SEARCH_STATE.query) {
        filteredOrders = filteredOrders.filter(order => {
            return order.service.toLowerCase().includes(SEARCH_STATE.query) ||
                   order.notes.toLowerCase().includes(SEARCH_STATE.query) ||
                   order.employee.toLowerCase().includes(SEARCH_STATE.query) ||
                   order.id.toLowerCase().includes(SEARCH_STATE.query);
        });
    }
    
    // Apply date filter
    filteredOrders = filterByDateRange(filteredOrders, SEARCH_STATE.dateRange);
    
    // Apply service filter
    if (SEARCH_STATE.service !== 'all') {
        filteredOrders = filteredOrders.filter(order => 
            order.service === SEARCH_STATE.service
        );
    }
    
    // Apply employee filter
    if (SEARCH_STATE.employee !== 'all') {
        filteredOrders = filteredOrders.filter(order => 
            order.employee === SEARCH_STATE.employee
        );
    }
    
    // Apply sorting
    filteredOrders = sortOrders(filteredOrders, SEARCH_STATE.sortBy);
    
    // Update display
    displayFilteredOrders(filteredOrders);
    updateSearchStats(filteredOrders);
    
    console.log(`✅ Search complete: ${filteredOrders.length} results`);
}

// Filter orders by date range
function filterByDateRange(orders, range) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (range) {
        case 'today':
            return orders.filter(order => {
                const orderDate = new Date(order.timestamp);
                return orderDate >= today;
            });
            
        case 'yesterday':
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            return orders.filter(order => {
                const orderDate = new Date(order.timestamp);
                return orderDate >= yesterday && orderDate < today;
            });
            
        case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return orders.filter(order => {
                const orderDate = new Date(order.timestamp);
                return orderDate >= weekAgo;
            });
            
        case 'month':
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            return orders.filter(order => {
                const orderDate = new Date(order.timestamp);
                return orderDate >= monthStart;
            });
            
        case 'all':
            return orders;
            
        default:
            return orders;
    }
}

// Sort orders
function sortOrders(orders, sortBy) {
    switch (sortBy) {
        case 'newest':
            return orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
        case 'oldest':
            return orders.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
        case 'price_high':
            return orders.sort((a, b) => b.price - a.price);
            
        case 'price_low':
            return orders.sort((a, b) => a.price - b.price);
            
        case 'service':
            return orders.sort((a, b) => a.service.localeCompare(b.service));
            
        case 'employee':
            return orders.sort((a, b) => a.employee.localeCompare(b.employee));
            
        default:
            return orders;
    }
}

// Display filtered orders
function displayFilteredOrders(orders) {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) {
        console.warn('⚠️ Orders list container not found');
        return;
    }
    
    if (orders.length === 0) {
        ordersList.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <svg class="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <p>Không tìm thấy đơn hàng nào</p>
                <button onclick="clearSearch()" class="mt-2 px-4 py-2 text-blue-600 hover:text-blue-800">
                    Xóa bộ lọc
                </button>
            </div>
        `;
        return;
    }
    
    // Clear and display orders
    ordersList.innerHTML = '';
    orders.forEach(order => {
        if (typeof addOrderToList === 'function') {
            addOrderToList(order);
        }
    });
}

// Update search statistics
function updateSearchStats(orders) {
    const statsDiv = document.getElementById('searchStats');
    if (!statsDiv) return;
    
    const totalRevenue = orders.reduce((sum, order) => sum + order.price, 0);
    
    statsDiv.innerHTML = `
        <div class="text-sm text-gray-600 mb-2">
            📊 ${orders.length} đơn hàng | 💰 ${formatCurrency(totalRevenue)}
        </div>
    `;
    
    // Show active filters
    const activeFilters = [];
    if (SEARCH_STATE.query) activeFilters.push(`"${SEARCH_STATE.query}"`);
    if (SEARCH_STATE.dateRange !== 'today') activeFilters.push(getDateRangeText(SEARCH_STATE.dateRange));
    if (SEARCH_STATE.service !== 'all') activeFilters.push(SEARCH_STATE.service);
    if (SEARCH_STATE.employee !== 'all') activeFilters.push(SEARCH_STATE.employee);
    
    if (activeFilters.length > 0) {
        statsDiv.innerHTML += `
            <div class="flex flex-wrap gap-1">
                ${activeFilters.map(filter => `
                    <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        ${filter}
                    </span>
                `).join('')}
            </div>
        `;
    }
}

// Get date range text for display
function getDateRangeText(range) {
    const texts = {
        'today': 'Hôm nay',
        'yesterday': 'Hôm qua',
        'week': 'Tuần này',
        'month': 'Tháng này',
        'all': 'Tất cả'
    };
    return texts[range] || range;
}

// Clear search and filters
function clearSearch() {
    console.log('🗑️ Clearing search and filters...');
    
    // Reset state
    SEARCH_STATE.query = '';
    SEARCH_STATE.dateRange = 'today';
    SEARCH_STATE.service = 'all';
    SEARCH_STATE.employee = 'all';
    SEARCH_STATE.sortBy = 'newest';
    SEARCH_STATE.isActive = false;
    
    // Reset UI
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) dateFilter.value = 'today';
    
    const serviceFilter = document.getElementById('serviceFilter');
    if (serviceFilter) serviceFilter.value = 'all';
    
    const employeeFilter = document.getElementById('employeeFilter');
    if (employeeFilter) employeeFilter.value = 'all';
    
    const sortOptions = document.getElementById('sortOptions');
    if (sortOptions) sortOptions.value = 'newest';
    
    // Refresh display with all orders
    if (typeof displayOrders === 'function') {
        displayOrders();
    }
    
    // Clear stats
    const statsDiv = document.getElementById('searchStats');
    if (statsDiv) {
        statsDiv.innerHTML = '';
    }
    
    console.log('✅ Search cleared');
}

// Toggle advanced search
function toggleAdvancedSearch() {
    const advancedPanel = document.getElementById('advancedSearchPanel');
    const toggleBtn = document.getElementById('advancedSearchToggle');
    
    if (advancedPanel && toggleBtn) {
        const isVisible = !advancedPanel.classList.contains('hidden');
        
        if (isVisible) {
            advancedPanel.classList.add('hidden');
            toggleBtn.innerHTML = '🔽 Tìm kiếm nâng cao';
        } else {
            advancedPanel.classList.remove('hidden');
            toggleBtn.innerHTML = '🔼 Thu gọn';
        }
    }
}

// Build filter options dynamically
function buildFilterOptions() {
    if (!APP_STATE || !APP_STATE.orders) return;
    
    const orders = APP_STATE.orders;
    
    // Build service options
    const services = [...new Set(orders.map(order => order.service))];
    const serviceFilter = document.getElementById('serviceFilter');
    if (serviceFilter) {
        serviceFilter.innerHTML = `
            <option value="all">Tất cả dịch vụ</option>
            ${services.map(service => `<option value="${service}">${service}</option>`).join('')}
        `;
    }
    
    // Build employee options
    const employees = [...new Set(orders.map(order => order.employee))];
    const employeeFilter = document.getElementById('employeeFilter');
    if (employeeFilter) {
        employeeFilter.innerHTML = `
            <option value="all">Tất cả nhân viên</option>
            ${employees.map(employee => `<option value="${employee}">${employee}</option>`).join('')}
        `;
    }
}

// Export search state for other modules
function getSearchState() {
    return { ...SEARCH_STATE };
}

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions globally available
window.clearSearch = clearSearch;
window.toggleAdvancedSearch = toggleAdvancedSearch;

// Initialize on DOM ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSearch);
    } else {
        initializeSearch();
    }
}
