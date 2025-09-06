# 🚀 Production Deployment Checklist

## ✅ **PRE-DEPLOYMENT CHECKLIST**

### 1. **Google Cloud Console Configuration**

#### OAuth 2.0 Client ID Settings:

**Authorized JavaScript origins:**
```
https://vantuanleforwork.github.io
```

**Authorized redirect URIs:**
```
https://vantuanleforwork.github.io/
https://vantuanleforwork.github.io/Hairsalon-PWA/
```

⚠️ **QUAN TRỌNG**: Thay `vantuanleforwork` bằng GitHub username thật của bạn!

### 2. **config.js Production Values**

```javascript
const APP_CONFIG = {
    // Real Google Client ID (not DEMO)
    GOOGLE_CLIENT_ID: 'YOUR_REAL_CLIENT_ID.apps.googleusercontent.com',
    
    // Real Google Apps Script URL
    API_BASE_URL: 'https://script.google.com/macros/s/YOUR_REAL_DEPLOYMENT_ID/exec',
    
    // Real allowed emails
    ALLOWED_EMAILS: [
        'employee1@gmail.com',
        'employee2@gmail.com',
        'owner@salon.com'
    ],
    
    // Real production URL
    PRODUCTION_URL: 'https://vantuanleforwork.github.io/Hairsalon-PWA/',
    
    // Turn off debug mode
    DEBUG_MODE: false
};
```

### 3. **GitHub Pages Setup**

1. **Repository Settings** → **Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `main` / `master`
4. **Folder**: `/ (root)` hoặc `/docs`
5. **Custom domain** (optional): `salon.yourdomain.com`

### 4. **Files to Deploy**

✅ **Include:**
- `index.html`
- `manifest.json`
- `css/styles.css`
- `js/` folder (all files)
- `config.js` (with production values)

❌ **Exclude (via .gitignore):**
- `test-*.html`
- `quick-test.html`
- `google-cloud-setup/` (sensitive docs)
- Development configs

## 🧪 **TESTING CHECKLIST**

### Desktop Testing:
- [ ] Open `https://yourusername.github.io/repo-name/`
- [ ] Click "Đăng nhập với Google"
- [ ] Google OAuth popup appears
- [ ] Login with allowed email → Success
- [ ] Login with blocked email → Access denied
- [ ] Create test order → Saves to Google Sheets
- [ ] Logout works

### Mobile Testing:
- [ ] Open on iPhone/Android browser
- [ ] Login button is tappable (44px min height)
- [ ] Google OAuth popup works on mobile
- [ ] Touch interactions smooth
- [ ] PWA install prompt appears
- [ ] App works in standalone mode

### Production URLs to Test:
- `https://vantuanleforwork.github.io/Hairsalon-PWA/`
- `https://vantuanleforwork.github.io/Hairsalon-PWA/index.html`

## 🔧 **TROUBLESHOOTING**

### Common Production Issues:

#### 1. **"Origin not allowed"**
```
❌ The given origin is not allowed for the given client ID
```
**Fix:** Update Google Cloud Console → Credentials → Add production URL

#### 2. **OAuth popup blocked**
```
❌ Popup blocked by browser
```
**Fix:** User needs to allow popups, or use fallback flow

#### 3. **Button not working on mobile**
```
❌ Touch events not registering
```
**Fix:** Check `touch-action: manipulation` in CSS

#### 4. **PWA not installing**
```
❌ Install prompt not showing
```
**Fix:** Check manifest.json, HTTPS, service worker

### Debug Commands:

**Console debug:**
```javascript
// Check OAuth status
console.log({
    google: typeof google,
    accounts: typeof google?.accounts,
    config: APP_CONFIG?.GOOGLE_CLIENT_ID,
    currentUrl: window.location.href
});

// Test OAuth initialization
google.accounts.id.initialize({
    client_id: APP_CONFIG.GOOGLE_CLIENT_ID,
    callback: console.log
});
```

**Network tab:**
- Check for 403 errors on Google OAuth requests
- Verify Google Apps Script API calls
- Check CORS issues

## 📱 **PWA FEATURES**

### Install Prompt:
- Appears after user engagement
- Works on Chrome, Edge, Firefox
- iOS Safari needs "Add to Home Screen"

### Offline Support:
- Service Worker caches app shell
- Data syncs when back online
- Graceful offline handling

### Mobile Optimization:
- Viewport meta tag configured
- Touch targets 44px minimum
- Prevent zoom on form inputs
- Status bar styling for iOS

## 🎯 **PERFORMANCE**

### Optimization:
- [x] Minified CSS (via CDN)
- [x] Optimized images (SVG icons)
- [x] Lazy loading where possible
- [x] Efficient caching strategy

### Lighthouse Score Targets:
- **Performance**: 90+
- **Accessibility**: 95+
- **Best Practices**: 90+
- **PWA**: 100

## 🚀 **GO-LIVE PROCESS**

### 1. Pre-launch:
1. Complete all checklists above
2. Test on multiple devices/browsers
3. Verify Google Sheets integration
4. Test with real user accounts

### 2. Launch:
1. Push to GitHub main branch
2. Verify GitHub Pages deployment
3. Test production URL
4. Monitor for errors

### 3. Post-launch:
1. Monitor Google Apps Script quotas
2. Check error logs
3. User feedback and iterations
4. Regular OAuth token refresh

---

## 🎉 **READY FOR PRODUCTION!**

After completing all checklists:
- ✅ OAuth configured correctly
- ✅ Production URLs working
- ✅ Mobile-optimized
- ✅ PWA installable
- ✅ Data syncing to Google Sheets

**Your salon management app is production-ready! 🔥**
