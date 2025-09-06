/**
 * Order Module for Hair Salon Management System
 * Contains business logic for order management
 * 
 * @version 1.0.0
 */

const OrderModule = {
  
  // =============  ORDER OPERATIONS =============
  
  /**
   * Create new order
   */
  async createOrder(orderData) {
    try {
      State.setLoading('submit', true);
      
      // Validate order data
      const validation = this.validateOrderData(orderData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      
      // Sanitize data
      const sanitizedData = this.sanitizeOrderData(orderData);
      
      // Add metadata
      const orderToCreate = {
        ...sanitizedData,
        timestamp: new Date().toISOString(),
        staff: State.get('user.email'),
        id: Utils.generateId('ORD')
      };
      
      // Try to create order via API
      let response;
      try {
        response = await API.createOrder(orderToCreate);
        
        if (response.success) {
          // Show success notification
          Notification.success(
            `Đã tạo đơn hàng ${orderToCreate.service} - ${Utils.formatCurrency(orderToCreate.price)}`,
            { duration: 3000 }
          );
          
          // Reset form
          State.resetForm();
          
          // Update statistics
          this.updateLocalStats();
          
          return response.data;
        } else {
          throw new Error(response.error || 'Tạo đơn hàng thất bại');
        }
        
      } catch (apiError) {
        // If offline or API error, add to offline queue
        if (!State.get('ui.isOnline') || apiError.code === 0) {
          State.addToOfflineQueue({
            action: 'createOrder',
            data: orderToCreate
          });
          
          // Add to local state immediately for better UX
          State.addOrder({
            ...orderToCreate,
            status: 'pending'
          });
          
          Notification.info(
            'Không có kết nối. Đơn hàng đã được lưu và sẽ đồng bộ khi có mạng.',
            { duration: 4000 }
          );
          
          // Reset form
          State.resetForm();
          return orderToCreate;
        } else {
          throw apiError;
        }
      }
      
    } catch (error) {
      console.error('Create order failed:', error);
      
      Notification.error(
        `Tạo đơn hàng thất bại: ${error.message}`,
        { duration: 5000 }
      );
      
      State.setFormErrors({
        general: error.message
      });
      
      throw error;
      
    } finally {
      State.setLoading('submit', false);
    }
  },
  
  /**
   * Update existing order
   */
  async updateOrder(orderId, updates) {
    try {
      State.setLoading('submit', true);
      
      // Validate updates
      const validation = this.validateOrderData(updates, true);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      
      // Sanitize updates
      const sanitizedUpdates = this.sanitizeOrderData(updates);
      
      // Try to update order via API
      try {
        const response = await API.updateOrder(orderId, sanitizedUpdates);
        
        if (response.success) {
          Notification.success('Cập nhật đơn hàng thành công', { duration: 2000 });
          return response.data;
        } else {
          throw new Error(response.error || 'Cập nhật thất bại');
        }
        
      } catch (apiError) {
        // If offline, add to offline queue
        if (!State.get('ui.isOnline') || apiError.code === 0) {
          State.addToOfflineQueue({
            action: 'updateOrder',
            data: { id: orderId, updates: sanitizedUpdates }
          });
          
          // Update local state immediately
          State.updateOrder(orderId, {
            ...sanitizedUpdates,
            status: 'pending'
          });
          
          Notification.info(
            'Không có kết nối. Cập nhật đã được lưu và sẽ đồng bộ khi có mạng.',
            { duration: 4000 }
          );
          
          return { id: orderId, ...sanitizedUpdates };
        } else {
          throw apiError;
        }
      }
      
    } catch (error) {
      console.error('Update order failed:', error);
      
      Notification.error(
        `Cập nhật đơn hàng thất bại: ${error.message}`,
        { duration: 5000 }
      );
      
      throw error;
      
    } finally {
      State.setLoading('submit', false);
    }
  },
  
  /**
   * Delete order
   */
  async deleteOrder(orderId) {
    try {
      // Show confirmation dialog
      const confirmed = await this.showDeleteConfirmation(orderId);
      if (!confirmed) {
        return false;
      }
      
      State.setLoading('submit', true);
      
      // Try to delete order via API
      try {
        const response = await API.deleteOrder(orderId);
        
        if (response.success) {
          Notification.success('Đã xóa đơn hàng', { duration: 2000 });
          
          // Update statistics
          this.updateLocalStats();
          
          return true;
        } else {
          throw new Error(response.error || 'Xóa đơn hàng thất bại');
        }
        
      } catch (apiError) {
        // If offline, add to offline queue
        if (!State.get('ui.isOnline') || apiError.code === 0) {
          State.addToOfflineQueue({
            action: 'deleteOrder',
            data: { id: orderId }
          });
          
          // Remove from local state immediately
          State.removeOrder(orderId);
          
          Notification.info(
            'Không có kết nối. Xóa đơn hàng đã được lưu và sẽ đồng bộ khi có mạng.',
            { duration: 4000 }
          );
          
          return true;
        } else {
          throw apiError;
        }
      }
      
    } catch (error) {
      console.error('Delete order failed:', error);
      
      Notification.error(
        `Xóa đơn hàng thất bại: ${error.message}`,
        { duration: 5000 }
      );
      
      throw error;
      
    } finally {
      State.setLoading('submit', false);
    }
  },
  
  /**
   * Load orders with filters
   */
  async loadOrders(filters = {}) {
    try {
      State.setOrdersLoading(true);
      
      // Get default filters from state
      const currentFilters = State.get('orders.filter') || {};
      const mergedFilters = { ...currentFilters, ...filters };
      
      // Update filter state
      State.set('orders.filter', mergedFilters);
      
      // Try to load from API
      try {
        const response = await API.getOrders(mergedFilters);
        
        if (response.success) {
          // Orders are automatically updated in state by API service
          console.log(`📥 Loaded ${response.data.length} orders`);
          return response.data;
        } else {
          throw new Error(response.error || 'Tải đơn hàng thất bại');
        }
        
      } catch (apiError) {
        // If offline, load from local storage
        if (!State.get('ui.isOnline') || apiError.code === 0) {
          const localOrders = await this.loadOrdersFromCache(mergedFilters);
          State.setOrders(localOrders);
          
          if (localOrders.length > 0) {
            Notification.info(
              `Đã tải ${localOrders.length} đơn hàng từ bộ nhớ cục bộ`,
              { duration: 3000 }
            );
          }
          
          return localOrders;
        } else {
          throw apiError;
        }
      }
      
    } catch (error) {
      console.error('Load orders failed:', error);
      
      State.setOrdersLoading(false, error.message);
      
      Notification.error(
        `Tải đơn hàng thất bại: ${error.message}`,
        { duration: 5000 }
      );
      
      return [];
      
    } finally {
      State.setOrdersLoading(false);
    }
  },
  
  /**
   * Load today's orders
   */
  async loadTodayOrders() {
    const today = Utils.getTodayString();
    return this.loadOrders({ date: today });
  },
  
  /**
   * Refresh orders
   */
  async refreshOrders() {
    const currentFilters = State.get('orders.filter') || {};
    return this.loadOrders(currentFilters);
  },
  
  // =============  VALIDATION & SANITIZATION =============
  
  /**
   * Validate order data
   */
  validateOrderData(data, isUpdate = false) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    // Required field validation for new orders
    if (!isUpdate) {
      if (!data.service || data.service.trim() === '') {
        result.errors.push('Vui lòng chọn dịch vụ');
        result.isValid = false;
      }
      
      if (!data.price && data.price !== 0) {
        result.errors.push('Vui lòng nhập giá tiền');
        result.isValid = false;
      }
    }
    
    // Service validation
    if (data.service) {
      const service = data.service.trim();
      
      if (service !== 'Khác' && !CONFIG.SERVICES.includes(service)) {
        result.errors.push('Dịch vụ không hợp lệ');
        result.isValid = false;
      }
      
      if (service.length > 100) {
        result.errors.push('Tên dịch vụ quá dài (tối đa 100 ký tự)');
        result.isValid = false;
      }
    }
    
    // Price validation
    if (data.price !== undefined && data.price !== null) {
      const price = Utils.parseNumber(data.price);
      
      if (isNaN(price) || price < 0) {
        result.errors.push('Giá tiền không hợp lệ');
        result.isValid = false;
      } else {
        // Check price range
        if (price > CONFIG.PRICE.MAX) {
          result.errors.push(`Giá tiền không được vượt quá ${Utils.formatCurrency(CONFIG.PRICE.MAX)}`);
          result.isValid = false;
        }
        
        // Price warnings
        const priceValidation = Utils.validatePrice(price);
        if (priceValidation.isTooLow) {
          result.warnings.push('Giá tiền có vẻ thấp');
        } else if (priceValidation.isTooHigh) {
          result.warnings.push('Giá tiền có vẻ cao');
        }
      }
    }
    
    // Note validation
    if (data.note && data.note.length > CONFIG.FORM.MAX_NOTE_LENGTH) {
      result.errors.push(`Ghi chú quá dài (tối đa ${CONFIG.FORM.MAX_NOTE_LENGTH} ký tự)`);
      result.isValid = false;
    }
    
    // Custom service validation
    if (data.service === 'Khác') {
      if (!data.customService || data.customService.trim() === '') {
        result.errors.push('Vui lòng nhập tên dịch vụ khác');
        result.isValid = false;
      } else if (data.customService.length > 100) {
        result.errors.push('Tên dịch vụ khác quá dài (tối đa 100 ký tự)');
        result.isValid = false;
      }
    }
    
    return result;
  },
  
  /**
   * Sanitize order data
   */
  sanitizeOrderData(data) {
    const sanitized = {};
    
    if (data.service) {
      sanitized.service = data.service.trim();
      
      // Use custom service if "Khác" is selected
      if (sanitized.service === 'Khác' && data.customService) {
        sanitized.service = data.customService.trim();
      }
    }
    
    if (data.price !== undefined && data.price !== null) {
      sanitized.price = Utils.parseNumber(data.price);
    }
    
    if (data.note) {
      sanitized.note = data.note.trim().substring(0, CONFIG.FORM.MAX_NOTE_LENGTH);
    }
    
    return sanitized;
  },
  
  // =============  CACHING & OFFLINE SUPPORT =============
  
  /**
   * Load orders from cache
   */
  async loadOrdersFromCache(filters) {
    try {
      const cachedOrders = await Storage.getStoredOrders();
      
      if (!cachedOrders.length) {
        return [];
      }
      
      // Apply filters
      let filteredOrders = cachedOrders;
      
      // Filter by staff
      const currentUser = State.get('user.email');
      if (filters.staff !== null) {
        const staffEmail = filters.staff || currentUser;
        filteredOrders = filteredOrders.filter(order => order.staff === staffEmail);
      }
      
      // Filter by date
      if (filters.date) {
        filteredOrders = filteredOrders.filter(order => {
          const orderDate = new Date(order.timestamp).toISOString().split('T')[0];
          return orderDate === filters.date;
        });
      }
      
      // Filter by service
      if (filters.service) {
        filteredOrders = filteredOrders.filter(order => order.service === filters.service);
      }
      
      // Filter by status (default: active only)
      const status = filters.status || 'Active';
      filteredOrders = filteredOrders.filter(order => order.status === status);
      
      // Sort orders
      const sortBy = filters.sortBy || 'timestamp';
      const sortOrder = filters.sortOrder || 'desc';
      filteredOrders = Utils.sortBy(filteredOrders, sortBy, sortOrder);
      
      return filteredOrders;
      
    } catch (error) {
      console.error('Failed to load orders from cache:', error);
      return [];
    }
  },
  
  /**
   * Cache orders for offline use
   */
  async cacheOrders(orders) {
    try {
      await Storage.storeOrders(orders);
      console.log(`💾 Cached ${orders.length} orders for offline use`);
    } catch (error) {
      console.error('Failed to cache orders:', error);
    }
  },
  
  // =============  STATISTICS & ANALYTICS =============
  
  /**
   * Update local statistics
   */
  updateLocalStats() {
    const todayOrders = State.get('orders.todayOrders') || [];
    State.updateTodayStats(todayOrders);
  },
  
  /**
   * Get order statistics
   */
  getOrderStats(orders = null) {
    const orderList = orders || State.get('orders.list') || [];
    
    const stats = {
      total: orderList.length,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      serviceBreakdown: {},
      hourlyDistribution: {},
      dailyDistribution: {}
    };
    
    const now = new Date();
    const today = now.toDateString();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    orderList.forEach(order => {
      const orderDate = new Date(order.timestamp);
      const price = parseInt(order.price) || 0;
      
      stats.totalRevenue += price;
      
      // Time-based counts
      if (orderDate.toDateString() === today) {
        stats.today++;
      }
      
      if (orderDate >= weekStart) {
        stats.thisWeek++;
      }
      
      if (orderDate >= monthStart) {
        stats.thisMonth++;
      }
      
      // Service breakdown
      const service = order.service;
      if (!stats.serviceBreakdown[service]) {
        stats.serviceBreakdown[service] = { count: 0, revenue: 0 };
      }
      stats.serviceBreakdown[service].count++;
      stats.serviceBreakdown[service].revenue += price;
      
      // Hourly distribution
      const hour = orderDate.getHours();
      if (!stats.hourlyDistribution[hour]) {
        stats.hourlyDistribution[hour] = 0;
      }
      stats.hourlyDistribution[hour]++;
      
      // Daily distribution (day of week)
      const dayOfWeek = orderDate.getDay();
      if (!stats.dailyDistribution[dayOfWeek]) {
        stats.dailyDistribution[dayOfWeek] = 0;
      }
      stats.dailyDistribution[dayOfWeek]++;
    });
    
    // Calculate average
    stats.averageOrderValue = stats.total > 0 ? 
      Math.round(stats.totalRevenue / stats.total) : 0;
    
    return stats;
  },
  
  // =============  UI HELPERS =============
  
  /**
   * Show delete confirmation dialog
   */
  async showDeleteConfirmation(orderId) {
    const order = State.get('orders.list')?.find(o => o.id === orderId);
    
    if (!order) {
      return false;
    }
    
    const message = `Bạn có chắc chắn muốn xóa đơn hàng này?\n\n` +
      `Dịch vụ: ${order.service}\n` +
      `Giá: ${Utils.formatCurrency(order.price)}\n` +
      `Thời gian: ${Utils.formatDate(order.timestamp)}`;
    
    return confirm(message);
  },
  
  /**
   * Format order for display
   */
  formatOrderForDisplay(order) {
    return {
      ...order,
      formattedPrice: Utils.formatCurrency(order.price),
      formattedTime: Utils.formatDate(order.timestamp, 'time'),
      formattedDate: Utils.formatDate(order.timestamp, 'date'),
      relativeTime: Utils.formatDate(order.timestamp, 'relative'),
      isToday: Utils.isToday(order.timestamp),
      serviceIcon: CONFIG.SERVICE_ICONS[order.service] || '✨'
    };
  },
  
  /**
   * Get orders grouped by date
   */
  getOrdersGroupedByDate(orders = null) {
    const orderList = orders || State.get('orders.list') || [];
    return Utils.groupBy(orderList, order => {
      return new Date(order.timestamp).toDateString();
    });
  },
  
  /**
   * Search orders
   */
  searchOrders(query, orders = null) {
    if (!query || query.trim() === '') {
      return orders || State.get('orders.list') || [];
    }
    
    const orderList = orders || State.get('orders.list') || [];
    const searchTerm = query.toLowerCase().trim();
    
    return orderList.filter(order => {
      return (
        order.service.toLowerCase().includes(searchTerm) ||
        order.note.toLowerCase().includes(searchTerm) ||
        order.id.toLowerCase().includes(searchTerm) ||
        Utils.formatCurrency(order.price).includes(searchTerm) ||
        Utils.formatDate(order.timestamp).toLowerCase().includes(searchTerm)
      );
    });
  },
  
  // =============  EXPORT & IMPORT =============
  
  /**
   * Export orders to JSON
   */
  exportOrdersToJson(orders = null) {
    const orderList = orders || State.get('orders.list') || [];
    const exportData = {
      exportDate: new Date().toISOString(),
      totalOrders: orderList.length,
      orders: orderList.map(order => ({
        ...order,
        exportedBy: State.get('user.email')
      }))
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `salon-orders-${Utils.getTodayString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    Notification.success('Đã xuất dữ liệu đơn hàng', { duration: 2000 });
  },
  
  /**
   * Export orders to CSV
   */
  exportOrdersToCsv(orders = null) {
    const orderList = orders || State.get('orders.list') || [];
    
    if (orderList.length === 0) {
      Notification.warning('Không có đơn hàng để xuất', { duration: 3000 });
      return;
    }
    
    // CSV headers
    const headers = ['ID', 'Thời gian', 'Nhân viên', 'Dịch vụ', 'Giá tiền', 'Ghi chú', 'Trạng thái'];
    
    // CSV data
    const csvData = [
      headers.join(','),
      ...orderList.map(order => [
        order.id,
        Utils.formatDate(order.timestamp),
        order.staff,
        order.service,
        order.price,
        `"${order.note || ''}"`, // Wrap in quotes for CSV
        order.status
      ].join(','))
    ].join('\n');
    
    const dataUri = 'data:text/csv;charset=utf-8,'+ encodeURIComponent(csvData);
    const exportFileDefaultName = `salon-orders-${Utils.getTodayString()}.csv`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    Notification.success('Đã xuất dữ liệu đơn hàng', { duration: 2000 });
  }
};

// =============  AUTO-REFRESH SETUP =============

let autoRefreshInterval = null;

function setupAutoRefresh() {
  const settings = State.get('settings');
  
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
  
  if (settings.autoRefresh && State.get('user.isAuthenticated')) {
    autoRefreshInterval = setInterval(() => {
      if (!document.hidden && State.get('ui.isOnline')) {
        OrderModule.refreshOrders();
      }
    }, settings.refreshInterval || CONFIG.ORDER.REFRESH_INTERVAL);
  }
}

// Setup auto-refresh when user authenticates
State.subscribe('user.isAuthenticated', (isAuthenticated) => {
  if (isAuthenticated) {
    setupAutoRefresh();
  } else if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
});

// Update auto-refresh when settings change
State.subscribe('settings.autoRefresh', setupAutoRefresh);
State.subscribe('settings.refreshInterval', setupAutoRefresh);

// Make available globally
window.OrderModule = OrderModule;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrderModule;
}

console.log('📋 Order Module ready');
