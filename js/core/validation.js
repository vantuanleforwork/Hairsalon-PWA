/**
 * Validation Manager - Form validation utilities
 * Version: 1.0.0
 */

export class ValidationManager {
  constructor() {
    this.validators = new Map();
    this.errorMessages = new Map();
    this.init();
  }

  init() {
    this.setupDefaultValidators();
    this.setupDefaultErrorMessages();
  }

  /**
   * Setup default validators
   */
  setupDefaultValidators() {
    // Required field validator
    this.addValidator('required', (value) => {
      return value !== null && value !== undefined && String(value).trim() !== '';
    });

    // Email validator
    this.addValidator('email', (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !value || emailRegex.test(value);
    });

    // Phone number validator (Vietnamese format)
    this.addValidator('phone', (value) => {
      const phoneRegex = /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/;
      return !value || phoneRegex.test(value.replace(/\s/g, ''));
    });

    // Minimum length validator
    this.addValidator('minLength', (value, length) => {
      return !value || String(value).length >= length;
    });

    // Maximum length validator
    this.addValidator('maxLength', (value, length) => {
      return !value || String(value).length <= length;
    });

    // Number validator
    this.addValidator('number', (value) => {
      return !value || !isNaN(Number(value));
    });

    // Positive number validator
    this.addValidator('positiveNumber', (value) => {
      return !value || (!isNaN(Number(value)) && Number(value) > 0);
    });

    // Price validator (Vietnamese currency)
    this.addValidator('price', (value) => {
      return !value || (!isNaN(Number(value)) && Number(value) >= 0);
    });

    // Name validator (Vietnamese names)
    this.addValidator('vietnameseName', (value) => {
      const nameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s]+$/;
      return !value || nameRegex.test(value);
    });

    // Date validator
    this.addValidator('date', (value) => {
      if (!value) return true;
      const date = new Date(value);
      return !isNaN(date.getTime());
    });

    // Future date validator
    this.addValidator('futureDate', (value) => {
      if (!value) return true;
      const date = new Date(value);
      const now = new Date();
      return date > now;
    });

    // Past date validator
    this.addValidator('pastDate', (value) => {
      if (!value) return true;
      const date = new Date(value);
      const now = new Date();
      return date < now;
    });
  }

  /**
   * Setup default error messages
   */
  setupDefaultErrorMessages() {
    this.errorMessages.set('required', 'Trường này là bắt buộc');
    this.errorMessages.set('email', 'Email không hợp lệ');
    this.errorMessages.set('phone', 'Số điện thoại không hợp lệ');
    this.errorMessages.set('minLength', 'Tối thiểu {length} ký tự');
    this.errorMessages.set('maxLength', 'Tối đa {length} ký tự');
    this.errorMessages.set('number', 'Phải là một số hợp lệ');
    this.errorMessages.set('positiveNumber', 'Phải là số dương');
    this.errorMessages.set('price', 'Giá phải là số không âm');
    this.errorMessages.set('vietnameseName', 'Tên không hợp lệ');
    this.errorMessages.set('date', 'Ngày không hợp lệ');
    this.errorMessages.set('futureDate', 'Ngày phải trong tương lai');
    this.errorMessages.set('pastDate', 'Ngày phải trong quá khứ');
  }

  /**
   * Add custom validator
   */
  addValidator(name, validator) {
    this.validators.set(name, validator);
  }

  /**
   * Add custom error message
   */
  addErrorMessage(validatorName, message) {
    this.errorMessages.set(validatorName, message);
  }

  /**
   * Validate a single value
   */
  validateValue(value, rules) {
    const errors = [];

    for (const rule of rules) {
      let validator, params;

      if (typeof rule === 'string') {
        validator = rule;
        params = [];
      } else if (typeof rule === 'object') {
        validator = rule.type;
        params = rule.params || [];
      }

      if (!this.validators.has(validator)) {
        console.warn(`Validator '${validator}' not found`);
        continue;
      }

      const isValid = this.validators.get(validator)(value, ...params);
      
      if (!isValid) {
        let message = this.errorMessages.get(validator) || `Validation failed for ${validator}`;
        
        // Replace placeholders in error message
        if (typeof rule === 'object' && rule.params) {
          rule.params.forEach((param, index) => {
            message = message.replace(`{param${index}}`, param);
            message = message.replace(`{${Object.keys(rule.params)[index] || 'param'}}`, param);
          });
        }
        
        // Handle specific parameter replacements
        if (validator === 'minLength' || validator === 'maxLength') {
          message = message.replace('{length}', params[0]);
        }

        errors.push({
          validator,
          message: rule.message || message,
          params
        });
      }
    }

    return errors;
  }

  /**
   * Validate form data
   */
  validateForm(data, schema) {
    const errors = {};
    let isValid = true;

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const fieldErrors = this.validateValue(value, rules);

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
        isValid = false;
      }
    }

    return { isValid, errors };
  }

  /**
   * Validate form element
   */
  validateElement(element, rules) {
    const value = this.getElementValue(element);
    const errors = this.validateValue(value, rules);
    
    this.displayElementErrors(element, errors);
    
    return errors.length === 0;
  }

  /**
   * Get value from form element
   */
  getElementValue(element) {
    switch (element.type) {
      case 'checkbox':
        return element.checked;
      case 'radio':
        const radioGroup = document.querySelectorAll(`input[name="${element.name}"]`);
        const checkedRadio = Array.from(radioGroup).find(radio => radio.checked);
        return checkedRadio ? checkedRadio.value : null;
      case 'select-multiple':
        return Array.from(element.selectedOptions).map(option => option.value);
      default:
        return element.value;
    }
  }

  /**
   * Display validation errors for form element
   */
  displayElementErrors(element, errors) {
    // Remove existing error messages
    this.clearElementErrors(element);

    if (errors.length === 0) {
      element.classList.remove('validation-error');
      element.classList.add('validation-success');
      return;
    }

    element.classList.add('validation-error');
    element.classList.remove('validation-success');

    // Create error message container
    const errorContainer = document.createElement('div');
    errorContainer.className = 'validation-errors';

    errors.forEach(error => {
      const errorElement = document.createElement('div');
      errorElement.className = 'validation-error-message';
      errorElement.textContent = error.message;
      errorContainer.appendChild(errorElement);
    });

    // Insert error container after the element
    element.parentNode.insertBefore(errorContainer, element.nextSibling);
  }

  /**
   * Clear validation errors for form element
   */
  clearElementErrors(element) {
    const errorContainer = element.parentNode.querySelector('.validation-errors');
    if (errorContainer) {
      errorContainer.remove();
    }
    
    element.classList.remove('validation-error', 'validation-success');
  }

  /**
   * Setup real-time validation for form
   */
  setupFormValidation(formElement, schema, options = {}) {
    const {
      validateOnBlur = true,
      validateOnInput = false,
      validateOnSubmit = true,
      showSuccess = true
    } = options;

    // Validate on input/change events
    if (validateOnInput || validateOnBlur) {
      Object.keys(schema).forEach(fieldName => {
        const field = formElement.querySelector(`[name="${fieldName}"]`);
        if (!field) return;

        if (validateOnInput) {
          field.addEventListener('input', () => {
            this.validateElement(field, schema[fieldName]);
          });
        }

        if (validateOnBlur) {
          field.addEventListener('blur', () => {
            this.validateElement(field, schema[fieldName]);
          });
        }
      });
    }

    // Validate on form submit
    if (validateOnSubmit) {
      formElement.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(formElement);
        const data = Object.fromEntries(formData.entries());
        
        const validation = this.validateForm(data, schema);
        
        if (!validation.isValid) {
          // Display errors for each field
          Object.entries(validation.errors).forEach(([field, errors]) => {
            const element = formElement.querySelector(`[name="${field}"]`);
            if (element) {
              this.displayElementErrors(element, errors);
            }
          });
          
          // Focus on first error field
          const firstErrorField = Object.keys(validation.errors)[0];
          const firstErrorElement = formElement.querySelector(`[name="${firstErrorField}"]`);
          if (firstErrorElement) {
            firstErrorElement.focus();
          }
          
          return false;
        }

        // Form is valid, proceed with submission
        return true;
      });
    }
  }

  /**
   * Common validation schemas
   */
  static getOrderFormSchema() {
    return {
      customerName: [
        'required',
        { type: 'vietnameseName' },
        { type: 'minLength', params: [2] },
        { type: 'maxLength', params: [50] }
      ],
      customerPhone: [
        'required',
        'phone'
      ],
      customerEmail: [
        'email'
      ],
      services: [
        'required'
      ],
      appointmentDate: [
        'required',
        'date',
        'futureDate'
      ],
      appointmentTime: [
        'required'
      ],
      totalAmount: [
        'required',
        'positiveNumber'
      ]
    };
  }

  static getCustomerFormSchema() {
    return {
      name: [
        'required',
        { type: 'vietnameseName' },
        { type: 'minLength', params: [2] },
        { type: 'maxLength', params: [50] }
      ],
      phone: [
        'required',
        'phone'
      ],
      email: [
        'email'
      ],
      address: [
        { type: 'maxLength', params: [200] }
      ],
      birthDate: [
        'date',
        'pastDate'
      ]
    };
  }

  static getServiceFormSchema() {
    return {
      name: [
        'required',
        { type: 'minLength', params: [3] },
        { type: 'maxLength', params: [100] }
      ],
      description: [
        { type: 'maxLength', params: [500] }
      ],
      price: [
        'required',
        'price'
      ],
      duration: [
        'required',
        'positiveNumber'
      ]
    };
  }
}

// Export singleton instance
export default new ValidationManager();
