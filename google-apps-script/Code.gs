/**
 * Salon Manager - Google Apps Script Backend
 * Version: 1.0.0
 * 
 * This script serves as the backend API for the Salon Manager PWA
 * It handles CRUD operations with Google Sheets as the database
 */

// Configuration
const CONFIG = {
  SPREADSHEET_ID: '1dqxdNQTdIvf7mccYMW825Xiuck-vK3kOOcHkn-YCphU', // Set by Codex
  SHEET_NAME: 'Orders',
  GOOGLE_CLIENT_ID: '36454863313-tlsos46mj2a63sa6k4hjralerarugtku.apps.googleusercontent.com',
  // Không dùng nữa: quản lý email qua tab Employees
  ALLOWED_EMAILS: [],
  ALLOWED_ORIGINS: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'https://vantuanleforwork.github.io' // Replace with your GitHub Pages URL
  ],
  MAX_ORDERS_PER_REQUEST: 100,
  TIMEZONE: 'Asia/Ho_Chi_Minh'
};

/**
 * Ensure Employees sheet exists with proper headers and seeded rows.
 * Returns the sheet instance.
 */
function initializeEmployeesSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Employees');
  if (!sheet) {
    sheet = ss.insertSheet('Employees');
    sheet.getRange(1, 1, 1, 4).setValues([[
      'Email', 'Tên nhân viên', 'Kích hoạt', 'Vai trò'
    ]]);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Get Employees sheet (ensures it exists) */
function getEmployeesSheet() {
  return initializeEmployeesSheet();
}

/** Read allowed (active) emails from Employees sheet */
function getAllowedEmails() {
  const sheet = getEmployeesSheet();
  const values = sheet.getDataRange().getValues();
  const emails = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var email = row[0]; // Email
    var active = row[2]; // Kích hoạt
    if (email && (active === true || String(active).toLowerCase() === 'true' || String(active).trim() === '1' || String(active).toLowerCase() === 'yes')) {
      emails.push(String(email).toLowerCase());
    }
  }
  return emails;
}

/** Lấy tên nhân viên theo email từ tab Employees */
function getEmployeeNameByEmail(email) {
  if (!email) return '';
  const sheet = getEmployeesSheet();
  const values = sheet.getDataRange().getValues();
  const target = String(email).toLowerCase();
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (String(row[0]).toLowerCase() === target) {
      return row[1] || '';
    }
  }
  return '';
}

/** Check if email is allowed (server-side) */
function isAllowedEmail(email) {
  if (!email) return false;
  var e = String(email).toLowerCase();
  var list = getAllowedEmails();
  return list.indexOf(e) >= 0;
}

/** Verify Google ID Token and return email (or null) */
function verifyIdToken(idToken) {
  try {
    if (!idToken) return null;
    var url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken);
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;
    var info = JSON.parse(res.getContentText() || '{}');
    var audOk = info && info.aud === CONFIG.GOOGLE_CLIENT_ID;
    var email = info && info.email;
    var verified = (info && (info.email_verified === true || info.email_verified === 'true'));
    if (audOk && email && verified) return String(email).toLowerCase();
    return null;
  } catch (e) {
    return null;
  }
}

// Column indices (0-based) - ĐÃ BỎ H, I, J
const COLUMNS = {
  ID: 0,              // A
  TIMESTAMP: 1,       // B
  EMPLOYEE: 2,        // C (email)
  EMPLOYEE_NAME: 3,   // D (tên nhân viên)
  SERVICE: 4,         // E
  PRICE: 5,           // F
  NOTES: 6            // G
};

/**
 * Initialize the spreadsheet with headers if empty
 */
function initializeSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    const headers = [
      'ID',
      'Thời gian',
      'Email nhân viên',
      'Tên nhân viên',
      'Dịch vụ',
      'Giá',
      'Ghi chú'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else {
    // Migration: nếu chưa có cột "Tên nhân viên", chèn cột D và đặt tiêu đề
    const firstRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var hasNameCol = false;
    for (var i = 0; i < firstRow.length; i++) {
      if (String(firstRow[i]).toLowerCase().indexOf('tên nhân viên') >= 0) { hasNameCol = true; break; }
    }
    if (!hasNameCol) {
      sheet.insertColumnAfter(3);
      sheet.getRange(1, 4).setValue('Tên nhân viên');
    }
    // Bỏ các cột H, I, J nếu tồn tại (Status/Created By/Modified At cũ)
    var lastCol = sheet.getLastColumn();
    if (lastCol >= 8) {
      // Xóa từ phải sang trái để không dịch chỉ số cột chưa xóa
      // Nếu có J (10)
      if (sheet.getLastColumn() >= 10) {
        sheet.deleteColumn(10);
      }
      // Nếu có I (9)
      if (sheet.getLastColumn() >= 9) {
        sheet.deleteColumn(9);
      }
      // Nếu có H (8)
      if (sheet.getLastColumn() >= 8) {
        sheet.deleteColumn(8);
      }
    }
  }
  // Ensure Employees sheet exists
  initializeEmployeesSheet();
  
  return sheet;
}

/**
 * Handle GET requests
 */
function doGet(e) {
  try {
    const params = e.parameter;
    const action = params.action || 'orders';

    // Require valid idToken for protected endpoints
    if (action !== 'health') {
      var email = verifyIdToken(params && params.idToken);
      if (!email) return createResponse({ error: 'Unauthorized' }, 401);
      if (!isAllowedEmail(email)) return createResponse({ error: 'Forbidden' }, 403);
      // attach for downstream filtering
      params._email = email;
    }
    
    let result;
    switch(action) {
      case 'orders':
        result = getOrders(params);
        break;
      case 'stats':
        result = getStats(params);
        break;
      case 'health':
        result = { status: 'OK', timestamp: new Date().toISOString() };
        break;
      default:
        result = { error: 'Invalid action' };
    }
    // Support JSONP to bypass CORS for static frontends
    if (params && params.callback) {
      var cb = String(params.callback).replace(/[^\w\.$]/g, '');
      var payload = cb + '(' + JSON.stringify(result) + ')';
      return ContentService.createTextOutput(payload)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return createResponse(result);
  } catch (error) {
    console.error('Error in doGet:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

/**
 * Handle POST requests
 */
function doPost(e) {
  try {
    var data = {};
    try {
      var ct = (e && e.postData && e.postData.type) || '';
      if (ct.indexOf('application/x-www-form-urlencoded') >= 0) {
        data = e.parameter || {};
      } else if (ct.indexOf('application/json') >= 0) {
        data = JSON.parse(e.postData.contents || '{}');
      } else {
        // Fallback: try parameter first then JSON parse
        data = (e && e.parameter && Object.keys(e.parameter).length) ? e.parameter : JSON.parse(e.postData && e.postData.contents || '{}');
      }
    } catch (parseErr) {
      console.warn('POST body parse warning:', parseErr);
      data = (e && e.parameter) || {};
    }

    var action = data.action || 'create';

    // Check origin for CORS (best-effort)
    var origin = (e && e.parameter && e.parameter.origin) || (e && e.headers && e.headers.Origin);
    if (!isAllowedOrigin(origin)) {
      return createResponse({ error: 'Unauthorized origin' }, 403);
    }

    // Verify idToken and get caller email
    var callerEmail = verifyIdToken((data && data.idToken) || (e && e.parameter && e.parameter.idToken));
    if (!callerEmail) return createResponse({ error: 'Unauthorized' }, 401);
    if (!isAllowedEmail(callerEmail)) return createResponse({ error: 'Forbidden' }, 403);
    
    var result;
    switch(action) {
      case 'create':
        result = createOrder({ ...data, _email: callerEmail });
        break;
      case 'update':
        result = updateOrder({ ...data, _email: callerEmail });
        break;
      case 'delete':
        result = deleteOrder({ ...data, _email: callerEmail });
        break;
      case 'orders':
        // Support fetching orders via POST to avoid exposing idToken in URL
        result = getOrders({ ...data, _email: callerEmail });
        break;
      case 'stats':
        // Support fetching stats via POST
        result = getStats({ ...data, _email: callerEmail });
        break;
      default:
        result = { error: 'Invalid action' };
    }
    
    return createResponse(result);
  } catch (error) {
    console.error('Error in doPost:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

/**
 * Create a new order
 */
function createOrder(data) {
  const sheet = initializeSheet();
  const id = generateOrderId();
  // Use Date object for stable storage and ISO for API response
  const now = new Date();
  const timestampISO = now.toISOString();
  var caller = (data && data._email) || (data && data.createdBy) || (data && data.employee) || 'unknown@local';
  // Force employee = caller email để đảm bảo quyền sở hữu
  var employeeEmail = String(caller).toLowerCase();
  var employeeName = getEmployeeNameByEmail(employeeEmail) || '';
  
  const newRow = [
    id,
    // Store Date object in sheet for reliable sorting/filtering
    now,
    employeeEmail,
    employeeName,
    data.service || '',
    data.price || 0,
    data.notes || ''
  ];
  
  sheet.appendRow(newRow);
  
  return {
    success: true,
    order: {
      id: id,
      // Return ISO string to clients
      timestamp: timestampISO,
      employee: employeeEmail,
      employeeName: employeeName,
      service: data.service,
      price: data.price,
      notes: data.notes
    }
  };
}

/**
 * Get orders with optional filters
 */
function getOrders(params) {
  const sheet = initializeSheet();
  const data = sheet.getDataRange().getValues();
  var requester = params && params._email;
  
  if (data.length <= 1) {
    return { orders: [], total: 0 };
  }
  
  // Determine limit (cap by MAX_ORDERS_PER_REQUEST)
  var max = (CONFIG && CONFIG.MAX_ORDERS_PER_REQUEST) || 100;
  var limit = parseInt(params && params.limit, 10);
  if (!(limit > 0)) limit = max;
  if (limit > max) limit = max;

  // Optional day filter
  var haveDayFilter = false;
  var dayStart = null, dayEnd = null;
  if (params && params.date) {
    var d = new Date(params.date);
    if (!isNaN(d.getTime())) {
      dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
      haveDayFilter = true;
    }
  }
  
  const orders = [];
  // Iterate from newest to oldest (bottom-up)
  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i];
    
    // Enforce ownership theo email nhân viên
    if (requester && String(row[COLUMNS.EMPLOYEE]).toLowerCase() !== String(requester).toLowerCase()) {
      continue;
    }

    // Parse timestamp as Date
    var ts = row[COLUMNS.TIMESTAMP];
    if (!(ts instanceof Date)) ts = new Date(ts);

    // Apply day filter (and break early when older than dayStart)
    if (haveDayFilter) {
      if (ts >= dayEnd) {
        // This row is newer than the target day; keep scanning older ones
        continue;
      }
      if (ts < dayStart) {
        // Older than requested day; since we are bottom-up, earlier rows will be even older
        break;
      }
    }

    // Apply employee filter if provided
    if (params && params.employee && row[COLUMNS.EMPLOYEE] !== params.employee) {
      continue;
    }

    orders.push({
      id: row[COLUMNS.ID],
      timestamp: row[COLUMNS.TIMESTAMP],
      employee: row[COLUMNS.EMPLOYEE],
      employeeName: row[COLUMNS.EMPLOYEE_NAME],
      service: row[COLUMNS.SERVICE],
      price: row[COLUMNS.PRICE],
      notes: row[COLUMNS.NOTES]
    });

    if (orders.length >= limit) break;
  }
  
  // Orders are already in newest-first order due to bottom-up scan
  return {
    orders: orders,
    total: orders.length
  };
}

/**
 * Get statistics
 */
function getStats(params) {
  const sheet = initializeSheet();
  const data = sheet.getDataRange().getValues();
  var requester = params && params._email;
  
  if (data.length <= 1) {
    return {
      todayCount: 0,
      todayRevenue: 0,
      monthRevenue: 0,
      totalOrders: 0
    };
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

  let todayCount = 0;
  let todayRevenue = 0;
  let monthRevenue = 0;
  let totalOrders = 0; // Count within current month (sufficient for UI)

  // Iterate from newest to oldest; break when older than current month
  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i];
    if (requester && String(row[COLUMNS.EMPLOYEE]).toLowerCase() !== String(requester).toLowerCase()) continue;

    var ts = row[COLUMNS.TIMESTAMP];
    if (!(ts instanceof Date)) ts = new Date(ts);

    if (ts < monthStart) {
      // Older than current month: stop scanning
      break;
    }

    // Only count within current month
    if (ts >= monthStart && ts < nextMonthStart) {
      var priceRaw = row[COLUMNS.PRICE];
      var price = 0;
      if (typeof priceRaw === 'number') {
        price = priceRaw;
      } else if (priceRaw != null) {
        var digits = String(priceRaw).replace(/\D+/g, '');
        price = digits ? parseInt(digits, 10) : 0;
      }

      totalOrders++;
      monthRevenue += price;

      if (ts >= todayStart && ts < tomorrowStart) {
        todayCount++;
        todayRevenue += price;
      }
    }
  }

  return {
    todayCount: todayCount,
    todayRevenue: todayRevenue,
    monthRevenue: monthRevenue,
    totalOrders: totalOrders,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Update an order (mainly for marking as deleted)
 */
function updateOrder(data) {
  // Không hỗ trợ cập nhật trạng thái khi đã bỏ các cột H/I/J
  return { success: false, error: 'Not supported' };
}

/**
 * Delete an order (soft delete)
 */
function deleteOrder(data) {
  var sheet = initializeSheet();
  var values = sheet.getDataRange().getValues();
  var requester = data && data._email;

  for (var i = 1; i < values.length; i++) {
    if (values[i][COLUMNS.ID] === data.id) {
      // Chỉ cho phép nhân viên (theo email) xóa đơn của chính họ
      if (requester && String(values[i][COLUMNS.EMPLOYEE]).toLowerCase() !== String(requester).toLowerCase()) {
        return { success: false, error: 'Forbidden' };
      }
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Order row deleted', id: data.id };
    }
  }

  return { success: false, error: 'Order not found' };
}

/**
 * Generate unique order ID
 */
function generateOrderId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Check if origin is allowed (CORS)
 */
function isAllowedOrigin(origin) {
  if (!origin) return true; // Allow if no origin (e.g., direct access)
  return CONFIG.ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
}

/**
 * Create JSON response with CORS headers
 */
function createResponse(data, status = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Add CORS headers
  return output;
}

/**
 * Handle CORS preflight requests
 */
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Test function for development
 */
function testAPI() {
  // Initialize sheet
  initializeSheet();
  
  // Test create order
  const testOrder = {
    employee: 'test@salon.com',
    service: 'Cắt tóc',
    price: 150000,
    notes: 'Test order',
    createdBy: 'test@salon.com'
  };
  
  const result = createOrder(testOrder);
  console.log('Create result:', result);
  
  // Test get orders
  const orders = getOrders({});
  console.log('Orders:', orders);
  
  // Test get stats
  const stats = getStats({});
  console.log('Stats:', stats);
}
