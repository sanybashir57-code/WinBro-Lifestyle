const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();

const PORT = process.env.PORT || 3000;

// =============================
// SSLCOMMERZ PAYMENT SETTINGS
// =============================
const SSLCZ_STORE_ID = process.env.SSLCZ_STORE_ID || '';
const SSLCZ_STORE_PASSWORD = process.env.SSLCZ_STORE_PASSWORD || '';
const SSLCZ_IS_LIVE = String(process.env.SSLCZ_IS_LIVE || 'false').toLowerCase() === 'true';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const SSLCZ_BASE_URL = SSLCZ_IS_LIVE
  ? 'https://securepay.sslcommerz.com'
  : 'https://sandbox.sslcommerz.com';

function sslCommerzConfigured() {
  return Boolean(SSLCZ_STORE_ID && SSLCZ_STORE_PASSWORD);
}

async function sslCommerzRequest(pathname, params) {
  const response = await fetch(`${SSLCZ_BASE_URL}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params)
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(`SSLCommerz HTTP ${response.status}`);
  return data;
}

async function validateSslCommerzPayment(valId) {
  const url = new URL(`${SSLCZ_BASE_URL}/validator/api/validationserverAPI.php`);
  url.searchParams.set('val_id', valId);
  url.searchParams.set('store_id', SSLCZ_STORE_ID);
  url.searchParams.set('store_passwd', SSLCZ_STORE_PASSWORD);
  url.searchParams.set('format', 'json');
  url.searchParams.set('v', '1');
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(`SSLCommerz validation HTTP ${response.status}`);
  return data;
}

function paymentResultPage(title, message, success = false) {
  const safeTitle = String(title).replace(/[<>&\"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','\"':'&quot;'}[c]));
  const safeMessage = String(message).replace(/[<>&\"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','\"':'&quot;'}[c]));
  return `<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>${safeTitle}</title><style>body{font-family:Arial,sans-serif;background:#f7f7f7;display:grid;place-items:center;min-height:100vh;margin:0}.card{background:#fff;padding:36px;max-width:520px;text-align:center;border-radius:16px;box-shadow:0 10px 40px #0001}h1{margin-top:0}a{display:inline-block;margin-top:20px;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px}</style></head><body><div class=\"card\"><h1>${success ? 'Payment Successful' : safeTitle}</h1><p>${safeMessage}</p><a href=\"/\">Back to Store</a></div></body></html>`;
}

const DB_FILE = path.join(__dirname, 'data.json');

// =====================================
// ADMIN LOGIN SETTINGS
// =====================================

// Local testing-এর জন্য এই username/password কাজ করবে.
// পরে Render-এর Environment Variables দিয়ে এগুলো change করবে.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'WinBro@123';

// Logged-in admin tokens
// token -> admin record
const adminTokens = new Map();

function hashAdminPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyAdminPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, expectedHex] = stored.split(':');
  try {
    const actual = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function ensureAdminStore(db) {
  if (!Array.isArray(db.admins)) db.admins = [];

  if (db.admins.length === 0) {
    db.admins.push({
      id: 1,
      name: 'WinBro Admin',
      username: ADMIN_USERNAME,
      passwordHash: hashAdminPassword(ADMIN_PASSWORD),
      role: 'superadmin',
      active: true,
      createdAt: new Date().toISOString()
    });
  }
}


// =====================================
// MIDDLEWARE
// =====================================

app.use(cors());

app.use(express.json({ limit: '1mb' }));

app.use(express.urlencoded({ extended: true }));


// =====================================
// DATABASE FUNCTIONS
// =====================================

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      products: [],
      orders: [],
      customers: [],
      admins: []
    };

    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(initial, null, 2)
    );

    return initial;
  }

  const db = JSON.parse(
    fs.readFileSync(DB_FILE, 'utf8')
  );

  ensureAdminStore(db);
  return db;
}


function writeDB(db) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(db, null, 2)
  );
}


// =====================================
// GENERAL HELPERS
// =====================================

function nextId(items) {
  return items.reduce(
    (max, item) =>
      Math.max(max, Number(item.id) || 0),
    0
  ) + 1;
}


function today() {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}


function orderId(orders) {
  const max = orders.reduce((m, o) => {
    const n =
      Number(
        String(o.id || '').replace(/\D/g, '')
      ) || 1000;

    return Math.max(m, n);
  }, 1000);

  return `WB-${max + 1}`;
}


function validateProduct(body) {
  const {
    name,
    category,
    price,
    stock,
    size
  } = body;

  if (
    !name ||
    !category ||
    price === undefined ||
    stock === undefined ||
    !size
  ) {
    return 'name, category, price, stock and size are required';
  }

  if (
    Number(price) < 0 ||
    Number(stock) < 0
  ) {
    return 'price and stock cannot be negative';
  }

  return null;
}


// =====================================
// ADMIN AUTHENTICATION
// =====================================

function createAdminToken() {
  return crypto.randomBytes(32).toString('hex');
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Admin login required' });
  }

  const token = authHeader.substring(7);
  const admin = adminTokens.get(token);

  if (!admin) {
    return res.status(401).json({ message: 'Invalid or expired admin session' });
  }

  req.admin = admin;
  req.isAdmin = true;
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.admin || req.admin.role !== 'superadmin') {
    return res.status(403).json({ message: 'Super admin permission required' });
  }
  next();
}

// =====================================
// ADMIN PAGE SESSION COOKIE
// =====================================

function getCookie(req, name) {
  const raw = String(req.headers.cookie || '');
  for (const part of raw.split(';')) {
    const [key, ...valueParts] = part.trim().split('=');
    if (key === name) return decodeURIComponent(valueParts.join('='));
  }
  return null;
}

function setAdminCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `winbro_admin_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secure}`
  );
}

function clearAdminCookie(res) {
  res.setHeader(
    'Set-Cookie',
    'winbro_admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
}

function requireAdminPage(req, res, next) {
  const token = getCookie(req, 'winbro_admin_token');
  if (!token || !adminTokens.has(token)) {
    return res.redirect('/admin');
  }
  req.admin = adminTokens.get(token);
  next();
}

// =====================================
// ADMIN LOGIN
// =====================================

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();

  const admin = db.admins.find(
    item => item.username.toLowerCase() === String(username || '').trim().toLowerCase() && item.active !== false
  );

  if (!admin || !verifyAdminPassword(password, admin.passwordHash)) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const token = createAdminToken();
  const sessionAdmin = {
    id: admin.id,
    name: admin.name,
    username: admin.username,
    role: admin.role
  };

  adminTokens.set(token, sessionAdmin);
  setAdminCookie(res, token);

  res.json({
    message: 'Login successful',
    token,
    admin: sessionAdmin
  });
});

// Current admin
app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

// List admins - super admin only
app.get('/api/admin/admins', requireAdmin, requireSuperAdmin, (req, res) => {
  const db = readDB();
  res.json(db.admins.map(({ passwordHash, ...admin }) => admin));
});

// Add admin - super admin only
app.post('/api/admin/admins', requireAdmin, requireSuperAdmin, (req, res) => {
  const { name, username, password, role = 'admin' } = req.body;
  const cleanName = String(name || '').trim();
  const cleanUsername = String(username || '').trim();
  const cleanPassword = String(password || '');

  if (!cleanName || !cleanUsername || cleanPassword.length < 6) {
    return res.status(400).json({ message: 'Name, username and a password of at least 6 characters are required' });
  }

  if (!['admin', 'superadmin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid admin role' });
  }

  const db = readDB();
  if (db.admins.some(a => a.username.toLowerCase() === cleanUsername.toLowerCase())) {
    return res.status(409).json({ message: 'Username already exists' });
  }

  const admin = {
    id: nextId(db.admins),
    name: cleanName,
    username: cleanUsername,
    passwordHash: hashAdminPassword(cleanPassword),
    role,
    active: true,
    createdAt: new Date().toISOString()
  };

  db.admins.push(admin);
  writeDB(db);

  const { passwordHash, ...safeAdmin } = admin;
  res.status(201).json(safeAdmin);
});

// Edit admin - super admin only
app.put('/api/admin/admins/:id', requireAdmin, requireSuperAdmin, (req, res) => {
  const db = readDB();
  const admin = db.admins.find(a => a.id === Number(req.params.id));

  if (!admin) return res.status(404).json({ message: 'Admin not found' });

  const { name, username, password, role, active } = req.body;

  if (username !== undefined) {
    const cleanUsername = String(username).trim();
    if (!cleanUsername) return res.status(400).json({ message: 'Username cannot be empty' });
    if (db.admins.some(a => a.id !== admin.id && a.username.toLowerCase() === cleanUsername.toLowerCase())) {
      return res.status(409).json({ message: 'Username already exists' });
    }
    admin.username = cleanUsername;
  }

  if (name !== undefined) admin.name = String(name).trim() || admin.name;
  if (password !== undefined && String(password).length > 0) {
    if (String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    admin.passwordHash = hashAdminPassword(String(password));
  }
  if (role !== undefined && ['admin', 'superadmin'].includes(role)) admin.role = role;
  if (active !== undefined && admin.id !== req.admin.id) admin.active = Boolean(active);

  writeDB(db);

  // Existing sessions are refreshed only for the edited account on next login.
  for (const [token, session] of adminTokens.entries()) {
    if (session.id === admin.id) {
      adminTokens.set(token, { id: admin.id, name: admin.name, username: admin.username, role: admin.role });
    }
  }

  const { passwordHash, ...safeAdmin } = admin;
  res.json(safeAdmin);
});

// Delete admin - super admin only
app.delete('/api/admin/admins/:id', requireAdmin, requireSuperAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.admin.id) return res.status(400).json({ message: 'You cannot delete your own account' });

  const db = readDB();
  const before = db.admins.length;
  db.admins = db.admins.filter(a => a.id !== id);

  if (db.admins.length === before) return res.status(404).json({ message: 'Admin not found' });
  writeDB(db);
  res.json({ message: 'Admin deleted' });
});


// =====================================
// ADMIN LOGOUT
// =====================================

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const authHeader =
    req.headers.authorization || '';

  const token =
    authHeader.substring(7);

  adminTokens.delete(token);
  clearAdminCookie(res);

  res.json({
    message: 'Logged out successfully'
  });
});


// =====================================
// HEALTH CHECK
// =====================================

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'WinBro Backend',
    time: new Date().toISOString()
  });
});


// =====================================
// DASHBOARD - ADMIN ONLY
// =====================================

app.get(
  '/api/dashboard',
  requireAdmin,
  (req, res) => {

    const db = readDB();

    const currentDate = today();

    res.json({
      totalProducts: db.products.length,

      todaysOrders:
        db.orders.filter(
          o => o.date === currentDate
        ).length,

      totalCustomers:
        db.customers.length,

      lowStock:
        db.products.filter(
          p => Number(p.stock) <= 10
        ).length,

      recentOrders:
        db.orders.slice(0, 3),

      stockAlerts:
        db.products.filter(
          p => Number(p.stock) <= 10
        )
    });
  }
);


// =====================================
// PRODUCTS - PUBLIC
// Customers need this to shop.
// =====================================

app.get('/api/products', (req, res) => {

  const db = readDB();

  let items = db.products;

  const q =
    String(
      req.query.search || ''
    )
      .trim()
      .toLowerCase();

  const category =
    String(
      req.query.category || ''
    )
      .trim()
      .toLowerCase();

  if (q) {
    items = items.filter(p =>
      p.name
        .toLowerCase()
        .includes(q) ||

      p.category
        .toLowerCase()
        .includes(q)
    );
  }

  if (
    category &&
    category !== 'all'
  ) {
    items = items.filter(
      p =>
        p.category
          .toLowerCase() === category
    );
  }

  res.json(items);
});


// =====================================
// SINGLE PRODUCT - PUBLIC
// =====================================

app.get(
  '/api/products/:id',
  (req, res) => {

    const db = readDB();

    const product =
      db.products.find(
        p =>
          p.id ===
          Number(req.params.id)
      );

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    res.json(product);
  }
);


// =====================================
// ADD PRODUCT - ADMIN ONLY
// =====================================

app.post(
  '/api/products',
  requireAdmin,
  (req, res) => {

    const error =
      validateProduct(req.body);

    if (error) {
      return res.status(400).json({
        message: error
      });
    }

    const db = readDB();

    const product = {
      id: nextId(db.products),

      name:
        String(req.body.name).trim(),

      category:
        String(req.body.category).trim(),

      price:
        Number(req.body.price),

      stock:
        Number(req.body.stock),

      size:
        String(req.body.size).trim(),

      emoji:
        req.body.emoji || '👕',

      image:
        req.body.image || 'tshirt.png'
    };

    db.products.push(product);

    writeDB(db);

    res.status(201).json(product);
  }
);


// =====================================
// EDIT PRODUCT - ADMIN ONLY
// =====================================

app.put(
  '/api/products/:id',
  requireAdmin,
  (req, res) => {

    const db = readDB();

    const product =
      db.products.find(
        p =>
          p.id ===
          Number(req.params.id)
      );

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    Object.assign(product, {

      ...(req.body.name !== undefined && {
        name:
          String(req.body.name).trim()
      }),

      ...(req.body.category !== undefined && {
        category:
          String(req.body.category).trim()
      }),

      ...(req.body.price !== undefined && {
        price:
          Number(req.body.price)
      }),

      ...(req.body.stock !== undefined && {
        stock:
          Number(req.body.stock)
      }),

      ...(req.body.size !== undefined && {
        size:
          String(req.body.size).trim()
      }),

      ...(req.body.image !== undefined && {
        image:
          String(req.body.image)
      })
    });

    writeDB(db);

    res.json(product);
  }
);


// =====================================
// DELETE PRODUCT - ADMIN ONLY
// =====================================

app.delete(
  '/api/products/:id',
  requireAdmin,
  (req, res) => {

    const db = readDB();

    const before =
      db.products.length;

    db.products =
      db.products.filter(
        p =>
          p.id !==
          Number(req.params.id)
      );

    if (
      db.products.length ===
      before
    ) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    writeDB(db);

    res.json({
      message: 'Product deleted'
    });
  }
);


// =====================================
// CUSTOMERS - ADMIN ONLY
// =====================================

app.get(
  '/api/customers',
  requireAdmin,
  (req, res) => {

    res.json(
      readDB().customers
    );
  }
);


// =====================================
// MANUAL CUSTOMER ADD - ADMIN ONLY
// =====================================

app.post(
  '/api/customers',
  requireAdmin,
  (req, res) => {

    const {
      name,
      phone,
      email = ''
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        message:
          'name and phone are required'
      });
    }

    const db = readDB();

    const customer = {
      name:
        String(name).trim(),

      phone:
        String(phone).trim(),

      email:
        String(email).trim(),

      orders: 0
    };

    db.customers.push(customer);

    writeDB(db);

    res.status(201).json(customer);
  }
);


// =====================================
// ORDERS - ADMIN ONLY
// =====================================

app.get(
  '/api/orders',
  requireAdmin,
  (req, res) => {

    res.json(
      readDB().orders
    );
  }
);


// =====================================
// SINGLE ORDER - ADMIN ONLY
// =====================================

app.get(
  '/api/orders/:id',
  requireAdmin,
  (req, res) => {

    const db = readDB();

    const order =
      db.orders.find(
        o =>
          o.id ===
          req.params.id
      );

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    res.json(order);
  }
);


// =====================================
// CHECKOUT / CREATE ORDER - PUBLIC
// Customers need this.
// =====================================

app.post(
  '/api/orders',
  async (req, res) => {

    const {
      customerName,
      phone,
      address,
      delivery,
      payment,
      items
    } = req.body;

    if (
      !customerName ||
      !phone ||
      !address ||
      !delivery ||
      !payment ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message:
          'Customer, delivery, payment and cart items are required'
      });
    }

    const db = readDB();

    const orderItems = [];

    let subtotal = 0;

    for (
      const requested
      of items
    ) {

      const product =
        db.products.find(
          p =>
            p.id ===
            Number(requested.id)
        );

      const quantity =
        Number(requested.quantity);

      if (!product) {
        return res.status(404).json({
          message:
            `Product ${requested.id} not found`
        });
      }

      if (
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return res.status(400).json({
          message:
            'Invalid quantity'
        });
      }

      if (
        product.stock < quantity
      ) {
        return res.status(409).json({
          message:
            `${product.name} has only ${product.stock} item(s) in stock`
        });
      }

      const lineTotal =
        product.price * quantity;

      subtotal += lineTotal;

      orderItems.push({
        productId:
          product.id,

        name:
          product.name,

        price:
          product.price,

        quantity,

        size:
          requested.size ||
          product.size
      });

      // Reduce stock
      product.stock -= quantity;
    }

    const deliveryCharge =
      delivery === 'Inside Dhaka'
        ? 60
        : 120;

    const amount =
      subtotal + deliveryCharge;

    const id =
      orderId(db.orders);

    const order = {

      id,

      customer:
        String(customerName).trim(),

      phone:
        String(phone).trim(),

      address:
        String(address).trim(),

      delivery,

      payment,

      date:
        today(),

      amount,

      subtotal,

      deliveryCharge,

      status:
        'Pending',

      items:
        orderItems
    };

    db.orders.unshift(order);


    // =================================
    // SAVE / UPDATE CUSTOMER
    // =================================

    const customerPhone =
      String(phone).trim();

    const existingCustomer =
      db.customers.find(
        c =>
          c.phone ===
          customerPhone
      );

    if (existingCustomer) {

      existingCustomer.orders =
        Number(
          existingCustomer.orders || 0
        ) + 1;

      existingCustomer.name =
        String(customerName).trim();

      existingCustomer.address =
        String(address).trim();

    } else {

      db.customers.push({

        name:
          String(customerName).trim(),

        phone:
          customerPhone,

        email:
          '',

        orders:
          1,

        address:
          String(address).trim()
      });
    }


    writeDB(db);

    // Cash on delivery is complete at order placement.
    // Online payment is initiated server-side and customer is redirected to SSLCommerz.
    const isOnlinePayment = String(payment).toLowerCase() === 'online payment' || String(payment).toLowerCase() === 'sslcommerz';

    if (isOnlinePayment) {
      if (!sslCommerzConfigured()) {
        return res.status(503).json({
          message: 'Online payment is not configured yet. Please set SSLCZ_STORE_ID and SSLCZ_STORE_PASSWORD.'
        });
      }

      try {
        const ssl = await sslCommerzRequest('/gwprocess/v4/api.php', {
          store_id: SSLCZ_STORE_ID,
          store_passwd: SSLCZ_STORE_PASSWORD,
          total_amount: amount.toFixed(2),
          currency: 'BDT',
          tran_id: id,
          success_url: `${PUBLIC_BASE_URL}/payment/success`,
          fail_url: `${PUBLIC_BASE_URL}/payment/fail`,
          cancel_url: `${PUBLIC_BASE_URL}/payment/cancel`,
          ipn_url: `${PUBLIC_BASE_URL}/payment/ipn`,
          cus_name: String(customerName).trim(),
          cus_phone: String(phone).trim(),
          cus_add1: String(address).trim(),
          cus_city: delivery === 'Inside Dhaka' ? 'Dhaka' : 'Bangladesh',
          cus_country: 'Bangladesh',
          product_name: 'WinBro Lifestyle Order',
          product_category: 'Fashion',
          product_profile: 'general',
          shipping_method: 'YES',
          num_of_item: String(orderItems.reduce((n, item) => n + item.quantity, 0)),
          ship_name: String(customerName).trim(),
          ship_add1: String(address).trim(),
          ship_city: delivery === 'Inside Dhaka' ? 'Dhaka' : 'Bangladesh',
          ship_country: 'Bangladesh',
          value_a: id
        });

        if (ssl.status !== 'SUCCESS' || !ssl.GatewayPageURL) {
          order.paymentStatus = 'Initiation Failed';
          writeDB(db);
          return res.status(502).json({ message: ssl.failedreason || 'Unable to start online payment' });
        }

        order.paymentStatus = 'Unpaid';
        order.sslSessionKey = ssl.sessionkey || '';
        writeDB(db);

        return res.status(201).json({
          message: 'Redirecting to secure payment',
          paymentRequired: true,
          gatewayUrl: ssl.GatewayPageURL,
          order
        });
      } catch (error) {
        console.error('SSLCommerz initiation error:', error);
        return res.status(502).json({ message: 'Online payment gateway is temporarily unavailable. Please try again.' });
      }
    }

    order.paymentStatus = 'Cash on Delivery';
    writeDB(db);

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  }
);


// =====================================
// SSLCOMMERZ CALLBACKS / IPN
// =====================================
function restoreOrderStock(db, order) {
  if (!order || order.stockRestored || order.paymentStatus === 'Paid') return;
  for (const item of order.items || []) {
    const product = db.products.find(p => p.id === Number(item.productId));
    if (product) product.stock = Number(product.stock || 0) + Number(item.quantity || 0);
  }
  order.stockRestored = true;
}

async function handleSslSuccess(req, res) {
  const payload = req.body || {};
  const tranId = String(payload.tran_id || payload.value_a || '').trim();
  const valId = String(payload.val_id || '').trim();
  if (!tranId || !valId) return res.status(400).send(paymentResultPage('Payment Error', 'Payment validation information is missing.'));

  const db = readDB();
  const order = db.orders.find(o => o.id === tranId);
  if (!order) return res.status(404).send(paymentResultPage('Order Not Found', 'We could not find this order.'));
  if (order.paymentStatus === 'Paid') return res.send(paymentResultPage('Already Paid', `Order ${order.id} is already marked as paid.`, true));

  try {
    const validation = await validateSslCommerzPayment(valId);
    const validatedTranId = String(validation.tran_id || '').trim();
    const validatedAmount = Number(validation.amount);
    if (!['VALID', 'VALIDATED'].includes(validation.status) || validatedTranId !== order.id || Math.abs(validatedAmount - Number(order.amount)) > 0.01) {
      order.paymentStatus = 'Validation Failed';
      order.status = 'Cancelled';
      restoreOrderStock(db, order);
      writeDB(db);
      return res.status(400).send(paymentResultPage('Payment Could Not Be Verified', 'The payment details did not pass server-side verification.'));
    }

    order.paymentStatus = 'Paid';
    order.status = 'Processing';
    order.paidAt = new Date().toISOString();
    order.transactionId = validatedTranId;
    order.validationId = valId;
    writeDB(db);
    return res.send(paymentResultPage('Payment Successful', `Your payment for order ${order.id} was verified successfully.`, true));
  } catch (error) {
    console.error('SSLCommerz success validation error:', error);
    return res.status(502).send(paymentResultPage('Payment Verification Pending', 'We received the payment response but could not verify it right now. Please contact the store if money was deducted.'));
  }
}

app.post('/payment/success', handleSslSuccess);
async function handleSslFailed(req, res, title, message) {
  const tranId = String(req.body?.tran_id || req.body?.value_a || '').trim();
  if (tranId) {
    const db = readDB();
    const order = db.orders.find(o => o.id === tranId);
    if (order && order.paymentStatus !== 'Paid') {
      order.paymentStatus = 'Unpaid';
      order.status = 'Cancelled';
      restoreOrderStock(db, order);
      writeDB(db);
    }
  }
  return res.send(paymentResultPage(title, message));
}

app.post('/payment/fail', (req, res) => handleSslFailed(req, res, 'Payment Failed', 'Your payment was not completed. You can return to the store and try again.'));
app.post('/payment/cancel', (req, res) => handleSslFailed(req, res, 'Payment Cancelled', 'The payment was cancelled. Your order remains unpaid.'));
app.post('/payment/ipn', async (req, res) => {
  try {
    if (!req.body || !req.body.val_id) return res.status(400).send('Missing val_id');
    const db = readDB();
    const tranId = String(req.body.tran_id || '').trim();
    const order = db.orders.find(o => o.id === tranId);
    if (!order) return res.status(404).send('Order not found');
    const validation = await validateSslCommerzPayment(String(req.body.val_id));
    if (['VALID', 'VALIDATED'].includes(validation.status) && String(validation.tran_id) === order.id && Math.abs(Number(validation.amount) - Number(order.amount)) <= 0.01) {
      order.paymentStatus = 'Paid';
      order.status = 'Processing';
      order.paidAt = order.paidAt || new Date().toISOString();
      order.transactionId = String(validation.tran_id);
      order.validationId = String(req.body.val_id);
      writeDB(db);
    }
    return res.send('OK');
  } catch (error) {
    console.error('SSLCommerz IPN error:', error);
    return res.status(500).send('IPN processing failed');
  }
});

// =====================================
// UPDATE ORDER STATUS - ADMIN ONLY
// =====================================

app.patch(
  '/api/orders/:id/status',
  requireAdmin,
  (req, res) => {

    const db = readDB();

    const order =
      db.orders.find(
        o =>
          o.id ===
          req.params.id
      );

    if (!order) {
      return res.status(404).json({
        message:
          'Order not found'
      });
    }

    const allowed = [
      'Pending',
      'Processing',
      'Delivered',
      'Cancelled'
    ];

    if (
      !allowed.includes(
        req.body.status
      )
    ) {
      return res.status(400).json({
        message:
          'Invalid order status'
      });
    }

    order.status =
      req.body.status;

    writeDB(db);

    res.json(order);
  }
);


// =====================================
// SERVE FRONTEND
// =====================================

// Customer storefront: no admin UI is included here.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'customer.html'));
});

app.get('/customer.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'customer.html'));
});

// Private admin entry. The old /admin.html URL is intentionally not exposed.
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Admin dashboard requires a server-side HttpOnly session cookie.
app.get('/admin/dashboard', requireAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

// Never serve these internal admin HTML files directly.
app.get(['/admin.html', '/admin-dashboard.html', '/index.html'], (req, res) => {
  if (req.path === '/index.html') return res.redirect('/');
  return res.status(404).send('Not found');
});

app.use(express.static(__dirname));

// =====================================
// ERROR HANDLER
// =====================================

app.use(
  (err, req, res, next) => {

    console.error(err);

    res.status(500).json({
      message:
        'Internal server error'
    });
  }
);


// =====================================
// START SERVER
// =====================================

app.listen(
  PORT,
  '0.0.0.0',
  () => {

    console.log(
      `WinBro backend running on port ${PORT}`
    );

    console.log(
      `Customer: http://localhost:${PORT}/`
    );

    console.log(
      `Admin: http://localhost:${PORT}/admin`
    );
  }
);