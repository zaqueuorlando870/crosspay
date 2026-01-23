# CrossPay Marketplace Workflow Implementation

## Overview
Implemented a complete peer-to-peer marketplace system with wallet integration, escrow management, and commission tracking.

## Database Schema Created

### 1. **Listings Table**
- Stores seller's product listings
- Tracks listing fee ($0.50 per listing)
- Status: active, sold, inactive
- Quantity tracking

### 2. **Orders Table**
- Links buyer and seller through listing
- Tracks order status: pending, completed, cancelled, refunded
- Records transaction ID and total amount (including fees)

### 3. **Escrow Table**
- Holds buyer funds during transaction
- Status: held, released, refunded
- Tracks held_at and released_at timestamps

### 4. **Fees Table**
- Records all fees for each order:
  - **Listing Fee**: $0.50 per listing (deducted from seller at listing creation)
  - **Seller Commission**: 5% of transaction amount
  - **Buyer Fee**: 2% of transaction amount
  - **Payout Fee**: 3% deducted when cashing out

### 5. **Payouts Table**
- Manages seller payouts to external accounts
- Supports cross-border transactions with optional currency conversion
- Tracks payout status: pending, processing, completed, failed

## Workflow Implementation

### **1. Seller Creates Listing**
```
seller.listings.create(data)
  → Listing fee ($0.50) deducted from seller's wallet
  → Listing becomes visible in marketplace (active status)
  → Platform earns listing fee
```

### **2. Buyer Purchases**
```
order.create(listing, buyer)
  → Funds debited from buyer's wallet (price + 2% buyer fee)
  → Escrow created: holds $X amount (listing price)
  → Fees calculated and recorded:
    - Listing Fee: $0.50
    - Seller Commission: 5% of price
    - Buyer Fee: 2% of price
    - Payout Fee: calculated at payout
```

### **3. Seller Completes Order**
```
order.completeOrder()
  → Escrow status changes to 'released'
  → Seller credited: (price - seller commission)
  → Platform keeps: listing fee + seller commission
```

### **4. Buyer Requests Payout**
```
payout.create(order)
  → Optional currency conversion (if cross-border)
  → Payout fee (3%) deducted from final amount
  → Amount = Escrow Amount - Payout Fee (- conversion if cross-border)
  → Funds sent to linked account
  → Status: pending → processing → completed
```

## Models & Relationships

### User
- `hasMany` listings (as seller)
- `hasMany` purchases (as buyer, through orders)
- `hasMany` payouts

### Listing
- `belongsTo` seller (user)
- `hasMany` orders

### Order
- `belongsTo` listing
- `belongsTo` buyer (user)
- `hasOne` escrow
- `hasOne` fees
- `hasOne` payout

### Escrow
- `belongsTo` order

### Fee
- `belongsTo` order

### Payout
- `belongsTo` order
- `belongsTo` user

## Controllers

### **MarketplaceController**
- `index()` - List active listings with pagination
- `show()` - Display listing details

### **ListingController**
- `create()` - Show listing form
- `store()` - Create listing and debit listing fee
- `edit()` - Edit listing
- `update()` - Update listing details
- `destroy()` - Deactivate listing

### **OrderController**
- `create()` - Show purchase form
- `store()` - Create order, debit buyer, create escrow, record fees
- `completeOrder()` - Release escrow, credit seller

### **PayoutController**
- `create()` - Show payout form
- `store()` - Create payout record, debit payout fee
- `confirmation()` - Payout confirmation page
- `process()` - Process payout to external account
- `index()` - List user's payouts

## Routes

### Public Routes
```
GET /marketplace                    - View marketplace
GET /marketplace/{listing}          - View listing details
```

### Protected Routes (auth required)
```
# Listings
GET    /listings/create             - Create listing form
POST   /listings                    - Store listing
GET    /listings/{listing}/edit     - Edit listing form
PUT    /listings/{listing}          - Update listing
DELETE /listings/{listing}          - Delete listing

# Orders
GET    /listings/{listing}/order/create  - Purchase form
POST   /orders                      - Create order
POST   /orders/{order}/complete     - Complete order

# Payouts
GET    /orders/{order}/payout       - Payout form
POST   /payouts                     - Create payout
GET    /payouts/{payout}/confirm    - Confirm payout
POST   /payouts/{payout}/process    - Process payout
GET    /payouts                     - List user payouts
```

## Fee Distribution

For a $100 transaction:

**Buyer Pays:**
- Product: $100
- Buyer Fee: $2 (2%)
- **Total: $102**

**Platform Earns:**
- Listing Fee: $0.50 (one-time)
- Seller Commission: $5 (5%)
- Buyer Fee: $2
- **Total: $7.50**

**Seller Receives:**
- After completion: $95 ($100 - $5 commission)
- If requests payout: $92.15 ($95 - $2.85 payout fee at 3%)

## Next Steps

1. Create React pages for marketplace UI
2. Add seller dashboard
3. Implement payment gateway integration
4. Add transaction history
5. Create admin dashboard for platform earnings tracking
6. Add notifications for order updates
