/**
 * Stats Service - Dashboard Statistics
 * Handles statistics calculation and dashboard data
 */

import { StorageService } from './storage.service.js';
import { EventBus } from '../core/eventBus.js';

export class StatsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.init();
  }

  init() {
    console.log('StatsService initialized');
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    const cacheKey = 'dashboard_stats';
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const stats = await this.calculateStats();
      
      // Cache the results
      this.cache.set(cacheKey, {
        data: stats,
        timestamp: Date.now()
      });

      return stats;
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      return this.getDefaultStats();
    }
  }

  /**
   * Calculate statistics from stored data
   */
  async calculateStats() {
    const orders = await StorageService.get('orders') || [];
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Filter orders by time periods
    const todayOrders = orders.filter(order => new Date(order.createdAt) >= startOfDay);
    const weekOrders = orders.filter(order => new Date(order.createdAt) >= startOfWeek);
    const monthOrders = orders.filter(order => new Date(order.createdAt) >= startOfMonth);

    // Calculate totals
    const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.price || 0), 0);
    const weekRevenue = weekOrders.reduce((sum, order) => sum + (order.price || 0), 0);
    const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.price || 0), 0);

    // Calculate averages
    const avgOrderToday = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;
    const avgOrderWeek = weekOrders.length > 0 ? weekRevenue / weekOrders.length : 0;
    const avgOrderMonth = monthOrders.length > 0 ? monthRevenue / monthOrders.length : 0;

    // Service statistics
    const serviceStats = this.calculateServiceStats(orders);
    
    return {
      today: {
        orders: todayOrders.length,
        revenue: todayRevenue,
        avgOrder: avgOrderToday
      },
      week: {
        orders: weekOrders.length,
        revenue: weekRevenue,
        avgOrder: avgOrderWeek
      },
      month: {
        orders: monthOrders.length,
        revenue: monthRevenue,
        avgOrder: avgOrderMonth
      },
      total: {
        orders: orders.length,
        revenue: orders.reduce((sum, order) => sum + (order.price || 0), 0)
      },
      services: serviceStats,
      lastUpdated: Date.now()
    };
  }

  /**
   * Calculate service-specific statistics
   */
  calculateServiceStats(orders) {
    const serviceMap = new Map();
    
    orders.forEach(order => {
      const service = order.service || 'Unknown';
      if (!serviceMap.has(service)) {
        serviceMap.set(service, {
          name: service,
          count: 0,
          revenue: 0
        });
      }
      
      const serviceData = serviceMap.get(service);
      serviceData.count++;
      serviceData.revenue += order.price || 0;
    });

    // Convert to array and sort by revenue
    const services = Array.from(serviceMap.values())
      .map(service => ({
        ...service,
        avgPrice: service.count > 0 ? service.revenue / service.count : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return services.slice(0, 10); // Top 10 services
  }

  /**
   * Get revenue trend data
   */
  async getRevenueTrend(days = 30) {
    try {
      const orders = await StorageService.get('orders') || [];
      const today = new Date();
      const trend = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
        const dateStr = date.toISOString().split('T')[0];
        
        const dayOrders = orders.filter(order => {
          const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
          return orderDate === dateStr;
        });

        const revenue = dayOrders.reduce((sum, order) => sum + (order.price || 0), 0);
        
        trend.push({
          date: dateStr,
          revenue,
          orders: dayOrders.length
        });
      }

      return trend;
    } catch (error) {
      console.error('Failed to get revenue trend:', error);
      return [];
    }
  }

  /**
   * Get hourly statistics for today
   */
  async getHourlyStats() {
    try {
      const orders = await StorageService.get('orders') || [];
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const todayOrders = orders.filter(order => new Date(order.createdAt) >= startOfDay);
      
      const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        orders: 0,
        revenue: 0
      }));

      todayOrders.forEach(order => {
        const hour = new Date(order.createdAt).getHours();
        hourlyData[hour].orders++;
        hourlyData[hour].revenue += order.price || 0;
      });

      return hourlyData;
    } catch (error) {
      console.error('Failed to get hourly stats:', error);
      return [];
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    try {
      const stats = await this.getDashboardStats();
      const trend = await this.getRevenueTrend(7); // Last 7 days
      
      const previousWeekRevenue = trend.slice(0, 7).reduce((sum, day) => sum + day.revenue, 0);
      const currentWeekRevenue = stats.week.revenue;
      
      const revenueGrowth = previousWeekRevenue > 0 
        ? ((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100 
        : 0;

      return {
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        orderGrowth: this.calculateOrderGrowth(trend),
        topService: stats.services[0]?.name || 'N/A',
        avgOrderValue: stats.month.avgOrder,
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {
        revenueGrowth: 0,
        orderGrowth: 0,
        topService: 'N/A',
        avgOrderValue: 0,
        lastUpdated: Date.now()
      };
    }
  }

  /**
   * Calculate order growth percentage
   */
  calculateOrderGrowth(trend) {
    if (trend.length < 2) return 0;
    
    const mid = Math.floor(trend.length / 2);
    const firstHalf = trend.slice(0, mid);
    const secondHalf = trend.slice(mid);
    
    const firstHalfOrders = firstHalf.reduce((sum, day) => sum + day.orders, 0);
    const secondHalfOrders = secondHalf.reduce((sum, day) => sum + day.orders, 0);
    
    if (firstHalfOrders === 0) return 0;
    
    return Math.round(((secondHalfOrders - firstHalfOrders) / firstHalfOrders) * 100 * 100) / 100;
  }

  /**
   * Get default stats when calculation fails
   */
  getDefaultStats() {
    return {
      today: { orders: 0, revenue: 0, avgOrder: 0 },
      week: { orders: 0, revenue: 0, avgOrder: 0 },
      month: { orders: 0, revenue: 0, avgOrder: 0 },
      total: { orders: 0, revenue: 0 },
      services: [],
      lastUpdated: Date.now()
    };
  }

  /**
   * Clear statistics cache
   */
  clearCache() {
    this.cache.clear();
    EventBus.emit('stats:cache-cleared');
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  /**
   * Format number with thousands separator
   */
  formatNumber(number) {
    return new Intl.NumberFormat('vi-VN').format(number);
  }

  /**
   * Export statistics data
   */
  async exportStats(format = 'json') {
    try {
      const stats = await this.getDashboardStats();
      const trend = await this.getRevenueTrend();
      const hourly = await this.getHourlyStats();
      
      const exportData = {
        stats,
        trend,
        hourly,
        exportedAt: new Date().toISOString()
      };

      if (format === 'csv') {
        return this.convertToCSV(exportData);
      }

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export stats:', error);
      throw error;
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    let csv = '';
    
    // Revenue trend CSV
    csv += 'Date,Revenue,Orders\n';
    data.trend.forEach(day => {
      csv += `${day.date},${day.revenue},${day.orders}\n`;
    });
    
    csv += '\n';
    
    // Services CSV
    csv += 'Service,Count,Revenue,Average Price\n';
    data.stats.services.forEach(service => {
      csv += `${service.name},${service.count},${service.revenue},${service.avgPrice}\n`;
    });
    
    return csv;
  }
}

// Export singleton instance
export default new StatsService();
