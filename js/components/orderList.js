/**
 * OrderList Component - Danh sách và quản lý đơn hàng
 * Features: Filter, Search, Pagination, Sorting, Bulk actions
 */

import EventBus from '../core/eventBus.js';
import Utils from '../core/utils.js';
import NotificationService from '../services/notification.service.js';
import OrderService from '../services/order.service.js';
import { OrderForm } from './orderForm.js';

export class OrderList {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      pageSize: 10,
      showFilters: true,
      showSearch: true,
      showBulkActions: true,
      enableSelection: true,
      autoRefresh: false,
      refreshInterval: 30000, // 30 seconds
      ...options
    };
    
    this.state = {
      orders: [],
      filteredOrders: [],
      selectedOrders: new Set(),
      currentPage: 1,
      totalPages: 1,
      isLoading: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      searchQuery: '',
      filters: {
        status: 'all',
        dateRange: 'all',
        service: 'all',
        customer: ''
      }
    };
    
    this.statusConfig = {
      pending: { label: 'Chờ xử lý', class: 'status-pending', color: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'Đã xác nhận', class: 'status-confirmed', color: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'Đang thực hiện', class: 'status-progress', color: 'bg-purple-100 text-purple-800' },
      completed: { label: 'Hoàn thành', class: 'status-completed', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Đã hủy', class: 'status-cancelled', color: 'bg-gray-100 text-gray-800' },
      draft: { label: 'Nháp', class: 'status-draft', color: 'bg-gray-100 text-gray-600' }
    };
    
    this.refreshTimer = null;
    
    this.init();
  }
  
  async init() {
    try {
      this.render();
      this.bindEvents();
      await this.loadOrders();
      this.setupAutoRefresh();
      
      EventBus.emit('list:initialized', { 
        component: 'OrderList',
        totalOrders: this.state.orders.length
      });
      
    } catch (error) {
      console.error('OrderList init error:', error);
      NotificationService.show('Lỗi khởi tạo danh sách đơn hàng', 'error');
    }
  }
  
  render() {
    this.container.innerHTML = `
      <div class="order-list-container">
        <!-- Header -->
        <div class="list-header bg-white rounded-lg shadow-sm p-4 mb-4">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div class="flex items-center space-x-4">
              <h2 class="text-xl font-semibold text-gray-900">Danh sách đơn hàng</h2>
              <button class="btn-refresh p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                <svg class="w-5 h-5 refresh-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              </button>
              <div class="loading-indicator hidden">
                <svg class="w-5 h-5 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
            
            <div class="flex items-center space-x-3">
              <button class="btn-primary btn-new-order">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Tạo đơn mới
              </button>
            </div>
          </div>
        </div>

        <!-- Filters & Search -->
        ${this.options.showFilters || this.options.showSearch ? this.renderFiltersSection() : ''}

        <!-- Bulk Actions -->
        ${this.options.showBulkActions ? this.renderBulkActions() : ''}

        <!-- Orders Table -->
        <div class="orders-table-container bg-white rounded-lg shadow-sm overflow-hidden">
          <div class="table-responsive">
            <table class="orders-table w-full">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  ${this.options.enableSelection ? '<th class="table-th w-12"><input type="checkbox" class="select-all-checkbox"></th>' : ''}
                  <th class="table-th sortable" data-sort="id">
                    <div class="flex items-center space-x-1 cursor-pointer">
                      <span>Mã đơn</span>
                      <svg class="w-4 h-4 sort-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
                      </svg>
                    </div>
                  </th>
                  <th class="table-th sortable" data-sort="customerName">
                    <div class="flex items-center space-x-1 cursor-pointer">
                      <span>Khách hàng</span>
                      <svg class="w-4 h-4 sort-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
                      </svg>
                    </div>
                  </th>
                  <th class="table-th">Dịch vụ</th>
                  <th class="table-th sortable" data-sort="finalAmount">
                    <div class="flex items-center space-x-1 cursor-pointer">
                      <span>Thành tiền</span>
                      <svg class="w-4 h-4 sort-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
                      </svg>
                    </div>
                  </th>
                  <th class="table-th sortable" data-sort="appointmentTime">
                    <div class="flex items-center space-x-1 cursor-pointer">
                      <span>Thời gian hẹn</span>
                      <svg class="w-4 h-4 sort-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
                      </svg>
                    </div>
                  </th>
                  <th class="table-th sortable" data-sort="status">
                    <div class="flex items-center space-x-1 cursor-pointer">
                      <span>Trạng thái</span>
                      <svg class="w-4 h-4 sort-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
                      </svg>
                    </div>
                  </th>
                  <th class="table-th w-32">Thao tác</th>
                </tr>
              </thead>
              <tbody class="orders-tbody divide-y divide-gray-200">
                <!-- Order rows will be rendered here -->
              </tbody>
            </table>
          </div>

          <!-- Empty State -->
          <div class="empty-state hidden text-center py-12">
            <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Không có đơn hàng nào</h3>
            <p class="text-gray-500 mb-6">Bắt đầu bằng cách tạo đơn hàng đầu tiên</p>
            <button class="btn-primary btn-create-first">Tạo đơn đầu tiên</button>
          </div>

          <!-- Loading State -->
          <div class="loading-state hidden text-center py-12">
            <svg class="w-8 h-8 animate-spin mx-auto text-purple-600 mb-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-gray-600">Đang tải danh sách đơn hàng...</p>
          </div>
        </div>

        <!-- Pagination -->
        <div class="pagination-container mt-4">
          <!-- Pagination will be rendered here -->
        </div>

        <!-- Order Details Modal -->
        <div class="order-details-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
          <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div class="modal-content p-6">
              <!-- Order details will be rendered here -->
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderFiltersSection() {
    return `
      <div class="filters-section bg-white rounded-lg shadow-sm p-4 mb-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          ${this.options.showSearch ? `
            <div class="search-container col-span-1 md:col-span-2">
              <div class="relative">
                <input 
                  type="text" 
                  class="search-input form-input pl-10" 
                  placeholder="Tìm theo tên, SĐT, mã đơn..."
                  value="${this.state.searchQuery}"
                >
                <svg class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <button class="clear-search absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 hidden">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
          ` : ''}
          
          <div class="filter-group">
            <select class="filter-select form-input" data-filter="status">
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ xử lý</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="in_progress">Đang thực hiện</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
              <option value="draft">Nháp</option>
            </select>
          </div>
          
          <div class="filter-group">
            <select class="filter-select form-input" data-filter="dateRange">
              <option value="all">Tất cả thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="yesterday">Hôm qua</option>
              <option value="this_week">Tuần này</option>
              <option value="last_week">Tuần trước</option>
              <option value="this_month">Tháng này</option>
              <option value="last_month">Tháng trước</option>
            </select>
          </div>
          
          <div class="filter-actions flex space-x-2">
            <button class="btn-outline btn-reset-filters">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Đặt lại
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  renderBulkActions() {
    return `
      <div class="bulk-actions bg-white rounded-lg shadow-sm p-4 mb-4 hidden">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <span class="selected-count text-sm text-gray-600">
              Đã chọn <strong>0</strong> đơn hàng
            </span>
          </div>
          
          <div class="flex items-center space-x-2">
            <select class="bulk-action-select form-input">
              <option value="">Chọn hành động</option>
              <option value="confirm">Xác nhận đơn</option>
              <option value="start">Bắt đầu thực hiện</option>
              <option value="complete">Hoàn thành</option>
              <option value="cancel">Hủy đơn</option>
              <option value="delete">Xóa đơn</option>
            </select>
            
            <button class="btn-primary btn-apply-bulk" disabled>Áp dụng</button>
          </div>
        </div>
      </div>
    `;
  }
  
  async loadOrders() {
    this.state.isLoading = true;
    this.showLoadingState();
    
    try {
      const orders = await OrderService.getAllOrders();
      this.state.orders = orders;
      this.applyFiltersAndSort();
      this.renderOrders();
      
      EventBus.emit('orders:loaded', { 
        total: orders.length,
        filtered: this.state.filteredOrders.length
      });
      
    } catch (error) {
      console.error('Load orders error:', error);
      NotificationService.show('Lỗi tải danh sách đơn hàng', 'error');
    } finally {
      this.state.isLoading = false;
      this.hideLoadingState();
    }
  }
  
  applyFiltersAndSort() {
    let filtered = [...this.state.orders];
    
    // Apply search
    if (this.state.searchQuery.trim()) {
      const query = this.state.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.customerName.toLowerCase().includes(query) ||
        order.customerPhone.includes(query) ||
        order.id.toString().includes(query)
      );
    }
    
    // Apply filters
    if (this.state.filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === this.state.filters.status);
    }
    
    if (this.state.filters.dateRange !== 'all') {
      filtered = this.filterByDateRange(filtered, this.state.filters.dateRange);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = this.getSortValue(a, this.state.sortBy);
      const bVal = this.getSortValue(b, this.state.sortBy);
      
      if (this.state.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    this.state.filteredOrders = filtered;
    this.updatePagination();
  }
  
  filterByDateRange(orders, range) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return orders.filter(order => {
      const orderDate = new Date(order.appointmentTime || order.createdAt);
      const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
      
      switch (range) {
        case 'today':
          return orderDay.getTime() === today.getTime();
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return orderDay.getTime() === yesterday.getTime();
        case 'this_week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          return orderDate >= weekStart && orderDate <= now;
        case 'last_week':
          const lastWeekStart = new Date(today);
          lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
          const lastWeekEnd = new Date(lastWeekStart);
          lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
          return orderDate >= lastWeekStart && orderDate <= lastWeekEnd;
        case 'this_month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          return orderDate >= monthStart && orderDate <= now;
        case 'last_month':
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          return orderDate >= lastMonthStart && orderDate <= lastMonthEnd;
        default:
          return true;
      }
    });
  }
  
  getSortValue(order, sortBy) {
    switch (sortBy) {
      case 'id':
        return order.id;
      case 'customerName':
        return order.customerName.toLowerCase();
      case 'finalAmount':
        return order.finalAmount;
      case 'appointmentTime':
        return new Date(order.appointmentTime);
      case 'status':
        return order.status;
      case 'createdAt':
      default:
        return new Date(order.createdAt);
    }
  }
  
  updatePagination() {
    this.state.totalPages = Math.ceil(this.state.filteredOrders.length / this.options.pageSize);
    this.state.currentPage = Math.min(this.state.currentPage, this.state.totalPages || 1);
    this.renderPagination();
  }
  
  renderOrders() {
    const tbody = this.container.querySelector('.orders-tbody');
    const startIndex = (this.state.currentPage - 1) * this.options.pageSize;
    const endIndex = startIndex + this.options.pageSize;
    const pageOrders = this.state.filteredOrders.slice(startIndex, endIndex);
    
    if (pageOrders.length === 0) {
      this.showEmptyState();
      tbody.innerHTML = '';
      return;
    }
    
    this.hideEmptyState();
    tbody.innerHTML = pageOrders.map(order => this.renderOrderRow(order)).join('');
    
    // Update sort indicators
    this.updateSortIndicators();
  }
  
  renderOrderRow(order) {
    const status = this.statusConfig[order.status] || this.statusConfig.pending;
    const isSelected = this.state.selectedOrders.has(order.id);
    
    return `
      <tr class="order-row hover:bg-gray-50 ${isSelected ? 'selected bg-purple-50' : ''}" data-order-id="${order.id}">
        ${this.options.enableSelection ? `
          <td class="table-td">
            <input type="checkbox" class="order-checkbox" value="${order.id}" ${isSelected ? 'checked' : ''}>
          </td>
        ` : ''}
        
        <td class="table-td">
          <div class="font-medium text-gray-900">#${order.id}</div>
          <div class="text-sm text-gray-500">${Utils.formatDate(order.createdAt)}</div>
        </td>
        
        <td class="table-td">
          <div class="font-medium text-gray-900">${order.customerName}</div>
          <div class="text-sm text-gray-500">${order.customerPhone}</div>
        </td>
        
        <td class="table-td">
          <div class="services-preview">
            ${order.services.slice(0, 2).map(service => 
              `<span class="service-tag">${service.name}</span>`
            ).join('')}
            ${order.services.length > 2 ? `<span class="text-sm text-gray-500">+${order.services.length - 2} khác</span>` : ''}
          </div>
        </td>
        
        <td class="table-td">
          <div class="font-medium text-gray-900">${this.formatCurrency(order.finalAmount)}</div>
          ${order.discount > 0 ? `<div class="text-sm text-gray-500">Giảm: ${this.formatCurrency(order.discount)}</div>` : ''}
        </td>
        
        <td class="table-td">
          <div class="text-gray-900">${Utils.formatDateTime(order.appointmentTime)}</div>
        </td>
        
        <td class="table-td">
          <span class="status-badge ${status.color} ${status.class}">${status.label}</span>
        </td>
        
        <td class="table-td">
          <div class="flex items-center space-x-2">
            <button class="btn-icon btn-view" data-order-id="${order.id}" title="Xem chi tiết">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            </button>
            
            <button class="btn-icon btn-edit" data-order-id="${order.id}" title="Chỉnh sửa">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            
            <div class="dropdown relative">
              <button class="btn-icon dropdown-toggle" data-order-id="${order.id}" title="Thao tác khác">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                </svg>
              </button>
              
              <div class="dropdown-menu hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10 border border-gray-200">
                ${this.renderOrderActions(order)}
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }
  
  renderOrderActions(order) {
    const actions = [];
    
    // Status-based actions
    switch (order.status) {
      case 'pending':
        actions.push({ action: 'confirm', label: 'Xác nhận đơn', icon: 'check' });
        actions.push({ action: 'cancel', label: 'Hủy đơn', icon: 'x', destructive: true });
        break;
      case 'confirmed':
        actions.push({ action: 'start', label: 'Bắt đầu thực hiện', icon: 'play' });
        actions.push({ action: 'cancel', label: 'Hủy đơn', icon: 'x', destructive: true });
        break;
      case 'in_progress':
        actions.push({ action: 'complete', label: 'Hoàn thành', icon: 'check' });
        break;
      case 'draft':
        actions.push({ action: 'activate', label: 'Kích hoạt đơn', icon: 'play' });
        actions.push({ action: 'delete', label: 'Xóa nháp', icon: 'trash', destructive: true });
        break;
    }
    
    // Common actions
    actions.push({ action: 'duplicate', label: 'Nhân bản đơn', icon: 'copy' });
    
    if (order.status !== 'draft') {
      actions.push({ action: 'print', label: 'In đơn hàng', icon: 'printer' });
    }
    
    return actions.map(({ action, label, icon, destructive }) => `
      <button class="dropdown-item ${destructive ? 'text-red-600 hover:bg-red-50' : ''}" data-action="${action}" data-order-id="${order.id}">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          ${this.getActionIcon(icon)}
        </svg>
        ${label}
      </button>
    `).join('');
  }
  
  getActionIcon(icon) {
    const icons = {
      check: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>',
      x: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>',
      play: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15a2 2 0 002-2V9a2 2 0 00-2-2h-1.586l-2.414-2.414A1 1 0 0012.293 4H11a2 2 0 00-2 2v5z"></path>',
      copy: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>',
      trash: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>',
      printer: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>'
    };
    return icons[icon] || '';
  }
  
  renderPagination() {
    const container = this.container.querySelector('.pagination-container');
    
    if (this.state.totalPages <= 1) {
      container.innerHTML = '';
      return;
    }
    
    const currentPage = this.state.currentPage;
    const totalPages = this.state.totalPages;
    
    container.innerHTML = `
      <div class="pagination bg-white rounded-lg shadow-sm p-4">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-600">
            Hiển thị ${((currentPage - 1) * this.options.pageSize) + 1} - 
            ${Math.min(currentPage * this.options.pageSize, this.state.filteredOrders.length)} 
            trong tổng số ${this.state.filteredOrders.length} đơn hàng
          </div>
          
          <div class="flex items-center space-x-2">
            <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" data-page="prev">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            
            ${this.renderPaginationNumbers()}
            
            <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" data-page="next">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  renderPaginationNumbers() {
    const current = this.state.currentPage;
    const total = this.state.totalPages;
    const pages = [];
    
    // Always show first page
    if (current > 3) {
      pages.push(1);
      if (current > 4) pages.push('...');
    }
    
    // Show pages around current
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
      pages.push(i);
    }
    
    // Always show last page
    if (current < total - 2) {
      if (current < total - 3) pages.push('...');
      pages.push(total);
    }
    
    return pages.map(page => {
      if (page === '...') {
        return '<span class="pagination-ellipsis">...</span>';
      }
      return `
        <button class="pagination-btn ${page === current ? 'active' : ''}" data-page="${page}">
          ${page}
        </button>
      `;
    }).join('');
  }
  
  bindEvents() {
    // New order button
    this.container.querySelector('.btn-new-order').addEventListener('click', () => {
      this.showOrderForm();
    });
    
    // Refresh button
    this.container.querySelector('.btn-refresh').addEventListener('click', () => {
      this.loadOrders();
    });
    
    // Search input
    const searchInput = this.container.querySelector('.search-input');
    if (searchInput) {
      let searchTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          this.state.searchQuery = e.target.value;
          this.handleSearch();
        }, 500);
      });
    }
    
    // Filter selects
    this.container.querySelectorAll('.filter-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const filter = e.target.dataset.filter;
        this.state.filters[filter] = e.target.value;
        this.applyFiltersAndSort();
        this.renderOrders();
      });
    });
    
    // Reset filters
    this.container.querySelector('.btn-reset-filters').addEventListener('click', () => {
      this.resetFilters();
    });
    
    // Table sorting
    this.container.querySelectorAll('.sortable').forEach(header => {
      header.addEventListener('click', (e) => {
        const sortBy = e.currentTarget.dataset.sort;
        this.handleSort(sortBy);
      });
    });
    
    // Select all checkbox
    const selectAllCheckbox = this.container.querySelector('.select-all-checkbox');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        this.handleSelectAll(e.target.checked);
      });
    }
    
    // Bulk actions
    this.bindBulkActionEvents();
    
    // Row actions
    this.bindRowActionEvents();
    
    // Pagination
    this.bindPaginationEvents();
    
    // Modal events
    this.bindModalEvents();
  }
  
  bindBulkActionEvents() {
    const bulkActionSelect = this.container.querySelector('.bulk-action-select');
    const applyBulkBtn = this.container.querySelector('.btn-apply-bulk');
    
    if (bulkActionSelect) {
      bulkActionSelect.addEventListener('change', () => {
        applyBulkBtn.disabled = !bulkActionSelect.value;
      });
    }
    
    if (applyBulkBtn) {
      applyBulkBtn.addEventListener('click', () => {
        this.handleBulkAction(bulkActionSelect.value);
      });
    }
  }
  
  bindRowActionEvents() {
    // Delegate event handling for dynamic content
    this.container.addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;
      
      const orderId = target.dataset.orderId;
      
      if (target.classList.contains('btn-view')) {
        this.showOrderDetails(orderId);
      } else if (target.classList.contains('btn-edit')) {
        this.showOrderForm('edit', orderId);
      } else if (target.classList.contains('dropdown-toggle')) {
        this.toggleDropdown(target);
      } else if (target.classList.contains('dropdown-item')) {
        const action = target.dataset.action;
        this.handleOrderAction(action, orderId);
      } else if (target.classList.contains('btn-create-first')) {
        this.showOrderForm();
      }
    });
    
    // Row selection
    this.container.addEventListener('change', (e) => {
      if (e.target.classList.contains('order-checkbox')) {
        this.handleRowSelection(e.target);
      }
    });
  }
  
  bindPaginationEvents() {
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.pagination-btn')) {
        const btn = e.target.closest('.pagination-btn');
        if (btn.classList.contains('disabled')) return;
        
        const page = btn.dataset.page;
        this.handlePaginationClick(page);
      }
    });
  }
  
  bindModalEvents() {
    // Close modal on backdrop click
    this.container.querySelector('.order-details-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hideOrderDetails();
      }
    });
  }
  
  handleSearch() {
    const clearBtn = this.container.querySelector('.clear-search');
    if (this.state.searchQuery) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
    
    this.state.currentPage = 1;
    this.applyFiltersAndSort();
    this.renderOrders();
  }
  
  resetFilters() {
    this.state.searchQuery = '';
    this.state.filters = {
      status: 'all',
      dateRange: 'all',
      service: 'all',
      customer: ''
    };
    this.state.currentPage = 1;
    
    // Reset UI
    this.container.querySelector('.search-input').value = '';
    this.container.querySelector('.clear-search').classList.add('hidden');
    this.container.querySelectorAll('.filter-select').forEach(select => {
      select.value = 'all';
    });
    
    this.applyFiltersAndSort();
    this.renderOrders();
  }
  
  handleSort(sortBy) {
    if (this.state.sortBy === sortBy) {
      this.state.sortOrder = this.state.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.state.sortBy = sortBy;
      this.state.sortOrder = 'asc';
    }
    
    this.applyFiltersAndSort();
    this.renderOrders();
  }
  
  updateSortIndicators() {
    this.container.querySelectorAll('.sortable').forEach(header => {
      const sortBy = header.dataset.sort;
      const icon = header.querySelector('.sort-icon');
      
      if (sortBy === this.state.sortBy) {
        header.classList.add('sorted');
        icon.classList.add(this.state.sortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
      } else {
        header.classList.remove('sorted');
        icon.classList.remove('sort-asc', 'sort-desc');
      }
    });
  }
  
  handleSelectAll(checked) {
    const checkboxes = this.container.querySelectorAll('.order-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = checked;
      const orderId = parseInt(checkbox.value);
      
      if (checked) {
        this.state.selectedOrders.add(orderId);
      } else {
        this.state.selectedOrders.delete(orderId);
      }
    });
    
    this.updateBulkActions();
    this.updateRowSelection();
  }
  
  handleRowSelection(checkbox) {
    const orderId = parseInt(checkbox.value);
    
    if (checkbox.checked) {
      this.state.selectedOrders.add(orderId);
    } else {
      this.state.selectedOrders.delete(orderId);
    }
    
    this.updateBulkActions();
    this.updateRowSelection();
  }
  
  updateBulkActions() {
    const bulkActions = this.container.querySelector('.bulk-actions');
    const selectedCount = this.container.querySelector('.selected-count strong');
    const selectAllCheckbox = this.container.querySelector('.select-all-checkbox');
    
    const count = this.state.selectedOrders.size;
    
    if (count > 0) {
      bulkActions.classList.remove('hidden');
      selectedCount.textContent = count;
    } else {
      bulkActions.classList.add('hidden');
    }
    
    // Update select all checkbox state
    const totalVisible = this.container.querySelectorAll('.order-checkbox').length;
    if (count === 0) {
      selectAllCheckbox.indeterminate = false;
      selectAllCheckbox.checked = false;
    } else if (count === totalVisible) {
      selectAllCheckbox.indeterminate = false;
      selectAllCheckbox.checked = true;
    } else {
      selectAllCheckbox.indeterminate = true;
    }
  }
  
  updateRowSelection() {
    this.container.querySelectorAll('.order-row').forEach(row => {
      const orderId = parseInt(row.dataset.orderId);
      const isSelected = this.state.selectedOrders.has(orderId);
      
      if (isSelected) {
        row.classList.add('selected', 'bg-purple-50');
      } else {
        row.classList.remove('selected', 'bg-purple-50');
      }
    });
  }
  
  async handleBulkAction(action) {
    if (!action || this.state.selectedOrders.size === 0) return;
    
    const orderIds = Array.from(this.state.selectedOrders);
    const confirmMsg = this.getBulkActionConfirmMessage(action, orderIds.length);
    
    if (confirmMsg && !confirm(confirmMsg)) return;
    
    try {
      await this.executeBulkAction(action, orderIds);
      NotificationService.show(`Đã ${this.getBulkActionSuccessMessage(action)} ${orderIds.length} đơn hàng`, 'success');
      
      // Clear selection and reload
      this.state.selectedOrders.clear();
      this.updateBulkActions();
      await this.loadOrders();
      
    } catch (error) {
      console.error('Bulk action error:', error);
      NotificationService.show(`Lỗi thực hiện hành động: ${error.message}`, 'error');
    }
  }
  
  getBulkActionConfirmMessage(action, count) {
    const messages = {
      delete: `Bạn có chắc muốn xóa ${count} đơn hàng? Hành động này không thể hoàn tác.`,
      cancel: `Bạn có chắc muốn hủy ${count} đơn hàng?`
    };
    return messages[action];
  }
  
  getBulkActionSuccessMessage(action) {
    const messages = {
      confirm: 'xác nhận',
      start: 'bắt đầu thực hiện',
      complete: 'hoàn thành',
      cancel: 'hủy',
      delete: 'xóa'
    };
    return messages[action] || 'cập nhật';
  }
  
  async executeBulkAction(action, orderIds) {
    const promises = orderIds.map(id => {
      switch (action) {
        case 'confirm':
          return OrderService.updateOrderStatus(id, 'confirmed');
        case 'start':
          return OrderService.updateOrderStatus(id, 'in_progress');
        case 'complete':
          return OrderService.updateOrderStatus(id, 'completed');
        case 'cancel':
          return OrderService.updateOrderStatus(id, 'cancelled');
        case 'delete':
          return OrderService.deleteOrder(id);
        default:
          throw new Error('Invalid action');
      }
    });
    
    await Promise.all(promises);
  }
  
  toggleDropdown(button) {
    // Close all other dropdowns
    this.container.querySelectorAll('.dropdown-menu').forEach(menu => {
      if (menu !== button.nextElementSibling) {
        menu.classList.add('hidden');
      }
    });
    
    // Toggle current dropdown
    const menu = button.nextElementSibling;
    menu.classList.toggle('hidden');
    
    // Close dropdown when clicking outside
    if (!menu.classList.contains('hidden')) {
      const closeDropdown = (e) => {
        if (!button.contains(e.target) && !menu.contains(e.target)) {
          menu.classList.add('hidden');
          document.removeEventListener('click', closeDropdown);
        }
      };
      setTimeout(() => document.addEventListener('click', closeDropdown), 0);
    }
  }
  
  async handleOrderAction(action, orderId) {
    try {
      let confirmMsg = '';
      
      switch (action) {
        case 'confirm':
          await OrderService.updateOrderStatus(orderId, 'confirmed');
          NotificationService.show('Đã xác nhận đơn hàng', 'success');
          break;
        case 'start':
          await OrderService.updateOrderStatus(orderId, 'in_progress');
          NotificationService.show('Đã bắt đầu thực hiện đơn hàng', 'success');
          break;
        case 'complete':
          await OrderService.updateOrderStatus(orderId, 'completed');
          NotificationService.show('Đã hoàn thành đơn hàng', 'success');
          break;
        case 'cancel':
          confirmMsg = 'Bạn có chắc muốn hủy đơn hàng này?';
          if (confirm(confirmMsg)) {
            await OrderService.updateOrderStatus(orderId, 'cancelled');
            NotificationService.show('Đã hủy đơn hàng', 'success');
          }
          return;
        case 'delete':
          confirmMsg = 'Bạn có chắc muốn xóa đơn hàng này? Hành động này không thể hoàn tác.';
          if (confirm(confirmMsg)) {
            await OrderService.deleteOrder(orderId);
            NotificationService.show('Đã xóa đơn hàng', 'success');
          }
          return;
        case 'duplicate':
          const order = await OrderService.getOrder(orderId);
          this.showOrderForm('create', null, order);
          return;
        case 'print':
          this.printOrder(orderId);
          return;
        case 'activate':
          await OrderService.updateOrderStatus(orderId, 'pending');
          NotificationService.show('Đã kích hoạt đơn hàng', 'success');
          break;
        default:
          return;
      }
      
      await this.loadOrders();
      
    } catch (error) {
      console.error('Order action error:', error);
      NotificationService.show(`Lỗi thực hiện hành động: ${error.message}`, 'error');
    }
  }
  
  handlePaginationClick(page) {
    if (page === 'prev') {
      this.state.currentPage = Math.max(1, this.state.currentPage - 1);
    } else if (page === 'next') {
      this.state.currentPage = Math.min(this.state.totalPages, this.state.currentPage + 1);
    } else {
      this.state.currentPage = parseInt(page);
    }
    
    this.renderOrders();
    this.renderPagination();
  }
  
  async showOrderDetails(orderId) {
    try {
      const order = await OrderService.getOrder(orderId);
      const modal = this.container.querySelector('.order-details-modal');
      const content = modal.querySelector('.modal-content');
      
      content.innerHTML = `
        <div class="order-details">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-semibold">Chi tiết đơn hàng #${order.id}</h3>
            <button class="btn-close-modal text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div>
                <h4 class="font-medium text-gray-900 mb-2">Thông tin khách hàng</h4>
                <div class="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div><strong>Tên:</strong> ${order.customerName}</div>
                  <div><strong>SĐT:</strong> ${order.customerPhone}</div>
                </div>
              </div>
              
              <div>
                <h4 class="font-medium text-gray-900 mb-2">Dịch vụ</h4>
                <div class="bg-gray-50 rounded-lg p-4 space-y-2">
                  ${order.services.map(service => `
                    <div class="flex justify-between">
                      <span>${service.name}</span>
                      <span>${this.formatCurrency(service.price)}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
            
            <div class="space-y-4">
              <div>
                <h4 class="font-medium text-gray-900 mb-2">Thông tin đơn hàng</h4>
                <div class="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div><strong>Trạng thái:</strong> ${this.statusConfig[order.status]?.label}</div>
                  <div><strong>Thời gian hẹn:</strong> ${Utils.formatDateTime(order.appointmentTime)}</div>
                  <div><strong>Tạo lúc:</strong> ${Utils.formatDateTime(order.createdAt)}</div>
                  <div><strong>Cập nhật:</strong> ${Utils.formatDateTime(order.updatedAt)}</div>
                </div>
              </div>
              
              <div>
                <h4 class="font-medium text-gray-900 mb-2">Thanh toán</h4>
                <div class="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div class="flex justify-between">
                    <span>Tổng tiền:</span>
                    <span>${this.formatCurrency(order.totalAmount)}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Giảm giá:</span>
                    <span>-${this.formatCurrency(order.discount)}</span>
                  </div>
                  <div class="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Thành tiền:</span>
                    <span class="text-purple-600">${this.formatCurrency(order.finalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          ${order.notes ? `
            <div class="mt-6">
              <h4 class="font-medium text-gray-900 mb-2">Ghi chú</h4>
              <div class="bg-gray-50 rounded-lg p-4">
                ${order.notes}
              </div>
            </div>
          ` : ''}
          
          <div class="mt-6 flex justify-end space-x-3">
            <button class="btn-outline btn-close-modal">Đóng</button>
            <button class="btn-primary" onclick="window.orderList.showOrderForm('edit', '${order.id}')">Chỉnh sửa</button>
          </div>
        </div>
      `;
      
      // Bind close events
      content.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => this.hideOrderDetails());
      });
      
      modal.classList.remove('hidden');
      
    } catch (error) {
      console.error('Show order details error:', error);
      NotificationService.show('Lỗi tải chi tiết đơn hàng', 'error');
    }
  }
  
  hideOrderDetails() {
    this.container.querySelector('.order-details-modal').classList.add('hidden');
  }
  
  showOrderForm(mode = 'create', orderId = null, templateOrder = null) {
    EventBus.emit('show:order-form', {
      mode,
      orderId,
      templateOrder
    });
  }
  
  printOrder(orderId) {
    // Implement print functionality
    NotificationService.show('Tính năng in đang được phát triển', 'info');
  }
  
  showLoadingState() {
    this.container.querySelector('.loading-state').classList.remove('hidden');
    this.container.querySelector('.orders-table-container .table-responsive').classList.add('hidden');
    this.container.querySelector('.loading-indicator').classList.remove('hidden');
    
    const refreshIcon = this.container.querySelector('.refresh-icon');
    refreshIcon.classList.add('animate-spin');
  }
  
  hideLoadingState() {
    this.container.querySelector('.loading-state').classList.add('hidden');
    this.container.querySelector('.orders-table-container .table-responsive').classList.remove('hidden');
    this.container.querySelector('.loading-indicator').classList.add('hidden');
    
    const refreshIcon = this.container.querySelector('.refresh-icon');
    refreshIcon.classList.remove('animate-spin');
  }
  
  showEmptyState() {
    this.container.querySelector('.empty-state').classList.remove('hidden');
    this.container.querySelector('.orders-table-container .table-responsive').classList.add('hidden');
  }
  
  hideEmptyState() {
    this.container.querySelector('.empty-state').classList.add('hidden');
    this.container.querySelector('.orders-table-container .table-responsive').classList.remove('hidden');
  }
  
  setupAutoRefresh() {
    if (!this.options.autoRefresh) return;
    
    this.refreshTimer = setInterval(() => {
      if (!document.hidden) {
        this.loadOrders();
      }
    }, this.options.refreshInterval);
  }
  
  formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }
  
  destroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
    EventBus.emit('list:destroyed', { component: 'OrderList' });
  }
}

// Make it globally available for modal callbacks
window.orderList = null;
