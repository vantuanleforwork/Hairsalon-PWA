/**
 * Salon Manager - Google Apps Script Backend
 * Version: 1.0.1
 *
 * Backend API for the Salon Manager PWA
 * - Uses Google Sheets as the database
 * - Vietnamese headers per request: Timestamp → Thời gian, Employee → Email nhân viên, Tên nhân viên (unchanged), Service → Dịch vụ, Price → Giá, Notes → Ghi chú
 */

// Configuration
const CONFIG = {
  SPREADSHEET_ID: '1dqxdNQTdIvf7mccYMW825Xiuck-vK3kOOcHkn-YCphU',
  SHEET_NAME: 'Đơn hàng',
  GOOGLE_CLIENT_ID: '36454863313-tlsos46mj2a63sa6k4hjralerarugtku.apps.googleusercontent.com',
  MAX_ORDERS_PER_REQUEST: 100,
  // Rate limiting
  RATE_LIMIT_REQUESTS: 60, // Max requests per time window
  RATE_LIMIT_WINDOW: 60 * 1000, // Time window in milliseconds (1 minute)
  MAX_PRICE: 50000, // Maximum price in thousands (50 million VND)
  MIN_PRICE: 1, // Minimum price in thousands (1000 VND)
  MAX_NOTES_LENGTH: 500, // Maximum notes length
  MAX_SERVICE_NAME_LENGTH: 100 // Maximum service name length
};

/** Lấy sheet "Nhân viên" (đảm bảo tồn tại và có header) */
function getNhanVienSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Nhân viên');
  if (!sheet) {
    sheet = ss.insertSheet('Nhân viên');
    sheet.getRange(1, 1, 1, 3).setValues([['Email', 'Tên nhân viên', 'Vai trò']]);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return sheet;
  }
  try {
    const newHeaders = ['Email', 'Tên nhân viên', 'Vai trò'];
    sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
  } catch (e) {}
  return sheet;
}

/** Đọc danh sách email được phép từ sheet "Nhân viên" */
function getAllowedEmails() {
  const sheet = getNhanVienSheet();
  const values = sheet.getDataRange().getValues();
  const emails = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var email = row[0]; // Email
    if (email) emails.push(String(email).toLowerCase());
  }
  return emails;
}

/** Lấy tên nhân viên theo email từ sheet "Nhân viên" */
function getEmployeeNameByEmail(email) {
  if (!email) return '';
  const sheet = getNhanVienSheet();
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

/** Rate limiting implementation */
const RateLimiter = {
  cache: CacheService.getScriptCache(),
  
  checkLimit: function(email) {
    const key = 'rate_' + email;
    const current = this.cache.get(key);
    
    if (!current) {
      // First request, initialize counter
      this.cache.put(key, '1', CONFIG.RATE_LIMIT_WINDOW / 1000);
      return true;
    }
    
    const count = parseInt(current);
    if (count >= CONFIG.RATE_LIMIT_REQUESTS) {
      return false; // Rate limit exceeded
    }
    
    // Increment counter
    this.cache.put(key, String(count + 1), CONFIG.RATE_LIMIT_WINDOW / 1000);
    return true;
  }
};

/** Input validation */
const Validator = {
  validatePrice: function(price) {
    // Accept either thousands-units (legacy) or full VND amounts
    // CONFIG.MIN_PRICE/MAX_PRICE are in thousands
    const numPrice = Number(price);
    if (isNaN(numPrice)) {
      throw new Error('Giá không hợp lệ (không phải số)');
    }

    // Normalize to VND
    const MIN_VND = CONFIG.MIN_PRICE * 1000;      // 1,000 VND
    const MAX_VND = CONFIG.MAX_PRICE * 1000;      // 50,000,000 VND

    let vnd = numPrice;
    // If looks like thousands-based input (legacy), convert to VND
    if (numPrice >= CONFIG.MIN_PRICE && numPrice <= CONFIG.MAX_PRICE) {
      vnd = numPrice * 1000;
    }

    if (vnd < MIN_VND || vnd > MAX_VND) {
      throw new Error('Giá không hợp lệ (1,000 - 50,000,000 VND)');
    }
    return vnd;
  },
  
  validateService: function(service) {
    if (!service || typeof service !== 'string' || service.trim().length === 0) {
      throw new Error('Dịch vụ không được để trống');
    }
    if (service.length > CONFIG.MAX_SERVICE_NAME_LENGTH) {
      throw new Error('Tên dịch vụ quá dài');
    }
    // Sanitize input to prevent injection
    return service.trim().replace(/[<>"']/g, '');
  },
  
  validateNotes: function(notes) {
    if (notes && notes.length > CONFIG.MAX_NOTES_LENGTH) {
      throw new Error('Ghi chú quá dài');
    }
    // Sanitize input
    return notes ? notes.trim().replace(/[<>"']/g, '') : '';
  },
  
  validateDate: function(date) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Ngày không hợp lệ');
    }
    return date;
  }
};

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

// Column indices (0-based)
const COLUMNS = {
  ID: 0,              // A
  TIMESTAMP: 1,       // B
  EMPLOYEE: 2,        // C (email)
  EMPLOYEE_NAME: 3,   // D (tên nhân viên)
  SERVICE: 4,         // E
  PRICE: 5,           // F
  NOTES: 6            // G
};

/** Initialize the order sheet with headers if missing */
function initializeSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    const legacy = ss.getSheetByName('Orders');
    if (legacy) {
      legacy.setName(CONFIG.SHEET_NAME);
      sheet = legacy;
    }
  }

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    const headers = ['ID', 'Thời gian', 'Email nhân viên', 'Tên nhân viên', 'Dịch vụ', 'Giá', 'Ghi chú'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else {
    // Ensure column D exists and is labeled
    const firstRow = sheet.getRange(1, 1, 1, Math.max(7, sheet.getLastColumn())).getValues()[0];
    var hasNameCol = false;
    for (var i = 0; i < firstRow.length; i++) {
      if (String(firstRow[i]).toLowerCase().indexOf('tên nhân viên') >= 0) { hasNameCol = true; break; }
    }
    if (!hasNameCol) {
      sheet.insertColumnAfter(3);
      sheet.getRange(1, 4).setValue('Tên nhân viên');
    }
    // Trim optional extra columns H-J if present
    if (sheet.getLastColumn() >= 10) sheet.deleteColumn(10);
    if (sheet.getLastColumn() >= 9) sheet.deleteColumn(9);
    if (sheet.getLastColumn() >= 8) sheet.deleteColumn(8);
  }

  // Ensure Employees sheet exists
  // Removed legacy "Employees" sheet; only using "Nhân viên" now.
  return sheet;
}

/** Handle GET requests */
function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action || 'orders';

    // Require valid idToken for protected endpoints
    if (action !== 'health') {
      var email = verifyIdToken(params && params.idToken);
      if (!email) return createResponse({ error: 'Unauthorized' });
      if (!isAllowedEmail(email)) return createResponse({ error: 'Forbidden' });
      
      // Check rate limit
      if (!RateLimiter.checkLimit(email)) {
        return createResponse({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.' });
      }
      
      // attach for downstream filtering
      params._email = email;
    }

    let result;
    switch (action) {
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
    return createResponse({ error: error.toString() });
  }
}

/** Handle POST requests */
function doPost(e) {
  try {
    // Try to parse JSON body first; fallback to form-encoded
    var data = {};
    try {
      if (e && e.postData && e.postData.type && e.postData.type.indexOf('application/json') >= 0) {
        data = JSON.parse(e.postData.contents || '{}');
      } else {
        // Fallback: try parameter first then JSON parse
        data = (e && e.parameter && Object.keys(e.parameter).length) ? e.parameter : JSON.parse(e.postData && e.postData.contents || '{}');
      }
    } catch (parseErr) {
      data = (e && e.parameter) || {};
    }

    var action = data.action || 'create';

    // Origin check removed; rely on idToken verification

    // Verify idToken and get caller email
    var callerEmail = verifyIdToken((data && data.idToken) || (e && e.parameter && e.parameter.idToken));
    if (!callerEmail) return createResponse({ error: 'Unauthorized' });
    if (!isAllowedEmail(callerEmail)) return createResponse({ error: 'Forbidden' });
    
    // Check rate limit
    if (!RateLimiter.checkLimit(callerEmail)) {
      return createResponse({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.' });
    }

    var result;
    switch (action) {
      case 'create':
        result = createOrder({ ...data, _email: callerEmail });
        break;
      
      case 'delete':
        result = deleteOrder({ ...data, _email: callerEmail });
        break;
      case 'orders':
        result = getOrders({ ...data, _email: callerEmail });
        break;
      case 'stats':
        result = getStats({ ...data, _email: callerEmail });
        break;
      default:
        result = { error: 'Invalid action' };
    }

    return createResponse(result);
  } catch (error) {
    return createResponse({ error: error.toString() });
  }
}

/** Create a new order */
function createOrder(data) {
  try {
    // Validate inputs
    const validatedService = Validator.validateService(data.service);
    const validatedPrice = Validator.validatePrice(data.price);
    const validatedNotes = Validator.validateNotes(data.notes);
    
    const sheet = initializeSheet();
    const id = generateOrderId();
    // Use Date object for stable storage and ISO for API response
    const now = new Date();
    const timestampISO = now.toISOString();
    var caller = (data && data._email) || (data && data.createdBy) || (data && data.employee) || 'unknown@local';
    // Force employee = caller email
    var employeeEmail = String(caller).toLowerCase();
    var employeeName = getEmployeeNameByEmail(employeeEmail) || '';

    const newRow = [
      id,
      // Store Date object in sheet for reliable sorting/filtering
      now,
      employeeEmail,
      employeeName,
      validatedService,
      validatedPrice,
      validatedNotes
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
        service: validatedService,
        price: validatedPrice,
        notes: validatedNotes
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || error.toString()
    };
  }
}

/** Get orders with optional filters */
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

    // Enforce ownership by employee email
    if (requester && String(row[COLUMNS.EMPLOYEE]).toLowerCase() !== String(requester).toLowerCase()) {
      continue;
    }

    // Parse timestamp as Date
    var ts = row[COLUMNS.TIMESTAMP];
    if (!(ts instanceof Date)) ts = new Date(ts);

    // Apply day filter (and break early when older than dayStart)
    if (haveDayFilter) {
      if (ts >= dayEnd) {
        // Newer than the target day; keep scanning
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

  return { orders: orders, total: orders.length };
}

/** Get statistics */
function getStats(params) {
  const sheet = initializeSheet();
  const data = sheet.getDataRange().getValues();
  var requester = params && params._email;

  if (data.length <= 1) {
    return { todayCount: 0, todayRevenue: 0, monthRevenue: 0, totalOrders: 0 };
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

  let todayCount = 0;
  let todayRevenue = 0;
  let monthRevenue = 0;
  let totalOrders = 0;

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

/** Update an order (not supported post clean-up) */
// updateOrder removed (not supported)

/** Delete an order (by ID), only by owner */
function deleteOrder(data) {
  var sheet = initializeSheet();
  var values = sheet.getDataRange().getValues();
  var requester = data && data._email;

  for (var i = 1; i < values.length; i++) {
    if (values[i][COLUMNS.ID] === data.id) {
      if (requester && String(values[i][COLUMNS.EMPLOYEE]).toLowerCase() !== String(requester).toLowerCase()) {
        return { success: false, error: 'Forbidden' };
      }
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Order row deleted', id: data.id };
    }
  }

  return { success: false, error: 'Order not found' };
}

/** Generate unique order ID */
function generateOrderId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Origin allowlist removed

/** Create JSON response */
function createResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/** Handle CORS preflight */
// doOptions removed (Apps Script uses doGet/doPost)

/** Test helper */
function testAPI() {
  initializeSheet();
}
