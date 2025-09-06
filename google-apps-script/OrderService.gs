/**
 * Order Service for Hair Salon Management System
 * Handles all order-related operations (CRUD)
 * 
 * @version 1.0.0
 */

const OrderService = {
  /**
   * Create a new order
   * @param {object} orderData - Order data
   * @returns {object} - Created order with ID
   */
  createOrder: function(orderData) {
    try {
      Logger.info('Creating new order', { staff: orderData.staff });
      
      // Generate unique ID
      const orderId = generateId();
      
      // Prepare order data
      const order = {
        id: orderId,
        timestamp: orderData.timestamp || getCurrentTimestamp(),
        staff: orderData.staff,
        service: orderData.service,
        price: parseInt(orderData.price),
        note: orderData.note || '',
        status: 'Active'
      };
      
      // Get Orders sheet
      const sheet = getSheet(CONFIG.SHEET_NAMES.ORDERS);
      
      // Prepare row data based on column mapping
      const rowData = new Array(7); // 7 columns
      rowData[CONFIG.ORDER_COLUMNS.ID] = order.id;
      rowData[CONFIG.ORDER_COLUMNS.TIMESTAMP] = order.timestamp;
      rowData[CONFIG.ORDER_COLUMNS.STAFF] = order.staff;
      rowData[CONFIG.ORDER_COLUMNS.SERVICE] = order.service;
      rowData[CONFIG.ORDER_COLUMNS.PRICE] = order.price;
      rowData[CONFIG.ORDER_COLUMNS.NOTE] = order.note;
      rowData[CONFIG.ORDER_COLUMNS.STATUS] = order.status;
      
      // Add to sheet
      sheet.appendRow(rowData);
      
      Logger.info('Order created successfully', { orderId: orderId });
      return order;
      
    } catch (error) {
      Logger.error('Failed to create order', { error: error.toString() });
      throw new Error('Failed to create order: ' + error.toString());
    }
  },
  
  /**
   * Get orders with optional filters
   * @param {object} filters - Filter criteria
   * @returns {array} - Array of orders
   */
  getOrders: function(filters = {}) {
    try {
      Logger.debug('Getting orders with filters', filters);
      
      const sheet = getSheet(CONFIG.SHEET_NAMES.ORDERS);
      const data = sheet.getDataRange().getValues();
      
      if (data.length <= 1) {
        return []; // No data or only headers
      }
      
      // Remove header row
      const rows = data.slice(1);
      
      // Convert rows to objects
      let orders = rows.map(row => ({
        id: row[CONFIG.ORDER_COLUMNS.ID],
        timestamp: row[CONFIG.ORDER_COLUMNS.TIMESTAMP],
        staff: row[CONFIG.ORDER_COLUMNS.STAFF],
        service: row[CONFIG.ORDER_COLUMNS.SERVICE],
        price: row[CONFIG.ORDER_COLUMNS.PRICE],
        note: row[CONFIG.ORDER_COLUMNS.NOTE],
        status: row[CONFIG.ORDER_COLUMNS.STATUS]
      }));
      
      // Apply filters
      if (filters.staff) {
        orders = orders.filter(order => order.staff === filters.staff);
      }
      
      if (filters.status) {
        orders = orders.filter(order => order.status === filters.status);
      } else {
        // Default: only show active orders
        orders = orders.filter(order => order.status === 'Active');
      }
      
      if (filters.date) {
        const filterDate = filters.date;
        orders = orders.filter(order => {
          const orderDate = new Date(order.timestamp).toISOString().split('T')[0];
          return orderDate === filterDate;
        });
      }
      
      if (filters.dateFrom) {
        orders = orders.filter(order => {
          const orderDate = new Date(order.timestamp);
          return orderDate >= new Date(filters.dateFrom);
        });
      }
      
      if (filters.dateTo) {
        orders = orders.filter(order => {
          const orderDate = new Date(order.timestamp);
          return orderDate <= new Date(filters.dateTo);
        });
      }
      
      if (filters.service) {
        orders = orders.filter(order => order.service === filters.service);
      }
      
      // Apply sorting
      const sortBy = filters.sortBy || 'timestamp';
      const sortOrder = filters.sortOrder || 'desc';
      
      orders.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];
        
        // Handle different data types
        if (sortBy === 'timestamp') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (sortBy === 'price') {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
      
      // Apply limit
      if (filters.limit) {
        orders = orders.slice(0, parseInt(filters.limit));
      }
      
      Logger.debug('Retrieved orders', { count: orders.length });
      return orders;
      
    } catch (error) {
      Logger.error('Failed to get orders', { error: error.toString() });
      throw new Error('Failed to get orders: ' + error.toString());
    }
  },
  
  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   * @returns {object|null} - Order object or null if not found
   */
  getOrderById: function(orderId) {
    try {
      const orders = this.getOrders({ status: null }); // Get all orders including deleted
      return orders.find(order => order.id === orderId) || null;
    } catch (error) {
      Logger.error('Failed to get order by ID', { orderId, error: error.toString() });
      return null;
    }
  },
  
  /**
   * Update an existing order
   * @param {string} orderId - Order ID to update
   * @param {object} updates - Fields to update
   * @returns {object} - Updated order
   */
  updateOrder: function(orderId, updates) {
    try {
      Logger.info('Updating order', { orderId, updates });
      
      const sheet = getSheet(CONFIG.SHEET_NAMES.ORDERS);
      const data = sheet.getDataRange().getValues();
      
      // Find the row to update
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][CONFIG.ORDER_COLUMNS.ID] === orderId) {
          rowIndex = i + 1; // Sheet rows are 1-indexed
          break;
        }
      }
      
      if (rowIndex === -1) {
        throw new Error('Order not found');
      }
      
      // Apply updates
      const currentRow = data[rowIndex - 1];
      if (updates.service !== undefined) {
        currentRow[CONFIG.ORDER_COLUMNS.SERVICE] = updates.service;
      }
      if (updates.price !== undefined) {
        currentRow[CONFIG.ORDER_COLUMNS.PRICE] = parseInt(updates.price);
      }
      if (updates.note !== undefined) {
        currentRow[CONFIG.ORDER_COLUMNS.NOTE] = updates.note;
      }
      if (updates.status !== undefined) {
        currentRow[CONFIG.ORDER_COLUMNS.STATUS] = updates.status;
      }
      
      // Add update timestamp as note suffix (optional)
      if (updates.addUpdateLog) {
        const updateLog = ` [Updated: ${getCurrentTimestamp()}]`;
        currentRow[CONFIG.ORDER_COLUMNS.NOTE] = (currentRow[CONFIG.ORDER_COLUMNS.NOTE] || '') + updateLog;
      }
      
      // Update the row
      sheet.getRange(rowIndex, 1, 1, currentRow.length).setValues([currentRow]);
      
      // Return updated order
      const updatedOrder = {
        id: currentRow[CONFIG.ORDER_COLUMNS.ID],
        timestamp: currentRow[CONFIG.ORDER_COLUMNS.TIMESTAMP],
        staff: currentRow[CONFIG.ORDER_COLUMNS.STAFF],
        service: currentRow[CONFIG.ORDER_COLUMNS.SERVICE],
        price: currentRow[CONFIG.ORDER_COLUMNS.PRICE],
        note: currentRow[CONFIG.ORDER_COLUMNS.NOTE],
        status: currentRow[CONFIG.ORDER_COLUMNS.STATUS]
      };
      
      Logger.info('Order updated successfully', { orderId });
      return updatedOrder;
      
    } catch (error) {
      Logger.error('Failed to update order', { orderId, error: error.toString() });
      throw new Error('Failed to update order: ' + error.toString());
    }
  },
  
  /**
   * Delete an order (soft delete by marking as 'Deleted')
   * @param {string} orderId - Order ID to delete
   * @returns {boolean} - True if successful
   */
  deleteOrder: function(orderId) {
    try {
      Logger.info('Deleting order', { orderId });
      
      this.updateOrder(orderId, { 
        status: 'Deleted',
        addUpdateLog: true
      });
      
      Logger.info('Order deleted successfully', { orderId });
      return true;
      
    } catch (error) {
      Logger.error('Failed to delete order', { orderId, error: error.toString() });
      throw new Error('Failed to delete order: ' + error.toString());
    }
  },
  
  /**
   * Get daily statistics for a staff member
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} staffEmail - Staff email (optional)
   * @returns {object} - Daily statistics
   */
  getDailyStats: function(date, staffEmail = null) {
    try {
      Logger.debug('Getting daily stats', { date, staffEmail });
      
      const filters = {
        date: date,
        status: 'Active'
      };
      
      if (staffEmail) {
        filters.staff = staffEmail;
      }
      
      const orders = this.getOrders(filters);
      
      // Calculate statistics
      const stats = {
        date: date,
        staff: staffEmail,
        totalOrders: orders.length,
        totalRevenue: 0,
        services: {},
        avgOrderValue: 0,
        hourlyDistribution: {}
      };
      
      orders.forEach(order => {
        // Total revenue
        stats.totalRevenue += parseInt(order.price) || 0;
        
        // Service breakdown
        const service = order.service;
        if (!stats.services[service]) {
          stats.services[service] = { count: 0, revenue: 0 };
        }
        stats.services[service].count++;
        stats.services[service].revenue += parseInt(order.price) || 0;
        
        // Hourly distribution
        const hour = new Date(order.timestamp).getHours();
        const hourKey = `${hour.toString().padStart(2, '0')}:00`;
        if (!stats.hourlyDistribution[hourKey]) {
          stats.hourlyDistribution[hourKey] = 0;
        }
        stats.hourlyDistribution[hourKey]++;
      });
      
      // Calculate average
      stats.avgOrderValue = stats.totalOrders > 0 ? Math.round(stats.totalRevenue / stats.totalOrders) : 0;
      
      // Add formatted currency
      stats.totalRevenueFormatted = formatCurrency(stats.totalRevenue);
      stats.avgOrderValueFormatted = formatCurrency(stats.avgOrderValue);
      
      Logger.debug('Daily stats calculated', { 
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue 
      });
      
      return stats;
      
    } catch (error) {
      Logger.error('Failed to get daily stats', { error: error.toString() });
      throw new Error('Failed to get daily stats: ' + error.toString());
    }
  },
  
  /**
   * Get orders for today (helper function)
   * @param {string} staffEmail - Staff email
   * @returns {array} - Today's orders
   */
  getTodayOrders: function(staffEmail) {
    const today = new Date().toISOString().split('T')[0];
    return this.getOrders({
      date: today,
      staff: staffEmail,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  },
  
  /**
   * Get recent orders (last N orders)
   * @param {string} staffEmail - Staff email
   * @param {number} limit - Number of orders to return
   * @returns {array} - Recent orders
   */
  getRecentOrders: function(staffEmail, limit = 10) {
    return this.getOrders({
      staff: staffEmail,
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: limit
    });
  },
  
  /**
   * Search orders by keyword
   * @param {string} keyword - Search keyword
   * @param {string} staffEmail - Staff email (optional)
   * @returns {array} - Matching orders
   */
  searchOrders: function(keyword, staffEmail = null) {
    try {
      const filters = { status: 'Active' };
      if (staffEmail) {
        filters.staff = staffEmail;
      }
      
      const orders = this.getOrders(filters);
      const searchTerm = keyword.toLowerCase();
      
      return orders.filter(order => {
        return (
          order.service.toLowerCase().includes(searchTerm) ||
          order.note.toLowerCase().includes(searchTerm) ||
          order.id.toLowerCase().includes(searchTerm) ||
          order.price.toString().includes(searchTerm)
        );
      });
    } catch (error) {
      Logger.error('Failed to search orders', { keyword, error: error.toString() });
      return [];
    }
  },
  
  /**
   * Get order summary for a date range
   * @param {string} dateFrom - Start date (YYYY-MM-DD)
   * @param {string} dateTo - End date (YYYY-MM-DD)
   * @param {string} staffEmail - Staff email (optional)
   * @returns {object} - Order summary
   */
  getOrderSummary: function(dateFrom, dateTo, staffEmail = null) {
    try {
      const filters = {
        dateFrom: dateFrom,
        dateTo: dateTo,
        status: 'Active'
      };
      
      if (staffEmail) {
        filters.staff = staffEmail;
      }
      
      const orders = this.getOrders(filters);
      
      const summary = {
        dateRange: { from: dateFrom, to: dateTo },
        staff: staffEmail,
        totalOrders: orders.length,
        totalRevenue: 0,
        dailyBreakdown: {},
        topServices: {}
      };
      
      orders.forEach(order => {
        const price = parseInt(order.price) || 0;
        summary.totalRevenue += price;
        
        // Daily breakdown
        const date = new Date(order.timestamp).toISOString().split('T')[0];
        if (!summary.dailyBreakdown[date]) {
          summary.dailyBreakdown[date] = { count: 0, revenue: 0 };
        }
        summary.dailyBreakdown[date].count++;
        summary.dailyBreakdown[date].revenue += price;
        
        // Top services
        if (!summary.topServices[order.service]) {
          summary.topServices[order.service] = { count: 0, revenue: 0 };
        }
        summary.topServices[order.service].count++;
        summary.topServices[order.service].revenue += price;
      });
      
      // Sort top services by count
      summary.topServicesArray = Object.entries(summary.topServices)
        .map(([service, data]) => ({ service, ...data }))
        .sort((a, b) => b.count - a.count);
      
      return summary;
      
    } catch (error) {
      Logger.error('Failed to get order summary', { error: error.toString() });
      throw new Error('Failed to get order summary: ' + error.toString());
    }
  }
};
