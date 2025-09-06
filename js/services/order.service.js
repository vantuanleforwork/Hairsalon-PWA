/**
 * Order Service - Manages order operations
 * Version: 1.0.0
 * 
 * Features:
 * - CRUD operations for orders
 * - Offline support with background sync
 * - Status management
 * - Search and filtering
 * - Statistics
 */

import EventBus from '../core/eventBus.js';
import Utils from '../core/utils.js';
import API from './api.service.js';
import Storage from './storage.service.js';
// Maintain compatibility with existing references in this file
const APIService = API;
const StorageService = Storage;
import NotificationService from './notification.service.js';

export class OrderService {
  constructor() {
    this.orders = new Map();
    this.isOnline = navigator.onLine;
    this.pendingSync = new Set();
    this.init();
  }

  /**
   * Get recent N orders sorted by createdAt desc
   */
  async getRecentOrders(limit = 5) {
    try {
      const ordersArray = Array.from(this.orders.values());
      const sorted = ordersArray
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return sorted.slice(0, limit);
    } catch (error) {
      console.error('OrderService: getRecentOrders failed:', error);
      return [];
    }
  }

  async init() {
    console.log('OrderService: Initializing...');
    
    // Load cached orders
    await this.loadCachedOrders();
    
    // Setup event listeners
    this.bindEvents();
    
    // Sync with server if online
    if (this.isOnline) {
      await this.syncWithServer();
    }
    
    console.log('OrderService: Initialized');
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Network status changes
    EventBus.on('network:online', async () => {
      this.isOnline = true;
      await this.syncPendingChanges();
    });

    EventBus.on('network:offline', () => {
      this.isOnline = false;
    });

    // Service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_OFFLINE_REQUESTS') {
          this.syncPendingChanges();
        }
      });
    }
  }

  /**
   * Load orders from local cache
   */
  async loadCachedOrders() {
    try {
      const cachedOrders = await StorageService.get('orders') || [];
      cachedOrders.forEach(order => {
        this.orders.set(order.id, order);
      });
      
      console.log(`OrderService: Loaded ${cachedOrders.length} cached orders`);
    } catch (error) {
      console.error('OrderService: Failed to load cached orders:', error);
    }
  }

  /**
   * Save orders to local cache
   */
  async saveCachedOrders() {
    try {
      const ordersArray = Array.from(this.orders.values());
      await StorageService.set('orders', ordersArray);
    } catch (error) {
      console.error('OrderService: Failed to save cached orders:', error);
    }
  }

  /**
   * Sync with server
   */
  async syncWithServer() {
    try {
      const response = await APIService.getOrders({});
      const serverOrders = (response && response.data) ? response.data : (response || []);
      
      serverOrders.forEach(order => {
        this.orders.set(order.id, order);
      });
      
      await this.saveCachedOrders();
      
      EventBus.emit('orders:synced', {
        count: serverOrders.length
      });
      
    } catch (error) {
      console.error('OrderService: Failed to sync with server:', error);
    }
  }

  /**
   * Sync pending changes
   */
  async syncPendingChanges() {
    if (!this.isOnline || this.pendingSync.size === 0) return;

    const pendingOperations = Array.from(this.pendingSync);
    
    for (const operation of pendingOperations) {
      try {
        await this.executePendingOperation(operation);
        this.pendingSync.delete(operation);
      } catch (error) {
        console.error('OrderService: Failed to sync operation:', operation, error);
      }
    }

    // Save updated pending sync list
    await StorageService.set('pending_sync', Array.from(this.pendingSync));
  }

  /**
   * Execute pending operation
   */
  async executePendingOperation(operation) {
    switch (operation.type) {
      case 'CREATE':
        await APIService.createOrder(operation.data);
        break;
      case 'UPDATE':
        await APIService.updateOrder(operation.id, operation.data);
        break;
      case 'DELETE':
        await APIService.deleteOrder(operation.id);
        break;
    }
  }

  /**
   * Generate unique order ID
   */
  generateOrderId() {
    return `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Create new order
   */
  async createOrder(orderData) {
    try {
      const order = {
        id: this.generateOrderId(),
        ...orderData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'current_user', // Should be actual user ID
        offline: !this.isOnline
      };

      // Validate order data
      const validation = this.validateOrder(order);
      if (!validation.isValid) {
        throw new Error(`Invalid order data: ${validation.errors.join(', ')}`);
      }

      // Calculate totals
      order.subtotal = this.calculateSubtotal(order.services);
      order.tax = this.calculateTax(order.subtotal);
      order.discount = order.discount || 0;
      order.finalAmount = order.subtotal + order.tax - order.discount;

      // Save locally
      this.orders.set(order.id, order);
      await this.saveCachedOrders();

      // Sync with server if online
      if (this.isOnline) {
        try {
          const resp = await APIService.createOrder(order);
          const serverOrder = resp?.data || order;
          // Update with server response
          this.orders.set(order.id, serverOrder);
          await this.saveCachedOrders();
        } catch (error) {
          // Queue for sync later
          this.pendingSync.add({
            type: 'CREATE',
            id: order.id,
            data: order
          });
          await StorageService.set('pending_sync', Array.from(this.pendingSync));
        }
      } else {
        // Queue for sync later
        this.pendingSync.add({
          type: 'CREATE',
          id: order.id,
          data: order
        });
        await StorageService.set('pending_sync', Array.from(this.pendingSync));
      }

      // Emit event
      EventBus.emit('order:created', { order });

      // Show notification
      NotificationService.success(`Đơn hàng ${order.id} đã được tạo thành công!`);

      return order;

    } catch (error) {
      console.error('OrderService: Failed to create order:', error);
      NotificationService.error('Lỗi tạo đơn hàng: ' + error.message);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  getOrder(orderId) {
    return this.orders.get(orderId) || null;
  }

  /**
   * Update order
   */
  async updateOrder(orderId, updateData) {
    try {
      const existingOrder = this.orders.get(orderId);
      if (!existingOrder) {
        throw new Error(`Order ${orderId} not found`);
      }

      const updatedOrder = {
        ...existingOrder,
        ...updateData,
        updatedAt: new Date().toISOString(),
        offline: !this.isOnline
      };

      // Recalculate totals if services changed
      if (updateData.services) {
        updatedOrder.subtotal = this.calculateSubtotal(updatedOrder.services);
        updatedOrder.tax = this.calculateTax(updatedOrder.subtotal);
        updatedOrder.finalAmount = updatedOrder.subtotal + updatedOrder.tax - (updatedOrder.discount || 0);
      }

      // Validate updated order
      const validation = this.validateOrder(updatedOrder);
      if (!validation.isValid) {
        throw new Error(`Invalid order data: ${validation.errors.join(', ')}`);
      }

      // Save locally
      this.orders.set(orderId, updatedOrder);
      await this.saveCachedOrders();

      // Sync with server if online
      if (this.isOnline) {
        try {
          const serverOrder = await APIService.put(`/orders/${orderId}`, updatedOrder);
          this.orders.set(orderId, serverOrder);
          await this.saveCachedOrders();
        } catch (error) {
          // Queue for sync later
          this.pendingSync.add({
            type: 'UPDATE',
            id: orderId,
            data: updatedOrder
          });
          await StorageService.set('pending_sync', Array.from(this.pendingSync));
        }
      } else {
        // Queue for sync later
        this.pendingSync.add({
          type: 'UPDATE',
          id: orderId,
          data: updatedOrder
        });
        await StorageService.set('pending_sync', Array.from(this.pendingSync));
      }

      // Emit event
      EventBus.emit('order:updated', { order: updatedOrder });

      // Show notification
      NotificationService.success(`Đơn hàng ${orderId} đã được cập nhật!`);

      return updatedOrder;

    } catch (error) {
      console.error('OrderService: Failed to update order:', error);
      NotificationService.error('Lỗi cập nhật đơn hàng: ' + error.message);
      throw error;
    }
  }

  /**
   * Delete order
   */
  async deleteOrder(orderId) {
    try {
      const order = this.orders.get(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Remove locally
      this.orders.delete(orderId);
      await this.saveCachedOrders();

      // Sync with server if online
      if (this.isOnline) {
        try {
          await APIService.delete(`/orders/${orderId}`);
        } catch (error) {
          // Queue for sync later
          this.pendingSync.add({
            type: 'DELETE',
            id: orderId
          });
          await StorageService.set('pending_sync', Array.from(this.pendingSync));
        }
      } else {
        // Queue for sync later
        this.pendingSync.add({
          type: 'DELETE',
          id: orderId
        });
        await StorageService.set('pending_sync', Array.from(this.pendingSync));
      }

      // Emit event
      EventBus.emit('order:deleted', { orderId, order });

      // Show notification
      NotificationService.success(`Đơn hàng ${orderId} đã được xóa!`);

      return true;

    } catch (error) {
      console.error('OrderService: Failed to delete order:', error);
      NotificationService.error('Lỗi xóa đơn hàng: ' + error.message);
      throw error;
    }
  }

  /**
   * Get all orders with optional filtering
   */
  getOrders(filters = {}) {
    let orders = Array.from(this.orders.values());

    // Apply filters
    if (filters.status) {
      orders = orders.filter(order => order.status === filters.status);
    }

    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      orders = orders.filter(order => new Date(order.createdAt) >= dateFrom);
    }

    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      orders = orders.filter(order => new Date(order.createdAt) <= dateTo);
    }

    if (filters.customerName) {
      const searchTerm = filters.customerName.toLowerCase();
      orders = orders.filter(order => 
        order.customerName && order.customerName.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.minAmount) {
      orders = orders.filter(order => order.finalAmount >= filters.minAmount);
    }

    if (filters.maxAmount) {
      orders = orders.filter(order => order.finalAmount <= filters.maxAmount);
    }

    // Sort by creation date (newest first)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return orders;
  }

  /**
   * Get recent orders
   */
  getRecentOrders(limit = 10) {
    const orders = Array.from(this.orders.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    return orders;
  }

  /**
   * Search orders
   */
  searchOrders(query, filters = {}) {
    const searchTerm = query.toLowerCase();
    let orders = Array.from(this.orders.values());

    // Text search
    if (query) {
      orders = orders.filter(order => {
        return (
          order.id.toLowerCase().includes(searchTerm) ||
          (order.customerName && order.customerName.toLowerCase().includes(searchTerm)) ||
          (order.customerPhone && order.customerPhone.includes(query)) ||
          (order.customerEmail && order.customerEmail.toLowerCase().includes(searchTerm)) ||
          (order.notes && order.notes.toLowerCase().includes(searchTerm))
        );
      });
    }

    // Apply additional filters
    return this.getOrders({ ...filters, orders });
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status, notes = '') {
    try {
      const order = this.orders.get(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }

      const updatedOrder = {
        ...order,
        status,
        statusHistory: [
          ...(order.statusHistory || []),
          {
            status,
            notes,
            timestamp: new Date().toISOString(),
            updatedBy: 'current_user'
          }
        ],
        updatedAt: new Date().toISOString()
      };

      await this.updateOrder(orderId, updatedOrder);

      return updatedOrder;

    } catch (error) {
      console.error('OrderService: Failed to update order status:', error);
      throw error;
    }
  }

  /**
   * Validate order data
   */
  validateOrder(order) {
    const errors = [];

    if (!order.customerName || order.customerName.trim() === '') {
      errors.push('Tên khách hàng là bắt buộc');
    }

    if (!order.customerPhone || order.customerPhone.trim() === '') {
      errors.push('Số điện thoại là bắt buộc');
    }

    if (!order.services || order.services.length === 0) {
      errors.push('Phải chọn ít nhất một dịch vụ');
    }

    if (!order.appointmentDate) {
      errors.push('Ngày hẹn là bắt buộc');
    }

    if (!order.appointmentTime) {
      errors.push('Giờ hẹn là bắt buộc');
    }

    // Validate services
    if (order.services) {
      order.services.forEach((service, index) => {
        if (!service.id || !service.name || !service.price) {
          errors.push(`Dịch vụ ${index + 1} không hợp lệ`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate subtotal
   */
  calculateSubtotal(services) {
    if (!services || services.length === 0) return 0;
    
    return services.reduce((total, service) => {
      const price = parseFloat(service.price) || 0;
      const quantity = parseInt(service.quantity) || 1;
      return total + (price * quantity);
    }, 0);
  }

  /**
   * Calculate tax (10% VAT in Vietnam)
   */
  calculateTax(subtotal) {
    return Math.round(subtotal * 0.1);
  }

  /**
   * Get order statistics
   */
  getOrderStatistics(period = 'today') {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0);
    }

    const orders = Array.from(this.orders.values())
      .filter(order => new Date(order.createdAt) >= startDate);

    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0),
      averageOrderValue: 0,
      statusBreakdown: {},
      topServices: {},
      hourlyDistribution: {}
    };

    // Calculate average
    if (stats.totalOrders > 0) {
      stats.averageOrderValue = Math.round(stats.totalRevenue / stats.totalOrders);
    }

    // Status breakdown
    orders.forEach(order => {
      stats.statusBreakdown[order.status] = (stats.statusBreakdown[order.status] || 0) + 1;
    });

    // Top services
    orders.forEach(order => {
      if (order.services) {
        order.services.forEach(service => {
          stats.topServices[service.name] = (stats.topServices[service.name] || 0) + 1;
        });
      }
    });

    // Hourly distribution
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      stats.hourlyDistribution[hour] = (stats.hourlyDistribution[hour] || 0) + 1;
    });

    return stats;
  }

  /**
   * Export orders to CSV
   */
  exportOrdersToCSV(orders = null) {
    if (!orders) {
      orders = this.getOrders();
    }

    const headers = [
      'ID', 'Khách hàng', 'Số điện thoại', 'Email', 
      'Dịch vụ', 'Ngày hẹn', 'Giờ hẹn', 'Trạng thái', 
      'Thành tiền', 'Ngày tạo', 'Ghi chú'
    ];

    const csvData = [
      headers.join(','),
      ...orders.map(order => [
        order.id,
        `"${order.customerName || ''}"`,
        order.customerPhone || '',
        order.customerEmail || '',
        `"${order.services ? order.services.map(s => s.name).join(', ') : ''}"`,
        order.appointmentDate || '',
        order.appointmentTime || '',
        order.status || '',
        order.finalAmount || 0,
        Utils.formatDateTime(order.createdAt),
        `"${order.notes || ''}"`
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${Utils.formatDate(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    NotificationService.success('Dữ liệu đơn hàng đã được xuất!');
  }

  /**
   * Get total count
   */
  getOrderCount() {
    return this.orders.size;
  }

  /**
   * Clear all orders (for testing)
   */
  async clearAllOrders() {
    this.orders.clear();
    await this.saveCachedOrders();
    EventBus.emit('orders:cleared');
  }
}

// Export singleton instance
export default new OrderService();
