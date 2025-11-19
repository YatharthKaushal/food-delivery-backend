# Admin User Story Document

## Overview
This document outlines the admin panel functionality, pages, flows, and API response structures for frontend development. It covers authentication, dashboard analytics, order management, kitchen operations, menu management, subscription management, delivery management, and customer management.

---

## Pages Required

### Authentication Pages
1. **Admin Login Page** (`/admin/login`)
2. **Admin Registration Page** (`/admin/register`)

### Dashboard Pages
3. **Admin Dashboard Page** (`/admin/dashboard`)
4. **Order Analytics Page** (`/admin/analytics/orders`)
5. **Revenue Reports Page** (`/admin/analytics/revenue`)

### Operations Pages
6. **Kitchen Dashboard Page** (`/admin/kitchen`) - Kitchen Staff role
7. **Order Management Page** (`/admin/orders`)
8. **Menu Items Management Page** (`/admin/menu-items`)
9. **Addons Management Page** (`/admin/addons`)
10. **Delivery Management Page** (`/admin/deliveries`)

### Subscription Pages
11. **Subscription Plans Page** (`/admin/subscription-plans`)
12. **Subscriptions Management Page** (`/admin/subscriptions`)
13. **Vouchers Management Page** (`/admin/vouchers`)

### Customer Pages
14. **Customer Management Page** (`/admin/customers`)

---

## Features and Functionality

### Authentication Features
- Admin registration with role assignment (ADMIN, KITCHEN_STAFF, DELIVERY_MANAGER)
- Admin login with JWT token generation
- Token-based authentication for protected routes
- 7-day token expiration
- Role-based access control

### Dashboard Features
- Display total customers count
- Display active subscriptions count
- Display today's orders count
- Display active drivers count
- Display today's revenue
- Display order status breakdown (placed, accepted, preparing, out for delivery, delivered, cancelled, failed)
- Order analytics by date range with meal type breakdown
- Revenue reports by time period (day, week, month, year)

### Kitchen Dashboard Features (KITCHEN_STAFF, ADMIN)
- View today's orders summary
- View pending orders (not accepted)
- View preparing orders
- Accept individual orders
- Reject orders with reason
- Bulk accept multiple orders
- Update preparation status (started, in-progress, almost-ready)
- Mark orders ready for delivery

### Order Management Features (ADMIN)
- View all orders with filtering (customer, meal type, date, status)
- View individual order details
- Update order status manually
- Update order details (special instructions, packaging)
- Cancel orders with optional time restriction bypass
- Delete/restore orders (soft delete)
- Get orders by date range
- View upcoming orders
- Get order statistics
- Assign drivers manually or automatically
- Refund management (approve/reject customer refund requests)

### Menu Items Management Features (ADMIN)
- Create menu items with price, description, media
- View all menu items with filtering (meal type, price range, search)
- Update menu item details
- Toggle live/inactive status
- Delete/restore menu items (soft delete)
- Bulk update multiple menu items
- Get menu item statistics

### Addons Management Features (ADMIN)
- Create addons linked to menu items
- View all addons with filtering (menu item, category, price range)
- Update addon details
- Toggle live/inactive status
- Delete/restore addons (soft delete)
- Bulk update multiple addons
- Delete all addons for a menu item
- Get addon statistics

### Delivery Management Features (ADMIN, DELIVERY_MANAGER)
- Create delivery records
- View all deliveries with filtering
- View delivery by order ID
- Assign/reassign delivery drivers
- Update delivery status (picked up, out for delivery, delivered, failed)
- Update delivery details (locations, estimated time, notes)
- View active deliveries
- View pending deliveries
- Get delivery statistics
- View deliveries by driver

### Subscription Management Features (ADMIN)
- View all subscriptions with filtering
- View individual subscription details
- Update subscription status (active, expired, cancelled, exhausted)
- Delete/restore subscriptions (soft delete)
- Get subscription statistics
- Update expired subscriptions (cron job)

### Subscription Plans Management Features (ADMIN)
- Create subscription plans
- View all plans (including inactive)
- View active plans only
- Update plan details
- Activate/deactivate plans
- Delete plans (soft delete via isActive flag)
- Get plan statistics
- Get plans grouped by type

### Vouchers Management Features (ADMIN)
- View all voucher batches with filtering
- View voucher batch details
- Update voucher batch (remaining vouchers, expired status)
- Delete/restore voucher batches (soft delete)
- Get voucher statistics
- Update expired vouchers (cron job)
- View vouchers by subscription

### Customer Management Features (ADMIN)
- Create test customers (for development/testing)

---

## User Flows

### Registration Flow
1. Admin navigates to registration page
2. Admin enters: name, username, password, email (optional), phone (optional), role (optional, defaults to KITCHEN_STAFF)
3. System validates input and checks for duplicate username/email
4. System creates admin account with hashed password
5. Admin receives success confirmation with admin details

### Login Flow
1. Admin navigates to login page
2. Admin enters username and password
3. System validates credentials
4. System generates JWT token (7-day expiration)
5. System returns token and admin details
6. Frontend stores token for subsequent authenticated requests

### Dashboard Access Flow
1. Admin logs in and is redirected to dashboard
2. System loads overall statistics (requires JWT token in Authorization header)
3. Dashboard displays real-time metrics for current day
4. Admin can navigate to detailed analytics pages

### Kitchen Operations Flow
1. Kitchen staff logs in and navigates to kitchen dashboard
2. System displays today's pending orders
3. Kitchen staff can:
   - Accept individual orders or bulk accept
   - Reject orders with reason
   - Update preparation status as orders are cooked
   - Mark orders ready when complete
4. Orders automatically create delivery records when accepted

### Order Management Flow
1. Admin navigates to order management page
2. Admin can filter orders by customer, date, meal type, status
3. Admin can view order details, update status, assign drivers
4. Admin can process refund requests (approve/reject)
5. Admin can cancel orders with optional bypass of time restrictions

### Menu Management Flow
1. Admin navigates to menu items page
2. Admin can create new menu items with media upload
3. Admin can toggle live status to control visibility
4. Admin can bulk update multiple items
5. Admin manages addons linked to menu items

### Delivery Management Flow
1. Admin/Delivery Manager views active and pending deliveries
2. Admin assigns available drivers to orders
3. Drivers update delivery status (picked up, out for delivery, delivered)
4. System tracks delivery statistics and driver performance

### Subscription Management Flow
1. Admin views all customer subscriptions
2. Admin can manually update subscription status
3. System automatically expires subscriptions past expiry date
4. Admin can view voucher batches and usage statistics

---

## Lifecycle States

### Admin Account Lifecycle
- **Created**: New admin registered (isDeleted: false)
- **Active**: Admin can login and access system
- **Deleted**: Admin marked as deleted (isDeleted: true, cannot login)

### Authentication Lifecycle
- **Unauthenticated**: No token present
- **Authenticated**: Valid JWT token in Authorization header as Bearer token
- **Expired**: Token expired after 7 days, requires re-login

### Order Lifecycle
- **Placed**: Initial state when customer places order (orderStatus.placedAt)
- **Accepted**: Kitchen accepts order (orderStatus.acceptedAt) - Auto-creates delivery record
- **Preparing**: Kitchen is preparing food (orderStatus.preparingAt)
- **Out for Delivery**: Food ready, out for delivery (orderStatus.outForDeliveryAt)
- **Delivered**: Successfully delivered (orderStatus.deliveredAt)
- **Cancelled**: Customer or admin cancelled (orderStatus.cancelledAt)
- **Failed**: Kitchen rejected or delivery failed (orderStatus.failedAt)

### Menu Item/Addon Lifecycle
- **Created**: New item created (isDeleted: false)
- **Live**: Visible to customers (isLive: true)
- **Inactive**: Hidden from customers (isLive: false)
- **Deleted**: Soft deleted (isDeleted: true, deletedAt set)
- **Restored**: Soft delete reversed (isDeleted: false, deletedAt: null)

### Subscription Lifecycle
- **Active**: Valid subscription with available vouchers (ACTIVE)
- **Expired**: Past expiry date (EXPIRED)
- **Exhausted**: All vouchers used (EXHAUSTED)
- **Cancelled**: Customer cancelled (CANCELLED)

### Delivery Lifecycle
- **Pending**: Delivery created, not picked up (status.pickedUpAt: null)
- **Picked Up**: Driver picked up order (status.pickedUpAt)
- **Out for Delivery**: Driver on the way (status.outForDeliveryAt)
- **Delivered**: Successfully delivered (status.deliveredAt)
- **Failed**: Delivery failed (status.failedToDeliverAt)

---

## Media Upload Handling

When a form requires storing media links:

1. Use the Cloudinary endpoints to upload media first:
   - Single file: `POST /api/cloudinary/upload/single`
   - Multiple files: `POST /api/cloudinary/upload/multiple`

2. Extract the `url` from the upload response

3. Use the returned URL in the document creation/update request

**Example Flow:**
```
Step 1: Upload media
POST /api/cloudinary/upload/single
FormData: { file: [file object], folder: "menu-items" }

Step 2: Get public URL from response
Response: { data: { url: "https://cloudinary.com/..." } }

Step 3: Use URL in document creation
POST /api/menu-items
Body: { name: "...", media: ["https://cloudinary.com/..."], ... }
```

---

## API Endpoints and Response Structures

### Admin Authentication

#### 1. Admin Registration
**Endpoint:** `POST /api/auth/admin/register`

**Authentication:** None

**Request Body:**
```json
{
  "name": "string (required)",
  "username": "string (required)",
  "password": "string (required)",
  "email": "string (optional)",
  "phone": "string (optional)",
  "role": "string (optional: ADMIN or KITCHEN_STAFF)"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Admin registered successfully",
  "data": {
    "admin": {
      "id": "string",
      "name": "string",
      "username": "string",
      "email": "string",
      "phone": "string",
      "role": "string",
      "createdAt": "ISO date string"
    }
  }
}
```

**Error Responses:**

*Missing required fields (400):*
```json
{
  "success": false,
  "message": "Name, username, and password are required fields",
  "data": null
}
```

*Invalid role (400):*
```json
{
  "success": false,
  "message": "Invalid role. Must be either ADMIN or KITCHEN_STAFF",
  "data": null
}
```

*Username exists (409):*
```json
{
  "success": false,
  "message": "Username already exists. Please choose a different username",
  "data": null
}
```

*Email exists (409):*
```json
{
  "success": false,
  "message": "Email already registered. Please use a different email",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to register admin. Please try again",
  "data": null
}
```

---

#### 2. Admin Login
**Endpoint:** `POST /api/auth/admin/login`

**Authentication:** None

**Request Body:**
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "JWT token string",
    "admin": {
      "id": "string",
      "name": "string",
      "username": "string",
      "email": "string",
      "phone": "string",
      "role": "string"
    }
  }
}
```

**Error Responses:**

*Missing credentials (400):*
```json
{
  "success": false,
  "message": "Username and password are required",
  "data": null
}
```

*Invalid credentials (401):*
```json
{
  "success": false,
  "message": "Invalid username or password",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to login. Please try again",
  "data": null
}
```

---

### Dashboard Analytics

#### 3. Overall Dashboard Statistics
**Endpoint:** `GET /api/admin/dashboard/stats`

**Authentication:** Required (JWT - ADMIN role)

**Request:** No body required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Dashboard stats retrieved successfully",
  "data": {
    "totalCustomers": "number",
    "activeSubscriptions": "number",
    "todayOrders": "number",
    "activeDrivers": "number",
    "todayRevenue": "number",
    "orderStatusBreakdown": {
      "placed": "number",
      "accepted": "number",
      "preparing": "number",
      "outForDelivery": "number",
      "delivered": "number",
      "cancelled": "number",
      "failed": "number"
    }
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch dashboard stats. Please try again",
  "data": null
}
```

---

#### 4. Order Analytics
**Endpoint:** `GET /api/admin/dashboard/orders`

**Authentication:** Required (JWT - ADMIN role)

**Query Parameters:**
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)
- *Default: Last 30 days if no dates provided*

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order analytics retrieved successfully",
  "data": {
    "analytics": [
      {
        "_id": {
          "date": "YYYY-MM-DD"
        },
        "totalOrders": "number",
        "totalRevenue": "number",
        "lunchOrders": "number",
        "dinnerOrders": "number",
        "withSubscription": "number",
        "withoutSubscription": "number",
        "delivered": "number",
        "cancelled": "number"
      }
    ],
    "dateRange": {
      "$gte": "ISO date string",
      "$lte": "ISO date string"
    }
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch order analytics. Please try again",
  "data": null
}
```

---

#### 5. Revenue Report
**Endpoint:** `GET /api/admin/dashboard/revenue`

**Authentication:** Required (JWT - ADMIN role)

**Query Parameters:**
- `period`: "day" | "week" | "month" | "year" (optional, default: "month")

**Success Response (200):**
```json
{
  "success": true,
  "message": "Revenue report retrieved successfully",
  "data": {
    "period": "string",
    "revenue": [
      {
        "_id": "string or object (based on period)",
        "totalRevenue": "number",
        "orderCount": "number",
        "avgOrderValue": "number"
      }
    ],
    "summary": {
      "totalRevenue": "number",
      "totalOrders": "number",
      "averageOrderValue": "number"
    }
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch revenue report. Please try again",
  "data": null
}
```

---

### Kitchen Operations

#### 6. Kitchen Dashboard
**Endpoint:** `GET /api/orders/kitchen/dashboard`

**Authentication:** Required (JWT - KITCHEN_STAFF or ADMIN role)

**Request:** No body required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Kitchen dashboard data retrieved",
  "data": {
    "stats": {
      "totalOrders": "number",
      "placed": "number",
      "accepted": "number",
      "preparing": "number",
      "ready": "number"
    },
    "pendingOrders": [
      {
        "_id": "string",
        "customerId": {
          "name": "string",
          "phone": "string",
          "address": "object"
        },
        "menuItem": {
          "menuItemId": "object (menu item details)",
          "orderPlacedPrice": "number"
        },
        "addons": ["array of addon objects"],
        "mealType": "LUNCH or DINNER",
        "scheduledForDate": "ISO date string",
        "totalAmount": "number",
        "specialInstructions": "string",
        "packagingType": "STEEL_DABBA or DISPOSABLE",
        "orderStatus": "object (status timestamps)"
      }
    ],
    "preparingOrders": ["array of order objects"]
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch kitchen dashboard. Please try again",
  "data": null
}
```

---

#### 7. Accept Order
**Endpoint:** `POST /api/orders/:orderId/accept`

**Authentication:** Required (JWT - KITCHEN_STAFF or ADMIN role)

**Path Parameters:**
- `orderId`: Order ID (required)

**Request:** No body required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order accepted successfully",
  "data": {
    "_id": "string",
    "orderStatus": {
      "placedAt": "ISO date string",
      "acceptedAt": "ISO date string"
    },
    "customerId": "object (customer details)",
    "menuItem": "object (menu item details)",
    "addons": ["array"],
    "mealType": "string",
    "scheduledForDate": "ISO date string",
    "totalAmount": "number"
  }
}
```

**Error Responses:**

*Invalid order ID (400):*
```json
{
  "success": false,
  "message": "Invalid order ID format",
  "data": null
}
```

*Order not found (404):*
```json
{
  "success": false,
  "message": "Order not found",
  "data": null
}
```

*Order already accepted (400):*
```json
{
  "success": false,
  "message": "Order is already accepted",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to accept order. Please try again",
  "data": null
}
```

---

#### 8. Reject Order
**Endpoint:** `POST /api/orders/:orderId/reject`

**Authentication:** Required (JWT - KITCHEN_STAFF or ADMIN role)

**Path Parameters:**
- `orderId`: Order ID (required)

**Request Body:**
```json
{
  "reason": "string (optional)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order rejected successfully",
  "data": {
    "_id": "string",
    "orderStatus": {
      "placedAt": "ISO date string",
      "failedAt": "ISO date string"
    },
    "specialInstructions": "string (includes rejection reason)"
  }
}
```

**Error Responses:**

*Invalid order ID (400):*
```json
{
  "success": false,
  "message": "Invalid order ID format",
  "data": null
}
```

*Order not found (404):*
```json
{
  "success": false,
  "message": "Order not found",
  "data": null
}
```

*Order already cancelled/failed (400):*
```json
{
  "success": false,
  "message": "Order is already cancelled/marked as failed",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to reject order. Please try again",
  "data": null
}
```

---

#### 9. Bulk Accept Orders
**Endpoint:** `POST /api/orders/bulk-accept`

**Authentication:** Required (JWT - KITCHEN_STAFF or ADMIN role)

**Request Body:**
```json
{
  "orderIds": ["array of order IDs (required)"]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "N orders accepted",
  "data": {
    "modifiedCount": "number",
    "requestedCount": "number"
  }
}
```

**Error Responses:**

*Missing order IDs (400):*
```json
{
  "success": false,
  "message": "orderIds array is required",
  "data": null
}
```

*Invalid order ID format (400):*
```json
{
  "success": false,
  "message": "Invalid order ID format: <id>",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Bulk accept failed. Please try again",
  "data": null
}
```

---

#### 10. Update Preparation Status
**Endpoint:** `PATCH /api/orders/:orderId/preparation-status`

**Authentication:** Required (JWT - KITCHEN_STAFF or ADMIN role)

**Path Parameters:**
- `orderId`: Order ID (required)

**Request Body:**
```json
{
  "preparationStatus": "string (required: started, in-progress, or almost-ready)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Preparation status updated successfully",
  "data": {
    "_id": "string",
    "orderStatus": {
      "preparingAt": "ISO date string"
    },
    "specialInstructions": "string (includes preparation status)"
  }
}
```

**Error Responses:**

*Missing status (400):*
```json
{
  "success": false,
  "message": "Preparation status is required",
  "data": null
}
```

*Invalid status (400):*
```json
{
  "success": false,
  "message": "Invalid preparation status",
  "data": {
    "validStatuses": ["started", "in-progress", "almost-ready"]
  }
}
```

*Order not accepted (400):*
```json
{
  "success": false,
  "message": "Order must be accepted before updating preparation status",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to update preparation status. Please try again",
  "data": null
}
```

---

#### 11. Mark Ready for Delivery
**Endpoint:** `POST /api/orders/:orderId/ready`

**Authentication:** Required (JWT - KITCHEN_STAFF or ADMIN role)

**Path Parameters:**
- `orderId`: Order ID (required)

**Request:** No body required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order marked ready for delivery",
  "data": {
    "_id": "string",
    "orderStatus": {
      "preparingAt": "ISO date string",
      "outForDeliveryAt": "ISO date string"
    }
  }
}
```

**Error Responses:**

*Order not preparing (400):*
```json
{
  "success": false,
  "message": "Order must be in preparing status first",
  "data": null
}
```

*Already ready (400):*
```json
{
  "success": false,
  "message": "Order is already marked as ready/out for delivery",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to mark order ready. Please try again",
  "data": null
}
```

---

### Order Management (Admin)

#### 12. Get All Orders
**Endpoint:** `GET /api/orders/all`

**Authentication:** Required (JWT - ADMIN role)

**Query Parameters:**
- `customerId`: Filter by customer ID (optional)
- `mealType`: Filter by meal type - LUNCH or DINNER (optional)
- `scheduledForDate`: Filter by date (optional)
- `status`: Filter by status - active, placed, accepted, preparing, delivered, cancelled, failed (optional)
- `includeDeleted`: "true" or "false" (optional, default: "false")
- `sortBy`: Field to sort by (optional, default: "scheduledForDate")
- `sortOrder`: "asc" or "desc" (optional, default: "desc")
- `page`: Page number (optional, default: 1)
- `limit`: Items per page (optional, default: 20)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": {
    "orders": [
      {
        "_id": "string",
        "customerId": "object (customer details)",
        "menuItem": "object (menu item details)",
        "addons": ["array"],
        "subscriptionUsed": "object or null",
        "mealType": "string",
        "scheduledForDate": "ISO date string",
        "totalAmount": "number",
        "vouchersConsumed": "number",
        "specialInstructions": "string",
        "packagingType": "string",
        "orderStatus": "object (status timestamps)",
        "currentStatus": "string (computed current status)",
        "isDeleted": "boolean",
        "createdAt": "ISO date string"
      }
    ],
    "pagination": {
      "currentPage": "number",
      "totalPages": "number",
      "totalCount": "number",
      "limit": "number"
    }
  }
}
```

**Error Responses:**

*Invalid customer ID (400):*
```json
{
  "success": false,
  "message": "Invalid customer ID format",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to fetch orders. Please try again",
  "data": null
}
```

---

#### 13. Get Order by ID (Admin)
**Endpoint:** `GET /api/orders/admin/:id`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Order ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "_id": "string",
    "customerId": "object (full customer details including dietary preferences)",
    "menuItem": "object (menu item details)",
    "addons": ["array"],
    "subscriptionUsed": "object or null",
    "mealType": "string",
    "scheduledForDate": "ISO date string",
    "totalAmount": "number",
    "currentStatus": "string",
    "orderStatus": "object (all status timestamps)"
  }
}
```

**Error Responses:**

*Invalid order ID (400):*
```json
{
  "success": false,
  "message": "Invalid order ID format",
  "data": null
}
```

*Order not found (404):*
```json
{
  "success": false,
  "message": "Order not found",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to fetch order. Please try again",
  "data": null
}
```

---

#### 14. Update Order Status (Admin)
**Endpoint:** `PATCH /api/orders/:id/status`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Order ID (required)

**Request Body:**
```json
{
  "status": "string (required: accepted, preparing, outForDelivery, delivered, or failed)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order status updated to <status>",
  "data": {
    "_id": "string",
    "orderStatus": "object (updated status timestamps)",
    "currentStatus": "string"
  }
}
```

**Error Responses:**

*Missing status (400):*
```json
{
  "success": false,
  "message": "Status is required",
  "data": null
}
```

*Invalid status (400):*
```json
{
  "success": false,
  "message": "Invalid status",
  "data": {
    "validStatuses": ["accepted", "preparing", "outForDelivery", "delivered", "failed"]
  }
}
```

*Invalid progression (400):*
```json
{
  "success": false,
  "message": "Order must be accepted first / Order is already <status>",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to update order status. Please try again",
  "data": null
}
```

---

#### 15. Update Order Details (Admin)
**Endpoint:** `PUT /api/orders/:id`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Order ID (required)

**Request Body:**
```json
{
  "specialInstructions": "string (optional)",
  "packagingType": "string (optional: STEEL_DABBA or DISPOSABLE)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order updated successfully",
  "data": {
    "_id": "string",
    "specialInstructions": "string",
    "packagingType": "string"
  }
}
```

**Error Responses:**

*Invalid packaging type (400):*
```json
{
  "success": false,
  "message": "Invalid packaging type. Must be STEEL_DABBA or DISPOSABLE",
  "data": null
}
```

*Cannot update (400):*
```json
{
  "success": false,
  "message": "Cannot update delivered/cancelled/failed order",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to update order. Please try again",
  "data": null
}
```

---

#### 16. Admin Cancel Order
**Endpoint:** `PATCH /api/orders/:id/admin-cancel`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Order ID (required)

**Request Body:**
```json
{
  "bypassTimeRestrictions": "boolean (optional, default: false)",
  "reason": "string (optional)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order cancelled successfully by admin",
  "data": {
    "_id": "string",
    "orderStatus": {
      "cancelledAt": "ISO date string"
    },
    "specialInstructions": "string (includes cancellation reason)"
  }
}
```

**Error Responses:**

*Order already cancelled (400):*
```json
{
  "success": false,
  "message": "Order is already cancelled",
  "data": null
}
```

*Time restriction (400):*
```json
{
  "success": false,
  "message": "Cannot cancel order within X hours of scheduled time (Set bypassTimeRestrictions=true to override)",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to cancel order. Please try again",
  "data": null
}
```

---

#### 17. Delete Order (Soft Delete)
**Endpoint:** `DELETE /api/orders/:id`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Order ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order deleted successfully",
  "data": {
    "id": "string",
    "deletedAt": "ISO date string"
  }
}
```

**Error Responses:**

*Order not found (404):*
```json
{
  "success": false,
  "message": "Order not found or already deleted",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to delete order. Please try again",
  "data": null
}
```

---

#### 18. Restore Deleted Order
**Endpoint:** `PATCH /api/orders/:id/restore`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Order ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order restored successfully",
  "data": {
    "_id": "string",
    "isDeleted": false,
    "deletedAt": null
  }
}
```

**Error Responses:**

*Deleted order not found (404):*
```json
{
  "success": false,
  "message": "Deleted order not found",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to restore order. Please try again",
  "data": null
}
```

---

#### 19. Get Orders by Date Range
**Endpoint:** `GET /api/orders/date-range`

**Authentication:** Required (JWT - ADMIN role)

**Query Parameters:**
- `startDate`: ISO date string (required)
- `endDate`: ISO date string (required)
- `mealType`: LUNCH or DINNER (optional)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Found N orders in date range",
  "data": {
    "orders": ["array of order objects"],
    "dateRange": {
      "startDate": "ISO date string",
      "endDate": "ISO date string"
    }
  }
}
```

**Error Responses:**

*Missing dates (400):*
```json
{
  "success": false,
  "message": "Start date and end date are required",
  "data": null
}
```

*Invalid date range (400):*
```json
{
  "success": false,
  "message": "Start date must be before end date",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to fetch orders by date range. Please try again",
  "data": null
}
```

---

#### 20. Get Order Statistics
**Endpoint:** `GET /api/orders/stats`

**Authentication:** Required (JWT - ADMIN role)

**Request:** No parameters required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order statistics retrieved successfully",
  "data": {
    "totalOrders": "number",
    "ordersByStatus": {
      "active": "number",
      "delivered": "number",
      "cancelled": "number",
      "failed": "number"
    },
    "ordersByMealType": [
      {
        "_id": "LUNCH or DINNER",
        "count": "number",
        "totalRevenue": "number"
      }
    ],
    "revenue": {
      "total": "number",
      "average": "number"
    },
    "todaysOrders": "number"
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch order statistics. Please try again",
  "data": null
}
```

---

#### 21. Get Upcoming Orders
**Endpoint:** `GET /api/orders/upcoming`

**Authentication:** Required (JWT - ADMIN role)

**Query Parameters:**
- `days`: Number of days to look ahead (optional, default: 1)
- `mealType`: LUNCH or DINNER (optional)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Found N upcoming orders",
  "data": ["array of order objects"]
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch upcoming orders. Please try again",
  "data": null
}
```

---

#### 22. Assign Driver Manually
**Endpoint:** `POST /api/orders/:orderId/assign-driver`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `orderId`: Order ID (required)

**Request Body:**
```json
{
  "driverId": "string (required)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Driver assigned successfully",
  "data": {
    "_id": "string",
    "driverId": "object (driver details)"
  }
}
```

**Error Responses:**

*Missing driver ID (400):*
```json
{
  "success": false,
  "message": "Invalid driver ID format",
  "data": null
}
```

*Driver not found (404):*
```json
{
  "success": false,
  "message": "Driver not found or inactive",
  "data": null
}
```

*Driver unavailable (400):*
```json
{
  "success": false,
  "message": "Driver is currently unavailable or on another delivery",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Driver assignment failed. Please try again",
  "data": null
}
```

---

#### 23. Auto-Assign Driver
**Endpoint:** `POST /api/orders/:orderId/auto-assign-driver`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `orderId`: Order ID (required)

**Request:** No body required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Driver auto-assigned successfully",
  "data": {
    "order": "object (order details)",
    "driver": {
      "id": "string",
      "name": "string",
      "phone": "string",
      "vehicleNumber": "string"
    }
  }
}
```

**Error Responses:**

*Order already has driver (400):*
```json
{
  "success": false,
  "message": "Order already has a driver assigned",
  "data": null
}
```

*No available drivers (404):*
```json
{
  "success": false,
  "message": "No available drivers found at this time",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Auto-assignment failed. Please try again",
  "data": null
}
```

---

### Refund Management (Admin)

#### 24. Get Refund Requests
**Endpoint:** `GET /api/orders/refunds`

**Authentication:** Required (JWT - ADMIN role)

**Query Parameters:**
- `status`: "pending", "processed", or "rejected" (optional, default: "pending")

**Success Response (200):**
```json
{
  "success": true,
  "message": "Refund requests with status 'X' retrieved successfully",
  "data": {
    "count": "number",
    "refunds": [
      {
        "_id": "string",
        "customerId": "object (customer details)",
        "menuItem": "object",
        "refundStatus": "string",
        "refundAmount": "number",
        "refundReason": "string",
        "refundRequestedAt": "ISO date string",
        "refundProcessedAt": "ISO date string or null",
        "refundProcessedBy": "object or null"
      }
    ]
  }
}
```

**Error Responses:**

*Invalid status (400):*
```json
{
  "success": false,
  "message": "Invalid status. Valid values: none, pending, processed, rejected",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to fetch refund requests. Please try again",
  "data": null
}
```

---

#### 25. Process Refund
**Endpoint:** `POST /api/orders/:orderId/refund/process`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `orderId`: Order ID (required)

**Request Body:**
```json
{
  "action": "string (required: approve or reject)",
  "adminNotes": "string (optional)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Refund approved and processed successfully / Refund rejected",
  "data": {
    "_id": "string",
    "refundStatus": "processed or rejected",
    "refundProcessedAt": "ISO date string",
    "refundProcessedBy": "object (admin details)",
    "adminNotes": "string"
  }
}
```

**Error Responses:**

*Invalid action (400):*
```json
{
  "success": false,
  "message": "Invalid action. Use 'approve' or 'reject'",
  "data": null
}
```

*No pending refund (400):*
```json
{
  "success": false,
  "message": "No pending refund for this order. Current status: <status>",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Refund processing failed. Please try again",
  "data": null
}
```

---

### Menu Items Management (Admin)

#### 26. Create Menu Item
**Endpoint:** `POST /api/menu-items`

**Authentication:** Required (JWT - ADMIN role)

**Request Body:**
```json
{
  "name": "string (required)",
  "content": "string (required)",
  "description": "string (optional)",
  "media": ["array of URLs (optional)"],
  "mealType": "string (required: LUNCH, DINNER, OTHER, or BOTH)",
  "price": "number (required)",
  "compareAtPrice": "number (optional)",
  "isLive": "boolean (optional, default: false)"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Menu item created successfully",
  "data": {
    "_id": "string",
    "name": "string",
    "content": "string",
    "description": "string",
    "media": ["array"],
    "mealType": "string",
    "price": "number",
    "compareAtPrice": "number or null",
    "isLive": "boolean",
    "isDeleted": false,
    "createdAt": "ISO date string"
  }
}
```

**Error Responses:**

*Missing required fields (400):*
```json
{
  "success": false,
  "message": "Missing required fields: name, content, mealType, and price are required",
  "data": null
}
```

*Invalid meal type (400):*
```json
{
  "success": false,
  "message": "Invalid mealType. Must be LUNCH, DINNER, OTHER, or BOTH",
  "data": null
}
```

*Invalid price (400):*
```json
{
  "success": false,
  "message": "Price must be a non-negative number",
  "data": null
}
```

*Invalid compareAtPrice (400):*
```json
{
  "success": false,
  "message": "Compare at price must be greater than price",
  "data": null
}
```

*Validation error (400):*
```json
{
  "success": false,
  "message": "Validation error",
  "data": {
    "errors": ["array of error messages"]
  }
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to create menu item. Please try again",
  "data": null
}
```

---

#### 27. Get All Menu Items
**Endpoint:** `GET /api/menu-items`

**Authentication:** None (Public) - Admin can see deleted items with `includeDeleted=true`

**Query Parameters:**
- `mealType`: LUNCH, DINNER, OTHER, or BOTH (optional)
- `isLive`: "true" or "false" (optional)
- `includeDeleted`: "true" or "false" (optional, admin only, default: "false")
- `minPrice`: Minimum price (optional)
- `maxPrice`: Maximum price (optional)
- `search`: Text search in name, content, description (optional)
- `page`: Page number (optional, default: 1)
- `limit`: Items per page (optional, default: 20, max: 100)
- `sortBy`: Sort field (optional, default: "createdAt")
- `sortOrder`: "asc" or "desc" (optional, default: "desc")

**Success Response (200):**
```json
{
  "success": true,
  "message": "Menu items retrieved successfully",
  "data": {
    "menuItems": ["array of menu item objects"],
    "pagination": {
      "currentPage": "number",
      "totalPages": "number",
      "totalItems": "number",
      "itemsPerPage": "number",
      "hasNextPage": "boolean",
      "hasPrevPage": "boolean"
    }
  }
}
```

**Error Responses:**

*Invalid parameters (400):*
```json
{
  "success": false,
  "message": "Invalid mealType / Invalid page number / Invalid limit",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to retrieve menu items. Please try again",
  "data": null
}
```

---

#### 28. Get Menu Item by ID
**Endpoint:** `GET /api/menu-items/:id`

**Authentication:** None (Public) - Admin can see deleted items

**Path Parameters:**
- `id`: Menu item ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Menu item retrieved successfully",
  "data": {
    "_id": "string",
    "name": "string",
    "content": "string",
    "description": "string",
    "media": ["array"],
    "mealType": "string",
    "price": "number",
    "compareAtPrice": "number or null",
    "isLive": "boolean"
  }
}
```

**Error Responses:**

*Invalid ID (400):*
```json
{
  "success": false,
  "message": "Invalid menu item ID format",
  "data": null
}
```

*Not found (404):*
```json
{
  "success": false,
  "message": "Menu item not found",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to retrieve menu item. Please try again",
  "data": null
}
```

---

#### 29. Update Menu Item
**Endpoint:** `PUT /api/menu-items/:id`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Menu item ID (required)

**Request Body:**
```json
{
  "name": "string (optional)",
  "content": "string (optional)",
  "description": "string (optional)",
  "media": ["array of URLs (optional)"],
  "mealType": "string (optional)",
  "price": "number (optional)",
  "compareAtPrice": "number (optional)",
  "isLive": "boolean (optional)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Menu item updated successfully",
  "data": {
    "_id": "string",
    "name": "string",
    "content": "string",
    "price": "number",
    "isLive": "boolean"
  }
}
```

**Error Responses:**

*Not found (404):*
```json
{
  "success": false,
  "message": "Menu item not found or has been deleted",
  "data": null
}
```

*Validation error (400):*
```json
{
  "success": false,
  "message": "Invalid mealType / Price must be non-negative / Compare at price must be greater than price",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to update menu item. Please try again",
  "data": null
}
```

---

#### 30. Delete Menu Item (Soft Delete)
**Endpoint:** `DELETE /api/menu-items/:id`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Menu item ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Menu item deleted successfully",
  "data": {
    "id": "string",
    "deletedAt": "ISO date string"
  }
}
```

**Error Responses:**

*Not found (404):*
```json
{
  "success": false,
  "message": "Menu item not found or already deleted",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to delete menu item. Please try again",
  "data": null
}
```

---

#### 31. Restore Menu Item
**Endpoint:** `POST /api/menu-items/:id/restore`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Menu item ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Menu item restored successfully",
  "data": {
    "_id": "string",
    "name": "string",
    "isDeleted": false
  }
}
```

**Error Responses:**

*Not found (404):*
```json
{
  "success": false,
  "message": "Deleted menu item not found",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to restore menu item. Please try again",
  "data": null
}
```

---

#### 32. Toggle Menu Item Live Status
**Endpoint:** `PATCH /api/menu-items/:id/toggle-live`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Menu item ID (required)

**Request:** No body required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Menu item activated/deactivated successfully",
  "data": {
    "_id": "string",
    "name": "string",
    "isLive": "boolean"
  }
}
```

**Error Responses:**

*Not found (404):*
```json
{
  "success": false,
  "message": "Menu item not found or has been deleted",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to update menu item status. Please try again",
  "data": null
}
```

---

#### 33. Bulk Update Menu Items
**Endpoint:** `PATCH /api/menu-items/bulk-update`

**Authentication:** Required (JWT - ADMIN role)

**Request Body:**
```json
{
  "ids": ["array of menu item IDs (required)"],
  "updates": {
    "isLive": "boolean (optional)",
    "mealType": "string (optional)",
    "price": "number (optional)"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Bulk update completed successfully",
  "data": {
    "matchedCount": "number",
    "modifiedCount": "number",
    "requestedCount": "number"
  }
}
```

**Error Responses:**

*Invalid input (400):*
```json
{
  "success": false,
  "message": "ids must be a non-empty array / updates object is required / Invalid menu item ID format",
  "data": null
}
```

*Validation error (400):*
```json
{
  "success": false,
  "message": "Validation error",
  "data": {
    "errors": ["array of error messages"]
  }
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to bulk update menu items. Please try again",
  "data": null
}
```

---

#### 34. Get Menu Item Statistics
**Endpoint:** `GET /api/menu-items/stats`

**Authentication:** Required (JWT - ADMIN role)

**Request:** No parameters required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Menu item statistics retrieved successfully",
  "data": {
    "total": "number",
    "live": "number",
    "deleted": "number",
    "byMealType": [
      {
        "_id": "LUNCH or DINNER or OTHER or BOTH",
        "count": "number",
        "avgPrice": "number"
      }
    ],
    "priceStats": {
      "minPrice": "number",
      "maxPrice": "number",
      "avgPrice": "number"
    }
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to retrieve statistics. Please try again",
  "data": null
}
```

---

### Addons Management (Admin)

#### 35. Create Addon
**Endpoint:** `POST /api/addons`

**Authentication:** Required (JWT - ADMIN role)

**Request Body:**
```json
{
  "name": "string (required)",
  "menuItemId": "string (required)",
  "contents": "string (optional)",
  "description": "string (optional)",
  "price": "number (required)",
  "tags": ["array of strings (optional)"],
  "category": "string (optional: BEVERAGE, SWEETS, CONDIMENT, ICE_CREAM, LAVA_CAKE, DESSERT, SNACK, SIDE_DISH, OTHER)",
  "imageUrl": "string (optional)",
  "isLive": "boolean (optional, default: false)"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Addon created successfully",
  "data": {
    "_id": "string",
    "name": "string",
    "menuItemId": "object (menu item details)",
    "contents": "string",
    "description": "string",
    "price": "number",
    "tags": ["array"],
    "category": "string",
    "imageUrl": "string",
    "isLive": "boolean",
    "createdAt": "ISO date string"
  }
}
```

**Error Responses:**

*Missing required fields (400):*
```json
{
  "success": false,
  "message": "Missing required fields: name, menuItemId, and price are required",
  "data": null
}
```

*Invalid menuItemId (400):*
```json
{
  "success": false,
  "message": "Invalid menuItemId format",
  "data": null
}
```

*Menu item not found (404):*
```json
{
  "success": false,
  "message": "Menu item not found or has been deleted",
  "data": null
}
```

*Invalid category (400):*
```json
{
  "success": false,
  "message": "Invalid category. Must be one of: BEVERAGE, SWEETS, CONDIMENT, ICE_CREAM, LAVA_CAKE, DESSERT, SNACK, SIDE_DISH, OTHER",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to create addon. Please try again",
  "data": null
}
```

---

#### 36. Get All Addons
**Endpoint:** `GET /api/addons`

**Authentication:** None (Public) - Admin can see deleted items

**Query Parameters:**
- `menuItemId`: Filter by menu item ID (optional)
- `category`: Filter by category (optional)
- `isLive`: "true" or "false" (optional)
- `includeDeleted`: "true" or "false" (optional, admin only, default: "false")
- `minPrice`: Minimum price (optional)
- `maxPrice`: Maximum price (optional)
- `search`: Text search in name and description (optional)
- `tags`: Comma-separated tags (optional)
- `page`: Page number (optional, default: 1)
- `limit`: Items per page (optional, default: 20, max: 100)
- `sortBy`: Sort field (optional, default: "createdAt")
- `sortOrder`: "asc" or "desc" (optional, default: "desc")
- `populate`: "true" or "false" - Populate menu item details (optional, default: "false")

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addons retrieved successfully",
  "data": {
    "addons": ["array of addon objects"],
    "pagination": {
      "currentPage": "number",
      "totalPages": "number",
      "totalItems": "number",
      "itemsPerPage": "number",
      "hasNextPage": "boolean",
      "hasPrevPage": "boolean"
    }
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to retrieve addons. Please try again",
  "data": null
}
```

---

#### 37. Get Addons by Menu Item
**Endpoint:** `GET /api/addons/menu-item/:menuItemId`

**Authentication:** None (Public)

**Path Parameters:**
- `menuItemId`: Menu item ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addons retrieved successfully",
  "data": {
    "menuItem": {
      "id": "string",
      "name": "string",
      "mealType": "string"
    },
    "addons": ["array of addon objects"],
    "count": "number"
  }
}
```

**Error Responses:**

*Invalid ID (400):*
```json
{
  "success": false,
  "message": "Invalid menu item ID format",
  "data": null
}
```

*Menu item not found (404):*
```json
{
  "success": false,
  "message": "Menu item not found",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to retrieve addons. Please try again",
  "data": null
}
```

---

#### 38. Get Addon by ID
**Endpoint:** `GET /api/addons/:id`

**Authentication:** None (Public)

**Path Parameters:**
- `id`: Addon ID (required)

**Query Parameters:**
- `populate`: "true" or "false" - Populate menu item details (optional, default: "false")

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addon retrieved successfully",
  "data": {
    "_id": "string",
    "name": "string",
    "menuItemId": "object or string (depends on populate)",
    "price": "number",
    "category": "string",
    "isLive": "boolean"
  }
}
```

**Error Responses:**

*Invalid ID (400):*
```json
{
  "success": false,
  "message": "Invalid addon ID format",
  "data": null
}
```

*Not found (404):*
```json
{
  "success": false,
  "message": "Addon not found",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to retrieve addon. Please try again",
  "data": null
}
```

---

#### 39. Update Addon
**Endpoint:** `PUT /api/addons/:id`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Addon ID (required)

**Request Body:**
```json
{
  "name": "string (optional)",
  "menuItemId": "string (optional)",
  "contents": "string (optional)",
  "description": "string (optional)",
  "price": "number (optional)",
  "tags": ["array of strings (optional)"],
  "category": "string (optional)",
  "imageUrl": "string (optional)",
  "isLive": "boolean (optional)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addon updated successfully",
  "data": {
    "_id": "string",
    "name": "string",
    "menuItemId": "object (menu item details)",
    "price": "number",
    "isLive": "boolean"
  }
}
```

**Error Responses:**

*Not found (404):*
```json
{
  "success": false,
  "message": "Addon not found or has been deleted",
  "data": null
}
```

*Invalid menuItemId (404):*
```json
{
  "success": false,
  "message": "Menu item not found or has been deleted",
  "data": null
}
```

*Validation error (400):*
```json
{
  "success": false,
  "message": "Validation error",
  "data": {
    "errors": ["array of error messages"]
  }
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to update addon. Please try again",
  "data": null
}
```

---

#### 40. Delete Addon (Soft Delete)
**Endpoint:** `DELETE /api/addons/:id`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Addon ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addon deleted successfully",
  "data": {
    "id": "string",
    "deletedAt": "ISO date string"
  }
}
```

**Error Responses:**

*Not found (404):*
```json
{
  "success": false,
  "message": "Addon not found or already deleted",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to delete addon. Please try again",
  "data": null
}
```

---

#### 41. Restore Addon
**Endpoint:** `POST /api/addons/:id/restore`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Addon ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addon restored successfully",
  "data": {
    "_id": "string",
    "name": "string",
    "menuItemId": "object (menu item details)",
    "isDeleted": false
  }
}
```

**Error Responses:**

*Not found (404):*
```json
{
  "success": false,
  "message": "Deleted addon not found",
  "data": null
}
```

*Menu item deleted (400):*
```json
{
  "success": false,
  "message": "Cannot restore addon: the associated menu item no longer exists or has been deleted",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to restore addon. Please try again",
  "data": null
}
```

---

#### 42. Toggle Addon Live Status
**Endpoint:** `PATCH /api/addons/:id/toggle-live`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Addon ID (required)

**Request:** No body required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addon activated/deactivated successfully",
  "data": {
    "_id": "string",
    "name": "string",
    "isLive": "boolean",
    "menuItemId": "object (menu item details)"
  }
}
```

**Error Responses:**

*Not found (404):*
```json
{
  "success": false,
  "message": "Addon not found or has been deleted",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to update addon status. Please try again",
  "data": null
}
```

---

#### 43. Bulk Update Addons
**Endpoint:** `PATCH /api/addons/bulk-update`

**Authentication:** Required (JWT - ADMIN role)

**Request Body:**
```json
{
  "ids": ["array of addon IDs (required)"],
  "updates": {
    "isLive": "boolean (optional)",
    "category": "string (optional)",
    "price": "number (optional)"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Bulk update completed successfully",
  "data": {
    "matchedCount": "number",
    "modifiedCount": "number",
    "requestedCount": "number"
  }
}
```

**Error Responses:**

*Invalid input (400):*
```json
{
  "success": false,
  "message": "ids must be a non-empty array / updates object is required",
  "data": null
}
```

*Validation error (400):*
```json
{
  "success": false,
  "message": "Validation error",
  "data": {
    "errors": ["array of error messages"]
  }
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to bulk update addons. Please try again",
  "data": null
}
```

---

#### 44. Delete Addons by Menu Item
**Endpoint:** `DELETE /api/addons/menu-item/:menuItemId`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `menuItemId`: Menu item ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addons deleted successfully",
  "data": {
    "deletedCount": "number"
  }
}
```

**Error Responses:**

*Invalid ID (400):*
```json
{
  "success": false,
  "message": "Invalid menu item ID format",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to delete addons. Please try again",
  "data": null
}
```

---

#### 45. Get Addon Statistics
**Endpoint:** `GET /api/addons/stats`

**Authentication:** Required (JWT - ADMIN role)

**Request:** No parameters required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addon statistics retrieved successfully",
  "data": {
    "total": "number",
    "live": "number",
    "deleted": "number",
    "byCategory": [
      {
        "_id": "BEVERAGE or SWEETS or ...",
        "count": "number",
        "avgPrice": "number"
      }
    ],
    "topMenuItems": [
      {
        "_id": "menu item ID",
        "menuItem": "object (menu item details)",
        "count": "number",
        "avgPrice": "number",
        "totalPrice": "number"
      }
    ],
    "priceStats": {
      "minPrice": "number",
      "maxPrice": "number",
      "avgPrice": "number"
    }
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to retrieve statistics. Please try again",
  "data": null
}
```

---

### Delivery Management (Admin)

#### 46. Create Delivery
**Endpoint:** `POST /api/deliveries`

**Authentication:** Required (JWT - ADMIN role)

**Request Body:**
```json
{
  "orderId": "string (required)",
  "deliveryDriverId": "string (optional)",
  "fromLocation": {
    "address": "string (required)",
    "coordinates": {
      "latitude": "number (required)",
      "longitude": "number (required)"
    },
    "landmark": "string (optional)"
  },
  "toLocation": {
    "address": "string (required)",
    "coordinates": {
      "latitude": "number (required)",
      "longitude": "number (required)"
    },
    "landmark": "string (optional)"
  },
  "estimatedDeliveryTime": "ISO date string (optional)",
  "deliveryNotes": "string (optional)"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Delivery created successfully",
  "data": {
    "_id": "string",
    "orderId": "object (order details)",
    "customerId": "object (customer details)",
    "deliveryDriverId": "object or null (driver details)",
    "fromLocation": "object",
    "toLocation": "object",
    "estimatedDeliveryTime": "ISO date string or null",
    "deliveryNotes": "string",
    "status": "object (status timestamps)",
    "deliverySuccessStatus": {
      "status": "boolean or null",
      "message": "PENDING",
      "failedMessage": "string or null"
    },
    "createdAt": "ISO date string"
  }
}
```

**Error Responses:**

*Missing required fields (400):*
```json
{
  "success": false,
  "message": "Missing required fields",
  "data": {
    "required": ["orderId", "fromLocation", "toLocation"]
  }
}
```

*Invalid location data (400):*
```json
{
  "success": false,
  "message": "Invalid from/to location data",
  "data": {
    "required": ["address", "coordinates.latitude", "coordinates.longitude"]
  }
}
```

*Order not found (404):*
```json
{
  "success": false,
  "message": "Order not found",
  "data": null
}
```

*Delivery already exists (409):*
```json
{
  "success": false,
  "message": "Delivery already exists for this order",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to create delivery. Please try again",
  "data": null
}
```

---

#### 47. Get All Deliveries
**Endpoint:** `GET /api/deliveries/all`

**Authentication:** Required (JWT - ADMIN role)

**Query Parameters:**
- `customerId`: Filter by customer ID (optional)
- `deliveryDriverId`: Filter by driver ID (optional)
- `orderId`: Filter by order ID (optional)
- `status`: Filter by delivery status (optional)
- `includeDeleted`: "true" or "false" (optional, default: "false")
- `sortBy`: Sort field (optional, default: "createdAt")
- `sortOrder`: "asc" or "desc" (optional, default: "desc")
- `page`: Page number (optional, default: 1)
- `limit`: Items per page (optional, default: 20, max: 100)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Deliveries retrieved successfully",
  "data": {
    "deliveries": [
      {
        "_id": "string",
        "orderId": "object (order details)",
        "customerId": "object (customer details)",
        "deliveryDriverId": "object or null (driver details)",
        "fromLocation": "object",
        "toLocation": "object",
        "estimatedDeliveryTime": "ISO date string or null",
        "status": "object (status timestamps)",
        "deliverySuccessStatus": "object",
        "currentStatus": "string (computed current status)"
      }
    ],
    "pagination": {
      "currentPage": "number",
      "totalPages": "number",
      "totalCount": "number",
      "limit": "number"
    }
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch deliveries. Please try again",
  "data": null
}
```

---

#### 48. Get Delivery by ID
**Endpoint:** `GET /api/deliveries/:id`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Delivery ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Delivery retrieved successfully",
  "data": {
    "_id": "string",
    "orderId": "object (order details)",
    "customerId": "object (customer details including dietary preferences)",
    "deliveryDriverId": "object or null (driver details including vehicle)",
    "fromLocation": "object",
    "toLocation": "object",
    "estimatedDeliveryTime": "ISO date string or null",
    "status": "object (status timestamps)",
    "deliverySuccessStatus": "object",
    "currentStatus": "string"
  }
}
```

**Error Responses:**

*Invalid ID (400):*
```json
{
  "success": false,
  "message": "Invalid delivery ID format",
  "data": null
}
```

*Not found (404):*
```json
{
  "success": false,
  "message": "Delivery not found",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to fetch delivery. Please try again",
  "data": null
}
```

---

#### 49. Get Delivery by Order ID
**Endpoint:** `GET /api/deliveries/order/:orderId`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `orderId`: Order ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Delivery retrieved successfully",
  "data": {
    "_id": "string",
    "orderId": "object (order details)",
    "currentStatus": "string"
  }
}
```

**Error Responses:**

*Not found (404):*
```json
{
  "success": false,
  "message": "Delivery not found for this order",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to fetch delivery. Please try again",
  "data": null
}
```

---

#### 50. Assign Driver to Delivery
**Endpoint:** `PATCH /api/deliveries/:id/assign-driver`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Delivery ID (required)

**Request Body:**
```json
{
  "deliveryDriverId": "string (required)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Driver assigned successfully",
  "data": {
    "_id": "string",
    "deliveryDriverId": "object (driver details)"
  }
}
```

**Error Responses:**

*Missing driver ID (400):*
```json
{
  "success": false,
  "message": "Delivery driver ID is required",
  "data": null
}
```

*Driver not found (404):*
```json
{
  "success": false,
  "message": "Delivery driver not found or inactive",
  "data": null
}
```

*Driver unavailable (400):*
```json
{
  "success": false,
  "message": "Driver is currently <status>",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to assign driver. Please try again",
  "data": null
}
```

---

#### 51. Update Delivery Status
**Endpoint:** `PATCH /api/deliveries/:id/status`

**Authentication:** Required (JWT - ADMIN or DRIVER role)

**Path Parameters:**
- `id`: Delivery ID (required)

**Request Body:**
```json
{
  "status": "string (required: pickedUp, outForDelivery, delivered, or failed)",
  "failedMessage": "string (required if status is 'failed')"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Delivery status updated to <status>",
  "data": {
    "_id": "string",
    "status": "object (updated status timestamps)",
    "deliverySuccessStatus": {
      "status": "boolean or null",
      "message": "IN_PROGRESS or DELIVERED or FAILED",
      "failedMessage": "string or null"
    },
    "currentStatus": "string"
  }
}
```

**Error Responses:**

*Missing status (400):*
```json
{
  "success": false,
  "message": "Status is required",
  "data": null
}
```

*Invalid status (400):*
```json
{
  "success": false,
  "message": "Invalid status",
  "data": {
    "validStatuses": ["pickedUp", "outForDelivery", "delivered", "failed"]
  }
}
```

*Invalid progression (400):*
```json
{
  "success": false,
  "message": "Delivery must be picked up first / Delivery already marked as <status>",
  "data": null
}
```

*Missing failed message (400):*
```json
{
  "success": false,
  "message": "Failed message is required when marking delivery as failed",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to update delivery status. Please try again",
  "data": null
}
```

---

#### 52. Update Delivery Details
**Endpoint:** `PUT /api/deliveries/:id`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Delivery ID (required)

**Request Body:**
```json
{
  "fromLocation": "object (optional)",
  "toLocation": "object (optional)",
  "estimatedDeliveryTime": "ISO date string (optional)",
  "deliveryNotes": "string (optional)",
  "deliveryDriverId": "string (optional)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Delivery updated successfully",
  "data": {
    "_id": "string",
    "fromLocation": "object",
    "toLocation": "object",
    "estimatedDeliveryTime": "ISO date string or null",
    "deliveryNotes": "string"
  }
}
```

**Error Responses:**

*Cannot update (400):*
```json
{
  "success": false,
  "message": "Cannot update completed/failed delivery",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to update delivery. Please try again",
  "data": null
}
```

---

#### 53. Delete Delivery (Soft Delete)
**Endpoint:** `DELETE /api/deliveries/:id`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Delivery ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Delivery deleted successfully",
  "data": {
    "id": "string",
    "deletedAt": "ISO date string"
  }
}
```

**Error Responses:**

*Not found (404):*
```json
{
  "success": false,
  "message": "Delivery not found or already deleted",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to delete delivery. Please try again",
  "data": null
}
```

---

#### 54. Restore Deleted Delivery
**Endpoint:** `PATCH /api/deliveries/:id/restore`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Delivery ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Delivery restored successfully",
  "data": {
    "_id": "string",
    "isDeleted": false
  }
}
```

**Error Responses:**

*Not found (404):*
```json
{
  "success": false,
  "message": "Deleted delivery not found",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to restore delivery. Please try again",
  "data": null
}
```

---

#### 55. Get Deliveries by Driver
**Endpoint:** `GET /api/deliveries/driver/:driverId`

**Authentication:** Required (JWT - ADMIN or DRIVER role)

**Path Parameters:**
- `driverId`: Driver ID (required)

**Query Parameters:**
- `status`: Filter by delivery status (optional)
- `includeDeleted`: "true" or "false" (optional, default: "false")
- `sortBy`: Sort field (optional, default: "createdAt")
- `sortOrder`: "asc" or "desc" (optional, default: "desc")
- `page`: Page number (optional, default: 1)
- `limit`: Items per page (optional, default: 20, max: 100)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Deliveries retrieved successfully",
  "data": {
    "deliveries": ["array of delivery objects"],
    "pagination": {
      "currentPage": "number",
      "totalPages": "number",
      "totalCount": "number",
      "limit": "number"
    }
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch driver deliveries. Please try again",
  "data": null
}
```

---

#### 56. Get Delivery Statistics
**Endpoint:** `GET /api/deliveries/stats`

**Authentication:** Required (JWT - ADMIN role)

**Request:** No parameters required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Delivery statistics retrieved successfully",
  "data": {
    "totalDeliveries": "number",
    "deliveriesByStatus": {
      "pending": "number",
      "inProgress": "number",
      "delivered": "number",
      "failed": "number"
    },
    "successRate": "string (percentage)",
    "averageDeliveryTimeMinutes": "number",
    "topDrivers": [
      {
        "_id": "driver ID",
        "driverName": "string",
        "driverPhone": "string",
        "totalDeliveries": "number",
        "successfulDeliveries": "number",
        "failedDeliveries": "number",
        "successRate": "number (percentage)"
      }
    ]
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch delivery statistics. Please try again",
  "data": null
}
```

---

#### 57. Get Active Deliveries
**Endpoint:** `GET /api/deliveries/active`

**Authentication:** Required (JWT - ADMIN or DRIVER role)

**Request:** No parameters required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Found N active deliveries",
  "data": [
    {
      "_id": "string",
      "orderId": "object (order details)",
      "customerId": "object (customer details)",
      "deliveryDriverId": "object (driver details)",
      "currentStatus": "string",
      "status": "object (status timestamps)"
    }
  ]
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch active deliveries. Please try again",
  "data": null
}
```

---

#### 58. Get Pending Deliveries
**Endpoint:** `GET /api/deliveries/pending`

**Authentication:** Required (JWT - ADMIN role)

**Request:** No parameters required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Found N pending deliveries",
  "data": ["array of delivery objects"]
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch pending deliveries. Please try again",
  "data": null
}
```

---

### Subscription Management (Admin)

#### 59. Get All Subscriptions
**Endpoint:** `GET /api/subscriptions/all`

**Authentication:** Required (JWT - ADMIN role)

**Query Parameters:**
- `status`: Filter by status - ACTIVE, EXPIRED, CANCELLED, EXHAUSTED (optional)
- `customerId`: Filter by customer ID (optional)
- `planId`: Filter by plan ID (optional)
- `includeDeleted`: "true" or "false" (optional, default: "false")
- `sortBy`: Sort field (optional, default: "purchaseDate")
- `sortOrder`: "asc" or "desc" (optional, default: "desc")
- `page`: Page number (optional, default: 1)
- `limit`: Items per page (optional, default: 20)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscriptions retrieved successfully",
  "data": {
    "subscriptions": [
      {
        "_id": "string",
        "planId": "object (plan details)",
        "customerId": "object (customer details)",
        "purchaseDate": "ISO date string",
        "expiryDate": "ISO date string",
        "totalVouchers": "number",
        "usedVouchers": "number",
        "remainingVouchers": "number (computed)",
        "amountPaid": "number",
        "status": "ACTIVE or EXPIRED or CANCELLED or EXHAUSTED",
        "isExpired": "boolean (computed)",
        "isExhausted": "boolean (computed)"
      }
    ],
    "pagination": {
      "currentPage": "number",
      "totalPages": "number",
      "totalCount": "number",
      "limit": "number"
    }
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch subscriptions. Please try again",
  "data": null
}
```

---

#### 60. Get Subscription by ID (Admin)
**Endpoint:** `GET /api/subscriptions/admin/:id`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Subscription ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription retrieved successfully",
  "data": {
    "_id": "string",
    "planId": "object (plan details)",
    "customerId": "object (customer details)",
    "purchaseDate": "ISO date string",
    "expiryDate": "ISO date string",
    "totalVouchers": "number",
    "usedVouchers": "number",
    "remainingVouchers": "number",
    "amountPaid": "number",
    "status": "string",
    "isExpired": "boolean",
    "isExhausted": "boolean"
  }
}
```

**Error Responses:**

*Invalid ID (400):*
```json
{
  "success": false,
  "message": "Invalid subscription ID format",
  "data": null
}
```

*Not found (404):*
```json
{
  "success": false,
  "message": "Subscription not found",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to fetch subscription. Please try again",
  "data": null
}
```

---

#### 61. Update Subscription Status (Admin)
**Endpoint:** `PATCH /api/subscriptions/:id/status`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Subscription ID (required)

**Request Body:**
```json
{
  "status": "string (required: ACTIVE, EXPIRED, CANCELLED, or EXHAUSTED)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription status updated successfully",
  "data": {
    "_id": "string",
    "status": "string",
    "planId": "object (plan details)",
    "customerId": "object (customer details)"
  }
}
```

**Error Responses:**

*Missing status (400):*
```json
{
  "success": false,
  "message": "Status is required",
  "data": null
}
```

*Invalid status (400):*
```json
{
  "success": false,
  "message": "Invalid status value",
  "data": {
    "validStatuses": ["ACTIVE", "EXPIRED", "CANCELLED", "EXHAUSTED"]
  }
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to update subscription. Please try again",
  "data": null
}
```

---

#### 62. Delete Subscription (Soft Delete)
**Endpoint:** `DELETE /api/subscriptions/:id`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Subscription ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription deleted successfully",
  "data": {
    "_id": "string",
    "isDeleted": true,
    "deletedAt": "ISO date string"
  }
}
```

**Error Responses:**

*Not found (404):*
```json
{
  "success": false,
  "message": "Subscription not found",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to delete subscription. Please try again",
  "data": null
}
```

---

#### 63. Restore Deleted Subscription
**Endpoint:** `PATCH /api/subscriptions/:id/restore`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Subscription ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription restored successfully",
  "data": {
    "_id": "string",
    "isDeleted": false
  }
}
```

**Error Responses:**

*Not deleted (400):*
```json
{
  "success": false,
  "message": "Subscription is not deleted",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to restore subscription. Please try again",
  "data": null
}
```

---

#### 64. Get Subscription Statistics
**Endpoint:** `GET /api/subscriptions/stats`

**Authentication:** Required (JWT - ADMIN role)

**Request:** No parameters required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription statistics retrieved",
  "data": {
    "totalSubscriptions": "number",
    "subscriptionsByStatus": {
      "active": "number",
      "expired": "number",
      "cancelled": "number",
      "exhausted": "number"
    },
    "subscriptionsByPlan": [
      {
        "_id": "plan ID",
        "plan": "object (plan details)",
        "count": "number",
        "totalRevenue": "number",
        "totalVouchersIssued": "number",
        "totalVouchersUsed": "number"
      }
    ],
    "revenue": {
      "total": "number",
      "average": "number"
    },
    "vouchers": {
      "totalIssued": "number",
      "totalUsed": "number",
      "usageRate": "string (percentage)"
    }
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch subscription statistics. Please try again",
  "data": null
}
```

---

#### 65. Update Expired Subscriptions (Cron Job)
**Endpoint:** `POST /api/subscriptions/update-expired`

**Authentication:** Required (JWT - ADMIN role)

**Request:** No body required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Expired subscriptions updated",
  "data": {
    "updatedCount": "number"
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to update expired subscriptions. Please try again",
  "data": null
}
```

---

### Subscription Plans Management (Admin)

#### 66. Create Subscription Plan
**Endpoint:** `POST /api/subscription-plans`

**Authentication:** Required (JWT - ADMIN role)

**Request Body:**
```json
{
  "planName": "string (required)",
  "days": "string (required, e.g., '7D', '30D')",
  "planType": "string (required: LUNCH_ONLY, DINNER_ONLY, or BOTH)",
  "totalVouchers": "number (required)",
  "planPrice": "number (required)",
  "compareAtPlanPrice": "number (optional)",
  "description": "string (optional)",
  "isActive": "boolean (optional, default: true)"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Subscription plan created successfully",
  "data": {
    "_id": "string",
    "planName": "string",
    "days": "string",
    "planType": "string",
    "totalVouchers": "number",
    "planPrice": "number",
    "compareAtPlanPrice": "number or null",
    "description": "string",
    "isActive": "boolean",
    "createdAt": "ISO date string"
  }
}
```

**Error Responses:**

*Missing required fields (400):*
```json
{
  "success": false,
  "message": "Missing required fields",
  "data": {
    "required": ["planName", "days", "planType", "totalVouchers", "planPrice"]
  }
}
```

*Duplicate plan (409):*
```json
{
  "success": false,
  "message": "A subscription plan with the same name, type, and duration already exists",
  "data": null
}
```

*Validation error (400):*
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "errors": ["array of error messages"]
  }
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to create subscription plan. Please try again",
  "data": null
}
```

---

#### 67. Get All Subscription Plans (Admin)
**Endpoint:** `GET /api/subscription-plans/admin/all`

**Authentication:** Required (JWT - ADMIN role)

**Query Parameters:**
- `planType`: Filter by type - LUNCH_ONLY, DINNER_ONLY, BOTH (optional)
- `days`: Filter by duration (optional)
- `isActive`: "true" or "false" (optional)
- `minPrice`: Minimum price (optional)
- `maxPrice`: Maximum price (optional)
- `sortBy`: Sort field (optional, default: "createdAt")
- `sortOrder`: "asc" or "desc" (optional, default: "desc")
- `page`: Page number (optional, default: 1)
- `limit`: Items per page (optional, default: 20)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription plans retrieved successfully",
  "data": {
    "subscriptionPlans": ["array of plan objects"],
    "pagination": {
      "currentPage": "number",
      "totalPages": "number",
      "totalCount": "number",
      "limit": "number"
    }
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch subscription plans. Please try again",
  "data": null
}
```

---

#### 68. Get Active Subscription Plans (Public)
**Endpoint:** `GET /api/subscription-plans`

**Authentication:** None (Public)

**Query Parameters:**
- `planType`: Filter by type (optional)
- `days`: Filter by duration (optional)
- `sortBy`: Sort field (optional, default: "planPrice")
- `sortOrder`: "asc" or "desc" (optional, default: "asc")

**Success Response (200):**
```json
{
  "success": true,
  "message": "Active subscription plans retrieved successfully",
  "data": ["array of active plan objects"]
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch subscription plans. Please try again",
  "data": null
}
```

---

#### 69. Get Subscription Plan by ID (Admin)
**Endpoint:** `GET /api/subscription-plans/admin/:id`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Plan ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription plan retrieved successfully",
  "data": {
    "_id": "string",
    "planName": "string",
    "days": "string",
    "planType": "string",
    "totalVouchers": "number",
    "planPrice": "number",
    "isActive": "boolean"
  }
}
```

**Error Responses:**

*Invalid ID (400):*
```json
{
  "success": false,
  "message": "Invalid subscription plan ID format",
  "data": null
}
```

*Not found (404):*
```json
{
  "success": false,
  "message": "Subscription plan not found",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to fetch subscription plan. Please try again",
  "data": null
}
```

---

#### 70. Update Subscription Plan
**Endpoint:** `PUT /api/subscription-plans/:id`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Plan ID (required)

**Request Body:**
```json
{
  "planName": "string (optional)",
  "days": "string (optional)",
  "planType": "string (optional)",
  "totalVouchers": "number (optional)",
  "planPrice": "number (optional)",
  "compareAtPlanPrice": "number (optional)",
  "description": "string (optional)",
  "isActive": "boolean (optional)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription plan updated successfully",
  "data": {
    "_id": "string",
    "planName": "string",
    "planPrice": "number",
    "isActive": "boolean"
  }
}
```

**Error Responses:**

*Not found (404):*
```json
{
  "success": false,
  "message": "Subscription plan not found",
  "data": null
}
```

*Duplicate plan (409):*
```json
{
  "success": false,
  "message": "A subscription plan with the same name, type, and duration already exists",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to update subscription plan. Please try again",
  "data": null
}
```

---

#### 71. Delete Subscription Plan (Soft Delete)
**Endpoint:** `DELETE /api/subscription-plans/:id`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Plan ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription plan deleted successfully",
  "data": {
    "_id": "string",
    "isActive": false
  }
}
```

**Error Responses:**

*Not found (404):*
```json
{
  "success": false,
  "message": "Subscription plan not found",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to delete subscription plan. Please try again",
  "data": null
}
```

---

#### 72. Activate Subscription Plan
**Endpoint:** `PATCH /api/subscription-plans/:id/activate`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Plan ID (required)

**Request:** No body required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription plan activated successfully",
  "data": {
    "_id": "string",
    "planName": "string",
    "isActive": true
  }
}
```

**Error Responses:**

*Already active (400):*
```json
{
  "success": false,
  "message": "Subscription plan is already active",
  "data": null
}
```

*Duplicate active plan (409):*
```json
{
  "success": false,
  "message": "Cannot activate: A subscription plan with the same name, type, and duration is already active",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to activate subscription plan. Please try again",
  "data": null
}
```

---

#### 73. Get Subscription Plan Statistics
**Endpoint:** `GET /api/subscription-plans/stats`

**Authentication:** Required (JWT - ADMIN role)

**Request:** No parameters required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription plan statistics retrieved",
  "data": {
    "totalPlans": "number",
    "activePlans": "number",
    "inactivePlans": "number",
    "plansByType": [
      {
        "_id": "LUNCH_ONLY or DINNER_ONLY or BOTH",
        "count": "number",
        "averagePrice": "number",
        "minPrice": "number",
        "maxPrice": "number"
      }
    ]
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch subscription plan statistics. Please try again",
  "data": null
}
```

---

### Vouchers Management (Admin)

#### 74. Get All Vouchers
**Endpoint:** `GET /api/vouchers/all`

**Authentication:** Required (JWT - ADMIN role)

**Query Parameters:**
- `customerId`: Filter by customer ID (optional)
- `subscriptionId`: Filter by subscription ID (optional)
- `mealType`: Filter by meal type - LUNCH, DINNER, BOTH (optional)
- `hasRemaining`: "true" or "false" (optional)
- `isExpired`: "true" or "false" (optional)
- `includeDeleted`: "true" or "false" (optional, default: "false")
- `sortBy`: Sort field (optional, default: "issuedDate")
- `sortOrder`: "asc" or "desc" (optional, default: "desc")
- `page`: Page number (optional, default: 1)
- `limit`: Items per page (optional, default: 20)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Vouchers retrieved successfully",
  "data": {
    "vouchers": [
      {
        "_id": "string",
        "subscriptionId": "object (subscription details)",
        "customerId": "object (customer details)",
        "mealType": "LUNCH or DINNER or BOTH",
        "issuedDate": "ISO date string",
        "expiryDate": "ISO date string",
        "totalVouchers": "number",
        "remainingVouchers": "number",
        "usedVouchers": "number (computed)",
        "isExpired": "boolean",
        "isExhausted": "boolean (computed)"
      }
    ],
    "pagination": {
      "currentPage": "number",
      "totalPages": "number",
      "totalCount": "number",
      "limit": "number"
    }
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch vouchers. Please try again",
  "data": null
}
```

---

#### 75. Get Voucher by ID
**Endpoint:** `GET /api/vouchers/:id`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Voucher ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Voucher retrieved successfully",
  "data": {
    "_id": "string",
    "subscriptionId": "object (subscription details)",
    "customerId": "object (customer details)",
    "totalVouchers": "number",
    "remainingVouchers": "number",
    "usedVouchers": "number",
    "isExhausted": "boolean"
  }
}
```

**Error Responses:**

*Invalid ID (400):*
```json
{
  "success": false,
  "message": "Invalid voucher ID format",
  "data": null
}
```

*Not found (404):*
```json
{
  "success": false,
  "message": "Voucher not found",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to fetch voucher. Please try again",
  "data": null
}
```

---

#### 76. Update Voucher Status
**Endpoint:** `PATCH /api/vouchers/:id/status`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Voucher ID (required)

**Request Body:**
```json
{
  "remainingVouchers": "number (optional)",
  "isExpired": "boolean (optional)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Voucher updated successfully",
  "data": {
    "_id": "string",
    "remainingVouchers": "number",
    "usedVouchers": "number",
    "isExpired": "boolean",
    "isExhausted": "boolean"
  }
}
```

**Error Responses:**

*Invalid remaining vouchers (400):*
```json
{
  "success": false,
  "message": "Remaining vouchers must be a non-negative integer / Remaining vouchers cannot exceed total vouchers",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to update voucher. Please try again",
  "data": null
}
```

---

#### 77. Delete Voucher (Soft Delete)
**Endpoint:** `DELETE /api/vouchers/:id`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Voucher ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Voucher deleted successfully",
  "data": {
    "_id": "string",
    "isDeleted": true,
    "deletedAt": "ISO date string"
  }
}
```

**Error Responses:**

*Not found (404):*
```json
{
  "success": false,
  "message": "Voucher not found",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to delete voucher. Please try again",
  "data": null
}
```

---

#### 78. Restore Deleted Voucher
**Endpoint:** `PATCH /api/vouchers/:id/restore`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `id`: Voucher ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Voucher restored successfully",
  "data": {
    "_id": "string",
    "isDeleted": false
  }
}
```

**Error Responses:**

*Not deleted (400):*
```json
{
  "success": false,
  "message": "Voucher is not deleted",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to restore voucher. Please try again",
  "data": null
}
```

---

#### 79. Update Expired Vouchers (Cron Job)
**Endpoint:** `POST /api/vouchers/update-expired`

**Authentication:** Required (JWT - ADMIN role)

**Request:** No body required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Expired vouchers updated successfully",
  "data": {
    "updatedCount": "number"
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to update expired vouchers. Please try again",
  "data": null
}
```

---

#### 80. Get Voucher Statistics
**Endpoint:** `GET /api/vouchers/stats`

**Authentication:** Required (JWT - ADMIN role)

**Request:** No parameters required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Voucher statistics retrieved successfully",
  "data": {
    "totalBatches": "number",
    "expiredBatches": "number",
    "batchesWithRemaining": "number",
    "totalVouchersIssued": "number",
    "availableVouchers": "number",
    "usedVouchers": "number",
    "usageRate": "string (percentage)",
    "vouchersByMealType": [
      {
        "_id": "LUNCH or DINNER or BOTH",
        "totalIssued": "number",
        "remaining": "number",
        "batches": "number"
      }
    ]
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch voucher statistics. Please try again",
  "data": null
}
```

---

#### 81. Get Vouchers by Subscription
**Endpoint:** `GET /api/vouchers/subscription/:subscriptionId`

**Authentication:** Required (JWT - ADMIN role)

**Path Parameters:**
- `subscriptionId`: Subscription ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Voucher batch retrieved successfully",
  "data": {
    "_id": "string",
    "subscriptionId": "object (subscription details)",
    "customerId": "object (customer details)",
    "totalVouchers": "number",
    "remainingVouchers": "number",
    "usedVouchers": "number",
    "isExhausted": "boolean",
    "isAvailable": "boolean"
  }
}
```

**Error Responses:**

*Not found (404):*
```json
{
  "success": false,
  "message": "Voucher batch not found for this subscription",
  "data": null
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to fetch voucher. Please try again",
  "data": null
}
```

---

### Customer Management (Admin)

#### 82. Create Test Customer
**Endpoint:** `POST /api/auth/customer/test`

**Authentication:** Required (JWT - ADMIN role)

**Request Body:**
```json
{
  "phoneNumber": "string (required, 10 digits)"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Test customer created successfully",
  "data": {
    "customerId": "string",
    "firebaseUid": "string (test-user-{phoneNumber})",
    "phoneNumber": "string",
    "customToken": "string (Firebase custom token)",
    "note": "Use this custom token to authenticate as this test user in Firebase"
  }
}
```

**Error Responses:**

*Missing phone number (400):*
```json
{
  "success": false,
  "message": "Phone number is required",
  "data": {
    "error": "MISSING_PHONE_NUMBER"
  }
}
```

*Invalid phone format (400):*
```json
{
  "success": false,
  "message": "Please provide a valid 10-digit phone number",
  "data": {
    "error": "INVALID_PHONE_FORMAT"
  }
}
```

*Duplicate customer (409):*
```json
{
  "success": false,
  "message": "Test customer already exists with this phone number",
  "data": {
    "error": "DUPLICATE_TEST_CUSTOMER",
    "customerId": "string"
  }
}
```

*Token generation failed (500):*
```json
{
  "success": false,
  "message": "Failed to generate authentication token",
  "data": {
    "error": "TOKEN_GENERATION_FAILED"
  }
}
```

*Server error (500):*
```json
{
  "success": false,
  "message": "Failed to create test customer",
  "data": null
}
```

---

## Authentication Header Format

All protected endpoints require JWT token:

```
Authorization: Bearer <token>
```

Replace `<token>` with the JWT token received from the login response.

---

## Role-Based Access Control

Different endpoints require different admin roles:

- **ADMIN**: Full access to all admin endpoints
- **KITCHEN_STAFF**: Access to kitchen dashboard and order operations (accept, reject, update preparation status)
- **DELIVERY_MANAGER**: Access to delivery management endpoints

---

## Notes for Frontend Development

1. Store JWT token securely after login (localStorage/sessionStorage/cookie)
2. Include token in Authorization header for all protected routes
3. Handle token expiration (7 days) by redirecting to login
4. All dates from backend are in ISO 8601 format
5. For media uploads, upload to Cloudinary first, then use the returned URL in subsequent requests
6. All monetary values are in the base currency unit (no decimals unless specified)
7. Date ranges in analytics are inclusive of start and end dates
8. Order status breakdown counts are mutually exclusive based on the most recent status
9. Orders automatically create delivery records when accepted by kitchen
10. Subscription vouchers are tracked in Subscription schema (totalVouchers and usedVouchers fields)
11. Voucher batches are created per subscription and track remaining vouchers
12. Soft deletes are used throughout - items are marked isDeleted: true rather than hard deleted
13. Pagination is available on all list endpoints with page and limit parameters
14. Most list endpoints support filtering, sorting, and search functionality
15. Role-based access control restricts certain endpoints to specific admin roles
