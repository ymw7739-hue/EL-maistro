// وضع السنة الحالية في الفوتر تلقائياً
document.getElementById('year').textContent = new Date().getFullYear();

// ==================== التحقق واﻹشعار ====================
const formValidation = {
    name: (value) => {
        if (!value) return "اسم العميل مطلوب";
        if (value.length < 3) return "يجب أن يكون الاسم 3 أحرف على الأقل";
        return null;
    },
    phone: (value) => {
        if (!value) return "رقم الهاتف مطلوب";
        if (!/^01[0-9]{9}$/.test(value.replace(/\s+/g, ""))) return "رقم الهاتف غير صحيح (يجب إدخال رقم مصري يبدأ بـ01 ويحتوي 11 رقم)";
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

// توست للتنبيه العربي
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${type === 'success' ? '✓' : '✕'}</span>
            <p style="direction: rtl">${message}</p>
        </div>
    `;
    document.body.appendChild(toast);

    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
        .toast-notification {
            position: fixed;
            bottom: 30px;
            right: 30px;
            padding: 16px 24px;
            border-radius: 18px;
            color: white;
            z-index: 1010;
            font-family: Tajawal,Cairo,sans-serif;
            animation: slideIn 0.3s;
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 340px;
            font-size: 1rem;
            box-shadow: 0 3px 15px #d4af374c, 0 0 0 2px #fff2;
        }
        .toast-success { background: linear-gradient(135deg, #d4af37 0%, #fdb813 100%) }
        .toast-error { background: #dc2626; }
        .toast-icon { font-size: 22px; font-weight: bold;}
        .toast-notification p {margin:0;}
        @keyframes slideIn {from {transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1}}
        `;
        document.head.appendChild(style);
    }
    setTimeout(() => { toast.remove(); }, 2900);
}

// اظهار الخطأ على الحقل نفسه
function showFieldError(fieldName, errorMessage) {
    const field = document.getElementById(fieldName);
    if (!field) return;

    const parent = field.closest('.form-group');
    if (!parent) return;

    // Remove existing
    const existingError = parent.querySelector('.form-error');
    if (existingError) existingError.remove();

    // Add new error message
    if (errorMessage) {
        const errorEl = document.createElement('span');
        errorEl.className = 'form-error';
        errorEl.textContent = errorMessage;
        parent.appendChild(errorEl);
        field.style.borderColor = '#dc2626';
        field.style.boxShadow = '0 0 0 3px #dc26261a';
    } else {
        field.style.borderColor = 'var(--border)';
        field.style.boxShadow = '';
    }
}

// تحقق حي قبل الإرسال
function setupFieldValidation() {
    const fields = Array.from(document.querySelectorAll('.form-group input, .form-group select'));
    fields.forEach(field => {
        field.addEventListener('input', function() {
            const errorFn = formValidation[this.id];
            if (errorFn) showFieldError(this.id, errorFn(this.value));
        });
        field.addEventListener('blur', function() {
            const errorFn = formValidation[this.id];
            if (errorFn) showFieldError(this.id, errorFn(this.value));
        });
    });
}
setupFieldValidation();

// عند الارسال
document.getElementById('surveyForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const f = (id) => document.getElementById(id).value.trim();
    const data = {
        name: f('name'),
        phone: f('phone'),
        location: f('location'),
        area: f('area'),
        floor: f('floor'),
        apartment: f('apartment'),
        designType: f('designType'),
        floorType: f('floor-type'),
        electricity: f('electricity'),
        plumbing: f('plumbing'),
        customerLocation: f('customer-location'),
    };
    let errorFound = false;
    Object.entries(data).forEach(([key,val])=>{
        if (formValidation[key]) {
            const error = formValidation[key](val);
            showFieldError(key, error);
            if (error) errorFound = true;
        }
    });
    if (errorFound) { showToast("يرجى تصحيح الأخطاء", "error"); return; }

    const msg = `
*طلب تصميم جديد من المايسترو*

👤 *الاسم:* ${data.name}
📱 *رقم الهاتف:* ${data.phone}
🏢 *المكان:* ${data.location}
🗺️ *المنطقة:* ${data.area}
🔢 *الدور:* ${data.floor}
🏠 *حالة الشقة:* ${data.apartment}
🎨 *نوع التصميم:* ${data.designType}
⬜ *الأرضية:* ${data.floorType}
⚡ *الكهرباء:* ${data.electricity}
💧 *السباكة:* ${data.plumbing}
🌍 *مكان الإقامة:* ${data.customerLocation}
    `.trim();

    showToast("جاري تحويلك إلى واتساب...", "success");
    setTimeout(()=>{
        window.open("https://wa.me/201125933005?text=" + encodeURIComponent(msg), "_blank");
        this.reset();
        // إزالة كل الأخطاء
        document.querySelectorAll('.form-error').forEach(e=>e.remove());
        document.querySelectorAll('.form-group input, .form-group select').forEach(field=>{
            field.style.borderColor='var(--border)';
            field.style.boxShadow='';
        });
    }, 900);
});
