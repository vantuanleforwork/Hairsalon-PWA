# 🚀 SETUP BACKEND - Google Apps Script

Hướng dẫn chi tiết setup backend Google Apps Script cho Hair Salon Management System.

## 📋 STEP 1: TẠO GOOGLE SHEETS DATABASE

### 1.1 Tạo Google Sheets mới
1. Truy cập [Google Sheets](https://sheets.google.com)
2. Click **"+ Blank"** để tạo sheet mới
3. Đổi tên thành **"Salon Orders Database"**

### 1.2 Tạo Orders Sheet
1. Đổi tên sheet đầu tiên thành **"Orders"**
2. Thêm header row (row 1) với các cột:
   ```
   A1: ID
   B1: Timestamp  
   C1: Staff
   D1: Service
   E1: Price
   F1: Note
   G1: Status
   ```

### 1.3 Tạo Staff Sheet  
1. Click **"+"** để thêm sheet mới
2. Đổi tên thành **"Staff"**
3. Thêm header row với các cột:
   ```
   A1: Email
   B1: Name
   C1: Role
   D1: Active
   ```
4. Thêm data mẫu (row 2):
   ```
   A2: owner@gmail.com
   B2: Owner
   C2: Admin
   D2: TRUE
   ```

### 1.4 Lưu Spreadsheet ID
1. Copy URL của Google Sheets
2. Extract Spreadsheet ID từ URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```
3. Lưu ID này để dùng sau

## 📋 STEP 2: SETUP GOOGLE APPS SCRIPT

### 2.1 Mở Apps Script Editor
1. Từ Google Sheets, click **Extensions** → **Apps Script**
2. Sẽ mở Apps Script editor với file `Code.gs` mặc định

### 2.2 Thêm các file service
1. Click **"+"** bên cạnh "Files" để thêm file mới
2. Tạo lần lượt các file sau:

#### File 1: Config.gs
```javascript
// Copy toàn bộ nội dung từ google-apps-script/Config.gs
```

#### File 2: AuthService.gs  
```javascript
// Copy toàn bộ nội dung từ google-apps-script/AuthService.gs
```

#### File 3: OrderService.gs
```javascript
// Copy toàn bộ nội dung từ google-apps-script/OrderService.gs
```

#### File 4: StaffService.gs
```javascript
// Copy toàn bộ nội dung từ google-apps-script/StaffService.gs
```

#### File 5: ValidationService.gs
```javascript
// Copy toàn bộ nội dung từ google-apps-script/ValidationService.gs
```

### 2.3 Cập nhật file Code.gs chính
1. Xóa nội dung mặc định của `Code.gs`  
2. Copy toàn bộ nội dung từ `google-apps-script/Code.gs`

## 📋 STEP 3: CẤU HÌNH CONFIG

### 3.1 Cập nhật Config.gs
Mở file `Config.gs` và thay đổi các giá trị sau:

```javascript
const CONFIG = {
  // Thay YOUR_SPREADSHEET_ID_HERE bằng ID thực tế
  SPREADSHEET_ID: 'your-actual-spreadsheet-id-here',
  
  // Cập nhật danh sách email nhân viên
  ALLOWED_EMAILS: [
    'owner@gmail.com',        // Thay bằng email owner thực tế
    'staff1@gmail.com',       // Thay bằng email nhân viên 1
    'staff2@gmail.com',       // Thay bằng email nhân viên 2  
    'staff3@gmail.com',       // Thay bằng email nhân viên 3
    'staff4@gmail.com'        // Thay bằng email nhân viên 4
  ],
  
  // Cập nhật admin emails
  ADMIN_EMAILS: [
    'owner@gmail.com'         // Thay bằng email admin thực tế
  ],
  
  // Cập nhật allowed domains (sẽ setup sau)
  ALLOWED_DOMAINS: [
    'https://yourusername.github.io', // Thay bằng GitHub Pages URL
    'http://localhost:8080',          // Cho development
    'http://127.0.0.1:8080'
  ]
};
```

## 📋 STEP 4: TEST VÀ INITIALIZE

### 4.1 Test Functions
1. Trong Apps Script editor, chọn function `initializeSheets`
2. Click **"Run"** để khởi tạo sheets
3. Authorize khi được yêu cầu
4. Check Google Sheets để confirm sheets được tạo đúng

### 4.2 Initialize Staff Data
1. Chọn function `StaffService.initializeStaffData`
2. Click **"Run"** để thêm staff data
3. Check Staff sheet để confirm data

## 📋 STEP 5: DEPLOY WEB APP

### 5.1 Deploy
1. Click **"Deploy"** → **"New deployment"**
2. Click gear icon → chọn **"Web app"**
3. Cấu hình:
   - **Description**: "Hair Salon API v1.0"
   - **Execute as**: "Me (your-email@gmail.com)"
   - **Who has access**: "Anyone"
4. Click **"Deploy"**

### 5.2 Authorize và Test
1. Click **"Authorize access"** nếu được yêu cầu
2. Authorize với Google account
3. Copy **Web app URL** (dạng: `https://script.google.com/macros/s/.../exec`)
4. Test bằng cách mở URL trong browser → Should see JSON response

### 5.3 Save Web App URL
Lưu Web app URL để dùng cho frontend:
```
https://script.google.com/macros/s/AKfycbx.../exec
```

## 📋 STEP 6: PRODUCTION SETUP

### 6.1 Update Environment
Trong `Config.gs`:
```javascript
ENV: 'production', // Đổi từ 'development'
```

### 6.2 Update Allowed Domains  
Sau khi setup GitHub Pages, cập nhật:
```javascript
ALLOWED_DOMAINS: [
  'https://your-actual-username.github.io',
  // Remove localhost URLs in production
]
```

### 6.3 Re-deploy
1. Click **"Deploy"** → **"Manage deployments"**
2. Click edit icon của current deployment
3. **Version**: "New version"
4. Click **"Deploy"**

## 🧪 TESTING ENDPOINTS

### Test với browser hoặc Postman:

#### Health Check (GET)
```
https://script.google.com/macros/s/.../exec
```

#### Create Order (POST)
```
URL: https://script.google.com/macros/s/.../exec
Body (form-data):
- action: createOrder
- email: owner@gmail.com
- data: {"service":"Cắt tóc","price":100000,"note":"Test order"}
```

#### Get Orders (POST)  
```
Body:
- action: getOrders
- email: owner@gmail.com
- data: {}
```

## 🔧 TROUBLESHOOTING

### Error: "Script function not found"
- Check function names trong Code.gs
- Ensure all service files are added correctly

### Error: "Spreadsheet not found"
- Verify SPREADSHEET_ID trong Config.gs
- Ensure spreadsheet is accessible by script owner

### Error: "Unauthorized" 
- Check email trong ALLOWED_EMAILS
- Verify Staff sheet has correct data

### Error: "Rate limited"
- Wait 1 minute between tests
- Check MAX_REQUESTS_PER_MINUTE setting

## 📝 LOGS VÀ DEBUGGING

### View Execution Logs
1. Apps Script Editor → **"Executions"**  
2. Click execution để xem logs chi tiết
3. Use `Logger.log()` trong code để debug

### Enable Debug Logging
Trong `Config.gs`:
```javascript
LOG_LEVEL: 'DEBUG',
ENABLE_LOGGING: true
```

## 🎉 DONE!

Backend đã sẵn sàng! Bây giờ có thể chuyển sang setup frontend.

**Next Steps:**
1. Setup Google OAuth Client ID
2. Tạo frontend PWA  
3. Connect frontend với backend API
4. Deploy lên GitHub Pages

**Backend URL để dùng:**
```
https://script.google.com/macros/s/.../exec
```
