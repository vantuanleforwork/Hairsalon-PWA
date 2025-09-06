# 🔐 Hướng dẫn Setup Google OAuth 2.0

## Bước 1: Tạo Google Cloud Console Project

### 1.1 Truy cập Google Cloud Console
1. Đi tới [Google Cloud Console](https://console.cloud.google.com/)
2. Đăng nhập với Google Account

### 1.2 Tạo Project mới
1. Click **Select a project** ở top bar
2. Click **New Project**
3. Điền thông tin:
   - **Project name**: `Salon Manager PWA`
   - **Organization**: Để trống (No organization)
4. Click **Create**
5. Chờ project được tạo và **Select project** vừa tạo

## Bước 2: Enable APIs

### 2.1 Enable Google Sheets API
1. Vào **APIs & Services** → **Library**
2. Search "Google Sheets API"
3. Click vào **Google Sheets API**
4. Click **Enable**

### 2.2 Enable Google Drive API (Optional - để access sheets)
1. Search "Google Drive API"
2. Click **Enable**

## Bước 3: Configure OAuth Consent Screen

### 3.1 OAuth Consent Screen
1. Vào **APIs & Services** → **OAuth consent screen**
2. Chọn **External** (để cho phép bất kỳ Gmail nào đăng nhập)
3. Click **Create**

### 3.2 App Information
Điền thông tin:
- **App name**: `Salon Manager`
- **User support email**: Email của bạn
- **App logo**: Upload logo salon (optional)
- **Application home page**: `https://yourusername.github.io/salon-app/`
- **Application privacy policy link**: Để trống hoặc link đến privacy policy
- **Application terms of service link**: Để trống
- **Authorized domains**: `yourusername.github.io`
- **Developer contact information**: Email của bạn

Click **Save and Continue**

### 3.3 Scopes
1. Click **Add or Remove Scopes**
2. Chọn các scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
3. Click **Update** → **Save and Continue**

### 3.4 Test Users (cho Development)
1. Click **Add Users**
2. Thêm các email nhân viên salon:
   - `employee1@gmail.com`
   - `employee2@gmail.com` 
   - `owner@gmail.com`
3. Click **Save and Continue**

## Bước 4: Tạo OAuth 2.0 Credentials

### 4.1 Create Credentials
1. Vào **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**

### 4.2 Application Type
1. **Application type**: Web application
2. **Name**: `Salon Manager Web Client`

### 4.3 Authorized JavaScript Origins
Thêm các URLs:
- `http://localhost:5500` (cho development)
- `http://127.0.0.1:5500` (cho development)
- `https://yourusername.github.io` (cho production)

### 4.4 Authorized Redirect URIs
Thêm các URLs:
- `http://localhost:5500/` (cho development)
- `https://yourusername.github.io/salon-app/` (cho production)

### 4.5 Lưu Client ID
1. Click **Create**
2. **QUAN TRỌNG**: Copy và lưu **Client ID**
   ```
   123456789-abcdef.apps.googleusercontent.com
   ```
3. Click **OK**

## Bước 5: Update Frontend Config

### 5.1 Update config.js
```javascript
const APP_CONFIG = {
    // Paste Client ID vừa copy
    GOOGLE_CLIENT_ID: '123456789-abcdef.apps.googleusercontent.com',
    
    // Danh sách email được phép login
    ALLOWED_EMAILS: [
        'employee1@gmail.com',
        'employee2@gmail.com', 
        'employee3@gmail.com',
        'owner@salon.com'
    ],
    
    // Production URL
    PRODUCTION_URL: 'https://yourusername.github.io/salon-app/',
    
    // ... rest of config
};
```

## Bước 6: Test OAuth

### 6.1 Test Local
1. Mở web app bằng Live Server
2. Click "Đăng nhập với Google"
3. Chọn account được whitelist
4. Kiểm tra có đăng nhập thành công không

### 6.2 Test Production
1. Deploy lên GitHub Pages
2. Test trên URL production
3. Verify OAuth flow

## 🔧 Troubleshooting

### Lỗi "redirect_uri_mismatch"
- Check **Authorized JavaScript origins**
- Check **Authorized redirect URIs**
- Đảm bảo URL match chính xác

### Lỗi "access_blocked"
- App chưa được Google verify
- Thêm email vào **Test users** trong OAuth consent screen
- Hoặc publish app để public

### Lỗi "invalid_client"
- Check Client ID trong config.js
- Đảm bảo copy đúng Client ID

### Email không được phép login
- Check ALLOWED_EMAILS array trong config.js
- Case sensitive (phân biệt hoa thường)

## 📋 Security Checklist

- [ ] Client ID được config đúng
- [ ] Authorized origins match URLs
- [ ] ALLOWED_EMAILS được setup
- [ ] Test với email được phép
- [ ] Test với email không được phép (should block)
- [ ] Logout flow hoạt động
- [ ] Token được clear khi logout

## 📝 Notes

1. **Development vs Production**:
   - Development: localhost URLs
   - Production: GitHub Pages URLs

2. **Email Whitelist**:
   - Chỉ emails trong ALLOWED_EMAILS mới login được
   - Thêm/bớt emails trong config.js

3. **Google Review** (Optional):
   - App có thể cần Google review để public
   - Với internal use, không cần review

---

**OAuth 2.0 Setup Complete! 🔐**
