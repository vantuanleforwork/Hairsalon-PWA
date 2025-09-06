/**
 * Hair Salon Order Management System
 * Main entry point for Google Apps Script Web App
 * 
 * @version 1.0.0
 * @author Salon Management System
 */

/**
 * Handle GET requests (for testing and health check)
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Hair Salon API is running',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST requests - Main API endpoint
 */
function doPost(e) {
  try {
    // Enable CORS
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    
    // Parse request parameters
    const action = e.parameter.action;
    const userEmail = e.parameter.email;
    const idToken = e.parameter.idToken;
    const data = e.parameter.data ? JSON.parse(e.parameter.data) : {};
    
    // Log request for debugging
    console.log('Request received:', {
      action: action,
      userEmail: userEmail,
      timestamp: new Date().toISOString()
    });
    
    // Validate origin (if needed)
    if (!isAllowedOrigin(e)) {
      return output.setContent(JSON.stringify({
        success: false,
        error: 'Forbidden: Invalid origin',
        code: 403
      }));
    }
    
    // Validate user authentication
    if (!AuthService.validateUser(userEmail)) {
      return output.setContent(JSON.stringify({
        success: false,
        error: 'Unauthorized: User not allowed',
        code: 401
      }));
    }
    
    // Check rate limiting
    if (RateLimiter.isLimited(userEmail)) {
      return output.setContent(JSON.stringify({
        success: false,
        error: 'Too many requests. Please wait.',
        code: 429
      }));
    }
    
    // Route to appropriate handler based on action
    let result;
    switch(action) {
      // Auth endpoints
      case 'validateUser':
        result = handleValidateUser(userEmail);
        break;
        
      // Order endpoints
      case 'createOrder':
        result = handleCreateOrder(userEmail, data);
        break;
        
      case 'getOrders':
        result = handleGetOrders(userEmail, data);
        break;
        
      case 'updateOrder':
        result = handleUpdateOrder(userEmail, data);
        break;
        
      case 'deleteOrder':
        result = handleDeleteOrder(userEmail, data);
        break;
        
      // Staff endpoints
      case 'getStaffInfo':
        result = handleGetStaffInfo(userEmail);
        break;
        
      // Statistics endpoints
      case 'getDailyStats':
        result = handleGetDailyStats(userEmail, data);
        break;
        
      default:
        result = {
          success: false,
          error: 'Invalid action: ' + action,
          code: 400
        };
    }
    
    return output.setContent(JSON.stringify(result));
    
  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: 'Internal server error: ' + error.toString(),
        code: 500
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Check if request origin is allowed
 */
function isAllowedOrigin(e) {
  // For development, allow all origins
  // In production, check against CONFIG.ALLOWED_DOMAINS
  if (CONFIG.ENV === 'development') {
    return true;
  }
  
  const origin = e.parameter.origin || e.headers?.Origin;
  if (!origin) return true; // Allow requests without origin header (e.g., from Apps Script editor)
  
  return CONFIG.ALLOWED_DOMAINS.includes(origin);
}

// ============= HANDLER FUNCTIONS =============

/**
 * Validate user authentication
 */
function handleValidateUser(email) {
  try {
    const staffInfo = StaffService.getStaffByEmail(email);
    
    if (staffInfo && staffInfo.active) {
      return {
        success: true,
        data: {
          email: staffInfo.email,
          name: staffInfo.name,
          role: staffInfo.role,
          authenticated: true
        }
      };
    }
    
    return {
      success: false,
      error: 'User not found or inactive',
      code: 401
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      code: 500
    };
  }
}

/**
 * Create new order
 */
function handleCreateOrder(userEmail, data) {
  try {
    // Validate required fields
    const validation = ValidationService.validateOrder(data);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', '),
        code: 400
      };
    }
    
    // Create order
    const order = OrderService.createOrder({
      ...data,
      staff: userEmail,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      data: order
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      code: 500
    };
  }
}

/**
 * Get orders (with optional filters)
 */
function handleGetOrders(userEmail, filters) {
  try {
    const orders = OrderService.getOrders({
      ...filters,
      staff: filters.allStaff ? undefined : userEmail
    });
    
    return {
      success: true,
      data: orders
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      code: 500
    };
  }
}

/**
 * Update existing order
 */
function handleUpdateOrder(userEmail, data) {
  try {
    // Check if user owns the order or is admin
    const order = OrderService.getOrderById(data.id);
    if (!order) {
      return {
        success: false,
        error: 'Order not found',
        code: 404
      };
    }
    
    if (order.staff !== userEmail && !AuthService.isAdmin(userEmail)) {
      return {
        success: false,
        error: 'Permission denied',
        code: 403
      };
    }
    
    const updatedOrder = OrderService.updateOrder(data.id, data.updates);
    
    return {
      success: true,
      data: updatedOrder
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      code: 500
    };
  }
}

/**
 * Delete order (soft delete)
 */
function handleDeleteOrder(userEmail, data) {
  try {
    // Check if user owns the order or is admin
    const order = OrderService.getOrderById(data.id);
    if (!order) {
      return {
        success: false,
        error: 'Order not found',
        code: 404
      };
    }
    
    if (order.staff !== userEmail && !AuthService.isAdmin(userEmail)) {
      return {
        success: false,
        error: 'Permission denied',
        code: 403
      };
    }
    
    const success = OrderService.deleteOrder(data.id);
    
    return {
      success: success,
      data: { id: data.id, deleted: true }
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      code: 500
    };
  }
}

/**
 * Get staff information
 */
function handleGetStaffInfo(email) {
  try {
    const staffInfo = StaffService.getStaffByEmail(email);
    
    if (!staffInfo) {
      return {
        success: false,
        error: 'Staff not found',
        code: 404
      };
    }
    
    return {
      success: true,
      data: staffInfo
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      code: 500
    };
  }
}

/**
 * Get daily statistics
 */
function handleGetDailyStats(userEmail, data) {
  try {
    const date = data.date || new Date().toISOString().split('T')[0];
    const stats = OrderService.getDailyStats(date, userEmail);
    
    return {
      success: true,
      data: stats
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      code: 500
    };
  }
}

// ============= RATE LIMITER =============

const RateLimiter = {
  requests: new Map(),
  
  isLimited: function(email) {
    const now = Date.now();
    const userRequests = this.requests.get(email) || [];
    
    // Remove old requests (older than 1 minute)
    const recentRequests = userRequests.filter(time => now - time < 60000);
    
    // Check if exceeded limit
    if (recentRequests.length >= CONFIG.MAX_REQUESTS_PER_MINUTE) {
      return true;
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(email, recentRequests);
    
    return false;
  }
};
