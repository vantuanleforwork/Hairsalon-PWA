# 🌐 Setup Real Google Apps Script API

## 🎯 Mục tiêu
Chuyển từ mock mode sang API thật để test đầy đủ tính năng backend.

## ⚡ Quick Setup (Recommended)

### 1. Tạo Google Sheets Database
1. Mở [Google Sheets](https://sheets.google.com)
2. Tạo spreadsheet mới: "Salon Manager Database" 
3. Tạo sheet "orders" với headers:
   ```
   A1: id
   B1: timestamp  
   C1: employee
   D1: service
   E1: price
   F1: notes
   G1: status
   ```

### 2. Deploy Google Apps Script
1. Từ Google Sheets, mở **Extensions > Apps Script**
2. Xóa code mặc định
3. Copy code từ `google-apps-script/Code.gs` vào Apps Script editor
4. Save project với tên: "Salon Manager API"
5. Deploy:
   - Click **Deploy > New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Access: **Anyone**
   - Click **Deploy**
   - Copy **Web app URL**

### 3. Update Config
```javascript
// Trong config.js, thay DEMO_ID bằng real URL:
API_BASE_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'
```

### 4. Test API
1. Mở `test-api-simple.html`
2. Kiểm tra API configuration shows "✅ CONFIGURED" 
3. Test từng endpoint:
   - Health Check
   - Get Stats
   - Get Orders
   - Create Order

## 🔧 Detailed Setup

### Google Apps Script Code
File `google-apps-script/Code.gs` chứa:
- ✅ CORS headers
- ✅ doGet() for GET requests
- ✅ doPost() for POST requests  
- ✅ Create order endpoint
- ✅ Get orders endpoint
- ✅ Get stats endpoint
- ✅ Error handling

### Expected Endpoints:
```
GET  ?action=health    # Health check
GET  ?action=stats     # Get statistics
GET  ?action=orders    # Get orders list
POST action=create     # Create new order
```

### Response Format:
```json
{
  "success": true,
  "data": {...},
  "message": "Success"
}
```

## 🧪 Testing Steps

### 1. Manual Browser Test
```
https://your-script-url/exec?action=health
```
Expected: JSON response hoặc "OK"

### 2. API Test Page
- Mở `test-api-simple.html`
- Click "Test Health" → Should get response
- Test other endpoints

### 3. Full Flow Test
- Mở `test-full-flow.html`
- All API tests should pass
- Full integration test: 3/3 passed

## 🚫 Common Issues & Fixes

### ❌ CORS Errors
**Problem**: API calls fail with CORS error
**Fix**: Ensure Apps Script has proper CORS headers:
```javascript
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({success: true}))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*');
}
```

### ❌ "Script not found"
**Problem**: URL returns 404
**Fix**: 
1. Check deployment URL is correct
2. Ensure script is deployed as "Web app"
3. Try redeploy with new version

### ❌ Permission Denied
**Problem**: "You don't have permission"
**Fix**:
1. Deploy with "Execute as: Me"  
2. Set access to "Anyone" or "Anyone with account"
3. Authorize permissions when prompted

### ❌ Empty Responses
**Problem**: API returns empty/undefined
**Fix**:
1. Check Google Sheets permissions
2. Ensure sheet names match code
3. Add error logging in Apps Script

## 📱 Mobile Testing

### HTTPS Required
- Apps Script URLs are HTTPS ✅
- Works on mobile browsers ✅
- No certificate issues ✅

### CORS Handling
- Modern browsers: Full CORS support
- Fallback: No-cors mode (limited response)
- Apps Script: Proper CORS headers

### Performance
- Apps Script cold start: 2-3 seconds first call
- Warm instances: 500ms-1s response
- Mobile networks: Add timeout handling

## 🔮 Production Checklist

### Before Going Live:
- [ ] Google Sheets database created
- [ ] Apps Script deployed as web app
- [ ] Real API URL in config.js
- [ ] All test endpoints working
- [ ] CORS properly configured
- [ ] Email whitelist updated
- [ ] OAuth client ID configured

### Monitoring:
- Apps Script execution logs
- Google Sheets data integrity
- API response times
- Error rates

## 🎯 Quick Commands

```bash
# Test health endpoint
curl "YOUR_APPS_SCRIPT_URL?action=health"

# Test with browser
start test-api-simple.html

# Full integration test  
start test-full-flow.html
```

## 🔄 Rollback to Mock

If real API has issues, quickly switch back:

```javascript
// In config.js
API_BASE_URL: 'https://script.google.com/macros/s/DEMO_ID/exec'
```

This enables mock mode in all test pages.

## 📞 Support

### Apps Script Documentation
- [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web)
- [Sheets API](https://developers.google.com/apps-script/reference/spreadsheet)

### Debug Tools
- Apps Script editor > Execution log
- Browser Developer Tools > Network tab
- `test-api-simple.html` console logs

---

**Ready to setup real API? Follow steps 1-4 above! 🚀**
