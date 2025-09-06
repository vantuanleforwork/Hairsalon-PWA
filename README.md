# 💇‍♀️ Salon Manager PWA

Web app PWA hoàn chỉnh để quản lý đơn hàng cho salon tóc nhỏ, với Google OAuth, backend API, search/filter và export data.

## 🚀 Current Status: Phase 4 Complete! 🎉

**Phase 1: Frontend UI** ✅ COMPLETE  
**Phase 2: Backend API** ✅ COMPLETE  
**Phase 3: OAuth Integration** ✅ COMPLETE  
**Phase 4: Frontend-Backend Integration** ✅ COMPLETE 🎆  
**Phase 5: PWA Features** 🔄 NEXT  
**Phase 6: Testing & Deployment** ⏳ PLANNED

## 🌟 Tính năng hoàn chỉnh

### ✅ Phase 1: UI/UX Foundation
- 📱 Mobile-first responsive design
- 🎨 Form nhập đơn hàng đẹp như Google Form
- 📊 Dashboard với thống kê real-time
- 📋 Danh sách đơn hàng interactive
- 🗑️ Xóa đơn hàng với confirmation
- 💾 LocalStorage fallback

### ✅ Phase 2: Backend Infrastructure
- 🗃️ Google Sheets database integration
- ⚡ Google Apps Script API endpoints
- 🔄 CRUD operations (Create, Read, Update, Delete)
- 📈 Real-time statistics calculation
- 🧪 Comprehensive API testing tools

### ✅ Phase 3: Authentication
- 🔐 Google OAuth 2.0 integration
- 👥 Email whitelist security
- 🎟️ JWT token management
- 🔄 Session persistence
- 📱 Mobile OAuth support

### ✅ Phase 4: Full Integration
- 🔗 Frontend-Backend full integration
- 🔍 Advanced search & filter system
- 📊 Real-time statistics sync
- 🛠️ Comprehensive testing suite

### 🔮 Phase 5: PWA Features (Next)
- 📱 Service Worker
- 📴 Offline support
- 🔄 Background sync
- 📲 App installation prompt

## 🎮 Sử dụng

### 🚀 Quick Start
1. Mở `index.html` trong trình duyệt
2. Đăng nhập bằng Google OAuth (hoặc fallback demo)
3. Nhập đơn hàng mới:
   - Chọn dịch vụ từ grid buttons
   - Nhập giá tiền (nghìn đồng)
   - Thêm ghi chú nếu cần
   - Click "Lưu đơn hàng"
4. Sử dụng tính năng nâng cao:
   - 🔍 Tìm kiếm và lọc đơn hàng
   - 📊 Xem thống kê real-time

### 🧠 Testing Tools
- `test-api.html` - Test Google Apps Script API
- `test-oauth.html` - Test Google OAuth flow  
- `test-full-flow.html` - Test toàn bộ tính năng

### 🏠 Cấu trúc project
```
Hairsalon-PWA/
├── index.html                  # Main app
├── manifest.json              # PWA manifest
├── js/
│   ├── app.js                # Main app logic
│   ├── auth.js               # OAuth authentication
│   ├── api.js                # API integration
│   ├── search.js             # Search & filter
│   └── utils.js              # Utilities
├── google-apps-script/        # Backend code
│   └── Code.gs               # Apps Script API
├── test-*.html                # Testing tools
├── config.js                  # App configuration
└── icons/                     # PWA icons
```

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (Tailwind), JavaScript (Vanilla)
- **Database**: Google Sheets (Phase 2)
- **Backend**: Google Apps Script (Phase 2)
- **Authentication**: Google OAuth 2.0 (Phase 3)
- **Hosting**: GitHub Pages
- **PWA**: Service Worker, Manifest (Phase 5)

## 📋 Roadmap

### Phase 1: Frontend (✅ Hoàn thành)
- Giao diện HTML/CSS responsive
- Form nhập liệu
- Mock data với localStorage
- Basic JavaScript interactions

### Phase 2: Google Sheets & Apps Script
- Setup Google Sheets template
- Create Apps Script API
- CORS configuration

### Phase 3: Authentication
- Google Cloud Console setup
- OAuth 2.0 implementation
- Email whitelist

### Phase 4: API Integration
- Connect frontend to backend
- CRUD operations
- Real-time sync

### Phase 5: PWA Features
- Service Worker
- Offline support
- Install prompt
- Background sync

### Phase 6: Deployment
- GitHub Pages setup
- Custom domain (optional)
- Performance optimization
- User documentation

## 🔧 Development

### Prerequisites
- Modern web browser
- Text editor (VS Code recommended)
- Live Server extension (optional)

### Local development
```bash
# Clone repo
git clone https://github.com/yourusername/salon-app.git

# Open in VS Code
code salon-app

# Run with Live Server or open index.html
```

### Configuration
1. Copy `config.example.js` to `config.js`
2. Update với thông tin thực của bạn:
   - Google Client ID
   - Apps Script URL
   - Allowed emails
   - Production URL

## 📝 Notes

- App được thiết kế mobile-first
- Không cần server, chạy hoàn toàn trên client
- Data sync qua Google Sheets API
- Bảo mật với email whitelist

## 📄 License

MIT License - Free to use and modify

## 👨‍💻 Author

Salon Manager PWA Team

## 📚 Tài liệu chi tiết

- [`PHASE4_SUMMARY.md`](PHASE4_SUMMARY.md) - Tổng hợp Phase 4
- [`SETUP_GUIDE.md`](SETUP_GUIDE.md) - Hướng dẫn thiết lập
- [`API_SETUP.md`](API_SETUP.md) - Cài đặt Google Apps Script
- [`OAUTH_SETUP.md`](OAUTH_SETUP.md) - Cài đặt Google OAuth

---

**Version 4.0.0** - Phase 4 Complete! 🚀🎆

**Tính năng mới trong Phase 4:**
- 🔗 Full frontend-backend integration
- 🔍 Advanced search & filter system  
- 📊 Real-time API statistics sync
- 🛠️ Comprehensive testing suite
- 📱 Enhanced mobile experience
