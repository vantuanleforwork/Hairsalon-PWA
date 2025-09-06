/**
 * Hair Salon PWA - Main Application Controller
 * Version: 1.0.0
 * 
 * Features:
 * - Component initialization and management
 * - Simple routing system
 * - State management integration
 * - PWA lifecycle management
 * - Error handling and recovery
 */

import EventBus from './core/eventBus.js';
import Utils from './core/utils.js';
import State from './core/stateManager.js';
import Validation from './core/validation.js';
import './core/config.js';

// Services
import API from './services/api.service.js';
import OrderService from './services/order.service.js';
import StatsService from './services/stats.service.js';
import NotificationService from './services/notification.service.js';
import Auth from './services/auth.service.js';
import Storage from './services/storage.service.js';

// Components
import { OrderForm } from './components/orderForm.js';
import { OrderList } from './components/orderList.js';

export class HairSalonApp {
  constructor() {
    this.version = '1.0.0';
    this.currentRoute = 'dashboard';
    this.components = new Map();
    this.isInitialized = false;
    this.isOnline = navigator.onLine;
    this.user = null;
    
    // App configuration
    this.config = {
      debug: false,
      apiBaseUrl: 'https://api.hairsalon.local',
      features: {
        offlineMode: true,
        pushNotifications: true,
        backgroundSync: true,
        analytics: false
      },
      ui: {
        theme: 'light',
        animations: true,
        soundEnabled: false,
        autoSave: true
      }
    };

    // Route definitions
    this.routes = {
      'dashboard': {
        title: 'Bảng điều khiển',
        component: 'Dashboard',
        auth: true,
        icon: 'dashboard'
      },
      'orders': {
        title: 'Quản lý đơn hàng',
        component: 'OrderList', 
        auth: true,
        icon: 'orders'
      },
      'new-order': {
        title: 'Tạo đơn hàng',
        component: 'OrderForm',
        auth: true,
        icon: 'add'
      },
      'edit-order': {
        title: 'Chỉnh sửa đơn hàng',
        component: 'OrderForm',
        auth: true,
        icon: 'edit',
        params: ['id']
      },
      'stats': {
        title: 'Thống kê',
        component: 'Statistics',
        auth: true,
        icon: 'stats'
      },
      'settings': {
        title: 'Cài đặt',
        component: 'Settings',
        auth: true,
        icon: 'settings'
      },
      'login': {
        title: 'Đăng nhập',
        component: 'Login',
        auth: false,
        icon: 'login'
      }
    };
    
    this.bindEvents();
    console.log(`🚀 Hair Salon PWA v${this.version} initialized`);
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('📱 Initializing Hair Salon PWA...');
      
      // Show loading state
      this.showLoadingState();
      
      // Initialize core systems
      await this.initializeCore();
      
      // Check authentication
      await this.initializeAuth();
      
      // Setup PWA features
      await this.initializePWA();
      
      // Initialize routing
      this.initializeRouting();
      
      // Setup UI
      await this.initializeUI();
      
      // Setup periodic tasks
      this.setupPeriodicTasks();
      
      this.isInitialized = true;
      
      // Navigate to initial route
      await this.navigate(this.getInitialRoute());
      
      // Hide loading state
      this.hideLoadingState();
      
      console.log('✅ Hair Salon PWA initialized successfully');
      
      // Emit app ready event
      EventBus.emit('app:ready', {
        version: this.version,
        user: this.user,
        route: this.currentRoute
      });

      // Show welcome notification for first-time users
      if (await this.isFirstTimeUser()) {
        this.showWelcomeMessage();
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Initialize core services and systems
   */
  async initializeCore() {
    console.log('⚙️ Initializing core systems...');
    
    // Initialize state manager
    State.init();
    
    // Initialize storage service
    await Storage.init();
    
    // Load app configuration
    await this.loadConfiguration();
    
    // Initialize API service
    API.init({
      baseURL: (typeof CONFIG !== 'undefined' && CONFIG.APPS_SCRIPT_URL) ? CONFIG.APPS_SCRIPT_URL : this.config.apiBaseUrl,
      timeout: 10000
    });
    
    // Initialize notification system
    NotificationService.init({
      position: 'top-right',
      maxNotifications: 3,
      defaultDuration: 5000,
      enableSounds: this.config.ui.soundEnabled
    });
    
    console.log('✅ Core systems initialized');
  }

  /**
   * Initialize authentication
   */
  async initializeAuth() {
    console.log('🔐 Initializing authentication...');
    
    try {
      // Initialize auth service
      await Auth.validateCurrentSession();
      
      // Check for existing session
      if (Auth.isAuthenticated && Auth.currentUser) {
        this.user = Auth.currentUser;
        console.log('👤 User session found:', this.user.name);
      }
      
    } catch (error) {
      console.warn('Auth initialization failed:', error);
      // Continue without auth - will redirect to login when needed
    }
  }

  /**
   * Initialize PWA features
   */
  async initializePWA() {
    console.log('📲 Initializing PWA features...');
    
    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js');
        console.log('✅ Service Worker registered:', registration);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          this.handleServiceWorkerUpdate(registration);
        });
        
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }
    
    // Setup install prompt
    this.setupInstallPrompt();
    
    // Setup push notifications
    if (this.config.features.pushNotifications) {
      await this.setupPushNotifications();
    }
    
    // Monitor online/offline status
    this.setupConnectivityMonitoring();
  }

  /**
   * Initialize routing system
   */
  initializeRouting() {
    console.log('🛣️ Initializing routing...');
    
    // Handle browser back/forward
    window.addEventListener('popstate', (event) => {
      const route = this.getRouteFromURL();
      this.navigate(route, false); // Don't push to history
    });
    
    // Handle hash changes
    window.addEventListener('hashchange', () => {
      const route = this.getRouteFromURL();
      this.navigate(route, false);
    });
    
    console.log('✅ Routing initialized');
  }

  /**
   * Initialize UI components
   */
  async initializeUI() {
    console.log('🎨 Initializing UI...');
    
    // Create main layout
    this.createMainLayout();
    
    // Initialize navigation
    this.initializeNavigation();
    
    // Setup global keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Setup theme
    this.applyTheme(this.config.ui.theme);
    
    console.log('✅ UI initialized');
  }

  /**
   * Create main application layout
   */
  createMainLayout() {
    const app = document.getElementById('app');
    if (!app) {
      throw new Error('App container not found');
    }

    app.innerHTML = `
      <!-- App Loading Overlay -->
      <div id="app-loading" class="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <h2 class="text-lg font-semibold text-gray-900">Hair Salon PWA</h2>
          <p class="text-sm text-gray-600">Đang tải ứng dụng...</p>
        </div>
      </div>

      <!-- Main App Layout -->
      <div id="main-layout" class="min-h-screen bg-gray-50 hidden">
        <!-- Top Header -->
        <header id="app-header" class="bg-white shadow-sm border-b border-gray-200">
          <div class="container mx-auto px-4">
            <div class="flex items-center justify-between h-16">
              <!-- Logo & Title -->
              <div class="flex items-center space-x-4">
                <button id="menu-toggle" class="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                  </svg>
                </button>
                
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <h1 class="text-lg font-semibold text-gray-900">Hair Salon</h1>
                    <p class="text-xs text-gray-500 hidden md:block">Quản lý đơn hàng</p>
                  </div>
                </div>
              </div>

              <!-- Header Actions -->
              <div class="flex items-center space-x-4">
                <!-- Online Status -->
                <div id="online-status" class="flex items-center space-x-2">
                  <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span class="text-sm text-gray-600 hidden sm:block">Online</span>
                </div>

                <!-- Notifications -->
                <button id="notifications-btn" class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full relative">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM10.586 17.586L2.586 9.586C2.211 9.211 2 8.702 2 8.172V6a2 2 0 012-2h6.172c.53 0 1.039.211 1.414.586l8 8c.375.375.586.884.586 1.414s-.211 1.039-.586 1.414l-6 6c-.375.375-.884.586-1.414.586s-1.039-.211-1.414-.586z"></path>
                  </svg>
                  <span id="notification-count" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center hidden">0</span>
                </button>

                <!-- User Menu -->
                <div id="user-menu" class="relative">
                  <button id="user-menu-btn" class="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <img id="user-avatar" class="w-8 h-8 rounded-full bg-gray-300" src="" alt="User Avatar">
                    <span id="user-name" class="text-gray-700 hidden md:block">User</span>
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </button>
                  
                  <div id="user-dropdown" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <a href="#settings" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Cài đặt</a>
                    <button id="logout-btn" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Đăng xuất</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <!-- Side Navigation (Mobile Overlay) -->
        <div id="mobile-nav-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden hidden">
          <div id="mobile-nav" class="fixed inset-y-0 left-0 w-64 bg-white shadow-lg transform -translate-x-full transition-transform duration-300 ease-in-out">
            <div class="p-6">
              <div class="flex items-center space-x-3 mb-8">
                <div class="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-gray-900">Hair Salon</h2>
                  <p class="text-sm text-gray-500">PWA v${this.version}</p>
                </div>
              </div>
              
              <nav id="mobile-nav-menu" class="space-y-2">
                <!-- Navigation items will be inserted here -->
              </nav>
            </div>
          </div>
        </div>

        <!-- Desktop Sidebar -->
        <aside id="desktop-sidebar" class="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
          <div class="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
            <nav id="desktop-nav-menu" class="mt-8 flex-1 px-4 space-y-1">
              <!-- Navigation items will be inserted here -->
            </nav>
          </div>
        </aside>

        <!-- Main Content Area -->
        <main id="main-content" class="lg:pl-64">
          <div id="page-container" class="py-6">
            <div class="container mx-auto px-4">
              <!-- Page Header -->
              <div id="page-header" class="mb-8">
                <div class="md:flex md:items-center md:justify-between">
                  <div class="flex-1 min-w-0">
                    <h2 id="page-title" class="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                      Dashboard
                    </h2>
                    <div class="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
                      <div class="mt-2 flex items-center text-sm text-gray-500">
                        <svg class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span id="current-time">--:--</span>
                      </div>
                    </div>
                  </div>
                  <div class="mt-4 flex md:mt-0 md:ml-4" id="page-actions">
                    <!-- Page specific actions will be inserted here -->
                  </div>
                </div>
              </div>

              <!-- Page Content -->
              <div id="page-content">
                <!-- Dynamic content will be loaded here -->
              </div>
            </div>
          </div>
        </main>

        <!-- Bottom Navigation (Mobile) -->
        <nav id="bottom-nav" class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
          <div class="flex justify-around">
            <!-- Bottom nav items will be inserted here -->
          </div>
        </nav>
      </div>

      <!-- Install PWA Prompt -->
      <div id="install-prompt" class="hidden fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
        <div class="flex items-start space-x-3">
          <div class="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-medium text-gray-900">Cài đặt ứng dụng</h3>
            <p class="mt-1 text-sm text-gray-500">Thêm Hair Salon PWA vào màn hình chính để truy cập nhanh hơn.</p>
            <div class="mt-3 flex space-x-2">
              <button id="install-app-btn" class="bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-700">
                Cài đặt
              </button>
              <button id="dismiss-install-btn" class="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200">
                Bỏ qua
              </button>
            </div>
          </div>
          <button id="close-install-prompt" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Initialize navigation
   */
  initializeNavigation() {
    this.renderNavigation();
    this.bindNavigationEvents();
  }

  /**
   * Render navigation menus
   */
  renderNavigation() {
    const navItems = Object.entries(this.routes)
      .filter(([route, config]) => {
        // Show only authenticated routes if user is logged in, or public routes if not
        if (this.user) {
          return config.auth !== false;
        } else {
          return config.auth === false;
        }
      })
      .map(([route, config]) => ({
        route,
        ...config,
        active: route === this.currentRoute
      }));

    // Desktop navigation
    const desktopNav = document.getElementById('desktop-nav-menu');
    if (desktopNav) {
      desktopNav.innerHTML = navItems.map(item => `
        <a href="#${item.route}" class="nav-item group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
          item.active 
            ? 'bg-purple-100 text-purple-900' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }" data-route="${item.route}">
          ${this.getNavIcon(item.icon, item.active)}
          ${item.title}
        </a>
      `).join('');
    }

    // Mobile navigation
    const mobileNav = document.getElementById('mobile-nav-menu');
    if (mobileNav) {
      mobileNav.innerHTML = navItems.map(item => `
        <a href="#${item.route}" class="nav-item group flex items-center px-2 py-2 text-base font-medium rounded-md ${
          item.active 
            ? 'bg-purple-100 text-purple-900' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }" data-route="${item.route}">
          ${this.getNavIcon(item.icon, item.active)}
          ${item.title}
        </a>
      `).join('');
    }

    // Bottom navigation (mobile)
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) {
      const mainItems = navItems.slice(0, 4); // Show only first 4 items
      bottomNav.innerHTML = `
        <div class="flex justify-around">
          ${mainItems.map(item => `
            <a href="#${item.route}" class="bottom-nav-item flex flex-col items-center py-2 px-3 ${
              item.active ? 'text-purple-600' : 'text-gray-600'
            }" data-route="${item.route}">
              ${this.getNavIcon(item.icon, item.active, 'w-6 h-6')}
              <span class="text-xs mt-1">${item.title.split(' ')[0]}</span>
            </a>
          `).join('')}
        </div>
      `;
    }
  }

  /**
   * Get navigation icon SVG
   */
  getNavIcon(iconName, active = false, size = 'w-5 h-5') {
    const colorClass = active ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-500';
    
    const icons = {
      dashboard: `<svg class="${size} mr-3 ${colorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v14l-4-2-4 2V5z"></path>
      </svg>`,
      
      orders: `<svg class="${size} mr-3 ${colorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>`,
      
      add: `<svg class="${size} mr-3 ${colorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
      </svg>`,
      
      stats: `<svg class="${size} mr-3 ${colorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
      </svg>`,
      
      settings: `<svg class="${size} mr-3 ${colorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>`,
      
      login: `<svg class="${size} mr-3 ${colorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
      </svg>`
    };

    return icons[iconName] || icons.dashboard;
  }

  /**
   * Bind navigation events
   */
  bindNavigationEvents() {
    // Navigation clicks
    document.addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item, .bottom-nav-item');
      if (navItem) {
        e.preventDefault();
        const route = navItem.dataset.route;
        this.navigate(route);
        this.closeMobileNav();
      }
    });

    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        this.toggleMobileNav();
      });
    }

    // Close mobile nav on overlay click
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    if (mobileNavOverlay) {
      mobileNavOverlay.addEventListener('click', (e) => {
        if (e.target === mobileNavOverlay) {
          this.closeMobileNav();
        }
      });
    }

    // User menu events
    this.bindUserMenuEvents();

    // Other header events
    this.bindHeaderEvents();
  }

  /**
   * Navigate to a route
   */
  async navigate(route, pushHistory = true) {
    if (!route || !this.routes[route]) {
      console.warn(`Unknown route: ${route}`);
      route = this.getDefaultRoute();
    }

    const routeConfig = this.routes[route];

    // Check authentication
    if (routeConfig.auth && !this.user) {
      console.log('Authentication required, redirecting to login');
      return this.navigate('login');
    }

    if (route === 'login' && this.user) {
      console.log('User already authenticated, redirecting to dashboard');
      return this.navigate('dashboard');
    }

    console.log(`🔀 Navigating to: ${route}`);

    // Update URL if needed
    if (pushHistory) {
      history.pushState({ route }, '', `#${route}`);
    }

    // Update current route
    this.currentRoute = route;

    // Update page title
    document.title = `${routeConfig.title} - Hair Salon PWA`;
    
    // Update navigation active states
    this.renderNavigation();

    // Update page header
    this.updatePageHeader(routeConfig);

    // Load route component
    await this.loadRouteComponent(route, routeConfig);

    // Emit navigation event
    EventBus.emit('navigation:changed', {
      route,
      config: routeConfig
    });
  }

  /**
   * Update page header
   */
  updatePageHeader(routeConfig) {
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
      pageTitle.textContent = routeConfig.title;
    }

    // Update page actions based on route
    const pageActions = document.getElementById('page-actions');
    if (pageActions) {
      pageActions.innerHTML = this.getPageActions(this.currentRoute);
    }

    // Update current time
    this.updateCurrentTime();
  }

  /**
   * Get page-specific actions
   */
  getPageActions(route) {
    const actions = {
      'dashboard': `
        <button class="btn-primary" onclick="app.navigate('new-order')">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Tạo đơn mới
        </button>
      `,
      'orders': `
        <div class="flex space-x-2">
          <button class="btn-outline" onclick="app.refreshCurrentPage()">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Làm mới
          </button>
          <button class="btn-primary" onclick="app.navigate('new-order')">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Tạo đơn mới
          </button>
        </div>
      `,
      'new-order': `
        <button class="btn-outline" onclick="app.navigate('orders')">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Quay lại
        </button>
      `,
      'stats': `
        <button class="btn-outline" onclick="app.exportStats()">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          Xuất báo cáo
        </button>
      `
    };

    return actions[route] || '';
  }

  /**
   * Load route component
   */
  async loadRouteComponent(route, routeConfig) {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) return;

    try {
      // Show loading state
      pageContent.innerHTML = `
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
          <span class="ml-2 text-gray-600">Đang tải...</span>
        </div>
      `;

      // Destroy existing component if any
      if (this.components.has('current')) {
        const component = this.components.get('current');
        if (component && typeof component.destroy === 'function') {
          component.destroy();
        }
        this.components.delete('current');
      }

      // Load component based on route
      let component;
      switch (route) {
        case 'dashboard':
          component = await this.loadDashboardComponent(pageContent);
          break;
        case 'orders':
          component = await this.loadOrderListComponent(pageContent);
          break;
        case 'new-order':
          component = await this.loadOrderFormComponent(pageContent, 'create');
          break;
        case 'edit-order':
          const orderId = this.getRouteParam('id');
          component = await this.loadOrderFormComponent(pageContent, 'edit', orderId);
          break;
        case 'stats':
          component = await this.loadStatsComponent(pageContent);
          break;
        case 'settings':
          component = await this.loadSettingsComponent(pageContent);
          break;
        case 'login':
          component = await this.loadLoginComponent(pageContent);
          break;
        default:
          throw new Error(`Unknown component for route: ${route}`);
      }

      // Store component reference
      if (component) {
        this.components.set('current', component);
      }

    } catch (error) {
      console.error('Failed to load route component:', error);
      this.showErrorPage(error);
    }
  }

  /**
   * Load dashboard component
   */
  async loadDashboardComponent(container) {
    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Stats Cards -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Đơn hôm nay</p>
              <p class="text-2xl font-semibold text-gray-900" id="today-orders">--</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Doanh thu hôm nay</p>
              <p class="text-2xl font-semibold text-gray-900" id="today-revenue">--</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Đang chờ</p>
              <p class="text-2xl font-semibold text-gray-900" id="pending-orders">--</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Khách hàng</p>
              <p class="text-2xl font-semibold text-gray-900" id="total-customers">--</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Orders -->
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Đơn hàng gần đây</h3>
        </div>
        <div class="p-6">
          <div id="recent-orders-container">
            <div class="flex items-center justify-center py-8">
              <div class="animate-spin rounded-full h-6 w-6 border-2 border-purple-600 border-t-transparent"></div>
              <span class="ml-2 text-gray-600">Đang tải...</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Load dashboard data
    await this.loadDashboardData();

    return { name: 'Dashboard' };
  }

  /**
   * Load dashboard data
   */
  async loadDashboardData() {
    try {
      // Load stats
      const stats = await StatsService.getDashboardStats();
      
      // Update stats cards
      document.getElementById('today-orders').textContent = stats.todayOrders || 0;
      document.getElementById('today-revenue').textContent = this.formatCurrency(stats.todayRevenue || 0);
      document.getElementById('pending-orders').textContent = stats.pendingOrders || 0;
      document.getElementById('total-customers').textContent = stats.totalCustomers || 0;

      // Load recent orders
      const recentOrders = await OrderService.getRecentOrders(5);
      this.renderRecentOrders(recentOrders);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      NotificationService.error('Lỗi tải dữ liệu dashboard');
    }
  }

  /**
   * Render recent orders
   */
  renderRecentOrders(orders) {
    const container = document.getElementById('recent-orders-container');
    if (!container) return;

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8">
          <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p class="text-gray-500">Chưa có đơn hàng nào</p>
          <button class="btn-primary mt-4" onclick="app.navigate('new-order')">Tạo đơn đầu tiên</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="space-y-4">
        ${orders.map(order => `
          <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <div class="flex-1">
              <div class="flex items-center space-x-3">
                <div class="font-medium text-gray-900">#${order.id}</div>
                <div class="text-sm text-gray-500">${order.customerName}</div>
                <div class="px-2 py-1 text-xs font-medium rounded-full ${this.getStatusColor(order.status)}">
                  ${this.getStatusText(order.status)}
                </div>
              </div>
              <div class="mt-1 text-sm text-gray-500">
                ${Utils.formatDateTime(order.createdAt)} • ${this.formatCurrency(order.finalAmount)}
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button class="btn-icon" onclick="app.navigate('edit-order', { id: '${order.id}' })" title="Chỉnh sửa">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="mt-6 text-center">
        <button class="btn-outline" onclick="app.navigate('orders')">Xem tất cả đơn hàng</button>
      </div>
    `;
  }

  /**
   * Load order list component
   */
  async loadOrderListComponent(container) {
    // Make global reference available
    window.orderList = new OrderList(container, {
      pageSize: 10,
      showFilters: true,
      showSearch: true,
      showBulkActions: true,
      enableSelection: true,
      autoRefresh: false
    });

    return window.orderList;
  }

  /**
   * Load order form component
   */
  async loadOrderFormComponent(container, mode = 'create', orderId = null) {
    const orderForm = new OrderForm(container, {
      mode: mode,
      orderId: orderId,
      autoSave: this.config.ui.autoSave,
      showPreview: true
    });

    return orderForm;
  }

  // Additional helper methods for the rest of the application...
  
  bindEvents() {
    // Global error handling
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(event.reason);
    });

    // Online/offline handling
    window.addEventListener('online', () => {
      this.handleOnlineStatusChange(true);
    });

    window.addEventListener('offline', () => {
      this.handleOnlineStatusChange(false);
    });
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  getStatusColor(status) {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      draft: 'bg-gray-100 text-gray-600'
    };
    return colors[status] || colors.pending;
  }

  getStatusText(status) {
    const texts = {
      pending: 'Chờ xử lý',
      confirmed: 'Đã xác nhận',
      in_progress: 'Đang thực hiện',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
      draft: 'Nháp'
    };
    return texts[status] || 'Không xác định';
  }

  showLoadingState() {
    const loading = document.getElementById('app-loading');
    const mainLayout = document.getElementById('main-layout');
    if (loading) loading.classList.remove('hidden');
    if (mainLayout) mainLayout.classList.add('hidden');
  }

  hideLoadingState() {
    // Hide in-app loading overlay
    const loading = document.getElementById('app-loading');
    const mainLayout = document.getElementById('main-layout');
    if (loading) loading.classList.add('hidden');
    if (mainLayout) mainLayout.classList.remove('hidden');

    // Also hide the initial page loader defined in index.html
    const initialLoader = document.getElementById('loading-screen');
    if (initialLoader) initialLoader.classList.add('hidden');
  }

  getInitialRoute() {
    const hash = window.location.hash.slice(1);
    return hash && this.routes[hash] ? hash : (this.user ? 'dashboard' : 'login');
  }

  getRouteFromURL() {
    return window.location.hash.slice(1) || 'dashboard';
  }

  getDefaultRoute() {
    return this.user ? 'dashboard' : 'login';
  }

  async loadConfiguration() {
    try {
      const config = await Storage.getLocal('app_config');
      if (config) {
        this.config = { ...this.config, ...config };
      }
    } catch (error) {
      console.warn('Failed to load configuration:', error);
    }
  }

  updateCurrentTime() {
    const timeEl = document.getElementById('current-time');
    if (timeEl) {
      timeEl.textContent = new Date().toLocaleTimeString('vi-VN');
    }
  }

  setupPeriodicTasks() {
    // Update time every minute
    setInterval(() => {
      this.updateCurrentTime();
    }, 60000);

    // Update stats every 5 minutes
    setInterval(() => {
      if (this.currentRoute === 'dashboard') {
        this.loadDashboardData();
      }
    }, 5 * 60000);
  }

  async isFirstTimeUser() {
    const hasVisited = await StorageService.get('has_visited');
    if (!hasVisited) {
      await StorageService.set('has_visited', true);
      return true;
    }
    return false;
  }

  showWelcomeMessage() {
    NotificationService.info('Chào mừng đến với Hair Salon PWA! 🎉', {
      duration: 8000,
      actions: [
        {
          id: 'tour',
          label: 'Tham quan',
          handler: () => this.startTour()
        }
      ]
    });
  }

  startTour() {
    // TODO: Implement app tour
    NotificationService.info('Tính năng hướng dẫn đang được phát triển');
  }

  handleInitializationError(error) {
    document.body.innerHTML = `
      <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div class="sm:mx-auto sm:w-full sm:max-w-md">
          <div class="text-center">
            <svg class="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Lỗi khởi tạo ứng dụng
            </h2>
            <p class="mt-2 text-center text-sm text-gray-600">
              Đã xảy ra lỗi khi khởi tạo ứng dụng. Vui lòng tải lại trang.
            </p>
            <div class="mt-6">
              <button onclick="window.location.reload()" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                Tải lại ứng dụng
              </button>
            </div>
            <div class="mt-4">
              <details class="text-xs text-left text-gray-500">
                <summary class="cursor-pointer">Chi tiết lỗi</summary>
                <pre class="mt-2 p-2 bg-gray-100 rounded text-red-600 overflow-auto">${error.stack || error.message}</pre>
              </details>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  toggleMobileNav() {
    const overlay = document.getElementById('mobile-nav-overlay');
    const nav = document.getElementById('mobile-nav');
    
    if (overlay && nav) {
      overlay.classList.toggle('hidden');
      nav.classList.toggle('-translate-x-full');
    }
  }

  closeMobileNav() {
    const overlay = document.getElementById('mobile-nav-overlay');
    const nav = document.getElementById('mobile-nav');
    
    if (overlay && nav) {
      overlay.classList.add('hidden');
      nav.classList.add('-translate-x-full');
    }
  }

  bindUserMenuEvents() {
    // TODO: Implement user menu functionality
  }

  bindHeaderEvents() {
    // TODO: Implement header events
  }

  setupInstallPrompt() {
    // TODO: Implement PWA install prompt
  }

  setupPushNotifications() {
    // TODO: Implement push notifications
  }

  setupConnectivityMonitoring() {
    // TODO: Implement connectivity monitoring
  }

  setupKeyboardShortcuts() {
    // TODO: Implement keyboard shortcuts
  }

  applyTheme(theme) {
    // TODO: Implement theme switching
  }

  handleServiceWorkerUpdate(registration) {
    // TODO: Implement service worker update handling
  }

  handleOnlineStatusChange(isOnline) {
    this.isOnline = isOnline;
    // TODO: Update UI and handle offline/online scenarios
  }

  handleGlobalError(error) {
    console.error('Global error:', error);
    // TODO: Implement global error handling
  }

  refreshCurrentPage() {
    this.navigate(this.currentRoute, false);
  }

  exportStats() {
    // TODO: Implement stats export
    NotificationService.info('Tính năng xuất báo cáo đang được phát triển');
  }

  showErrorPage(error) {
    const pageContent = document.getElementById('page-content');
    if (pageContent) {
      pageContent.innerHTML = `
        <div class="text-center py-12">
          <svg class="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Lỗi tải trang</h3>
          <p class="text-gray-600 mb-6">Đã xảy ra lỗi khi tải nội dung. Vui lòng thử lại.</p>
          <button class="btn-primary" onclick="app.refreshCurrentPage()">Thử lại</button>
        </div>
      `;
    }
  }

  // Stub methods for components not yet implemented
  async loadStatsComponent(container) {
    container.innerHTML = '<div class="text-center py-12"><p class="text-gray-600">Tính năng thống kê đang được phát triển</p></div>';
    return { name: 'Stats' };
  }

  async loadSettingsComponent(container) {
    container.innerHTML = '<div class="text-center py-12"><p class="text-gray-600">Tính năng cài đặt đang được phát triển</p></div>';
    return { name: 'Settings' };
  }

  async loadLoginComponent(container) {
    container.innerHTML = '<div class="text-center py-12"><p class="text-gray-600">Tính năng đăng nhập đang được phát triển</p></div>';
    return { name: 'Login' };
  }
}

// Initialize the application
const app = new HairSalonApp();
window.app = app;

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app.init();
  });
} else {
  app.init();
}



