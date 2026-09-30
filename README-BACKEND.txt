WINBRO LIFESTYLE - BACKEND SETUP
================================

Files:
- server.js       Express backend + REST API
- package.json    Node.js dependencies and start command
- data.json       Local JSON database with WinBro products, orders and customers

REQUIREMENT:
- Install Node.js (LTS) on Windows.

SETUP:
1. Put server.js, package.json and data.json in the same folder as your existing:
   index.html
   style.css
   script.js
   hoodie.png
   jacket.png
   jeans.png
   panjabi.png
   polo.png
   shirt.png
   tshirt.png
   winbro-logo.png

2. Open Command Prompt in that folder.

3. Run:
   npm install

4. Then run:
   npm start

5. Open this in Chrome:
   http://localhost:3000

API endpoints:
GET    /api/health
GET    /api/dashboard
GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
GET    /api/customers
POST   /api/customers
GET    /api/orders
GET    /api/orders/:id
POST   /api/orders
PATCH  /api/orders/:id/status

IMPORTANT:
The current frontend still contains demo data in script.js. The backend is ready, but the frontend must use these API endpoints to make product/customer/order changes permanent. If you want the complete connected version, replace the frontend data logic with fetch() calls to /api/products, /api/customers and /api/orders.
