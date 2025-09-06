/**
 * Staff Service for Hair Salon Management System
 * Handles staff information and management
 * 
 * @version 1.0.0
 */

const StaffService = {
  /**
   * Get staff information by email
   * @param {string} email - Staff email
   * @returns {object|null} - Staff information or null if not found
   */
  getStaffByEmail: function(email) {
    try {
      Logger.debug('Getting staff info for email', { email });
      
      if (!email) {
        return null;
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      const sheet = getSheet(CONFIG.SHEET_NAMES.STAFF);
      const data = sheet.getDataRange().getValues();
      
      if (data.length <= 1) {
        Logger.warn('Staff sheet is empty or has no data');
        return null;
      }
      
      // Search for staff member
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const staffEmail = row[CONFIG.STAFF_COLUMNS.EMAIL];
        
        if (staffEmail && staffEmail.toLowerCase().trim() === normalizedEmail) {
          const staff = {
            email: staffEmail,
            name: row[CONFIG.STAFF_COLUMNS.NAME] || '',
            role: row[CONFIG.STAFF_COLUMNS.ROLE] || 'Staff',
            active: this.parseBoolean(row[CONFIG.STAFF_COLUMNS.ACTIVE])
          };
          
          Logger.debug('Staff found', { email: normalizedEmail, name: staff.name });
          return staff;
        }
      }
      
      Logger.debug('Staff not found', { email: normalizedEmail });
      return null;
      
    } catch (error) {
      Logger.error('Failed to get staff by email', { email, error: error.toString() });
      return null;
    }
  },
  
  /**
   * Get all staff members
   * @param {object} filters - Optional filters
   * @returns {array} - Array of staff members
   */
  getAllStaff: function(filters = {}) {
    try {
      Logger.debug('Getting all staff', filters);
      
      const sheet = getSheet(CONFIG.SHEET_NAMES.STAFF);
      const data = sheet.getDataRange().getValues();
      
      if (data.length <= 1) {
        return [];
      }
      
      // Convert rows to objects
      let staff = data.slice(1).map(row => ({
        email: row[CONFIG.STAFF_COLUMNS.EMAIL] || '',
        name: row[CONFIG.STAFF_COLUMNS.NAME] || '',
        role: row[CONFIG.STAFF_COLUMNS.ROLE] || 'Staff',
        active: this.parseBoolean(row[CONFIG.STAFF_COLUMNS.ACTIVE])
      }));
      
      // Apply filters
      if (filters.activeOnly !== false) {
        staff = staff.filter(s => s.active);
      }
      
      if (filters.role) {
        staff = staff.filter(s => s.role === filters.role);
      }
      
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        staff = staff.filter(s => 
          s.email.toLowerCase().includes(searchTerm) ||
          s.name.toLowerCase().includes(searchTerm)
        );
      }
      
      Logger.debug('Retrieved staff members', { count: staff.length });
      return staff;
      
    } catch (error) {
      Logger.error('Failed to get all staff', { error: error.toString() });
      return [];
    }
  },
  
  /**
   * Add new staff member
   * @param {object} staffData - Staff data to add
   * @returns {object} - Added staff member
   */
  addStaff: function(staffData) {
    try {
      Logger.info('Adding new staff member', { email: staffData.email });
      
      // Validate staff data
      const validation = ValidationService.validateStaff(staffData);
      if (!validation.isValid) {
        throw new Error('Validation failed: ' + validation.errors.join(', '));
      }
      
      // Check if staff already exists
      const existingStaff = this.getStaffByEmail(staffData.email);
      if (existingStaff) {
        throw new Error('Staff member already exists with this email');
      }
      
      // Prepare staff data
      const staff = {
        email: staffData.email.toLowerCase().trim(),
        name: staffData.name ? staffData.name.trim() : staffData.email.split('@')[0],
        role: staffData.role || 'Staff',
        active: staffData.active !== undefined ? staffData.active : true
      };
      
      // Get Staff sheet
      const sheet = getSheet(CONFIG.SHEET_NAMES.STAFF);
      
      // Prepare row data
      const rowData = new Array(4);
      rowData[CONFIG.STAFF_COLUMNS.EMAIL] = staff.email;
      rowData[CONFIG.STAFF_COLUMNS.NAME] = staff.name;
      rowData[CONFIG.STAFF_COLUMNS.ROLE] = staff.role;
      rowData[CONFIG.STAFF_COLUMNS.ACTIVE] = staff.active ? 'TRUE' : 'FALSE';
      
      // Add to sheet
      sheet.appendRow(rowData);
      
      Logger.info('Staff member added successfully', { email: staff.email });
      return staff;
      
    } catch (error) {
      Logger.error('Failed to add staff member', { error: error.toString() });
      throw new Error('Failed to add staff member: ' + error.toString());
    }
  },
  
  /**
   * Update staff member
   * @param {string} email - Staff email to update
   * @param {object} updates - Fields to update
   * @returns {object} - Updated staff member
   */
  updateStaff: function(email, updates) {
    try {
      Logger.info('Updating staff member', { email, updates });
      
      const sheet = getSheet(CONFIG.SHEET_NAMES.STAFF);
      const data = sheet.getDataRange().getValues();
      
      // Find the staff member to update
      let rowIndex = -1;
      const normalizedEmail = email.toLowerCase().trim();
      
      for (let i = 1; i < data.length; i++) {
        const staffEmail = data[i][CONFIG.STAFF_COLUMNS.EMAIL];
        if (staffEmail && staffEmail.toLowerCase().trim() === normalizedEmail) {
          rowIndex = i + 1; // Sheet rows are 1-indexed
          break;
        }
      }
      
      if (rowIndex === -1) {
        throw new Error('Staff member not found');
      }
      
      // Apply updates
      const currentRow = data[rowIndex - 1];
      
      if (updates.name !== undefined) {
        currentRow[CONFIG.STAFF_COLUMNS.NAME] = updates.name.trim();
      }
      
      if (updates.role !== undefined) {
        currentRow[CONFIG.STAFF_COLUMNS.ROLE] = updates.role;
      }
      
      if (updates.active !== undefined) {
        currentRow[CONFIG.STAFF_COLUMNS.ACTIVE] = updates.active ? 'TRUE' : 'FALSE';
      }
      
      // Update the row
      sheet.getRange(rowIndex, 1, 1, currentRow.length).setValues([currentRow]);
      
      // Return updated staff
      const updatedStaff = {
        email: currentRow[CONFIG.STAFF_COLUMNS.EMAIL],
        name: currentRow[CONFIG.STAFF_COLUMNS.NAME],
        role: currentRow[CONFIG.STAFF_COLUMNS.ROLE],
        active: this.parseBoolean(currentRow[CONFIG.STAFF_COLUMNS.ACTIVE])
      };
      
      Logger.info('Staff member updated successfully', { email });
      return updatedStaff;
      
    } catch (error) {
      Logger.error('Failed to update staff member', { email, error: error.toString() });
      throw new Error('Failed to update staff member: ' + error.toString());
    }
  },
  
  /**
   * Deactivate staff member (soft delete)
   * @param {string} email - Staff email to deactivate
   * @returns {boolean} - True if successful
   */
  deactivateStaff: function(email) {
    try {
      Logger.info('Deactivating staff member', { email });
      
      this.updateStaff(email, { active: false });
      
      Logger.info('Staff member deactivated successfully', { email });
      return true;
      
    } catch (error) {
      Logger.error('Failed to deactivate staff member', { email, error: error.toString() });
      throw new Error('Failed to deactivate staff member: ' + error.toString());
    }
  },
  
  /**
   * Activate staff member
   * @param {string} email - Staff email to activate
   * @returns {boolean} - True if successful
   */
  activateStaff: function(email) {
    try {
      Logger.info('Activating staff member', { email });
      
      this.updateStaff(email, { active: true });
      
      Logger.info('Staff member activated successfully', { email });
      return true;
      
    } catch (error) {
      Logger.error('Failed to activate staff member', { email, error: error.toString() });
      throw new Error('Failed to activate staff member: ' + error.toString());
    }
  },
  
  /**
   * Get staff statistics
   * @returns {object} - Staff statistics
   */
  getStaffStats: function() {
    try {
      Logger.debug('Getting staff statistics');
      
      const allStaff = this.getAllStaff({ activeOnly: false });
      
      const stats = {
        totalStaff: allStaff.length,
        activeStaff: 0,
        inactiveStaff: 0,
        roles: {},
        adminCount: 0
      };
      
      allStaff.forEach(staff => {
        if (staff.active) {
          stats.activeStaff++;
        } else {
          stats.inactiveStaff++;
        }
        
        // Role breakdown
        if (!stats.roles[staff.role]) {
          stats.roles[staff.role] = 0;
        }
        stats.roles[staff.role]++;
        
        // Admin count
        if (CONFIG.ADMIN_EMAILS.some(email => email.toLowerCase() === staff.email.toLowerCase())) {
          stats.adminCount++;
        }
      });
      
      Logger.debug('Staff statistics calculated', stats);
      return stats;
      
    } catch (error) {
      Logger.error('Failed to get staff statistics', { error: error.toString() });
      return {
        totalStaff: 0,
        activeStaff: 0,
        inactiveStaff: 0,
        roles: {},
        adminCount: 0
      };
    }
  },
  
  /**
   * Get staff performance summary
   * @param {string} email - Staff email (optional)
   * @param {string} dateFrom - Start date (YYYY-MM-DD)
   * @param {string} dateTo - End date (YYYY-MM-DD)
   * @returns {object} - Performance summary
   */
  getStaffPerformance: function(email = null, dateFrom = null, dateTo = null) {
    try {
      Logger.debug('Getting staff performance', { email, dateFrom, dateTo });
      
      // Default date range (last 30 days)
      if (!dateFrom || !dateTo) {
        const now = new Date();
        dateTo = now.toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
      }
      
      let staffList = [];
      if (email) {
        const staff = this.getStaffByEmail(email);
        if (staff && staff.active) {
          staffList = [staff];
        }
      } else {
        staffList = this.getAllStaff({ activeOnly: true });
      }
      
      const performance = [];
      
      for (const staff of staffList) {
        const summary = OrderService.getOrderSummary(dateFrom, dateTo, staff.email);
        
        performance.push({
          staff: {
            email: staff.email,
            name: staff.name,
            role: staff.role
          },
          period: { from: dateFrom, to: dateTo },
          totalOrders: summary.totalOrders,
          totalRevenue: summary.totalRevenue,
          avgOrderValue: summary.totalOrders > 0 ? Math.round(summary.totalRevenue / summary.totalOrders) : 0,
          topServices: summary.topServicesArray.slice(0, 3),
          dailyAverage: Math.round(summary.totalOrders / this.calculateDaysBetween(dateFrom, dateTo)),
          revenueFormatted: formatCurrency(summary.totalRevenue)
        });
      }
      
      // Sort by total revenue descending
      performance.sort((a, b) => b.totalRevenue - a.totalRevenue);
      
      Logger.debug('Staff performance calculated', { count: performance.length });
      return performance;
      
    } catch (error) {
      Logger.error('Failed to get staff performance', { error: error.toString() });
      return [];
    }
  },
  
  /**
   * Get staff working today
   * @returns {array} - Staff members who have orders today
   */
  getStaffWorkingToday: function() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = OrderService.getOrders({ date: today, staff: null });
      
      const workingStaffEmails = [...new Set(todayOrders.map(order => order.staff))];
      const workingStaff = workingStaffEmails.map(email => {
        const staff = this.getStaffByEmail(email);
        const orders = todayOrders.filter(order => order.staff === email);
        
        return {
          ...staff,
          ordersToday: orders.length,
          revenueToday: orders.reduce((sum, order) => sum + parseInt(order.price || 0), 0)
        };
      }).filter(staff => staff !== null);
      
      return workingStaff.sort((a, b) => b.ordersToday - a.ordersToday);
      
    } catch (error) {
      Logger.error('Failed to get staff working today', { error: error.toString() });
      return [];
    }
  },
  
  /**
   * Initialize staff sheet with allowed emails
   */
  initializeStaffData: function() {
    try {
      Logger.info('Initializing staff data');
      
      const existingStaff = this.getAllStaff({ activeOnly: false });
      const existingEmails = existingStaff.map(s => s.email.toLowerCase());
      
      // Add missing staff from CONFIG.ALLOWED_EMAILS
      let addedCount = 0;
      for (const email of CONFIG.ALLOWED_EMAILS) {
        if (!existingEmails.includes(email.toLowerCase())) {
          const isAdmin = CONFIG.ADMIN_EMAILS.some(adminEmail => 
            adminEmail.toLowerCase() === email.toLowerCase()
          );
          
          this.addStaff({
            email: email,
            name: email.split('@')[0], // Use email prefix as default name
            role: isAdmin ? 'Admin' : 'Staff',
            active: true
          });
          
          addedCount++;
        }
      }
      
      Logger.info('Staff data initialized', { addedCount });
      return { addedCount, totalStaff: CONFIG.ALLOWED_EMAILS.length };
      
    } catch (error) {
      Logger.error('Failed to initialize staff data', { error: error.toString() });
      throw new Error('Failed to initialize staff data: ' + error.toString());
    }
  },
  
  /**
   * Parse boolean value from string
   * @param {any} value - Value to parse
   * @returns {boolean} - Parsed boolean
   */
  parseBoolean: function(value) {
    if (typeof value === 'boolean') {
      return value;
    }
    
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      return normalized === 'true' || normalized === '1' || normalized === 'yes';
    }
    
    if (typeof value === 'number') {
      return value !== 0;
    }
    
    return false;
  },
  
  /**
   * Calculate days between two dates
   * @param {string} dateFrom - Start date (YYYY-MM-DD)
   * @param {string} dateTo - End date (YYYY-MM-DD)
   * @returns {number} - Number of days
   */
  calculateDaysBetween: function(dateFrom, dateTo) {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  },
  
  /**
   * Validate staff permissions for action
   * @param {string} email - Staff email
   * @param {string} action - Action to validate
   * @returns {boolean} - True if allowed
   */
  hasPermission: function(email, action) {
    try {
      const permissions = AuthService.getUserPermissions(email);
      
      switch (action) {
        case 'createOrder':
          return permissions.canCreateOrder;
        case 'viewAllOrders':
          return permissions.canViewAllOrders;
        case 'deleteOrder':
          return permissions.canDeleteAllOrders || permissions.canDeleteOwnOrders;
        case 'manageStaff':
          return permissions.canManageStaff;
        case 'viewReports':
          return permissions.canViewReports;
        default:
          return false;
      }
    } catch (error) {
      Logger.error('Failed to check permissions', { email, action, error: error.toString() });
      return false;
    }
  }
};
