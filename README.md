# 💇‍♀️ Salon Manager PWA

Web app PWA đơn giản để quản lý đơn hàng cho salon tóc nhỏ, hoạt động hoàn toàn trên GitHub Pages.

## 🚀 Demo

Bạn có thể test ngay bằng cách mở file `index.html` trong trình duyệt hoặc sử dụng Live Server trong VS Code.

## ✨ Tính năng

### Đã hoàn thành (Phase 1)
- ✅ Giao diện mobile-first responsive
- ✅ Form nhập đơn hàng đơn giản như Google Form
- ✅ Thống kê: Số đơn ngày, Doanh thu ngày, Doanh thu tháng
- ✅ Danh sách đơn hàng trong ngày
- ✅ Xóa đơn hàng với xác nhận
- ✅ Lưu dữ liệu local (localStorage)
- ✅ Mock authentication để test

### Đã hoàn thành (Phase 2)
- ✅ Google Sheets integration
- ✅ Google Apps Script API backend
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ Real-time statistics from Sheets
- ✅ API test tool

### Sắp tới
- ⏳ Google OAuth authentication (Phase 3)
- ⏳ Tích hợp Frontend với Backend (Phase 4)
- ⏳ PWA với offline support (Phase 5)
- ⏳ Deploy lên GitHub Pages (Phase 6)

## 📱 Sử dụng

### Test ngay (Phase 1)
1. Mở `index.html` trong trình duyệt
2. Click "Đăng nhập với Google" (mock login)
3. Nhập đơn hàng mới:
   - Chọn dịch vụ
   - Nhập giá tiền
   - Thêm ghi chú (tùy chọn)
   - Click "Lưu đơn hàng"
4. Xem danh sách và thống kê được cập nhật tự động

### Cấu trúc project
```
Hairsalon-PWA/
├── index.html              # File HTML chính
├── css/
│   └── styles.css         # Custom styles
├── js/
│   ├── app.js            # Logic chính
│   ├── auth.js           # Authentication (Phase 3)
│   ├── api.js            # API calls (Phase 4)
│   └── utils.js          # Utility functions
├── icons/                 # PWA icons
├── config.js             # App configuration
├── config.example.js     # Template config
└── README.md            # Documentation
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

---

**Version 1.0.0** - Phase 1 Complete 🎉
