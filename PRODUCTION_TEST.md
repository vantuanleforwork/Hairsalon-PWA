# 🚀 Production Test Instructions

## Quick Test trên GitHub Pages

1. **Deploy code lên GitHub Pages**:
   ```
   git add .
   git commit -m "Remove guest mode, clean OAuth"
   git push origin main
   ```

2. **Test URL**: https://vantuanleforwork.github.io/Hairsalon-PWA/

3. **Expected**: Google login sẽ hoạt động vì domain đã được config

## Local Test Requirements

### Google Cloud Console Setup:
- **Project**: Cùng project với Client ID
- **Credentials**: Edit OAuth 2.0 Client ID 
- **Authorized JavaScript origins**: Add:
  ```
  http://localhost:8080
  http://localhost:3000
  http://localhost:8000
  http://127.0.0.1:8080
  ```

### Current Config Status:
✅ Client ID: Valid format & working
✅ Email whitelist: 4 emails configured  
✅ Code: Clean, no mock/guest mode
❌ Domain authorization: Need to add localhost

## Next Steps:

1. **Immediate**: Test trên production URL
2. **Development**: Config localhost trong Google Cloud Console
3. **Verification**: Use test-client-id.html để verify setup

## Production URL Test:
```
https://vantuanleforwork.github.io/Hairsalon-PWA/
```

Đây sẽ là test chính xác nhất vì domain đã được authorize.
