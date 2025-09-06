/**
 * Login Component - Authentication with Google OAuth
 * Features: Google Sign-In, Session management, Remember me, Offline support
 */

import { EventBus } from '../core/eventBus.js';
import { Utils } from '../core/utils.js';
import { NotificationService } from '../services/notification.service.js';
import { AuthService } from '../services/auth.service.js';
import { StorageService } from '../services/storage.service.js';

export class LoginComponent {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      redirectAfterLogin: '/dashboard',
      showRememberMe: true,
      allowGuestMode: false,
      enableOfflineMode: true,
      ...options
    };
    
    this.isLoading = false;
    this.isGoogleLoaded = false;
    this.googleAuth = null;
    
    this.init();
  }

  async init() {
    try {
      this.render();
      await this.loadGoogleAPI();
      this.bindEvents();
      
      EventBus.emit('component:initialized', {
        component: 'LoginComponent'
      });
      
    } catch (error) {
      console.error('Login component init error:', error);
      this.showError('Lỗi khởi tạo đăng nhập. Vui lòng tải lại trang.');
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="login-container min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div class="sm:mx-auto sm:w-full sm:max-w-md">
          <!-- Logo -->
          <div class="flex justify-center mb-8">
            <div class="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          
          <h2 class="text-center text-3xl font-extrabold text-gray-900 mb-2">
            Hair Salon PWA
          </h2>
          <p class="text-center text-sm text-gray-600 mb-8">
            Đăng nhập để quản lý đơn hàng salon
          </p>
        </div>

        <div class="sm:mx-auto sm:w-full sm:max-w-md">
          <div class="login-card bg-white py-8 px-6 shadow-xl rounded-xl sm:px-10">
            
            <!-- Loading State -->
            <div id="login-loading" class="text-center py-8 hidden">
              <div class="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto mb-4"></div>
              <p class="text-gray-600">Đang đăng nhập...</p>
            </div>

            <!-- Error State -->
            <div id="login-error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6 hidden">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-red-800" id="error-message">
                    Đã xảy ra lỗi khi đăng nhập
                  </p>
                </div>
                <div class="ml-auto pl-3">
                  <button id="close-error" class="text-red-400 hover:text-red-600">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Login Form -->
            <div id="login-form" class="space-y-6">
              
              <!-- Google Sign-In Button -->
              <div>
                <button id="google-signin-btn" class="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span id="google-btn-text">Đăng nhập bằng Google</span>
                </button>
                
                <!-- Google Sign-In placeholder div -->
                <div id="g_id_onload" 
                     data-client_id="${this.getGoogleClientId()}"
                     data-context="signin"
                     data-ux_mode="popup"
                     data-callback="handleGoogleSignIn"
                     data-auto_prompt="false">
                </div>
              </div>

              ${this.options.allowGuestMode ? `
                <div class="relative">
                  <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-gray-300"></div>
                  </div>
                  <div class="relative flex justify-center text-sm">
                    <span class="px-2 bg-white text-gray-500">hoặc</span>
                  </div>
                </div>

                <!-- Guest Mode -->
                <div>
                  <button id="guest-mode-btn" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Tiếp tục với tư cách khách
                  </button>
                </div>
              ` : ''}

              ${this.options.showRememberMe ? `
                <!-- Remember Me -->
                <div class="flex items-center">
                  <input id="remember-me" type="checkbox" class="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded">
                  <label for="remember-me" class="ml-2 block text-sm text-gray-700">
                    Ghi nhớ đăng nhập
                  </label>
                </div>
              ` : ''}
            </div>

            <!-- Offline Mode -->
            <div id="offline-mode" class="hidden">
              <div class="text-center py-6">
                <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M12 12v.01"></path>
                </svg>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Chế độ ngoại tuyến</h3>
                <p class="text-sm text-gray-600 mb-4">Không thể kết nối đến máy chủ. Bạn có thể sử dụng ứng dụng ở chế độ ngoại tuyến với chức năng hạn chế.</p>
                
                ${this.options.enableOfflineMode ? `
                  <button id="offline-mode-btn" class="btn-outline">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                    Sử dụng ngoại tuyến
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- Footer -->
            <div class="mt-8 pt-6 border-t border-gray-200">
              <div class="text-center space-y-2">
                <p class="text-xs text-gray-500">
                  Bằng cách đăng nhập, bạn đồng ý với 
                  <a href="#" class="text-purple-600 hover:text-purple-500">Điều khoản sử dụng</a> 
                  và 
                  <a href="#" class="text-purple-600 hover:text-purple-500">Chính sách bảo mật</a>
                </p>
                
                <!-- Version info -->
                <p class="text-xs text-gray-400">
                  Hair Salon PWA v1.0.0 • 
                  <span id="connection-status" class="text-green-600">Online</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Features showcase -->
        <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div class="text-center">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Tính năng nổi bật</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="flex items-center space-x-2 text-gray-600">
                <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Hoạt động offline</span>
              </div>
              <div class="flex items-center space-x-2 text-gray-600">
                <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Đồng bộ tự động</span>
              </div>
              <div class="flex items-center space-x-2 text-gray-600">
                <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Giao diện thân thiện</span>
              </div>
              <div class="flex items-center space-x-2 text-gray-600">
                <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Bảo mật cao</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async loadGoogleAPI() {
    try {
      // Check if Google API is already loaded
      if (window.google && window.google.accounts) {
        this.isGoogleLoaded = true;
        this.initGoogleSignIn();
        return;
      }

      // Load Google API dynamically
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        this.isGoogleLoaded = true;
        this.initGoogleSignIn();
      };
      
      script.onerror = () => {
        console.error('Failed to load Google API');
        this.showGoogleLoadError();
      };
      
      document.head.appendChild(script);
      
    } catch (error) {
      console.error('Error loading Google API:', error);
      this.showGoogleLoadError();
    }
  }

  initGoogleSignIn() {
    if (!window.google || !window.google.accounts) {
      console.error('Google API not available');
      return;
    }

    try {
      // Make callback globally available
      window.handleGoogleSignIn = (response) => {
        this.handleGoogleSignIn(response);
      };

      // Initialize Google Sign-In
      window.google.accounts.id.initialize({
        client_id: this.getGoogleClientId(),
        callback: window.handleGoogleSignIn,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Enable custom button
      this.enableGoogleButton();

    } catch (error) {
      console.error('Google Sign-In init error:', error);
      this.showGoogleLoadError();
    }
  }

  enableGoogleButton() {
    const googleBtn = document.getElementById('google-signin-btn');
    if (googleBtn) {
      googleBtn.disabled = false;
      googleBtn.querySelector('#google-btn-text').textContent = 'Đăng nhập bằng Google';
    }
  }

  showGoogleLoadError() {
    const googleBtn = document.getElementById('google-signin-btn');
    if (googleBtn) {
      googleBtn.disabled = true;
      googleBtn.classList.add('opacity-50');
      googleBtn.querySelector('#google-btn-text').textContent = 'Google Sign-In không khả dụng';
    }
  }

  bindEvents() {
    // Google Sign-In button
    const googleBtn = document.getElementById('google-signin-btn');
    if (googleBtn) {
      googleBtn.addEventListener('click', () => {
        this.handleGoogleButtonClick();
      });
    }

    // Guest mode button
    const guestBtn = document.getElementById('guest-mode-btn');
    if (guestBtn) {
      guestBtn.addEventListener('click', () => {
        this.handleGuestLogin();
      });
    }

    // Offline mode button
    const offlineBtn = document.getElementById('offline-mode-btn');
    if (offlineBtn) {
      offlineBtn.addEventListener('click', () => {
        this.handleOfflineMode();
      });
    }

    // Error close button
    const closeErrorBtn = document.getElementById('close-error');
    if (closeErrorBtn) {
      closeErrorBtn.addEventListener('click', () => {
        this.hideError();
      });
    }

    // Monitor connection status
    this.setupConnectionMonitoring();

    // Listen for auth events
    EventBus.on('auth:login-required', () => {
      this.showError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    });
  }

  setupConnectionMonitoring() {
    const updateConnectionStatus = () => {
      const statusEl = document.getElementById('connection-status');
      const loginForm = document.getElementById('login-form');
      const offlineMode = document.getElementById('offline-mode');
      
      if (navigator.onLine) {
        if (statusEl) {
          statusEl.textContent = 'Online';
          statusEl.className = 'text-green-600';
        }
        if (loginForm) loginForm.classList.remove('hidden');
        if (offlineMode) offlineMode.classList.add('hidden');
      } else {
        if (statusEl) {
          statusEl.textContent = 'Offline';
          statusEl.className = 'text-red-600';
        }
        if (this.options.enableOfflineMode) {
          if (loginForm) loginForm.classList.add('hidden');
          if (offlineMode) offlineMode.classList.remove('hidden');
        }
      }
    };

    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    updateConnectionStatus();
  }

  handleGoogleButtonClick() {
    if (!this.isGoogleLoaded || !window.google?.accounts?.id) {
      this.showError('Google Sign-In chưa sẵn sàng. Vui lòng thử lại.');
      return;
    }

    try {
      // Show Google One Tap or popup
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback to popup if One Tap is not available
          this.showGooglePopup();
        }
      });
    } catch (error) {
      console.error('Google sign-in error:', error);
      this.showGooglePopup();
    }
  }

  showGooglePopup() {
    if (window.google?.accounts?.oauth2) {
      // Use OAuth2 popup as fallback
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: this.getGoogleClientId(),
        scope: 'email profile',
        callback: (response) => {
          this.handleOAuthResponse(response);
        }
      });
      
      client.requestAccessToken();
    } else {
      this.showError('Không thể mở cửa sổ đăng nhập Google. Vui lòng kiểm tra popup blocker.');
    }
  }

  async handleGoogleSignIn(response) {
    if (!response.credential) {
      this.showError('Không nhận được thông tin đăng nhập từ Google');
      return;
    }

    this.setLoading(true);

    try {
      // Decode JWT token to get user info
      const userInfo = this.decodeGoogleJWT(response.credential);
      
      // Authenticate with backend
      const authResult = await AuthService.authenticateWithGoogle({
        credential: response.credential,
        userInfo: userInfo
      });

      if (authResult.success) {
        await this.handleSuccessfulLogin(authResult.user, authResult.session);
      } else {
        throw new Error(authResult.error || 'Xác thực không thành công');
      }

    } catch (error) {
      console.error('Google sign-in error:', error);
      this.showError(this.getErrorMessage(error));
    } finally {
      this.setLoading(false);
    }
  }

  async handleOAuthResponse(response) {
    if (!response.access_token) {
      this.showError('Không nhận được access token từ Google');
      return;
    }

    this.setLoading(true);

    try {
      // Get user profile using access token
      const profileResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${response.access_token}`);
      const userInfo = await profileResponse.json();

      // Authenticate with backend
      const authResult = await AuthService.authenticateWithGoogle({
        accessToken: response.access_token,
        userInfo: userInfo
      });

      if (authResult.success) {
        await this.handleSuccessfulLogin(authResult.user, authResult.session);
      } else {
        throw new Error(authResult.error || 'Xác thực không thành công');
      }

    } catch (error) {
      console.error('OAuth response error:', error);
      this.showError(this.getErrorMessage(error));
    } finally {
      this.setLoading(false);
    }
  }

  async handleGuestLogin() {
    this.setLoading(true);

    try {
      const guestUser = await AuthService.createGuestSession();
      await this.handleSuccessfulLogin(guestUser, guestUser.session);
      
      NotificationService.info('Đăng nhập với tư cách khách. Một số tính năng có thể bị hạn chế.', {
        duration: 6000
      });

    } catch (error) {
      console.error('Guest login error:', error);
      this.showError('Không thể tạo phiên khách. Vui lòng thử lại.');
    } finally {
      this.setLoading(false);
    }
  }

  async handleOfflineMode() {
    try {
      // Create offline session
      const offlineUser = await AuthService.createOfflineSession();
      await this.handleSuccessfulLogin(offlineUser, offlineUser.session);
      
      NotificationService.warning('Chế độ ngoại tuyến: Dữ liệu sẽ được đồng bộ khi có kết nối.', {
        duration: 8000
      });

    } catch (error) {
      console.error('Offline mode error:', error);
      this.showError('Không thể khởi tạo chế độ ngoại tuyến.');
    }
  }

  async handleSuccessfulLogin(user, session) {
    try {
      // Save remember me preference
      const rememberMe = document.getElementById('remember-me')?.checked || false;
      if (rememberMe) {
        await StorageService.set('remember_login', true);
      }

      // Emit login success event
      EventBus.emit('auth:login-success', {
        user: user,
        session: session,
        timestamp: Date.now()
      });

      // Show success notification
      NotificationService.success(`Chào mừng ${user.name}! Đăng nhập thành công.`, {
        duration: 3000
      });

      // Navigate to dashboard or redirect URL
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || this.options.redirectAfterLogin;
      
      // Use app navigation if available
      if (window.app && typeof window.app.navigate === 'function') {
        setTimeout(() => {
          window.app.navigate(redirectTo.replace('/', ''));
        }, 1000);
      } else {
        setTimeout(() => {
          window.location.href = redirectTo;
        }, 1000);
      }

    } catch (error) {
      console.error('Post-login handling error:', error);
      this.showError('Đăng nhập thành công nhưng có lỗi xảy ra. Vui lòng tải lại trang.');
    }
  }

  decodeGoogleJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('JWT decode error:', error);
      return null;
    }
  }

  getGoogleClientId() {
    // Return environment-specific client ID
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'YOUR_GOOGLE_CLIENT_ID_DEV'; // Development client ID
    } else {
      return 'YOUR_GOOGLE_CLIENT_ID_PROD'; // Production client ID
    }
  }

  setLoading(loading) {
    this.isLoading = loading;
    
    const loadingEl = document.getElementById('login-loading');
    const formEl = document.getElementById('login-form');
    const googleBtn = document.getElementById('google-signin-btn');
    const guestBtn = document.getElementById('guest-mode-btn');
    
    if (loading) {
      if (loadingEl) loadingEl.classList.remove('hidden');
      if (formEl) formEl.classList.add('hidden');
    } else {
      if (loadingEl) loadingEl.classList.add('hidden');
      if (formEl) formEl.classList.remove('hidden');
    }
    
    if (googleBtn) googleBtn.disabled = loading;
    if (guestBtn) guestBtn.disabled = loading;
  }

  showError(message) {
    const errorEl = document.getElementById('login-error');
    const messageEl = document.getElementById('error-message');
    
    if (errorEl && messageEl) {
      messageEl.textContent = message;
      errorEl.classList.remove('hidden');
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        this.hideError();
      }, 10000);
    }

    // Also show as notification
    NotificationService.error(message, { duration: 8000 });
  }

  hideError() {
    const errorEl = document.getElementById('login-error');
    if (errorEl) {
      errorEl.classList.add('hidden');
    }
  }

  getErrorMessage(error) {
    if (typeof error === 'string') return error;
    
    const errorMessages = {
      'popup_blocked_by_browser': 'Popup bị chặn bởi trình duyệt. Vui lòng cho phép popup.',
      'access_denied': 'Truy cập bị từ chối. Vui lòng thử lại.',
      'invalid_client': 'Cấu hình Google Sign-In không hợp lệ.',
      'network_error': 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối.',
      'invalid_token': 'Token không hợp lệ. Vui lòng thử đăng nhập lại.',
      'server_error': 'Lỗi máy chủ. Vui lòng thử lại sau.',
      'timeout': 'Đăng nhập quá thời gian chờ. Vui lòng thử lại.'
    };

    const errorKey = error.error || error.type || error.code;
    return errorMessages[errorKey] || error.message || 'Đã xảy ra lỗi không xác định.';
  }

  destroy() {
    // Clean up Google API
    if (window.handleGoogleSignIn) {
      delete window.handleGoogleSignIn;
    }

    // Remove event listeners
    window.removeEventListener('online', this.updateConnectionStatus);
    window.removeEventListener('offline', this.updateConnectionStatus);

    EventBus.emit('component:destroyed', {
      component: 'LoginComponent'
    });
  }
}
