# 🚀 Hướng dẫn Deploy lên GitHub Pages

## ✅ Checklist tương thích GitHub Pages

### Những gì CÓ THỂ làm:
- ✅ Static HTML/CSS/JavaScript
- ✅ PWA với Service Worker
- ✅ Client-side Google OAuth
- ✅ Fetch API calls tới external APIs
- ✅ LocalStorage/IndexedDB
- ✅ Client-side routing
- ✅ HTTPS (tự động với GitHub Pages)

### Những gì KHÔNG THỂ làm:
- ❌ Server-side code (Node.js, PHP)
- ❌ Database connections trực tiếp
- ❌ Environment variables (.env files)
- ❌ Server-side authentication
- ❌ File uploads lên server

## 📋 Các bước deployment

### 1. Setup Google Apps Script Backend
```javascript
// Deploy Google Apps Script làm Web App
// 1. Mở Google Apps Script
// 2. Copy code từ file google-apps-script/Code.gs
// 3. Deploy > New Deployment > Web App
// 4. Execute as: Me
// 5. Who has access: Anyone
// 6. Copy Web App URL
```

### 2. Setup Google OAuth
```bash
# Google Cloud Console
1. Tạo project mới
2. Enable Google Sheets API
3. Create OAuth 2.0 Client ID
4. Authorized JavaScript origins:
   - http://localhost:5500 (development)
   - https://yourusername.github.io (production)
5. Copy Client ID
```

### 3. Configure Frontend
```javascript
// 1. Copy config.example.js thành config.js
// 2. Điền thông tin:
const APP_CONFIG = {
    GOOGLE_CLIENT_ID: 'your-client-id.apps.googleusercontent.com',
    API_BASE_URL: 'https://script.google.com/macros/s/your-id/exec',
    ALLOWED_EMAILS: ['email1@gmail.com', 'email2@gmail.com'],
    PRODUCTION_URL: 'https://yourusername.github.io/salon-app/'
};
```

### 4. Deploy lên GitHub Pages
```bash
# Initialize git repository
git init
git add .
git commit -m "Initial PWA deployment"

# Create GitHub repository
# Push to GitHub
git remote add origin https://github.com/yourusername/salon-app.git
git branch -M main
git push -u origin main

# Enable GitHub Pages
# Settings > Pages > Source: Deploy from branch (main)
# Wait 5-10 minutes for deployment
```

### 5. Test PWA Installation
```bash
# Access your app
https://yourusername.github.io/salon-app/

# Check PWA install prompt
# Check offline functionality
# Test on mobile devices
```

## 🔐 Bảo mật

### Client-side (GitHub Pages)
```javascript
// KHÔNG BAO GIỜ commit các thông tin sau:
- API keys thực
- OAuth secrets
- Database credentials
- Email passwords

// Thay vào đó, sử dụng:
- Client-side validation
- Whitelist emails
- CORS restrictions
- Rate limiting in Apps Script
```

### Server-side (Google Apps Script)
```javascript
// Validate mọi request
function doPost(e) {
    // Check origin
    if (!isAllowedOrigin(e)) return errorResponse();
    
    // Validate user email
    if (!isAllowedEmail(e.parameter.email)) return errorResponse();
    
    // Process request
    return processRequest(e);
}
```

## 🎯 Optimization cho GitHub Pages

### 1. Minify Resources
```bash
# CSS/JS minification
- Sử dụng online tools hoặc build tools
- Giảm file size cho loading nhanh hơn
```

### 2. Image Optimization
```bash
# Compress images
- WebP format cho modern browsers
- Lazy loading cho images
- Responsive images với srcset
```

### 3. Cache Strategy
```javascript
// Service Worker
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
```

### 4. CDN Usage
```html
<!-- Use CDN for libraries -->
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2" rel="stylesheet">
```

## 📱 PWA Features trên GitHub Pages

### manifest.json
```json
{
    "name": "Salon Manager",
    "short_name": "Salon",
    "start_url": "/salon-app/",
    "display": "standalone",
    "theme_color": "#667eea",
    "background_color": "#ffffff",
    "icons": [...]
}
```

### Service Worker Registration
```javascript
// Check HTTPS (required for SW)
if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('/salon-app/sw.js');
}
```

## 🐛 Troubleshooting

### CORS Issues
```javascript
// Google Apps Script
function doPost(e) {
    return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders({
            'Access-Control-Allow-Origin': 'https://yourusername.github.io'
        });
}
```

### 404 Errors
```html
<!-- Create 404.html for SPA routing -->
<!DOCTYPE html>
<html>
<head>
    <script>
        // Redirect to index.html with path
        window.location.href = '/salon-app/';
    </script>
</head>
</html>
```

### PWA Not Installing
- ✅ Check HTTPS
- ✅ Valid manifest.json
- ✅ Service Worker registered
- ✅ Icons provided
- ✅ start_url matches

## 📞 Support

Nếu gặp vấn đề khi deploy:
1. Check GitHub Pages build status
2. Verify CORS settings
3. Test locally với Live Server
4. Check browser console for errors
5. Validate manifest.json

---

**Ready to deploy! 🚀**
