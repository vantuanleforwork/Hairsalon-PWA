# 🚀 Production Testing Guide

## 📍 Live App URL

**Main App**: https://vantuanleforwork.github.io/Hairsalon-PWA/

## 🎯 Testing Steps

### 1. **Open Main App** 🏠
- Truy cập: https://vantuanleforwork.github.io/Hairsalon-PWA/
- App sẽ tự động detect production mode
- OAuth login với Google hoặc sử dụng demo mode

### 2. **Test Core Features** ⚡
- **✅ Login**: OAuth with Google hoặc demo login
- **✅ Create Order**: Nhập đơn hàng mới
- **✅ View Orders**: Xem danh sách đơn hàng
- **✅ Search & Filter**: Tìm kiếm và lọc đơn hàng
- **✅ Statistics**: Xem thống kê real-time

### 3. **Mobile Testing** 📱
- Mở trên điện thoại
- Test touch interactions
- Kiểm tra responsive design
- Test PWA features

## 🔧 Debug Tools (Nếu cần)

### Testing Pages:
- **OAuth Debug**: https://vantuanleforwork.github.io/Hairsalon-PWA/test-oauth-simple.html
- **API Debug**: https://vantuanleforwork.github.io/Hairsalon-PWA/test-api-simple.html  
- **Full Flow**: https://vantuanleforwork.github.io/Hairsalon-PWA/test-full-flow.html

## 🎮 Expected Behavior

### ✅ **Normal Flow**:
1. **App loads** → Shows login screen
2. **Login** → OAuth popup hoặc demo mode
3. **Main dashboard** → Statistics cards + order form
4. **Create order** → Save locally + attempt API sync
5. **View orders** → Display from localStorage + API if available

### ⚠️ **API Issues** (Expected):
- Google Apps Script API có thể slow/timeout
- App sẽ fallback to localStorage
- Messages: "Đã lưu local" hoặc "API chậm"
- **This is normal behavior** - app works offline!

### 🔍 **Search & Filter**:
- Search bar có icon
- Advanced filters collapse/expand
- Real-time filtering
- Results counter

## 📊 Performance Expectations

### ⚡ **Loading Times**:
- **First load**: 2-3 seconds (includes Google APIs)
- **Navigation**: Instant (SPA)
- **API calls**: 3-10 seconds (Apps Script can be slow)
- **Offline mode**: < 500ms

### 📱 **Mobile Performance**:
- Touch-friendly buttons (44px minimum)
- Smooth scrolling
- No horizontal scroll
- Responsive breakpoints

## 🚫 Known Issues (Normal)

### 1. **API Timeouts** ⏱️
- **Why**: Google Apps Script cold starts
- **Result**: App saves to localStorage
- **Message**: "API chậm, đã lưu local"
- **Solution**: Data syncs when API is available

### 2. **OAuth Popup Blocked** 🔒
- **Why**: Browser popup blocker
- **Result**: Falls back to demo login
- **Message**: "Using mock login"
- **Solution**: Allow popups or use demo mode

### 3. **CORS Warnings** 🌐
- **Why**: Cross-origin API calls
- **Result**: Console warnings (harmless)
- **Impact**: No impact on functionality
- **Solution**: Expected in production

## ✅ Success Criteria

### **App is working correctly if**:
- ✅ Login screen appears
- ✅ Can create new orders
- ✅ Orders are saved (local + API if available)
- ✅ Statistics update
- ✅ Search & filter work
- ✅ Mobile responsive
- ✅ No JavaScript errors (except API timeouts)

### **Error Handling**:
- 🔄 Graceful API fallbacks
- 💾 Always saves to localStorage
- 📱 User-friendly error messages
- 🔍 Debug info in console

## 📞 Debugging Console

### **Check Browser Console**:
```javascript
// App status
console.log('App State:', APP_STATE);
console.log('Config:', APP_CONFIG);

// API test
window.getStats().then(console.log).catch(console.error);

// Auth status  
console.log('User:', APP_STATE.user);
```

### **Key Console Messages**:
- `⚙️ App mode: Production with Google Sheets API`
- `✅ Order saved to Google Sheets`
- `📋 Using local storage (API timeout)`
- `🔐 OAuth login successful`

## 🎯 Test Scenarios

### **Scenario 1: Happy Path** 😊
1. Open app → Login → Create order → View in list
2. **Expected**: Order appears immediately, stats update

### **Scenario 2: API Slow** 🐌  
1. Create order → API takes 10+ seconds
2. **Expected**: "API chậm" message, order still saved locally

### **Scenario 3: Offline Mode** 📴
1. Disable network → Create order
2. **Expected**: "Offline mode" message, order saved locally

### **Scenario 4: Mobile** 📱
1. Open on phone → Test all features
2. **Expected**: Perfect touch interactions, no zoom needed

## 🔮 What's Next?

### **If App Works Great** ✨:
- Ready for **Phase 5: PWA Features**
- Service Worker
- Offline sync
- Add to home screen

### **If Issues Found** 🔧:
- Check console for specific errors
- Use debug pages for detailed testing
- API issues are expected (fallback works)

---

## 🚀 **Ready to Test?**

**Go to**: https://vantuanleforwork.github.io/Hairsalon-PWA/

**Mobile QR Code** (scan with phone):
```
████ ▄▄▄▄▄ █▀█ █▄█▀▀▀▀▄ ▄▄▄▄▄ ████
████ █   █ █▀▀▀█  ▄▄▄██ █   █ ████
████ █▄▄▄█ █▀ █▀▀██▄  ▀ █▄▄▄█ ████
████▄▄▄▄▄▄▄█▄▀ ▀▄█ █▄█ █▄▄▄▄▄▄████
████ ▄▄▄▄▄   ██▀▄▄▄ ▀▀▄   ▄▄▄  ████
████   ▀ ▄▄▀▄ ▀▄██  ▄▀█▀▀▄▀▄▀▄▄████
```
*(Placeholder - generate real QR for actual URL)*

**Happy Testing!** 🎉
