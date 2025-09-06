# 📋 Hướng dẫn Setup Google Sheets & Apps Script

## Bước 1: Tạo Google Sheets mới

1. Đăng nhập Google Account
2. Truy cập [Google Sheets](https://sheets.google.com)
3. Click **"+"** để tạo Spreadsheet mới
4. Đặt tên: **"Salon Manager Database"**
5. Copy **Spreadsheet ID** từ URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```
   Ví dụ: `1ABC123def456GHI789jkl`

## Bước 2: Setup Google Apps Script

### 2.1 Mở Apps Script Editor

1. Trong Google Sheets, vào menu **Extensions** → **Apps Script**
2. Xóa code mặc định trong file `Code.gs`

### 2.2 Copy code backend

1. Copy toàn bộ nội dung file `Code.gs` trong thư mục này
2. Paste vào Apps Script editor
3. Thay thế `YOUR_SPREADSHEET_ID_HERE` bằng Spreadsheet ID từ Bước 1
4. Thay thế `https://yourusername.github.io` bằng URL GitHub Pages của bạn (nếu có)

### 2.3 Save và test

1. Click **💾 Save** (Ctrl+S)
2. Đặt tên project: **"Salon Manager API"**
3. Click **▶️ Run** → Chọn function `testAPI`
4. Lần đầu sẽ yêu cầu quyền:
   - Click **Review permissions**
   - Chọn Google account
   - Click **Advanced** → **Go to Salon Manager API (unsafe)**
   - Click **Allow**

## Bước 3: Deploy as Web App

### 3.1 Deploy

1. Click **Deploy** → **New Deployment**
2. Settings:
   - **Type**: Web app
   - **Description**: Salon Manager API v1
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
3. Click **Deploy**

### 3.2 Copy Web App URL

Copy URL được tạo, dạng:
```
https://script.google.com/macros/s/AKfycbw.../exec
```

⚠️ **LƯU Ý**: Lưu URL này để config frontend!

## Bước 4: Test API

### Test với browser:

1. Health check:
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=health
```

2. Get orders:
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=orders
```

3. Get stats:
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=stats
```

### Test với curl:

```bash
# Health check
curl "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=health"

# Create order (POST)
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"action":"create","employee":"test@salon.com","service":"Cắt tóc","price":150000}' \
  "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
```

## Bước 5: Update Frontend Config

1. Mở file `config.js` trong project
2. Update:
```javascript
const APP_CONFIG = {
    // Thay bằng URL từ Bước 3.2
    API_BASE_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
    
    // Thay bằng GitHub Pages URL của bạn
    PRODUCTION_URL: 'https://yourusername.github.io/salon-app/',
    
    // ...rest của config
};
```

## 📊 Cấu trúc Google Sheets

Sheet **"Orders"** sẽ có các cột:

| Column | Field | Description |
|--------|-------|-------------|
| A | ID | Order ID duy nhất |
| B | Timestamp | Thời gian tạo đơn |
| C | Employee | Email nhân viên |
| D | Service | Tên dịch vụ |
| E | Price | Giá tiền (VNĐ) |
| F | Notes | Ghi chú |
| G | Status | active/deleted |
| H | Created By | Người tạo |
| I | Modified At | Lần sửa cuối |

## 🔧 Troubleshooting

### Lỗi "Script function not found: doGet"
- Đảm bảo đã save code
- Đảm bảo copy đúng toàn bộ code

### Lỗi CORS
- Kiểm tra ALLOWED_ORIGINS trong code
- Thêm domain của bạn vào list

### Lỗi "Exception: Spreadsheet ID not found"
- Kiểm tra lại SPREADSHEET_ID
- Đảm bảo Sheets và Script cùng account

### Lỗi Permission denied
- Re-deploy với "Anyone" access
- Clear cache browser và thử lại

## 🔄 Update code

Khi cần update API:

1. Sửa code trong Apps Script
2. Save
3. **Deploy** → **Manage Deployments**
4. Click **Edit** 🖊️
5. **Version**: New version
6. **Description**: Mô tả thay đổi
7. **Deploy**

⚠️ URL không đổi, nhưng version mới sẽ active

## ✅ Checklist

- [ ] Tạo Google Sheets
- [ ] Copy Spreadsheet ID
- [ ] Setup Apps Script
- [ ] Replace SPREADSHEET_ID trong code
- [ ] Test function testAPI
- [ ] Deploy as Web App
- [ ] Copy Web App URL
- [ ] Test API endpoints
- [ ] Update frontend config
- [ ] Test từ frontend

## 📞 API Endpoints

### GET Endpoints:

1. **Get Orders**
```
GET /exec?action=orders
GET /exec?action=orders&date=2025-01-06
GET /exec?action=orders&employee=user@gmail.com
```

2. **Get Statistics**
```
GET /exec?action=stats
```

3. **Health Check**
```
GET /exec?action=health
```

### POST Endpoints:

1. **Create Order**
```javascript
POST /exec
Body: {
  "action": "create",
  "employee": "user@gmail.com",
  "service": "Cắt tóc",
  "price": 150000,
  "notes": "Khách quen"
}
```

2. **Delete Order** (Soft delete)
```javascript
POST /exec
Body: {
  "action": "delete",
  "id": "order_id_here"
}
```

---

**Ready! 🚀** Backend API đã sẵn sàng để tích hợp với frontend.
