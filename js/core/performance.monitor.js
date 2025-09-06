/**
 * Performance Monitor
 * Monitors app performance, Core Web Vitals, and mobile-specific metrics
 */

export class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = [];
    this.isEnabled = true;
    
    this.init();
  }

  init() {
    if (!this.isEnabled || typeof window === 'undefined') return;

    // Initialize performance monitoring
    this.setupWebVitals();
    this.setupResourceTiming();
    this.setupMemoryMonitoring();
    this.setupMobileSpecificMetrics();
    this.setupErrorTracking();

    console.log('🔍 Performance Monitor initialized');
  }

  /**
   * Setup Core Web Vitals monitoring
   */
  setupWebVitals() {
    // Largest Contentful Paint (LCP)
    this.observeMetric('largest-contentful-paint', (list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.metrics.lcp = {
        value: lastEntry.startTime,
        element: lastEntry.element,
        timestamp: Date.now()
      };
      
      this.reportMetric('LCP', lastEntry.startTime);
    });

    // First Input Delay (FID)
    this.observeMetric('first-input', (list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        this.metrics.fid = {
          value: entry.processingStart - entry.startTime,
          timestamp: Date.now()
        };
        
        this.reportMetric('FID', entry.processingStart - entry.startTime);
      });
    });

    // Cumulative Layout Shift (CLS)
    this.observeMetric('layout-shift', (list) => {
      let clsValue = 0;
      
      list.getEntries().forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      
      if (clsValue > 0) {
        this.metrics.cls = {
          value: clsValue,
          timestamp: Date.now()
        };
        
        this.reportMetric('CLS', clsValue);
      }
    });

    // First Contentful Paint (FCP)
    this.observeMetric('paint', (list) => {
      list.getEntries().forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = {
            value: entry.startTime,
            timestamp: Date.now()
          };
          
          this.reportMetric('FCP', entry.startTime);
        }
      });
    });

    // Time to First Byte (TTFB)
    this.measureTTFB();
  }

  /**
   * Observe performance metrics
   */
  observeMetric(type, callback) {
    try {
      const observer = new PerformanceObserver(callback);
      observer.observe({ type, buffered: true });
      this.observers.push(observer);
    } catch (error) {
      console.warn(`Failed to observe ${type}:`, error);
    }
  }

  /**
   * Measure Time to First Byte
   */
  measureTTFB() {
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    if (navigationEntry) {
      const ttfb = navigationEntry.responseStart - navigationEntry.fetchStart;
      
      this.metrics.ttfb = {
        value: ttfb,
        timestamp: Date.now()
      };
      
      this.reportMetric('TTFB', ttfb);
    }
  }

  /**
   * Setup resource timing monitoring
   */
  setupResourceTiming() {
    this.observeMetric('resource', (list) => {
      const entries = list.getEntries();
      
      entries.forEach(entry => {
        // Monitor slow resources
        const duration = entry.responseEnd - entry.startTime;
        
        if (duration > 1000) { // Slower than 1s
          this.reportSlowResource(entry.name, duration);
        }

        // Track resource types
        if (entry.initiatorType) {
          if (!this.metrics.resourceTypes) {
            this.metrics.resourceTypes = {};
          }
          
          if (!this.metrics.resourceTypes[entry.initiatorType]) {
            this.metrics.resourceTypes[entry.initiatorType] = [];
          }
          
          this.metrics.resourceTypes[entry.initiatorType].push({
            name: entry.name,
            duration,
            size: entry.transferSize,
            timestamp: Date.now()
          });
        }
      });
    });
  }

  /**
   * Setup memory monitoring
   */
  setupMemoryMonitoring() {
    if (window.performance && window.performance.memory) {
      setInterval(() => {
        const memory = window.performance.memory;
        
        this.metrics.memory = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          timestamp: Date.now()
        };

        // Warn if memory usage is high
        const memoryUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (memoryUsagePercent > 80) {
          console.warn(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
          this.reportHighMemoryUsage(memoryUsagePercent);
        }

      }, 10000); // Check every 10 seconds
    }
  }

  /**
   * Setup mobile-specific metrics
   */
  setupMobileSpecificMetrics() {
    // Device type detection
    this.detectDeviceType();
    
    // Connection monitoring
    this.monitorConnection();
    
    // Battery monitoring
    this.monitorBattery();
    
    // Touch performance
    this.monitorTouchPerformance();
    
    // Viewport changes
    this.monitorViewportChanges();
  }

  /**
   * Detect device type and capabilities
   */
  detectDeviceType() {
    const userAgent = navigator.userAgent;
    const deviceType = {
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
      isTablet: /iPad|Android(?!.*Mobile)/i.test(userAgent),
      isIOS: /iPhone|iPad|iPod/i.test(userAgent),
      isAndroid: /Android/i.test(userAgent),
      isSafari: /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent),
      isChrome: /Chrome/i.test(userAgent),
      touchSupport: 'ontouchstart' in window,
      pixelRatio: window.devicePixelRatio || 1,
      screenSize: {
        width: screen.width,
        height: screen.height
      },
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    this.metrics.device = deviceType;
    console.log('📱 Device detected:', deviceType);
  }

  /**
   * Monitor connection quality
   */
  monitorConnection() {
    if (navigator.connection) {
      const connection = navigator.connection;
      
      this.metrics.connection = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
        timestamp: Date.now()
      };

      // Listen for connection changes
      connection.addEventListener('change', () => {
        this.metrics.connection = {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
          timestamp: Date.now()
        };

        console.log('📶 Connection changed:', this.metrics.connection);
        this.reportConnectionChange(this.metrics.connection);
      });

      // Warn about slow connections
      if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
        console.warn('🐌 Slow connection detected');
        this.reportSlowConnection(connection.effectiveType);
      }
    }
  }

  /**
   * Monitor battery status
   */
  async monitorBattery() {
    if (navigator.getBattery) {
      try {
        const battery = await navigator.getBattery();
        
        const updateBatteryStatus = () => {
          this.metrics.battery = {
            level: battery.level * 100,
            charging: battery.charging,
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime,
            timestamp: Date.now()
          };

          // Warn about low battery
          if (battery.level < 0.15 && !battery.charging) {
            console.warn('🔋 Low battery detected');
            this.reportLowBattery(battery.level * 100);
          }
        };

        updateBatteryStatus();
        
        battery.addEventListener('chargingchange', updateBatteryStatus);
        battery.addEventListener('levelchange', updateBatteryStatus);
        
      } catch (error) {
        console.warn('Battery API not supported:', error);
      }
    }
  }

  /**
   * Monitor touch performance
   */
  monitorTouchPerformance() {
    if ('ontouchstart' in window) {
      let touchStartTime = 0;
      let touchMoveCount = 0;

      document.addEventListener('touchstart', (e) => {
        touchStartTime = performance.now();
        touchMoveCount = 0;
      }, { passive: true });

      document.addEventListener('touchmove', (e) => {
        touchMoveCount++;
      }, { passive: true });

      document.addEventListener('touchend', (e) => {
        const touchDuration = performance.now() - touchStartTime;
        
        if (!this.metrics.touchPerformance) {
          this.metrics.touchPerformance = [];
        }

        this.metrics.touchPerformance.push({
          duration: touchDuration,
          moveCount: touchMoveCount,
          timestamp: Date.now()
        });

        // Keep only last 100 touch interactions
        if (this.metrics.touchPerformance.length > 100) {
          this.metrics.touchPerformance = this.metrics.touchPerformance.slice(-100);
        }

        // Warn about slow touch responses
        if (touchDuration > 100) {
          console.warn('👆 Slow touch response:', touchDuration);
        }
      }, { passive: true });
    }
  }

  /**
   * Monitor viewport changes (orientation, resize)
   */
  monitorViewportChanges() {
    let resizeTimeout;

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newSize = {
          width: window.innerWidth,
          height: window.innerHeight,
          orientation: window.orientation || 0,
          timestamp: Date.now()
        };

        if (!this.metrics.viewportChanges) {
          this.metrics.viewportChanges = [];
        }

        this.metrics.viewportChanges.push(newSize);

        // Keep only last 20 viewport changes
        if (this.metrics.viewportChanges.length > 20) {
          this.metrics.viewportChanges = this.metrics.viewportChanges.slice(-20);
        }

        console.log('📐 Viewport changed:', newSize);
      }, 250);
    }, { passive: true });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.metrics.orientation = {
          angle: window.orientation || 0,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          timestamp: Date.now()
        };

        console.log('📱 Orientation changed:', this.metrics.orientation);
      }, 100);
    }, { passive: true });
  }

  /**
   * Setup error tracking
   */
  setupErrorTracking() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError('JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
    });

    // Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError('Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });

    // Resource loading errors
    document.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.reportError('Resource Loading Error', {
          element: event.target.tagName,
          source: event.target.src || event.target.href,
          type: event.target.type
        });
      }
    }, true);
  }

  /**
   * Report a performance metric
   */
  reportMetric(name, value) {
    console.log(`📊 ${name}: ${Math.round(value)}ms`);

    // Send to analytics if available
    if (window.gtag) {
      gtag('event', 'web_vital', {
        name: name.toLowerCase(),
        value: Math.round(value),
        custom_map: {
          metric_type: 'performance'
        }
      });
    }

    // Alert on poor performance
    const thresholds = {
      LCP: 2500,  // Good: <2.5s
      FID: 100,   // Good: <100ms
      CLS: 0.1,   // Good: <0.1
      FCP: 1800,  // Good: <1.8s
      TTFB: 600   // Good: <600ms
    };

    if (thresholds[name] && value > thresholds[name]) {
      console.warn(`⚠️ Poor ${name}: ${Math.round(value)}${name === 'CLS' ? '' : 'ms'}`);
    }
  }

  /**
   * Report slow resource
   */
  reportSlowResource(url, duration) {
    console.warn(`🐌 Slow resource: ${url} (${Math.round(duration)}ms)`);
    
    if (window.gtag) {
      gtag('event', 'slow_resource', {
        resource_url: url,
        duration: Math.round(duration)
      });
    }
  }

  /**
   * Report high memory usage
   */
  reportHighMemoryUsage(percentage) {
    if (window.gtag) {
      gtag('event', 'high_memory_usage', {
        usage_percentage: Math.round(percentage)
      });
    }
  }

  /**
   * Report connection changes
   */
  reportConnectionChange(connection) {
    if (window.gtag) {
      gtag('event', 'connection_change', {
        effective_type: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      });
    }
  }

  /**
   * Report slow connection
   */
  reportSlowConnection(type) {
    if (window.gtag) {
      gtag('event', 'slow_connection', {
        connection_type: type
      });
    }
  }

  /**
   * Report low battery
   */
  reportLowBattery(level) {
    if (window.gtag) {
      gtag('event', 'low_battery', {
        battery_level: Math.round(level)
      });
    }
  }

  /**
   * Report errors
   */
  reportError(type, details) {
    console.error(`💥 ${type}:`, details);

    if (!this.metrics.errors) {
      this.metrics.errors = [];
    }

    this.metrics.errors.push({
      type,
      details,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Keep only last 50 errors
    if (this.metrics.errors.length > 50) {
      this.metrics.errors = this.metrics.errors.slice(-50);
    }

    if (window.gtag) {
      gtag('event', 'exception', {
        description: `${type}: ${details.message || details.reason || 'Unknown'}`,
        fatal: false
      });
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const metrics = this.getMetrics();
    
    return {
      coreWebVitals: {
        lcp: metrics.lcp?.value,
        fid: metrics.fid?.value,
        cls: metrics.cls?.value,
        fcp: metrics.fcp?.value,
        ttfb: metrics.ttfb?.value
      },
      device: metrics.device,
      connection: metrics.connection,
      battery: metrics.battery,
      memory: metrics.memory,
      errorCount: metrics.errors?.length || 0,
      timestamp: Date.now()
    };
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics() {
    const data = JSON.stringify(this.getMetrics(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * Start performance monitoring session
   */
  startSession(sessionName = 'default') {
    this.sessionName = sessionName;
    this.sessionStartTime = Date.now();
    
    console.log(`🚀 Performance monitoring session started: ${sessionName}`);
  }

  /**
   * End performance monitoring session
   */
  endSession() {
    if (!this.sessionStartTime) return;

    const sessionDuration = Date.now() - this.sessionStartTime;
    const summary = this.getSummary();
    
    console.log(`🏁 Performance session ended: ${this.sessionName} (${sessionDuration}ms)`);
    console.table(summary.coreWebVitals);
    
    if (window.gtag) {
      gtag('event', 'performance_session_end', {
        session_name: this.sessionName,
        session_duration: sessionDuration,
        lcp: summary.coreWebVitals.lcp,
        fid: summary.coreWebVitals.fid,
        cls: summary.coreWebVitals.cls
      });
    }

    return summary;
  }

  /**
   * Disconnect all observers
   */
  disconnect() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('Error disconnecting observer:', error);
      }
    });
    
    this.observers = [];
    this.isEnabled = false;
    
    console.log('🔍 Performance Monitor disconnected');
  }
}

// Export singleton instance
export default new PerformanceMonitor();
