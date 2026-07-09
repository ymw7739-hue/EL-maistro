// ============================================
// Categories & Defaults
// ============================================
let categoriesStatus = {
  cakes: true,
  gato: true,
  icecream: true,
  accessories: true
};

// ============================================
// Global Variables
// ============================================
let currentLang = 'en';
const cart = [];
// default number (Egyptian local 01070100112 -> international 201070100112)
let WHATSAPP_BUSINESS_NUMBER = '201070100112';

// NOTE: do NOT merge server `data` here at top-level — we handle it safely during init

// ============================================
// DOM Elements
// ============================================
const menuToggle = document.querySelector('.menu-toggle');
const languageMenu = document.getElementById('languageMenu');
const langButtons = document.querySelectorAll('.lang-btn');
const cartToggle = document.querySelector('.cart-toggle');
const cartSidebar = document.getElementById('cartSidebar');
const cartClose = document.querySelector('.cart-close');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotalElement = document.getElementById('cartTotal');
const cartCountElement = document.querySelector('.cart-count');
const clearCartBtn = document.getElementById('clearCartBtn');
const checkoutBtn = document.getElementById('checkoutBtn');

const checkoutModal = document.getElementById('checkoutModal');
const modalClose = document.getElementById('modalClose');
const cancelOrderBtn = document.getElementById('cancelOrderBtn');
const orderForm = document.getElementById('orderForm');
const orderSummary = document.getElementById('orderSummary');
const orderTotal = document.getElementById('orderTotal');

const detailsSection = document.getElementById('categoryDetails');
const detailsTitle = document.getElementById('detailsTitle');
const detailsText = document.getElementById('detailsText');
const detailsGrid = document.getElementById('detailsGrid');
const detailsClose = document.getElementById('detailsClose');

function safeAddEvent(element, event, callback) {
  if (element) {
    element.addEventListener(event, callback);
  }
}

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAJT6uIjmlFOvDy2owEUsZAwhCV8ReLkag",
  authDomain: "western-78cd9.firebaseapp.com",
  projectId: "western-78cd9",
  storageBucket: "western-78cd9.appspot.com",
  messagingSenderId: "148042495076",
  appId: "1:148042495076:web:eae114fa658321524d1b71",
  measurementId: "G-GLYH0DDVKQ",
  databaseURL: "https://western-78cd9-default-rtdb.firebaseio.com"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// === Load WhatsApp number from Firebase settings (optional override) ===
database.ref('settings/whatsappNumber').on('value', (snapshot) => {
  const val = snapshot.val();
  if (val) {
    // keep digits only
    let n = String(val).replace(/\D/g, '');
    // if user provided local Egyptian number like 01070100112, convert to international 20...
    if (n.length === 11 && n.startsWith('0')) {
      n = '20' + n.slice(1);
    }
    // basic validation: ensure at least country code + number
    if (n.length >= 8) {
      WHATSAPP_BUSINESS_NUMBER = n;
      console.log('Updated WhatsApp number from Firebase:', WHATSAPP_BUSINESS_NUMBER);
    } else {
      console.warn('Invalid whatsappNumber in Firebase settings:', val);
    }
  }
});

// ============================================
// UI sync utilities for categories
// ============================================
function applyCategoriesStatusToUI() {
  try {
    // re-query buttons each time to avoid stale NodeList
    const buttons = document.querySelectorAll('[data-category]');
    buttons.forEach(btn => {
      const cat = btn.dataset.category;
      if (!cat) return;
      if (categoriesStatus.hasOwnProperty(cat)) {
        // hide the button if category is closed
        btn.hidden = categoriesStatus[cat] === false;
        if (categoriesStatus[cat] === false) {
          btn.classList.add('category-closed');
        } else {
          btn.classList.remove('category-closed');
        }
      } else {
        btn.hidden = false;
        btn.classList.remove('category-closed');
      }
    });
  } catch (err) {
    console.error('applyCategoriesStatusToUI error:', err);
  }
}

// initial load: get categoriesStatus once first to avoid UI flash, then attach realtime listener
function initCategoriesStatus() {
  database.ref('categoriesStatus').once('value').then(snapshot => {
    const fbData = snapshot.val();

    if (fbData && typeof fbData === 'object') {
      // Firebase has authoritative data — use it
      categoriesStatus = { ...categoriesStatus, ...fbData };
      console.log('Loaded categoriesStatus from Firebase:', categoriesStatus);
    } else {
      // Firebase empty — fall back to server-provided `data` if present, then write it to Firebase
      if (typeof data !== "undefined" && data && typeof data === 'object') {
        categoriesStatus = { ...categoriesStatus, ...data };
        console.log('Firebase empty — using server `data` for categoriesStatus:', categoriesStatus);
        // write this initial status to Firebase so subsequent loads are consistent
        database.ref('categoriesStatus').set(categoriesStatus).catch(err => {
          console.warn('Failed to write initial categoriesStatus to Firebase:', err);
        });
      } else {
        console.log('No categoriesStatus in Firebase and no server `data` — using defaults:', categoriesStatus);
      }
    }

    applyCategoriesStatusToUI();
    // attach realtime listener after initial application
    loadCategoriesFromFirebase();
  }).catch(err => {
    console.warn('Failed to load initial categoriesStatus', err);
    // still attach realtime listener so changes are picked later
    loadCategoriesFromFirebase();
  });
}

// 🔴 تحميل حالات الأقسام من Firebase عند البداية (realtime listener)
function loadCategoriesFromFirebase() {
  database.ref('categoriesStatus').on('value', (snapshot) => {
    const data = snapshot.val();

    if (typeof data !== "undefined" && data) {
      categoriesStatus = {
        ...categoriesStatus,
        ...data
      };
    }

    console.log('Categories (realtime):', categoriesStatus);

    // apply to UI (hide/show section buttons)
    applyCategoriesStatusToUI();

    if (adminPanelVisible) {
      renderAdminCategories();
    }
  });
}

// ============================================
// Language Toggle
// ============================================
safeAddEvent(menuToggle, 'click', () => {
  languageMenu.hidden = !languageMenu.hidden;
});

langButtons.forEach(btn => {
  safeAddEvent(btn, 'click', () => {
    currentLang = btn.dataset.lang;
    updateLanguage();
    languageMenu.hidden = true;
  });
});

function updateLanguage() {
  const htmlElement = document.documentElement;
  htmlElement.lang = currentLang;
  htmlElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-en][data-ar]').forEach(element => {
    element.textContent = currentLang === 'en' ? element.dataset.en : element.dataset.ar;
  });

  updateCategoryDetails();
}

// ============================================
// Shopping Cart
// ============================================
safeAddEvent(cartToggle, 'click', () => {
  cartSidebar.hidden = !cartSidebar.hidden;
});

safeAddEvent(cartClose, 'click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  cartSidebar.hidden = true;
});

safeAddEvent(clearCartBtn, 'click', () => {
  if (confirm(currentLang === 'en' ? 'Clear entire cart?' : 'مسح جميع العناصر؟')) {
    cart.length = 0;
    updateCartUI();
  }
});

safeAddEvent(checkoutBtn, 'click', () => {
  if (cart.length === 0) {
    alert(currentLang === 'en' ? 'Your cart is empty!' : 'عربتك فارغة!');
  } else {
    cartSidebar.hidden = true;
    showCheckoutModal();
  }
});

function addToCart(itemName, price) {
  const item = {
    name: itemName,
    price: price,
    id: Date.now()
  };
  cart.push(item);
  updateCartUI();
  showNotification(currentLang === 'en' ? 'Added to cart!' : 'تمت الإضافة للسلة!');
}

function removeFromCart(itemId) {
  const index = cart.findIndex(item => item.id === itemId);
  if (index > -1) {
    cart.splice(index, 1);
    updateCartUI();
  }
}

function updateCartUI() {
  cartCountElement.textContent = cart.length;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `<p class="empty-cart" data-en="Your cart is empty" data-ar="عربتك فارغة">Your cart is empty</p>`;
  } else {
    cartItemsContainer.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-info">
          <p class="cart-item-name">${item.name}</p>
          <p class="cart-item-price">${item.price} جنيه</p>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${item.id})" aria-label="Remove item">✕</button>
      </div>
    `).join('');
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  cartTotalElement.textContent = total;
}

// ============================================
// Checkout Modal
// ============================================
function showCheckoutModal() {
  updateOrderSummary();
  checkoutModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeCheckoutModal() {
  checkoutModal.hidden = true;
  document.body.style.overflow = 'auto';
}

safeAddEvent(modalClose, 'click', closeCheckoutModal);
safeAddEvent(cancelOrderBtn, 'click', closeCheckoutModal);

safeAddEvent(checkoutModal, 'click', (e) => {
  if (e.target === checkoutModal) {
    closeCheckoutModal();
  }
});

function updateOrderSummary() {
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  orderSummary.innerHTML = cart.map(item => `
    <div class="summary-item">
      <span>${item.name}</span>
      <span>${item.price} جنيه</span>
    </div>
  `).join('');
  orderTotal.textContent = total;
}

// ============================================
// Generate WhatsApp Message
// ============================================
function generateWhatsAppMessage(orderData) {
  const itemsList = orderData.items.map(item => `• ${item.name}: ${item.price} جنيه`).join('\n');
  
  let message = '';
  
  if (currentLang === 'ar') {
    message = `
📦 *طلب جديد من أبو السعود*

👤 *الاسم:* ${orderData.name}
📱 *رقم الهاتف:* ${orderData.phone}
🗺️ *العنوان:* ${orderData.address}

📝 *الطلب:*
${itemsList}

💰 *الإجمالي:* ${orderData.total} جنيه

📌 *ملاحظات:* ${orderData.notes || 'بدون ملاحظات'}
    `.trim();
  } else {
    message = `
📦 *New Order from Abu Al-Saud*

👤 *Name:* ${orderData.name}
📱 *Phone:* ${orderData.phone}
🗺️ *Address:* ${orderData.address}

📝 *Items:*
${orderData.items.map(item => `• ${item.name}: ${item.price} EGP`).join('\n')}

💰 *Total:* ${orderData.total} EGP

📌 *Notes:* ${orderData.notes || 'No notes'}
    `.trim();
  }
  
  return encodeURIComponent(message);
}

// ============================================
// Handle Form Submission
// ============================================
safeAddEvent(orderForm, 'submit', (e) => {
  e.preventDefault();
  
  const formData = new FormData(orderForm);
  const orderData = {
    name: formData.get('name'),
    phone: formData.get('phone'),
    address: formData.get('address'),
    notes: formData.get('notes'),
    items: cart.map(item => ({ name: item.name, price: item.price })),
    total: cart.reduce((sum, item) => sum + item.price, 0),
    date: new Date().toLocaleString(currentLang === 'ar' ? 'ar-EG' : 'en-US')
  };

  const orders = JSON.parse(localStorage.getItem('orders') || '[]');
  orders.push(orderData);
  localStorage.setItem('orders', JSON.stringify(orders));

  const whatsappMessage = generateWhatsAppMessage(orderData);

  // Ensure number is digits-only and present
  const number = String(WHATSAPP_BUSINESS_NUMBER || '').replace(/\D/g, '');
  if (!number) {
    alert(currentLang === 'en' 
      ? 'WhatsApp number is not configured. Please contact admin.' 
      : 'رقم الواتساب غير مضبوط. يرجى التواصل مع المدير.');
    return;
  }

  const whatsappLink = `https://wa.me/${number}?text=${whatsappMessage}`;

  window.open(whatsappLink, '_blank');

  alert(currentLang === 'en' 
    ? `Thank you ${orderData.name}! Opening WhatsApp to confirm your order.` 
    : `شكراً ${orderData.name}! جاري فتح الواتس لتأكيد طلبك.`);

  cart.length = 0;
  updateCartUI();
  orderForm.reset();
  closeCheckoutModal();

  console.log('Order Data:', orderData);
});

// ============================================
// Category Data
// ============================================
const categoryImages = {
  cakes: 'IMG_8819.JPG.jpeg',
  gato: 'IMG_8822.JPG (1).jpeg',
  icecream: 'IMG_8181.JPG.jpeg',
  accessories: 'IMG_8823.JPG.jpeg'
};

const categories = {
  cakes: {
    titleEn: 'Cakes Menu',
    titleAr: 'منيو التورت',
    textEn: 'Click on any product to add to cart:',
    textAr: 'اضغط على المنتج لإضافته للسلة:',
    items: [
      {id:2 , nameEn: 'caramel Cake', nameAr: 'تورتة كاراميل', descriptionEn: ['White Sponge Cake', 'Nutella Cream', 'Crisp Crust', 'Imported Cherry', 'White Cream', 'Chocolate Glaze'], descriptionAr: ['كيك إسفنج أبيض', 'كريمة نوتيلا', 'كرست كريب', 'شري مستورد', 'كريمة لباني', 'جليز شوكولاتة'], price: 950, image: 'IMG_8981.JPG',available: true },
      {id:3 , nameEn: 'mango Cake', nameAr: 'تورتة مانجا', descriptionEn: ['White Sponge Cake', 'Lebanese Cream', 'Imported Strawberry', 'Tropical Fruits', 'Imported Cherry', 'Strawberry Glaze'], descriptionAr: ['كيك إسفنج أبيض', 'كريمة لباني', 'فراولة مستوردة', 'فاكهة استوائية', 'شري مستورد', 'جليز فراولة'], price: 900, image: 'IMG_8980.JPG',available: true },
      {id:4 , nameEn: 'American Lotus Cake', nameAr: 'تورتة اميريكان لوتس', descriptionEn: ['White Sponge Cake', 'Lebanese Cream', 'Mixed Berry Filling', 'Cocoa Butter', 'Chocolate Glaze', 'Tropical Fruits'], descriptionAr: ['كيك إسفنج أبيض', 'كريمة لباني', 'حشوة توت مشكل', 'زبدة كاكاو', 'جليز شوكولاتة', 'فاكهة استوائية'], price: 950, image: 'IMG_8979.JPG' ,available: true},
      {id:5 , nameEn: 'pistachio Cake', nameAr: 'تورتة بيستاشيو', descriptionEn: ['Magic Mousse', 'Dark Mousse', 'White Mousse', 'Crisp Crust', 'Cocoa Butter', 'Chocolate Glaze'], descriptionAr: ['موس ماجيك', 'موس درك', 'موس وايت', 'كرست كريب', 'زبدة كاكاو', 'جليز شوكولاتة'], price: 1150, image: 'IMG_8978.JPG' ,available: true},
      {id:6 , nameEn: 'black Forest Cake', nameAr: 'تورتة وايت فوريست', descriptionEn: ['Chocolate Cake', 'Caramel Mousse', 'Toffee Caramel', 'Walnuts', 'Cocoa Butter', 'Caramel Glaze'], descriptionAr: ['كيك شوكليت', 'موس كراميل', 'توفي كراميل', 'عين جمل', 'زبدة كاكاو', 'جليز كراميل'], price: 550, image: 'IMG_8976.JPG' ,available: true},
      {id:7 , nameEn: 'White Forest Cake', nameAr: 'تورتة بلاك فوريست', descriptionEn: ['White Cake', 'Caramel Mousse', 'Toffee Caramel', 'Walnuts', 'Cocoa Butter', 'Caramel Glaze'], descriptionAr: ['كيك وايت', 'موس كراميل', 'توفي كراميل', 'عين جمل', 'زبدة كاكاو', 'جليز كراميل'], price: 550, image: 'IMG_8977.JPG',available: true }
    ]
  },
  gato: {
    titleEn: 'GATO Sweets Menu',
    titleAr: 'منيو الحلويات الشرقية',
    textEn: 'Our most famous GATO varieties:',
    textAr: 'أشهر أصنافنا الشرقية:',
    items: [
      {id:11 , nameEn: 'Lotus éclair', nameAr: 'إكلير اللوتس', descriptionEn: ['Choux pastry', 'Lebanese Cream', 'Lotus butter', 'Imported Lotus biscuit'], descriptionAr: ['اكلير', 'كريمه باستري', 'زبده لوتس', 'بسكويت لوتس مستورد'], price: 95, image: 'IMG_8822.JPG (1).jpeg' ,available: true},
      {id:13 , nameEn: 'Cheese lotus', nameAr: 'جبنة اللوتس', descriptionEn: ['Imported Lotus biscuit', 'Imported butter', 'Cheese cream', 'Imported Lotus'], price: 100, image: '15.JPG',available: true, descriptionAr: ['بسكويت لوتس', 'زبده مستورده', 'كريمه تشيز', 'لوتس مستورد'] },
      {id:14 , nameEn: 'Cheese Nutella', nameAr: 'جبنة نوتيلا', descriptionEn: ['Imported Lotus biscuit', 'Imported butter', 'Cheese cream', 'Nutella'], descriptionAr: ['بسكويت لوتس', 'زبده مستورده', 'كريمه تشيز', 'نوتيلا'], price: 100, image: '16.JPG' ,available: true},
      {id:15 , nameEn: 'Cigar Gateau', nameAr: 'جاتو السيجار', descriptionEn: ['Dark Mousse', 'Dark Mousse', 'Toffee Caramel', 'Coffee Ganache', 'Cocoa Butter'], descriptionAr: ['فادج شوكليت', 'موس درك', 'توفي كراميل', 'جناش قهوه', 'زبده الكاكاو'], price: 100, image: '17.JPG' ,available: true},
      {id:16 , nameEn: 'Classic Millie', nameAr: 'ميلفي كلاسيك', descriptionEn: ['Mille-feuille', 'Pastry cream', 'Fine sugar'], descriptionAr: ['ميلفيه', 'كريمه باستري', 'سكر ناعم'], price: 90, image: '18.JPG' ,available: true},
      {id:17 , nameEn: 'Cheese Sherry', nameAr: 'جبنة شيري', descriptionEn: ['Lotus biscuit', 'Imported butter', 'Cheese cream', 'Imported cherry'], descriptionAr: ['بسكويت لوتس', 'زبده مستورده', 'كريمه تشيز', 'شري مستورد'], price: 100, image: '19.JPG' ,available: true},
      {id:18 , nameEn: 'Mille-feuille Lotus', nameAr: 'ميلفي اللوتس', descriptionEn: ['Mille-feuille', 'Pastry cream', 'Lotus butter', 'Imported Lotus biscuit'], descriptionAr: ['ميلفيه', 'كريمه باستري', 'زبده لوتس', 'بسكويت لوتس'], price: 100, image: '20.JPG',available: true },
      {id:19 , nameEn: 'Rocher Gateau', nameAr: 'جاتو روشيه', descriptionEn: ['Magic Mousse', 'Fudge cake', 'Nutella', 'Crisp Crust'], descriptionAr: ['موس ماجيك', 'فادج كيك', 'نوتيلا', 'كورست كريب'], price: 100, image: '21.JPG' ,available: true},
      {id:20 , nameEn:'Strawberry bean', nameAr: 'حبة فراولة', descriptionEn: ['White Mousse', 'Imported Strawberry Filling', 'Strawberry Glaze'], descriptionAr: ['موس وايت', 'حشوه فروله مستورده', 'جليز فراولة'], price:70, image:'22.JPG' ,available:true},
      {id:21 , nameEn:'Africano', nameAr: 'أفريكانو', descriptionEn: ['Fudge Cake', 'Dark Mousse', 'White Mousse', 'Crisp Crust', 'Cocoa Butter', 'Chocolate Glaze'], descriptionAr: ['فادج كيك', 'موس درك', 'موس وايت', 'كورست كريب', 'زبده كاكو', 'جليز شوكليت'], price:100, image:'23.JPG' ,available:true},
      {id:42 , nameEn:'Gateau Coconut', nameAr: 'جاتو جوز الهند', descriptionEn: ['White Sponge Cake', 'Bounty Filling', 'Passion Fruit', 'Coconut Mousse', 'Mint Mango', 'Swiss Milk Chocolate'], descriptionAr: ['اسبونج وايت', 'حشو باونتي', 'باشون فروت', 'موس جوز هند', 'مانجو نعناع', 'شوكليت حليب سويسري'], price:100, image:'25.JPG' ,available:true},
      {id:45.1 , nameEn:'Raspberry bean', nameAr: 'حبة توت', descriptionEn: ['White Mousse', 'Mixed Berry Filling', 'White Cake', 'Cocoa Butter'], descriptionAr: ['موس وايت', 'حشو ميكس بري', 'كيك وايت', 'زبده كاكاو'], price:100, image:'14.2.JPG' ,available:true},
      {id:45.2 , nameEn:'Pistachio éclair', nameAr: 'إكلير الفستق', descriptionEn: ['Pistachio Cake', 'Pistachio Mousse', 'Pistachio Crunch', 'Pistachio Glaze'], descriptionAr: ['كيك فسدق', 'موس فسدق', 'كروكند فسدق', 'جليز فسدق'], price:100, image:'14.3.JPG' ,available:true},
      {id:45.3 , nameEn:'Chocolate tacos', nameAr: 'تاكو الشوكولاتة', descriptionEn: ['Sablé biscuit', 'Pastry cream', 'Chocolate', 'Crisp Crust'], descriptionAr: ['بسكويت سابليا', 'كريمه باستري', 'شوكليت', 'كورست كريب'], price:85, image:'14.4.JPG' ,available:true},
      {id:45.4 , nameEn:'Pistachio Gateau', nameAr: 'جاتوة فسدق', descriptionEn: ['Pistachio Cake', 'Pistachio Mousse', 'Pistachio Crunch', 'Pistachio Glaze'], descriptionAr: ['كيك فسدق', 'موس فسدق', 'كروكند فسدق', 'جليز فسدق'], price:100, image:'IMG_8975.JPG' ,available:true},
      {id:45.5 , nameEn:'Mango bean', nameAr: 'حبه مانجا', descriptionEn: ['White Mousse', 'Natural Mango Filling', 'Cocoa Butter', 'Pectin'], descriptionAr: ['موس وايت', 'حشو مانجو طبيعي', 'زبده الكاكاو', 'بكتين'], price:70, image:'IMG_8974.JPG' ,available:true}, 
      {id:45.6 , nameEn:'Coffee bean', nameAr: 'حبه قهوة', descriptionEn: ['Magic Mousse', 'Coffee Ganache', 'Fudge Cake', 'Coffee'], descriptionAr: ['موس ماجيك', 'جناش قهوه', 'فادج كيك', 'كوفي'], price:85, image:'IMG_8973.JPG' ,available:true},
      {id:45.7 , nameEn:'Lotus Gateau', nameAr: 'جاتوة لوتس', descriptionEn: ['Lotus Cake', 'Cheese Cream', 'Lotus Butter', 'Imported Lotus biscuit'], descriptionAr: ['كيك لوتس', 'كريمه تشيز', 'زبده لوتس', 'بسكويت لوتس مستورد'], price:100, image:'IMG_8972.JPG' ,available:true},
      {id:45.8 , nameEn:'Fruit Gateau', nameAr: 'جاتوة فاكهة', descriptionEn: ['Sablé biscuit', 'Pastry cream', 'Fresh Mango'], descriptionAr: ['بسكويت سابليا', 'كريمه باستري', 'مانجو فرش'], price:65, image:'IMG_8971.JPG' ,available:true},
      {id:45.9 , nameEn:'Mango Taco', nameAr: 'جاتوة مانجا', descriptionEn: ['Sablé biscuit', 'Pastry cream', 'Fresh Mango'], descriptionAr: ['بسكويت سابليا', 'كريمه باستري', 'مانجو فرش'], price:70, image:'IMG_8970.JPG' ,available:true},
      {id:45.10 , nameEn:'Honey Cake', nameAr: 'هاني كيك', descriptionEn: ['Honey Cake', 'Cheese Cream', 'Honey'], descriptionAr: ['كيك هاني', 'كريمه تشيز', 'عسل نحل'], price:100, image:'IMG_8969.JPG' ,available:true},
      {id:45.11 , nameEn:'Mango Tart', nameAr: 'تارت مانجا', descriptionEn: ['White Mousse', 'Natural Mango Filling', 'Cocoa Butter', 'Pectin'], descriptionAr: ['موس وايت', 'حشو مانجو طبيعي', 'زبده الكاكاو', 'بكتين'], price:100, image:'IMG_8968.JPG' ,available:true},
      {id:45.12 , nameEn:'Vanilla Taco', nameAr: 'تاكو فانيليا', descriptionEn: ['Sablé biscuit', 'Pastry cream', 'Nutella', 'Crisp Crust'], descriptionAr: ['بسكويت سابليا', 'كريمه باستري', 'نوتيلا', 'كورست كريب'], price:85, image:'IMG_8967.JPG' ,available:true},
      {id:45.13 , nameEn:'Magic Gateau', nameAr: 'جاتوة ماجيك', descriptionEn: [ 'Gianduja Mousse', 'Fudge Cake', 'Crisp Crust', 'Nutella'], descriptionAr: [ 'موس جندوجيا', 'فادج كيك', 'كورست كريب', 'نوتيلا'], price:90, image:'IMG_8966.JPG' ,available:true},
      {id:45.14 , nameEn:'Nutella Millie', nameAr: 'ميلفية نوتيلا', descriptionEn: ['Mille-feuille', 'Pastry cream', 'Nutella', 'Crisp Crust'], descriptionAr: ['ميلفيه', 'كريمه باستري', 'نوتيلا', 'كورست كريب'], price:95, image:'IMG_8965.JPG' ,available:true},
      {id:45.15 , nameEn:'Red Velvet Gateau', nameAr: 'جاتوة ريدفيلفيد', descriptionEn: ['Red Velvet Cake', 'Cheese Cream', 'Imported Cherry Filling', 'Tropical Fruits'], descriptionAr: ['كيك ريد ڤلڤد', 'كريمه تشيز', 'حشو شري مستورد', 'فاكهه استوائية'], price:90, image:'IMG_8964.JPG' ,available:true},
      {id:45.16 , nameEn:'festival', nameAr: 'فيستيفال', descriptionEn: ['Sablé biscuit', 'Pastry cream', 'Chocolate', 'Crisp Crust'], descriptionAr: ['بسكويت سابليا', 'كريمه باستري', 'شوكليت', 'كورست كريب'], price:100, image:'IMG_8913.JPG' ,available:true}
    ]
  },
  icecream: {
    titleEn: 'Ice Cream Menu',
    titleAr: 'منيو آيسكريم',
    textEn: 'Our delicious ice cream flavors:',
    textAr: 'نكهات آيسكريم لذيذة:',
    items: [
      {id:51.1 , nameEn: 'Vanilla Ice Cream', nameAr: 'آيسكريم الفانيليا', descriptionEn: 'Pure vanilla bliss in every scoop', descriptionAr: 'سعادة الفانيليا النقية في كل ملعقة', price: 70, image: 'icecream-1.jpg',available: true },
      {id:52.2 , nameEn: 'Chocolate Ice Cream', nameAr: 'آيسكريم الشوكولاتة', descriptionEn: 'Rich dark chocolate flavor', descriptionAr: 'نكهة شوكولاتة داكنة غنية', price: 70, image: 'icecream-2.jpg',available: true },
      {id:53.3 , nameEn: 'Strawberry Ice Cream', nameAr: 'آيسكريم الفراولة', descriptionEn: 'Fresh strawberry delight', descriptionAr: 'متعة الفراولة الطازة', price: 70, image: 'icecream-3.jpg' ,available: true},
      {id:54.4 , nameEn: 'Pistachio Ice Cream', nameAr: 'آيسكريم الفستق', descriptionEn: 'Creamy pistachio premium blend', descriptionAr: 'مزيج فستق كريمي فاخر', price: 70, image: 'icecream-4.jpg',available: true },
      {id:57.7 , nameEn: 'Kinder Ice Cream', nameAr: 'آيسكريم كيندر', descriptionEn: 'Creamy Kinder chocolate blend', descriptionAr: 'مزيج كيندر شوكولاتة كريمي', price: 70, image: 'icecream-7.jpg',available: true },
      {id:58.8 , nameEn: 'Lemon Ice Cream', nameAr: 'آيسكريم الليمون', descriptionEn: 'Tangy refreshing lemon flavor', descriptionAr: 'نكهة ليمون منعشة وحامضة', price: 70, image: 'icecream-8.jpg',available: true },
      {id:59.9 , nameEn: 'Cookies Ice Cream', nameAr: 'آيسكريم الكوكيز', descriptionEn: 'Crunchy cookies with cream', descriptionAr: 'كوكيز قرمشي مع كريم', price: 70, image: 'icecream-9.jpg',available: true },
      {id:60.10 , nameEn: 'Nutella Ice Cream', nameAr: 'آيسكريم نوتيلا', descriptionEn: 'Delicious hazelnut spread flavor', descriptionAr: 'نكهة نوتيلا اللذيذة', price: 70, image: 'icecream-10.jpg',available: true },
      {id:61.11 , nameEn: 'Dark Chocolate Ice Cream', nameAr: 'آيسكريم الشوكولاتة الداكنة', descriptionEn: 'Premium dark chocolate delight', descriptionAr: 'متعة الشوكولاته الداكنة الفاخرة', price: 70, image: 'icecream-11.jpg',available: true },
      {id:62.12 , nameEn: 'Rocher Ice Cream', nameAr: 'آيسكريم روشيه', descriptionEn: 'Crispy wafer with hazelnut center', descriptionAr: 'ويفر قرمشي مع مركز البندق', price: 70, image: 'icecream-12.jpg',available: true },
      {id:63.13 , nameEn: 'Halawa Ruh Ice Cream', nameAr: 'آيسكريم حلاوة روح', descriptionEn: 'Traditional halawa with sesame', descriptionAr: 'حلاوة تقليدية مع الفسدق و الكنافة', price: 70, image: 'icecream-13.jpg',available: true },
      {id:65.15 , nameEn: 'Date Walnut Ice Cream', nameAr: 'آيسكريم البلح بالوز', descriptionEn: 'Sweet dates with crunchy walnuts', descriptionAr: 'بلح حلو مع جوز قرمشي', price: 70, image: 'icecream-15.jpg',available: true },
      {id:66.16 , nameEn: 'Cheesecake Ice Cream', nameAr: 'آيسكريم تشيز كيك', descriptionEn: 'Creamy cheesecake flavor', descriptionAr: 'نكهة تشيز كيك كريمية', price: 70, image: 'icecream-16.jpg',available: true },
      {id:67.17 , nameEn: 'Yogurt Berry Ice Cream', nameAr: 'آيسكريم زبادي توتو', descriptionEn: 'Tangy yogurt with mixed berries', descriptionAr: 'زبادي حامضي مع توتو مختلط', price: 70, image: 'icecream-17.jpg',available: true },
      {id:68.18 , nameEn: 'Lotus Ice Cream', nameAr: 'آيسكريم اللوتس', descriptionEn: 'Smooth lotus biscuit cream', descriptionAr: 'كريم بسكويت اللوتس الناعم', price: 70, image: 'icecream-18.jpg',available: true }
    ]
  },
  accessories: {
    titleEn: 'Accessories Menu',
    titleAr: 'منيو إكسسوارات',
    textEn: 'Beautiful accessories and gift items:',
    textAr: 'إكسسوارات وهدايا جميلة:',
    items: [
      {id:61 , nameEn: 'Decorative Box', nameAr: 'صندوق ديكوري', descriptionEn: 'Elegant gift box for special occasions', descriptionAr: 'صندوق هدية أنيق للمناسبات الخاصة', price: 75, image: 'acc-1.jpg',available: true },
      {id:62 , nameEn: 'Ribbon Pack', nameAr: 'عبوة أشرطة', descriptionEn: 'Assorted ribbons for decoration', descriptionAr: 'أشرطة متنوعة للزينة', price: 40, image: 'acc-2.jpg',available: true },
      {id:63 , nameEn: 'Gift Bag', nameAr: 'حقيبة هدية', descriptionEn: 'Premium quality gift bags', descriptionAr: 'حقائب هدية بجودة عالية', price: 30, image: 'acc-3.jpg' ,available: true},
      {id:64 , nameEn: 'Candle Set', nameAr: 'مجموعة شموع', descriptionEn: 'Luxurious scented candles set', descriptionAr: 'مجموعة شموع معطرة فاخرة', price: 85, image: 'acc-4.jpg',available: true },
      {id:65 , nameEn: 'Chocolate Wrapper', nameAr: 'غلاف شوكولاتة', descriptionEn: 'Beautiful chocolate wrappers', descriptionAr: 'أغلفة شوكولاتة جميلة', price: 25, image: 'acc-5.jpg' ,available: true},
      {id:66 , nameEn: 'Luxury Package', nameAr: 'عبوة فاخرة', descriptionEn: 'Complete luxury packaging solution', descriptionAr: 'حل تغليف فاخر كامل', price: 120, image: 'acc-6.jpg',available: true }
    ]
  }
};

// ============================================
// Category Display
// ============================================
function updateCategoryDetails() {
  if (!detailsSection.hidden) {
    const categoryName = Object.keys(categories).find(cat =>
      categories[cat].titleEn === detailsTitle.textContent ||
      categories[cat].titleAr === detailsTitle.textContent
    );

    if (categoryName) {
      showCategory(categoryName);
    }
  }
}

function showCategory(category) {
  const data = categories[category];
  if (!data) return;

  // 🔴 فحص إذا كان القسم مقفول
  if (!categoriesStatus[category]) {
    const closedMsg = currentLang === 'en' 
      ? `${category.toUpperCase()} section is currently closed!` 
      : `قسم ${data.titleAr} مقفول حالياً!`;
    alert(closedMsg);
    detailsSection.hidden = true;
    return;
  }

  detailsTitle.textContent = currentLang === 'en' ? data.titleEn : data.titleAr;
  detailsText.textContent = currentLang === 'en' ? data.textEn : data.textAr;
  
  detailsGrid.innerHTML = data.items
    .map(item => {
      const itemName = currentLang === 'en' ? item.nameEn : item.nameAr;
      const itemDescription = currentLang === 'en' ? (item.descriptionEn || '') : (item.descriptionAr || '');
      const buttonText = currentLang === 'en' ? '+' : '+';
      const isAvailable = item.available !== false;

      return `
        <div class="product-card ${!isAvailable ? 'unavailable' : ''}">
          <img src="${item.image}" alt="${itemName}" loading="lazy">

          <h4>${itemName}</h4>
          ${itemDescription ? `<p class="product-description">${itemDescription}</p>` : ''}
          
          <div class="price-button-container">
            <p class="price">${item.price} جنيه</p>
            ${isAvailable 
              ? `<button class="add-to-cart-btn" onclick="addToCart('${itemName.replace(/'/g, "\\'")}', ${item.price})">
                  ${buttonText}
                </button>`
              : `<button class="add-to-cart-btn disabled" disabled>
                  ${currentLang === 'en' ? 'Not Available' : 'غير متوفر'}
                </button>`}
          </div>
        </div>
      `;
    })
    .join('');
  
  detailsSection.hidden = false;
}

// ============================================
// Category Buttons Initialization (style + click binding)
// ============================================
function initCategoryButtons() {
  document.querySelectorAll('[data-category]').forEach(button => {
    safeAddEvent(button, 'click', () => showCategory(button.dataset.category));
    const category = button.dataset.category;
    if (categoryImages[category]) {
      const gradient = 'linear-gradient(180deg, rgba(34, 20, 9, 0.08), rgba(34, 20, 9, 0.35))';
      button.style.backgroundImage = `${gradient}, url('${categoryImages[category]}')`;
    }
  });
}
initCategoryButtons();

safeAddEvent(detailsClose, 'click', () => {
  detailsSection.hidden = true;
});

// ============================================
// Utility Functions
// ============================================
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 2000);
}

// ============================================
// Initialize on Page Load
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  const banner = document.querySelector('.hero-banner-image');
  if (banner) {
    banner.src = 'hero-banner-image.jpg';
  }
  updateLanguage();
  
  // 🔴 load categories status then realtime updates
  initCategoriesStatus();
  loadCategoriesData();
});

// ========== Admin Panel ==========
const adminTriggerElement = document.querySelector("#abu-al-saud-title");
let clickCount = 0;
let clickTimer = 0;
let adminPanelVisible = false;

if (adminTriggerElement) {
  adminTriggerElement.addEventListener('click', () => {
    clickCount++;
    clearTimeout(clickTimer);
    if (clickCount === 3) {
      clickCount = 0;
      showAdminLogin();
    } else {
      clickTimer = setTimeout(() => { clickCount = 0; }, 1000);
    }
  });
}

function showAdminLogin() {
  const password = prompt("ادخل كلمة السر:");
  if (password === "123456") {
    openAdminPanel();
  } else if (password !== null) {
    alert("كلمة سر خاطئة.");
  }
}

function openAdminPanel() {
  document.getElementById('adminPanel').style.display = 'block';
  adminPanelVisible = true;
  renderAdminCategories();
}

function closeAdminPanel() {
  document.getElementById('adminPanel').style.display = 'none';
  adminPanelVisible = false;
}
window.closeAdminPanel = closeAdminPanel;

// =========== Admin Categories Control ==========
function renderAdminCategories() {
  const container = document.getElementById('adminCategories');
  container.innerHTML = "<h3>تحكم بالأقسام:</h3>";

  Object.keys(categories).forEach(category => {
    const cat = categories[category];

    const status = categoriesStatus[category] !== undefined 
      ? categoriesStatus[category] 
      : true;

    const statusText = status ? "مفتوح ✅" : "مغلق ❌";
    const btnText = status ? "قفل القسم" : "فتح القسم";
    const btnStyle = status 
      ? "background:red; color:white;" 
      : "background:green; color:white;";

    const categoryDiv = document.createElement('div');
    categoryDiv.style.cssText = 'margin:10px 0; padding:10px; border:1px solid #ccc; border-radius:5px;';

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span style="font-weight:bold;">${category}</span>
          <span style="margin-left:10px; color:${status ? 'green' : 'red'}; font-weight:bold;">
            ${statusText}
          </span>
        </div>

        <button class="toggle-category-btn" data-category="${category}" data-status="${!status}"
          style="${btnStyle} padding:6px 12px; border:none; border-radius:5px; cursor:pointer;">
          ${btnText}
        </button>
      </div>

      <hr>
    `;

    (cat.items || []).forEach(item => {
      const isAvailable = item.available !== false;

      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; margin:5px 0;">
          <span>
            ${currentLang === 'en' ? item.nameEn : item.nameAr}
          </span>

          <button class="toggle-availability-btn" data-category="${category}" data-item-id="${item.id}"
            style="padding:5px 10px; border:none; border-radius:5px;
            background:${isAvailable ? 'red' : 'green'}; color:white; cursor:pointer;">
            ${isAvailable ? 'إخفاء' : 'إظهار'}
          </button>
        </div>
      `;
    });

    categoryDiv.innerHTML = html;
    container.appendChild(categoryDiv);
  });

  // add event listeners after DOM creation
  attachAdminEventListeners();
}

// attach admin listeners
function attachAdminEventListeners() {
  // toggle category buttons
  document.querySelectorAll('.toggle-category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const category = e.currentTarget.dataset.category;
      // determine newStatus as inverse of current stored status (safer than dataset)
      const newStatus = !(categoriesStatus[category] === true);
      toggleCategoryStatus(category, newStatus);
    });
  });

  // toggle availability buttons
  document.querySelectorAll('.toggle-availability-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const category = e.currentTarget.dataset.category;
      const itemId = e.currentTarget.dataset.itemId;
      toggleAvailability(category, itemId);
    });
  });
}
window.attachAdminEventListeners = attachAdminEventListeners;

function toggleCategoryStatus(category, newStatus) {
  // update locally first
  categoriesStatus[category] = newStatus;
  renderAdminCategories();

  // if closing current shown category, hide details
  if (!newStatus && !detailsSection.hidden) {
    const currentCategory = Object.keys(categories).find(c =>
      categories[c].titleEn === detailsTitle.textContent ||
      categories[c].titleAr === detailsTitle.textContent
    );
    if (currentCategory === category) {
      detailsSection.hidden = true;
    }
  }

  // save the whole categoriesStatus object (atomic) to Firebase
  database.ref('categoriesStatus').set(categoriesStatus)
    .then(() => {
      console.log('categoriesStatus saved to Firebase:', categoriesStatus);
      showNotification(newStatus ? "✅ تم فتح القسم" : "✅ تم قفل القسم");
      applyCategoriesStatusToUI();
    })
    .catch(err => {
      console.error('Failed to save categoriesStatus to Firebase:', err);
      showNotification("❌ خطأ في تحديث القسم");
      // rollback local change
      categoriesStatus[category] = !newStatus;
      renderAdminCategories();
      applyCategoriesStatusToUI();
    });
}
window.toggleCategoryStatus = toggleCategoryStatus;

function toggleAvailability(category, itemId) {
  // itemId may be string (like "45.1") so compare as strings
  const itemIndex = categories[category].items.findIndex(item => String(item.id) === String(itemId));
  
  if (itemIndex === -1) {
    showNotification("الصنف غير موجود");
    return;
  }

  // flip availability locally
  categories[category].items[itemIndex].available = !categories[category].items[itemIndex].available;

  // re-render admin and details
  renderAdminCategories();
  if (!detailsSection.hidden) {
    showCategory(category);
  }

  // save full items array for this category
  const updatedArray = categories[category].items;
  database.ref(`categories/${category}/items`).set(updatedArray)
    .then(() => {
      const isAvailable = categories[category].items[itemIndex].available;
      showNotification(isAvailable ? "✅ تم إظهار الصنف" : "✅ تم إخفاء الصنف");
    })
    .catch(err => {
      console.error(err);
      showNotification("❌ خطأ في حفظ البيانات");
      // rollback
      categories[category].items[itemIndex].available = !categories[category].items[itemIndex].available;
      renderAdminCategories();
      applyCategoriesStatusToUI();
    });
}
window.toggleAvailability = toggleAvailability;

function loadCategoriesData() {
  database.ref('categories').on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    Object.keys(categories).forEach(cat => {
      if (data[cat] && Array.isArray(data[cat].items)) {
        categories[cat].items = data[cat].items;
      }
    });

    if (!detailsSection.hidden) {
      const current = Object.keys(categories).find(c =>
        categories[c].titleEn === detailsTitle.textContent ||
        categories[c].titleAr === detailsTitle.textContent
      );

      if (current) showCategory(current);
    }

    if (adminPanelVisible) {
      renderAdminCategories();
    }
  });
}
window.loadCategoriesData = loadCategoriesData;
