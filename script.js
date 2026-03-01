// Set current year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// ==================== Form Validation ====================
const formValidation = {
    name: (value) => {
        if (!value) return "اسم العميل مطلوب";
        if (value.length < 3) return "يجب أن يكون الاسم 3 أحرف على الأقل";
        return null;
    },
    phone: (value) => {
        if (!value) return "رقم الهاتف مطلوب";
        if (!/^[0-9\s\-\+\(\)]{10,}$/.test(value)) return "رقم الهاتف غير صحيح";
        return null;
    },
    location: (value) => !value ? "نوع المكان مطلوب" : null,
    area: (value) => !value ? "المنطقة مطلوبة" : null,
    floor: (value) => !value ? "الدور مطلوب" : null,
    apartment: (value) => !value ? "حالة الشقة مطلوبة" : null,
    designType: (value) => !value ? "نوع التصميم مطلوب" : null,
    'floor-type': (value) => !value ? "نوع الأرضيات مطلوب" : null,
    electricity: (value) => !value ? "نظام الكهرباء مطلوب" : null,
    plumbing: (value) => !value ? "نظام السباكة مطلوب" : null,
    'customer-location': (value) => !value ? "مكان إقامة العميل مطلوب" : null,
};

// ==================== Toast Notification ====================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${type === 'success' ? '✓' : '✕'}</span>
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(toast);

    // Add animation
    const style = document.createElement('style');
    if (!document.getElementById('toast-styles')) {
        style.id = 'toast-styles';
        style.textContent = `
            .toast-notification {
                position: fixed;
                top: 24px;
                left: 24px;
                padding: 16px 24px;
                border-radius: 8px;
                color: white;
                z-index: 50;
                animation: slideIn 0.3s ease-out;
                display: flex;
                align-items: center;
                gap: 12px;
                max-width: 400px;
            }
            
            .toast-success {
                background: linear-gradient(135deg, #d4af37 0%, #fdb813 100%);
            }
            
            .toast-error {
                background: #dc2626;
            }
            
            .toast-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .toast-icon {
                font-size: 20px;
                font-weight: bold;
            }
            
            .toast-notification p {
                margin: 0;
                font-weight: 600;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== Form Error Display ====================
function showFieldError(fieldName, errorMessage) {
    const field = document.querySelector(`#${fieldName}`);
    if (!field) return;

    const parent = field.closest('.form-group');
    if (!parent) return;

    // Remove existing error message
    const existingError = parent.querySelector('.form-error');
    if (existingError) existingError.remove();

    // Add new error message
    if (errorMessage) {
        const errorEl = document.createElement('span');
        errorEl.className = 'form-error';
        errorEl.textContent = errorMessage;
        parent.appendChild(errorEl);

        // Add error styling to input
        field.style.borderColor = '#dc2626';
        field.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.1)';
    } else {
        // Remove error styling
        field.style.borderColor = 'var(--border)';
        field.style.boxShadow = '';
    }
}

// ==================== Form Validation On Change ====================
function setupFieldValidation() {
    const formFields = document.querySelectorAll('.form-group input, .form-group select');
    
    formFields.forEach(field => {
        field.addEventListener('change', function() {
            const fieldName = this.id;
            const fieldValue = this.value;
            
            if (formValidation[fieldName]) {
                const error = formValidation[fieldName](fieldValue);
                showFieldError(fieldName, error);
            }
        });

        field.addEventListener('blur', function() {
            const fieldName = this.id;
            const fieldValue = this.value;
            
            if (formValidation[fieldName]) {
                const error = formValidation[fieldName](fieldValue);
                if (error) {
                    showFieldError(fieldName, error);
                }
            }
        });
    });
}

// ==================== WhatsApp Form Integration ====================
document.getElementById('surveyForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Collect form data
    const formData = {
        clientName: document.getElementById('name').value,
        phoneNumber: document.getElementById('phone').value,
        locationType: document.getElementById('location').value,
        area: document.getElementById('area').value,
        floor: document.getElementById('floor').value,
        apartmentState: document.getElementById('apartment').value,
        designType: document.getElementById('designType').value,
        flooring: document.getElementById('floor-type').value,
        electricity: document.getElementById('electricity').value,
        plumbing: document.getElementById('plumbing').value,
        clientLocation: document.getElementById('customer-location').value
    };

    // Validate all fields
    let hasErrors = false;
    const fieldIds = ['name', 'phone', 'location', 'area', 'floor', 'apartment', 'designType', 'floor-type', 'electricity', 'plumbing', 'customer-location'];
    
    fieldIds.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        const fieldValue = field.value;
        if (formValidation[fieldId]) {
            const error = formValidation[fieldId](fieldValue);
            if (error) {
                showFieldError(fieldId, error);
                hasErrors = true;
            } else {
                showFieldError(fieldId, null);
            }
        }
    });

    if (hasErrors) {
        showToast('يرجى تصحيح الأخطاء المشار إليها', 'error');
        return;
    }

    // Build the message
    const message = `*طلب تسعير / تشطيب جديد* 🏗️✨

👤 *الاسم:* ${formData.clientName}
📱 *رقم الهاتف:* ${formData.phoneNumber}
🏢 *المكان:* ${formData.locationType}
🗺️ *المنطقة:* ${formData.area}
🔢 *الدور:* ${formData.floor}
🏠 *حالة الشقة:* ${formData.apartmentState}
🎨 *نوع التصميم:* ${formData.designType}
⬜ *الأرضية:* ${formData.flooring}
⚡ *الكهرباء:* ${formData.electricity}
💧 *السباكة:* ${formData.plumbing}
🌍 *مكان الإقامة:* ${formData.clientLocation}`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/201125933005?text=${encodedMessage}`;
    
    setSubmitLoading(true);
    showToast('تم استلام طلبك بنجاح! جاري تحويلك إلى واتساب...', 'success');

    // Small delay to show toast
    setTimeout(() => {
        window.open(whatsappURL, '_blank');
        setSubmitLoading(false);
        resetForm();
    }, 500);
});

// ==================== Submit WhatsApp Button ====================
const submitBtn = document.getElementById('submitWhatsApp');
if (submitBtn) {
    submitBtn.addEventListener('click', function() {
        document.getElementById('surveyForm').dispatchEvent(new Event('submit'));
    });
}

// ==================== Form Loading State ====================
function setSubmitLoading(isLoading) {
    const submitBtn = document.querySelector('.submit-btn');
    if (!submitBtn) return;

    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <span class="animate-spin">⏳</span>
            جاري الإرسال...
        `;
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `📱 إرسال عبر واتساب`;
    }
}

// ==================== Form Reset ====================
function resetForm() {
    const form = document.getElementById('surveyForm');
    if (form) {
        form.reset();
        // Clear all error messages
        document.querySelectorAll('.form-error').forEach(el => el.remove());
        document.querySelectorAll('.form-group input, .form-group select').forEach(field => {
            field.style.borderColor = 'var(--border)';
            field.style.boxShadow = '';
        });
    }
}



// ==================== Intersection Observer for Animations ====================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
        }
    });
}, observerOptions);

// ==================== Smooth Scroll Navigation ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ==================== Initialize on Page Load ====================
document.addEventListener('DOMContentLoaded', function() {
    loadPortfolio();
    loadTestimonials();
    setupFieldValidation();
    
    // Observe elements when they're created
    document.querySelectorAll('.portfolio-item, .gallery-item, .testimonial-item').forEach(el => {
        observer.observe(el);
    });
}); 
