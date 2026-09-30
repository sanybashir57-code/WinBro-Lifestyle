const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = { products: [], orders: [], customers: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function today() {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function orderId(orders) {
  const max = orders.reduce((m, o) => {
    const n = Number(String(o.id || '').replace(/\\D/g, '')) || 1000;
    return Math.max(m, n);
  }, 1000);
  return `WB-${max + 1}`;
}

function validateProduct(body) {
  const { name, category, price, stock, size } = body;
  if (!name || !category || price === undefined || stock === undefined || !size) {
    return 'name, category, price, stock and size are required';
  }
  if (Number(price) < 0 || Number(stock) < 0) return 'price and stock cannot be negative';
  return null;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'WinBro Backend', time: new Date().toISOString() });
});

// Dashboard
app.get('/api/dashboard', (req, res) => {
  const db = readDB();
  const currentDate = today();
  res.json({
    totalProducts: db.products.length,
    todaysOrders: db.orders.filter(o => o.date === currentDate).length,
    totalCustomers: db.customers.length,
    lowStock: db.products.filter(p => Number(p.stock) <= 10).length,
    recentOrders: db.orders.slice(0, 3),
    stockAlerts: db.products.filter(p => Number(p.stock) <= 10)
  });
});

// Products
app.get('/api/products', (req, res) => {
  const db = readDB();
  let items = db.products;
  const q = String(req.query.search || '').trim().toLowerCase();
  const category = String(req.query.category || '').trim().toLowerCase();
  if (q) items = items.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  if (category && category !== 'all') items = items.filter(p => p.category.toLowerCase() === category);
  res.json(items);
});

app.get('/api/products/:id', (req, res) => {
  const db = readDB();
  const product = db.products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

app.post('/api/products', (req, res) => {
  const error = validateProduct(req.body);
  if (error) return res.status(400).json({ message: error });
  const db = readDB();
  const product = {
    id: nextId(db.products),
    name: String(req.body.name).trim(),
    category: String(req.body.category).trim(),
    price: Number(req.body.price),
    stock: Number(req.body.stock),
    size: String(req.body.size).trim(),
    emoji: req.body.emoji || '👕',
    image: req.body.image || 'tshirt.png'
  };
  db.products.push(product);
  writeDB(db);
  res.status(201).json(product);
});

app.put('/api/products/:id', (req, res) => {
  const db = readDB();
  const product = db.products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ message: 'Product not found' });
  Object.assign(product, {
    ...(req.body.name !== undefined && { name: String(req.body.name).trim() }),
    ...(req.body.category !== undefined && { category: String(req.body.category).trim() }),
    ...(req.body.price !== undefined && { price: Number(req.body.price) }),
    ...(req.body.stock !== undefined && { stock: Number(req.body.stock) }),
    ...(req.body.size !== undefined && { size: String(req.body.size).trim() }),
    ...(req.body.image !== undefined && { image: String(req.body.image) })
  });
  writeDB(db);
  res.json(product);
});

app.delete('/api/products/:id', (req, res) => {
  const db = readDB();
  const before = db.products.length;
  db.products = db.products.filter(p => p.id !== Number(req.params.id));
  if (db.products.length === before) return res.status(404).json({ message: 'Product not found' });
  writeDB(db);
  res.json({ message: 'Product deleted' });
});

// Customers
app.get('/api/customers', (req, res) => res.json(readDB().customers));

app.post('/api/customers', (req, res) => {
  const { name, phone, email = '' } = req.body;
  if (!name || !phone) return res.status(400).json({ message: 'name and phone are required' });
  const db = readDB();
  const customer = { name: String(name).trim(), phone: String(phone).trim(), email: String(email).trim(), orders: 0 };
  db.customers.push(customer);
  writeDB(db);
  res.status(201).json(customer);
});

// Orders
app.get('/api/orders', (req, res) => res.json(readDB().orders));

app.get('/api/orders/:id', (req, res) => {
  const db = readDB();
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
});

// Checkout / create order
app.post('/api/orders', (req, res) => {
  const { customerName, phone, address, delivery, payment, items } = req.body;
  if (!customerName || !phone || !address || !delivery || !payment || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Customer, delivery, payment and cart items are required' });
  }

  const db = readDB();
  const orderItems = [];
  let subtotal = 0;

  for (const requested of items) {
    const product = db.products.find(p => p.id === Number(requested.id));
    const quantity = Number(requested.quantity);
    if (!product) return res.status(404).json({ message: `Product ${requested.id} not found` });
    if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ message: 'Invalid quantity' });
    if (product.stock < quantity) return res.status(409).json({ message: `${product.name} has only ${product.stock} item(s) in stock` });

    const lineTotal = product.price * quantity;
    subtotal += lineTotal;
    orderItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      size: requested.size || product.size
    });
    product.stock -= quantity;
  }

  const deliveryCharge = delivery === 'Inside Dhaka' ? 60 : 120;
  const amount = subtotal + deliveryCharge;
  const id = orderId(db.orders);
  const order = {
    id,
    customer: String(customerName).trim(),
    phone: String(phone).trim(),
    address: String(address).trim(),
    delivery,
    payment,
    date: today(),
    amount,
    subtotal,
    deliveryCharge,
    status: 'Pending',
    items: orderItems
  };

  db.orders.unshift(order);

  const existingCustomer = db.customers.find(c => c.phone === String(phone).trim());
  if (existingCustomer) {
    existingCustomer.orders = Number(existingCustomer.orders || 0) + 1;
    existingCustomer.name = String(customerName).trim();
    existingCustomer.address = String(address).trim();
  } else {
    db.customers.push({ name: String(customerName).trim(), phone: String(phone).trim(), email: '', orders: 1, address: String(address).trim() });
  }

  writeDB(db);
  res.status(201).json({ message: 'Order created successfully', order });
});

// Update order status
app.patch('/api/orders/:id/status', (req, res) => {
  const db = readDB();
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const allowed = ['Pending', 'Processing', 'Delivered', 'Cancelled'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid order status' });
  order.status = req.body.status;
  writeDB(db);
  res.json(order);
});

// Serve the existing WinBro frontend from the same folder.
app.use(express.static(__dirname));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`WinBro backend running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}/index.html`);
});
