# Hair Salon PWA - Ứng dụng quản lý đơn hàng salon chuyên nghiệp

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000)
![PWA](https://img.shields.io/badge/PWA-Ready-green.svg)
![Mobile](https://img.shields.io/badge/Mobile-Optimized-brightgreen.svg)
![Offline](https://img.shields.io/badge/Offline-Support-orange.svg)

Ứng dụng web progressive (PWA) hiện đại cho quản lý đơn hàng salon với khả năng hoạt động offline, đồng bộ dữ liệu và giao diện thân thiện trên mobile.

## ✨ Tính năng

### 🚀 Core Features
- **Quản lý đơn hàng**: Tạo, chỉnh sửa, xóa và theo dõi đơn hàng
- **Dashboard thống kê**: Báo cáo doanh thu, đơn hàng và khách hàng
- **Quản lý khách hàng**: Lưu trữ thông tin khách hàng và lịch sử
- **Quản lý dịch vụ**: Danh sách dịch vụ với giá và mô tả
- **Xác thực Google OAuth**: Đăng nhập an toàn với Google

### 📱 PWA Features
- **Offline Support**: Hoạt động hoàn toàn offline với Service Worker
- **Background Sync**: Đồng bộ dữ liệu khi có kết nối
- **Push Notifications**: Thông báo đơn hàng mới
- **App Install**: Cài đặt như ứng dụng native
- **Responsive Design**: Tối ưu cho mọi thiết bị

### 🔧 Technical Features
- **Modern JavaScript (ES6+)**: Module system, async/await
- **Mobile-First Design**: Touch-friendly UI/UX
- **Performance Optimized**: Lazy loading, code splitting
- **Security**: CSP, XSS protection, secure headers
- **Accessibility**: ARIA labels, keyboard navigation
- **Analytics**: Google Analytics tích hợp

## 📁 Cấu trúc dự án

```
Hairsalon-PWA/
├── 📄 index.html              # Entry point
├── 📄 offline.html            # Offline fallback page
├── 📄 manifest.json           # PWA manifest
├── 📄 sw.js                   # Service Worker
├── 📄 README.md              # Documentation
│
├── 📂 css/
│   ├── 📄 styles.css         # Main stylesheet
│   └── 📄 mobile.css         # Mobile-specific styles
│
├── 📂 js/
│   ├── 📄 main.js            # App entry point
│   ├── 📄 config.js          # App configuration
│   │
│   ├── 📂 core/
│   │   ├── 📄 utils.js       # Utility functions
│   │   ├── 📄 validation.js  # Form validation
│   │   ├── 📄 eventBus.js    # Event system
│   │   └── 📄 stateManager.js # State management
│   │
│   ├── 📂 services/
│   │   ├── 📄 api.service.js        # API client
│   │   ├── 📄 auth.service.js       # Authentication
│   │   ├── 📄 order.service.js      # Order management
│   │   ├── 📄 stats.service.js      # Statistics
│   │   ├── 📄 storage.service.js    # Local storage
│   │   └── 📄 notification.service.js # Toast notifications
│   │
│   ├── 📂 components/
│   │   ├── 📄 orderForm.js    # Order form component
│   │   ├── 📄 orderList.js    # Order list component
│   │   └── 📄 ...             # Other components
│   │
│   └── 📂 middleware/
│       ├── 📄 auth.middleware.js # Auth middleware
│       └── 📄 router.guard.js    # Route protection
│
└── 📂 assets/
    ├── 📂 icons/             # PWA icons
    ├── 📂 images/            # App images
    └── 📂 sounds/            # Notification sounds
```

## 🚀 Cài đặt và Chạy

### Prerequisites
- Node.js (v16+) và npm
- Modern browser hỗ trợ ES6+
- HTTPS (yêu cầu cho PWA features)

### Quick Start

1. **Clone repository**
```bash
git clone https://github.com/your-username/hairsalon-pwa.git
cd hairsalon-pwa
```

2. **Cài đặt dependencies** (nếu có)
```bash
npm install
```

3. **Chạy development server**
```bash
# Sử dụng Python
python -m http.server 8000

# Hoặc Node.js
npx serve -s . -l 8000

# Hoặc PHP
php -S localhost:8000
```

4. **Mở trình duyệt**
```
https://localhost:8000
```

### Production Deployment

1. **Build và optimize**
```bash
npm run build  # Nếu có build script
```

2. **Deploy lên hosting**
   - Netlify, Vercel, GitHub Pages
   - Apache, Nginx
   - Firebase Hosting

3. **Configure HTTPS**
   - PWA yêu cầu HTTPS để hoạt động
   - Cài đặt SSL certificate

## ⚙️ Configuration

### App Config (js/config.js)
```javascript
export const CONFIG = {
  APP_NAME: 'Hair Salon PWA',
  VERSION: '1.0.0',
  API_BASE_URL: 'https://api.yourdomain.com',
  GOOGLE_CLIENT_ID: 'your-google-client-id',
  
  FEATURES: {
    OFFLINE_MODE: true,
    PUSH_NOTIFICATIONS: true,
    BACKGROUND_SYNC: true,
    ANALYTICS: true
  },
  
  UI: {
    THEME: 'light',
    ANIMATIONS: true,
    SOUNDS: false,
    AUTO_SAVE: true
  }
};
```

### Service Worker Cache
```javascript
// sw.js - Customize cache strategies
const CACHE_VERSION = '1.0.0';
const STATIC_CACHE = 'salon-static-v1.0.0';
const DYNAMIC_CACHE = 'salon-dynamic-v1.0.0';
```

### Google OAuth Setup
1. Tạo project tại [Google Cloud Console](https://console.cloud.google.com)
2. Enable Google+ API
3. Tạo OAuth 2.0 credentials
4. Cập nhật `GOOGLE_CLIENT_ID` trong config

## 📱 PWA Features

### Service Worker
- **Caching Strategy**: Cache First cho static assets, Network First cho API
- **Offline Support**: Hoạt động hoàn toàn offline
- **Background Sync**: Đồng bộ dữ liệu khi có mạng
- **Update Management**: Tự động cập nhật khi có version mới

### App Manifest
```json
{
  "name": "Hair Salon PWA",
  "short_name": "Hair Salon",
  "description": "Ứng dụng quản lý đơn hàng salon chuyên nghiệp",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#7c3aed",
  "theme_color": "#7c3aed",
  "orientation": "portrait-primary"
}
```

### Push Notifications
```javascript
// Đăng ký nhận thông báo
await NotificationService.requestPermission();

// Gửi thông báo
NotificationService.showBrowserNotification('Đơn hàng mới!', {
  body: 'Có đơn hàng mới cần xử lý',
  icon: '/assets/icons/icon-192x192.png',
  actions: [
    { action: 'view', title: 'Xem đơn' },
    { action: 'dismiss', title: 'Bỏ qua' }
  ]
});
```

## 🔐 Security

### Content Security Policy (CSP)
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://accounts.google.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  ...
">
```

### Authentication Flow
1. User clicks "Đăng nhập với Google"
2. Google OAuth popup opens
3. User grants permissions
4. JWT token stored securely
5. API requests include Authorization header
6. Token refresh handled automatically

### Data Protection
- Local data encrypted in IndexedDB
- Sensitive data never logged
- HTTPS-only in production
- Secure cookie settings

## 📊 Performance

### Optimization Techniques
- **Code Splitting**: Lazy load components
- **Image Optimization**: WebP format, lazy loading
- **CSS Optimization**: Critical CSS inline
- **JavaScript**: ES6 modules, tree shaking
- **Caching**: Aggressive caching strategy

### Performance Metrics
- **FCP (First Contentful Paint)**: < 1.5s
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Bundle Size
```
Main Bundle: ~150KB (compressed)
CSS: ~50KB (compressed)
Service Worker: ~25KB
Total Initial Load: ~225KB
```

## 🧪 Testing

### Manual Testing
1. **Offline Functionality**
   - Disconnect network
   - Try creating orders
   - Check data persistence

2. **PWA Features**
   - Install app
   - Test notifications
   - Check caching

3. **Mobile Testing**
   - iOS Safari
   - Android Chrome
   - Various screen sizes

### Automated Testing
```bash
# Lighthouse audit
npx lighthouse http://localhost:8000 --view

# PWA audit
npx pwa-asset-generator logo.svg ./assets/icons
```

## 🐛 Debugging

### Common Issues

1. **Service Worker not registering**
```javascript
// Check HTTPS requirement
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  console.error('Service Worker requires HTTPS');
}
```

2. **Offline data not syncing**
```javascript
// Check IndexedDB support
if (!('indexedDB' in window)) {
  console.error('IndexedDB not supported');
}
```

3. **Push notifications not working**
```javascript
// Check notification permission
if (Notification.permission !== 'granted') {
  console.error('Notification permission denied');
}
```

### Debug Tools
- Chrome DevTools → Application tab
- Service Worker debugging
- PWA audit in Lighthouse
- Network throttling for offline testing

## 📈 Analytics

### Google Analytics Events
```javascript
// Track PWA install
gtag('event', 'pwa_installed');

// Track offline usage
gtag('event', 'offline_action', {
  action: 'create_order',
  offline_duration: 120000
});

// Track performance
gtag('event', 'timing_complete', {
  name: 'load',
  value: loadTime
});
```

### Custom Metrics
- Order creation rate
- Offline vs online usage
- User retention
- Feature adoption

## 🔄 Updates & Maintenance

### Version Management
1. Update version in `manifest.json`
2. Update `CACHE_VERSION` in `sw.js`
3. Test new version locally
4. Deploy to staging
5. Deploy to production

### Cache Busting
```javascript
// Service Worker automatically handles cache updates
// Browser will download new SW when version changes
const CACHE_VERSION = '1.0.1'; // Increment for updates
```

### Monitoring
- Error tracking with Sentry
- Performance monitoring
- User feedback collection
- Analytics dashboard

## 🤝 Contributing

### Development Guidelines
1. Follow ES6+ standards
2. Use semantic commit messages
3. Write comprehensive tests
4. Document new features
5. Ensure mobile compatibility

### Pull Request Process
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Code review process

## 📄 License

MIT License - xem [LICENSE](LICENSE) file để biết thêm chi tiết.

## 👥 Support

### Getting Help
- 📧 Email: support@hairsalon-pwa.com
- 💬 Discord: [Hair Salon PWA Community](https://discord.gg/hairsalon-pwa)
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/hairsalon-pwa/issues)

### FAQ

**Q: App không hoạt động offline?**
A: Kiểm tra Service Worker đã đăng ký thành công và HTTPS được enable.

**Q: Notifications không hiển thị?**
A: Đảm bảo đã cấp quyền notifications và domain hỗ trợ PWA.

**Q: Dữ liệu bị mất khi refresh?**
A: Check IndexedDB trong DevTools và đảm bảo Storage Service hoạt động đúng.

**Q: App chậm trên mobile?**
A: Bật DevTools mobile simulation và check Performance tab để tìm bottlenecks.

---

## 🚀 Roadmap

### v1.1.0 (Coming Soon)
- [ ] Dark mode support
- [ ] Multi-language (EN/VI)
- [ ] Advanced statistics
- [ ] Export data functionality

### v1.2.0
- [ ] Voice input for orders
- [ ] QR code integration
- [ ] Inventory management
- [ ] Staff management system

### v2.0.0
- [ ] React/Vue.js migration
- [ ] Native mobile apps
- [ ] Backend API development
- [ ] Multi-salon support

---

**🎯 Made with ❤️ for Vietnamese Hair Salons**

> "Simplifying salon management, one PWA at a time"
