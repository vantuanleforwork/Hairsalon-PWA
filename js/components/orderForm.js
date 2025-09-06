/**
 * OrderForm Component - Tạo và chỉnh sửa đơn hàng
 * Features: Validation, Auto-save, Offline support, Real-time preview
 */

import EventBus from '../core/eventBus.js';
import { ValidationManager } from '../core/validation.js';
import NotificationService from '../services/notification.service.js';
import { OrderService } from '../services/order.service.js';
import StorageService from '../services/storage.service.js';

export class OrderForm {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      mode: 'create', // 'create' | 'edit'
      orderId: null,
      autoSave: true,
      showPreview: true,
      ...options
    };
    
    this.formData = {
      id: null,
      customerName: '',
      customerPhone: '',
      services: [],
      totalAmount: 0,
      discount: 0,
      finalAmount: 0,
      notes: '',
      appointmentTime: '',
      status: 'pending',
      createdAt: null,
      updatedAt: null
    };
    
    this.servicesList = [
      { id: 'cut', name: 'Cắt tóc', price: 50000, duration: 30 },
      { id: 'wash', name: 'Gội đầu', price: 30000, duration: 15 },
      { id: 'color', name: 'Nhuộm tóc', price: 200000, duration: 90 },
      { id: 'perm', name: 'Uốn tóc', price: 300000, duration: 120 },
      { id: 'treatment', name: 'Dưỡng tóc', price: 150000, duration: 45 },
      { id: 'styling', name: 'Tạo kiểu', price: 80000, duration: 30 },
      { id: 'facial', name: 'Chăm sóc da mặt', price: 250000, duration: 60 },
      { id: 'manicure', name: 'Làm nail', price: 100000, duration: 45 }
    ];
    
    this.validationRules = {
      customerName: { required: true, minLength: 2, maxLength: 50 },
      customerPhone: { required: true, pattern: /^[0-9]{10,11}$/ },
      services: { required: true, minItems: 1 },
      appointmentTime: { required: true, futureDate: true }
    };
    
    this.autoSaveTimer = null;
    this.isDirty = false;
    this.isSubmitting = false;
    
    this.init();
  }
  
  async init() {
    try {
      await this.loadExistingData();
      this.render();
      this.bindEvents();
      this.setupAutoSave();
      
      EventBus.emit('form:initialized', { 
        component: 'OrderForm',
        mode: this.options.mode
      });
      
    } catch (error) {
      console.error('OrderForm init error:', error);
      NotificationService.show('Lỗi khởi tạo form', 'error');
    }
  }
  
  async loadExistingData() {
    if (this.options.mode === 'edit' && this.options.orderId) {
      try {
        const order = await OrderService.getOrder(this.options.orderId);
        if (order) {
          this.formData = { ...order };
        }
      } catch (error) {
        console.error('Load order error:', error);
        NotificationService.show('Không thể tải thông tin đơn hàng', 'error');
      }
    }
    
    // Load auto-saved data
    const autoSaved = await StorageService.get('form_autosave');
    if (autoSaved && this.options.mode === 'create') {
      if (confirm('Có dữ liệu form chưa lưu. Bạn muốn khôi phục?')) {
        this.formData = { ...this.formData, ...autoSaved };
      } else {
        await StorageService.remove('form_autosave');
      }
    }
  }
  
  render() {
    const isEdit = this.options.mode === 'edit';
    
    this.container.innerHTML = `
      <div class="order-form-container bg-white rounded-lg shadow-sm">
        <!-- Header -->
        <div class="form-header p-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900">
              ${isEdit ? 'Chỉnh sửa đơn hàng' : 'Tạo đơn hàng mới'}
            </h2>
            <div class="flex items-center space-x-2">
              ${this.isDirty ? '<span class="text-sm text-amber-600">● Chưa lưu</span>' : ''}
              <button type="button" class="btn-close text-gray-400 hover:text-gray-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Form Content -->
        <div class="form-content p-4">
          <form class="order-form space-y-6" novalidate>
            
            <!-- Customer Information -->
            <div class="form-section">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Thông tin khách hàng</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                  <label class="form-label">Tên khách hàng *</label>
                  <input 
                    type="text" 
                    name="customerName" 
                    class="form-input"
                    placeholder="Nhập tên khách hàng"
                    value="${this.formData.customerName}"
                    required
                  >
                  <div class="form-error hidden"></div>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Số điện thoại *</label>
                  <input 
                    type="tel" 
                    name="customerPhone" 
                    class="form-input"
                    placeholder="0123456789"
                    value="${this.formData.customerPhone}"
                    required
                  >
                  <div class="form-error hidden"></div>
                </div>
              </div>
            </div>
            
            <!-- Services Selection -->
            <div class="form-section">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Chọn dịch vụ *</h3>
              <div class="services-grid grid grid-cols-1 md:grid-cols-2 gap-3">
                ${this.renderServicesOptions()}
              </div>
              <div class="form-error hidden mt-2"></div>
            </div>
            
            <!-- Pricing -->
            <div class="form-section">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Thành tiền</h3>
              <div class="pricing-summary bg-gray-50 rounded-lg p-4 space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Tổng tiền dịch vụ:</span>
                  <span class="font-medium total-amount">${this.formatCurrency(this.formData.totalAmount)}</span>
                </div>
                
                <div class="flex justify-between items-center">
                  <label class="text-gray-600">Giảm giá:</label>
                  <div class="flex items-center space-x-2">
                    <input 
                      type="number" 
                      name="discount" 
                      class="form-input w-24 text-right"
                      placeholder="0"
                      min="0"
                      max="${this.formData.totalAmount}"
                      value="${this.formData.discount}"
                    >
                    <span class="text-gray-500">₫</span>
                  </div>
                </div>
                
                <div class="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span class="text-lg font-semibold text-gray-900">Thành tiền:</span>
                  <span class="text-xl font-bold text-purple-600 final-amount">
                    ${this.formatCurrency(this.formData.finalAmount)}
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Appointment Time -->
            <div class="form-section">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Thời gian hẹn</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                  <label class="form-label">Ngày hẹn *</label>
                  <input 
                    type="datetime-local" 
                    name="appointmentTime" 
                    class="form-input"
                    value="${this.formData.appointmentTime}"
                    min="${new Date().toISOString().slice(0, 16)}"
                    required
                  >
                  <div class="form-error hidden"></div>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Thời gian dự kiến</label>
                  <input 
                    type="text" 
                    class="form-input estimated-duration"
                    value="${this.calculateTotalDuration()} phút"
                    readonly
                    disabled
                  >
                </div>
              </div>
            </div>
            
            <!-- Notes -->
            <div class="form-section">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Ghi chú</h3>
              <div class="form-group">
                <textarea 
                  name="notes" 
                  class="form-input"
                  placeholder="Ghi chú thêm về yêu cầu của khách hàng..."
                  rows="4"
                >${this.formData.notes}</textarea>
              </div>
            </div>
            
          </form>
        </div>

        <!-- Form Actions -->
        <div class="form-actions p-4 border-t border-gray-200 flex justify-between items-center">
          <div class="flex items-center space-x-4">
            <button type="button" class="btn-secondary btn-draft">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              Lưu nháp
            </button>
            
            <button type="button" class="btn-outline btn-preview">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              Xem trước
            </button>
          </div>
          
          <div class="flex items-center space-x-3">
            <button type="button" class="btn-outline btn-cancel">Hủy</button>
            <button type="submit" class="btn-primary btn-submit" disabled>
              <svg class="w-4 h-4 mr-2 btn-submit-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="btn-submit-text">${isEdit ? 'Cập nhật' : 'Tạo đơn'}</span>
            </button>
          </div>
        </div>

        <!-- Order Preview Modal -->
        <div class="order-preview-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div class="preview-content p-4">
              <!-- Preview content will be rendered here -->
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.updateCalculations();
    this.updateSubmitButton();
  }
  
  renderServicesOptions() {
    return this.servicesList.map(service => {
      const isSelected = this.formData.services.some(s => s.id === service.id);
      return `
        <div class="service-option ${isSelected ? 'selected' : ''}" data-service-id="${service.id}">
          <div class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-purple-300 transition-colors">
            <input 
              type="checkbox" 
              id="service-${service.id}"
              class="service-checkbox"
              ${isSelected ? 'checked' : ''}
            >
            <div class="flex-1">
              <label for="service-${service.id}" class="font-medium text-gray-900 cursor-pointer">
                ${service.name}
              </label>
              <div class="text-sm text-gray-500">
                ${this.formatCurrency(service.price)} • ${service.duration} phút
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  bindEvents() {
    const form = this.container.querySelector('.order-form');
    
    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
    
    // Input changes
    form.addEventListener('input', (e) => {
      this.handleInputChange(e);
    });
    
    // Service selection
    this.container.addEventListener('change', (e) => {
      if (e.target.classList.contains('service-checkbox')) {
        this.handleServiceSelection(e);
      }
    });
    
    // Action buttons
    this.container.querySelector('.btn-cancel').addEventListener('click', () => {
      this.handleCancel();
    });
    
    this.container.querySelector('.btn-draft').addEventListener('click', () => {
      this.handleSaveDraft();
    });
    
    this.container.querySelector('.btn-preview').addEventListener('click', () => {
      this.handlePreview();
    });
    
    this.container.querySelector('.btn-close').addEventListener('click', () => {
      this.handleCancel();
    });
    
    // Close preview modal
    this.container.querySelector('.order-preview-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.closePreview();
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.handleSaveDraft();
      } else if (e.key === 'Escape') {
        this.closePreview();
      }
    });
  }
  
  setupAutoSave() {
    if (!this.options.autoSave) return;
    
    this.container.addEventListener('input', () => {
      this.markAsDirty();
      
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = setTimeout(() => {
        this.autoSave();
      }, 2000);
    });
  }
  
  async autoSave() {
    if (this.options.mode === 'create' && this.isDirty) {
      try {
        const formData = this.collectFormData();
        await StorageService.set('form_autosave', formData);
        console.log('Auto-saved form data');
      } catch (error) {
        console.warn('Auto-save failed:', error);
      }
    }
  }
  
  handleInputChange(e) {
    const { name, value, type } = e.target;
    
    if (name === 'discount') {
      const discount = Math.max(0, Math.min(parseInt(value) || 0, this.formData.totalAmount));
      e.target.value = discount;
      this.formData.discount = discount;
      this.updateCalculations();
    }
    
    this.markAsDirty();
    this.validateField(e.target);
    this.updateSubmitButton();
  }
  
  handleServiceSelection(e) {
    const serviceId = e.target.closest('.service-option').dataset.serviceId;
    const service = this.servicesList.find(s => s.id === serviceId);
    const isChecked = e.target.checked;
    
    if (isChecked) {
      if (!this.formData.services.find(s => s.id === serviceId)) {
        this.formData.services.push({...service});
      }
      e.target.closest('.service-option').classList.add('selected');
    } else {
      this.formData.services = this.formData.services.filter(s => s.id !== serviceId);
      e.target.closest('.service-option').classList.remove('selected');
    }
    
    this.updateCalculations();
    this.updateEstimatedDuration();
    this.markAsDirty();
    this.updateSubmitButton();
  }
  
  updateCalculations() {
    this.formData.totalAmount = this.formData.services.reduce((sum, service) => sum + service.price, 0);
    this.formData.finalAmount = Math.max(0, this.formData.totalAmount - this.formData.discount);
    
    const totalAmountEl = this.container.querySelector('.total-amount');
    const finalAmountEl = this.container.querySelector('.final-amount');
    
    if (totalAmountEl) totalAmountEl.textContent = this.formatCurrency(this.formData.totalAmount);
    if (finalAmountEl) finalAmountEl.textContent = this.formatCurrency(this.formData.finalAmount);
  }
  
  updateEstimatedDuration() {
    const durationEl = this.container.querySelector('.estimated-duration');
    if (durationEl) {
      durationEl.value = this.calculateTotalDuration() + ' phút';
    }
  }
  
  calculateTotalDuration() {
    return this.formData.services.reduce((total, service) => total + service.duration, 0);
  }
  
  validateField(field) {
    const { name, value } = field;
    const rules = this.validationRules[name];
    
    if (!rules) return true;
    
    const validator = new ValidationManager();
    const result = validator.validateField(name, value, rules);
    
    const errorEl = field.closest('.form-group').querySelector('.form-error');
    
    if (result.isValid) {
      field.classList.remove('error');
      errorEl.classList.add('hidden');
      errorEl.textContent = '';
    } else {
      field.classList.add('error');
      errorEl.classList.remove('hidden');
      errorEl.textContent = result.error;
    }
    
    return result.isValid;
  }
  
  validateForm() {
    const formData = this.collectFormData();
    const validator = new ValidationManager();
    
    // Validate required fields
    let isValid = true;
    
    const nameField = this.container.querySelector('[name="customerName"]');
    if (!this.validateField(nameField)) isValid = false;
    
    const phoneField = this.container.querySelector('[name="customerPhone"]');
    if (!this.validateField(phoneField)) isValid = false;
    
    const timeField = this.container.querySelector('[name="appointmentTime"]');
    if (!this.validateField(timeField)) isValid = false;
    
    // Validate services
    if (formData.services.length === 0) {
      const servicesError = this.container.querySelector('.services-grid + .form-error');
      servicesError.classList.remove('hidden');
      servicesError.textContent = 'Vui lòng chọn ít nhất một dịch vụ';
      isValid = false;
    } else {
      const servicesError = this.container.querySelector('.services-grid + .form-error');
      servicesError.classList.add('hidden');
    }
    
    return isValid;
  }
  
  collectFormData() {
    const form = this.container.querySelector('.order-form');
    const formData = new FormData(form);
    
    return {
      id: this.formData.id,
      customerName: formData.get('customerName')?.trim(),
      customerPhone: formData.get('customerPhone')?.trim(),
      services: [...this.formData.services],
      totalAmount: this.formData.totalAmount,
      discount: parseInt(formData.get('discount')) || 0,
      finalAmount: this.formData.finalAmount,
      notes: formData.get('notes')?.trim() || '',
      appointmentTime: formData.get('appointmentTime'),
      status: this.formData.status || 'pending',
      createdAt: this.formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  
  async handleSubmit() {
    if (this.isSubmitting) return;
    
    if (!this.validateForm()) {
      NotificationService.show('Vui lòng kiểm tra lại thông tin', 'error');
      return;
    }
    
    this.isSubmitting = true;
    this.updateSubmitButton();
    
    try {
      const formData = this.collectFormData();
      
      let result;
      if (this.options.mode === 'edit') {
        result = await OrderService.updateOrder(formData.id, formData);
        NotificationService.show('Cập nhật đơn hàng thành công!', 'success');
      } else {
        result = await OrderService.createOrder(formData);
        NotificationService.show('Tạo đơn hàng thành công!', 'success');
      }
      
      // Clear auto-save data
      await StorageService.remove('form_autosave');
      
      EventBus.emit('order:saved', {
        order: result,
        mode: this.options.mode
      });
      
      // Close form
      setTimeout(() => {
        this.handleCancel();
      }, 1000);
      
    } catch (error) {
      console.error('Submit error:', error);
      NotificationService.show(
        error.message || 'Có lỗi xảy ra khi lưu đơn hàng', 
        'error'
      );
    } finally {
      this.isSubmitting = false;
      this.updateSubmitButton();
    }
  }
  
  async handleSaveDraft() {
    try {
      const formData = this.collectFormData();
      formData.status = 'draft';
      
      if (this.options.mode === 'edit') {
        await OrderService.updateOrder(formData.id, formData);
      } else {
        await OrderService.createOrder(formData);
      }
      
      NotificationService.show('Lưu nháp thành công!', 'success');
      this.markAsClean();
      
    } catch (error) {
      console.error('Save draft error:', error);
      NotificationService.show('Lỗi lưu nháp', 'error');
    }
  }
  
  handlePreview() {
    const formData = this.collectFormData();
    const modal = this.container.querySelector('.order-preview-modal');
    const content = modal.querySelector('.preview-content');
    
    content.innerHTML = `
      <div class="order-preview">
        <h3 class="text-lg font-semibold mb-4">Xem trước đơn hàng</h3>
        
        <div class="space-y-4">
          <div>
            <span class="font-medium">Khách hàng:</span> ${formData.customerName}
            <br><span class="font-medium">SĐT:</span> ${formData.customerPhone}
          </div>
          
          <div>
            <span class="font-medium">Dịch vụ:</span>
            <ul class="mt-1 space-y-1">
              ${formData.services.map(service => 
                `<li>• ${service.name} - ${this.formatCurrency(service.price)}</li>`
              ).join('')}
            </ul>
          </div>
          
          <div>
            <span class="font-medium">Thời gian:</span> 
            ${new Date(formData.appointmentTime).toLocaleString('vi-VN')}
          </div>
          
          <div>
            <span class="font-medium">Thành tiền:</span> 
            <span class="text-lg font-bold text-purple-600">
              ${this.formatCurrency(formData.finalAmount)}
            </span>
          </div>
          
          ${formData.notes ? `
            <div>
              <span class="font-medium">Ghi chú:</span> ${formData.notes}
            </div>
          ` : ''}
        </div>
        
        <div class="mt-6 flex justify-end">
          <button class="btn-outline close-preview">Đóng</button>
        </div>
      </div>
    `;
    
    content.querySelector('.close-preview').addEventListener('click', () => {
      this.closePreview();
    });
    
    modal.classList.remove('hidden');
  }
  
  closePreview() {
    this.container.querySelector('.order-preview-modal').classList.add('hidden');
  }
  
  handleCancel() {
    if (this.isDirty) {
      if (!confirm('Có thay đổi chưa lưu. Bạn có chắc muốn thoát?')) {
        return;
      }
    }
    
    EventBus.emit('form:cancel', { component: 'OrderForm' });
  }
  
  markAsDirty() {
    this.isDirty = true;
    const dirtyIndicator = this.container.querySelector('.form-header .text-amber-600');
    if (dirtyIndicator) {
      dirtyIndicator.classList.remove('hidden');
    }
  }
  
  markAsClean() {
    this.isDirty = false;
    const dirtyIndicator = this.container.querySelector('.form-header .text-amber-600');
    if (dirtyIndicator) {
      dirtyIndicator.classList.add('hidden');
    }
  }
  
  updateSubmitButton() {
    const submitBtn = this.container.querySelector('.btn-submit');
    const submitText = this.container.querySelector('.btn-submit-text');
    const submitIcon = this.container.querySelector('.btn-submit-icon');
    
    if (this.isSubmitting) {
      submitBtn.disabled = true;
      submitText.textContent = 'Đang lưu...';
      submitIcon.innerHTML = `
        <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      `;
    } else {
      const isValid = this.formData.services.length > 0 &&
                      this.container.querySelector('[name="customerName"]').value.trim() &&
                      this.container.querySelector('[name="customerPhone"]').value.trim() &&
                      this.container.querySelector('[name="appointmentTime"]').value;
      
      submitBtn.disabled = !isValid;
      submitText.textContent = this.options.mode === 'edit' ? 'Cập nhật' : 'Tạo đơn';
      submitIcon.innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      `;
    }
  }
  
  formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }
  
  destroy() {
    clearTimeout(this.autoSaveTimer);
    EventBus.emit('form:destroyed', { component: 'OrderForm' });
  }
}
