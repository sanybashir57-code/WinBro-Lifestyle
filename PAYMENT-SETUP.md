# WinBro Lifestyle — SSLCommerz Payment Setup

The customer checkout now supports **Online Payment (bKash / Nagad / Card)** through SSLCommerz Hosted Checkout.

## 1. Create an SSLCommerz account
- Sandbox/testing: use the SSLCommerz developer registration.
- Live payments: use a production SSLCommerz merchant account.

## 2. Set environment variables

### Windows CMD
```bat
set SSLCZ_STORE_ID=YOUR_STORE_ID
set SSLCZ_STORE_PASSWORD=YOUR_STORE_PASSWORD
set SSLCZ_IS_LIVE=false
set PUBLIC_BASE_URL=https://YOUR-DOMAIN.com
npm start
```

### Render
Add these Environment Variables:
- `SSLCZ_STORE_ID` = your store ID
- `SSLCZ_STORE_PASSWORD` = your store password
- `SSLCZ_IS_LIVE` = `false` for sandbox, `true` for live
- `PUBLIC_BASE_URL` = your public HTTPS site URL, for example `https://yourstore.com`

Keep the store ID/password on the server. Do **not** put them in HTML or browser JavaScript.

## 3. SSLCommerz IPN URL
After deployment, configure this IPN URL in the SSLCommerz merchant panel:

`https://YOUR-DOMAIN.com/payment/ipn`

The application also supplies success/fail/cancel callback URLs during transaction initiation.

## 4. Customer flow
1. Customer adds products to cart.
2. Customer selects **Online Payment (bKash / Nagad / Card)**.
3. Server calculates the amount from the database.
4. Server creates the SSLCommerz transaction.
5. Customer is redirected to SSLCommerz.
6. SSLCommerz sends the result back.
7. Server validates the transaction and amount before marking the order as **Paid**.

## 5. Cash on Delivery
Cash on Delivery remains available and does not require SSLCommerz credentials.
