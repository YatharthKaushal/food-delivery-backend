# Kitchen Staff API Documentation

**Base URL:** `https://food-delivery-backend-y6lw.onrender.com`

**Documentation Version:** 1.0
**Last Updated:** November 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Kitchen Dashboard](#kitchen-dashboard)
4. [Order Management](#order-management)
5. [Order Viewing & Planning](#order-viewing--planning)
6. [Response Structure](#response-structure)
7. [Error Handling](#error-handling)
8. [Workflow Guide](#workflow-guide)

---

## Overview

This API enables kitchen staff to manage food orders in real-time. Kitchen staff are authenticated users with the role `KITCHEN_STAFF` and can:

- View today's orders on a dashboard
- Accept or reject incoming orders
- Update preparation status
- Mark orders ready for delivery
- View upcoming orders for planning
- Cancel orders when necessary

**Authentication Type:** JWT (JSON Web Token)
**Token Validity:** 7 days
**Authorization Header:** `Bearer <token>`

---

## Authentication

### 1. Register Kitchen Staff

**Endpoint:** `POST /api/auth/admin/register`
**Access:** Public (or admin-only based on your setup)
**Purpose:** Create a new kitchen staff account

**Request Body:**
```json
{
  "name": "John Doe",
  "username": "johndoe",
  "password": "securePassword123",
  "email": "john@example.com",
  "phone": "+1234567890",
  "role": "KITCHEN_STAFF"
}
```

**Required Fields:**
- `name` (string): Full name
- `username` (string): Unique username
- `password` (string): Account password

**Optional Fields:**
- `email` (string): Email address
- `phone` (string): Phone number
- `role` (string): Must be `KITCHEN_STAFF` or `ADMIN` (defaults to `KITCHEN_STAFF`)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Admin registered successfully",
  "data": {
    "admin": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "KITCHEN_STAFF",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

**Error Cases:**
- **400:** Missing required fields, invalid role
- **409:** Username or email already exists
- **500:** Server error

**Notes:**
- Username is automatically converted to lowercase
- Password is hashed using bcrypt before storage
- Role defaults to `KITCHEN_STAFF` if not specified

---

### 2. Login

**Endpoint:** `POST /api/auth/admin/login`
**Access:** Public
**Purpose:** Authenticate and receive JWT token

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "securePassword123"
}
```

**Required Fields:**
- `username` (string): Account username
- `password` (string): Account password

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "KITCHEN_STAFF"
    }
  }
}
```

**Error Cases:**
- **400:** Missing username or password
- **401:** Invalid credentials
- **500:** Server error

**Notes:**
- Store the `token` securely in your app (e.g., AsyncStorage in React Native)
- Token expires after 7 days
- Include token in all subsequent requests: `Authorization: Bearer <token>`

---

## Kitchen Dashboard

### 3. Get Kitchen Dashboard

**Endpoint:** `GET /api/orders/kitchen/dashboard`
**Access:** Kitchen Staff, Admin
**Purpose:** Get real-time overview of today's orders with statistics

**Request Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Kitchen dashboard data retrieved",
  "data": {
    "stats": {
      "totalOrders": 45,
      "placed": 8,
      "accepted": 5,
      "preparing": 12,
      "ready": 20
    },
    "pendingOrders": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "customerId": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Jane Smith",
          "phone": "+9876543210",
          "address": {
            "street": "123 Main St",
            "city": "Mumbai",
            "state": "Maharashtra",
            "zipCode": "400001"
          }
        },
        "menuItem": {
          "menuItemId": {
            "_id": "507f1f77bcf86cd799439013",
            "name": "Paneer Tikka Masala",
            "category": "North Indian",
            "imageUrl": "https://...",
            "price": 200
          },
          "quantity": 2
        },
        "addons": [
          {
            "addonId": {
              "_id": "507f1f77bcf86cd799439014",
              "name": "Extra Roti",
              "price": 10
            },
            "quantity": 4
          }
        ],
        "mealType": "LUNCH",
        "scheduledForDate": "2024-01-15T00:00:00Z",
        "orderStatus": {
          "placedAt": "2024-01-15T08:30:00Z",
          "acceptedAt": null,
          "preparingAt": null,
          "outForDeliveryAt": null,
          "deliveredAt": null,
          "cancelledAt": null,
          "failedAt": null
        },
        "totalPrice": 440,
        "specialInstructions": "Less spicy",
        "createdAt": "2024-01-15T08:30:00Z"
      }
    ],
    "preparingOrders": [
      {
        "_id": "507f1f77bcf86cd799439015",
        "customerId": { "name": "Mike Wilson", "phone": "+1122334455" },
        "menuItem": { "menuItemId": { "name": "Dal Makhani" } },
        "orderStatus": {
          "placedAt": "2024-01-15T08:00:00Z",
          "acceptedAt": "2024-01-15T08:05:00Z",
          "preparingAt": "2024-01-15T08:10:00Z",
          "outForDeliveryAt": null
        }
      }
    ]
  }
}
```

**Error Cases:**
- **401:** Missing or invalid token
- **403:** User is not kitchen staff or admin
- **500:** Server error

**Notes:**
- Dashboard shows only today's orders (midnight to midnight)
- `pendingOrders`: Orders placed but not yet accepted (needs immediate attention)
- `preparingOrders`: Orders currently being prepared
- Statistics help monitor kitchen workload in real-time
- Orders are populated with customer, menu item, and addon details

---

## Order Management

### 4. Accept Single Order

**Endpoint:** `POST /api/orders/:orderId/accept`
**Access:** Kitchen Staff, Admin
**Purpose:** Accept a placed order and start processing

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `orderId` (string): MongoDB ObjectId of the order

**Example:**
```
POST /api/orders/507f1f77bcf86cd799439011/accept
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order accepted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "orderStatus": {
      "placedAt": "2024-01-15T08:30:00Z",
      "acceptedAt": "2024-01-15T09:00:00Z",
      "preparingAt": null,
      "outForDeliveryAt": null,
      "deliveredAt": null
    },
    "customerId": { "name": "Jane Smith" },
    "menuItem": { "menuItemId": { "name": "Paneer Tikka" } }
  }
}
```

**Error Cases:**
- **400:** Invalid order ID format, order already accepted, order is cancelled/failed
- **401:** Missing or invalid token
- **403:** Insufficient permissions
- **404:** Order not found
- **500:** Server error

**Notes:**
- Order must be in "placed" state (not accepted, cancelled, or failed)
- Sets `orderStatus.acceptedAt` to current timestamp
- Order disappears from pending list after acceptance

---

### 5. Bulk Accept Orders

**Endpoint:** `POST /api/orders/bulk-accept`
**Access:** Kitchen Staff, Admin
**Purpose:** Accept multiple orders simultaneously for efficiency

**Request Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "orderIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ]
}
```

**Required Fields:**
- `orderIds` (array): Array of order IDs to accept

**Success Response (200):**
```json
{
  "success": true,
  "message": "3 orders accepted",
  "data": {
    "modifiedCount": 3,
    "requestedCount": 3
  }
}
```

**Error Cases:**
- **400:** Missing or empty orderIds array, invalid order ID format
- **401:** Missing or invalid token
- **403:** Insufficient permissions
- **500:** Server error

**Notes:**
- Only accepts orders that are in "placed" state
- Skips orders that are already accepted, cancelled, or failed
- `modifiedCount` may be less than `requestedCount` if some orders were invalid
- Useful for accepting all pending orders at once during peak hours

---

### 6. Reject Order

**Endpoint:** `POST /api/orders/:orderId/reject`
**Access:** Kitchen Staff, Admin
**Purpose:** Reject an order and mark as failed (with optional reason)

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `orderId` (string): MongoDB ObjectId of the order

**Request Body:**
```json
{
  "reason": "Menu item out of stock"
}
```

**Optional Fields:**
- `reason` (string): Reason for rejection (appended to specialInstructions)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order rejected successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "orderStatus": {
      "placedAt": "2024-01-15T08:30:00Z",
      "failedAt": "2024-01-15T09:00:00Z"
    },
    "specialInstructions": "Less spicy\n[Kitchen Rejected: Menu item out of stock]"
  }
}
```

**Error Cases:**
- **400:** Invalid order ID, order already cancelled/failed/delivered
- **401:** Missing or invalid token
- **403:** Insufficient permissions
- **404:** Order not found
- **500:** Server error

**Notes:**
- Sets `orderStatus.failedAt` to current timestamp
- Automatically refunds subscription vouchers if order used them
- Reason is appended to `specialInstructions` field
- Customer can see the rejection reason
- Use this when ingredients are unavailable or order cannot be fulfilled

---

### 7. Update Preparation Status

**Endpoint:** `PATCH /api/orders/:orderId/preparation-status`
**Access:** Kitchen Staff, Admin
**Purpose:** Update the preparation progress of an order

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `orderId` (string): MongoDB ObjectId of the order

**Request Body:**
```json
{
  "preparationStatus": "in-progress"
}
```

**Required Fields:**
- `preparationStatus` (string): One of: `"started"`, `"in-progress"`, `"almost-ready"`

**Valid Preparation Statuses:**
- `"started"`: Kitchen has started preparing the order
- `"in-progress"`: Order is actively being cooked
- `"almost-ready"`: Order is almost ready for delivery

**Success Response (200):**
```json
{
  "success": true,
  "message": "Preparation status updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "orderStatus": {
      "acceptedAt": "2024-01-15T09:00:00Z",
      "preparingAt": "2024-01-15T09:05:00Z"
    },
    "specialInstructions": "Less spicy\n[Preparation: in-progress]"
  }
}
```

**Error Cases:**
- **400:** Invalid order ID, invalid status, order not accepted, order cancelled/failed
- **401:** Missing or invalid token
- **403:** Insufficient permissions
- **404:** Order not found
- **500:** Server error

**Notes:**
- Order must be accepted first before updating preparation status
- First update sets `orderStatus.preparingAt` to current timestamp
- Preparation status is stored in `specialInstructions` field (consider adding dedicated field)
- Helps track order progress in real-time
- Previous preparation status is replaced with new one

---

### 8. Mark Order Ready for Delivery

**Endpoint:** `POST /api/orders/:orderId/ready`
**Access:** Kitchen Staff, Admin
**Purpose:** Mark order as ready and available for driver pickup

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `orderId` (string): MongoDB ObjectId of the order

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order marked ready for delivery",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "orderStatus": {
      "acceptedAt": "2024-01-15T09:00:00Z",
      "preparingAt": "2024-01-15T09:05:00Z",
      "outForDeliveryAt": "2024-01-15T09:30:00Z"
    }
  }
}
```

**Error Cases:**
- **400:** Invalid order ID, order not in preparing state, order cancelled/failed, order already ready
- **401:** Missing or invalid token
- **403:** Insufficient permissions
- **404:** Order not found
- **500:** Server error

**Notes:**
- Order must be in "preparing" status first (preparingAt must be set)
- Sets `orderStatus.outForDeliveryAt` to current timestamp
- This signals delivery drivers that order is ready for pickup
- Cannot mark an order ready if it hasn't been accepted and started preparing

---

### 9. Cancel Order (Kitchen Staff)

**Endpoint:** `PATCH /api/orders/:id/admin-cancel`
**Access:** Kitchen Staff, Admin
**Purpose:** Cancel an order (useful if customer requests or issue arises)

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` (string): MongoDB ObjectId of the order

**Request Body:**
```json
{
  "bypassTimeRestrictions": false,
  "reason": "Customer requested cancellation"
}
```

**Optional Fields:**
- `bypassTimeRestrictions` (boolean): Admin can cancel anytime (default: false)
- `reason` (string): Reason for cancellation

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "orderStatus": {
      "cancelledAt": "2024-01-15T09:00:00Z"
    }
  }
}
```

**Error Cases:**
- **400:** Invalid order ID, order already delivered/cancelled
- **401:** Missing or invalid token
- **403:** Insufficient permissions
- **404:** Order not found
- **500:** Server error

**Notes:**
- Kitchen staff typically use this when customer requests cancellation
- Automatically refunds subscription vouchers if applicable
- Different from "reject" - cancel is customer-initiated, reject is kitchen-initiated

---

## Order Viewing & Planning

### 10. View All Orders

**Endpoint:** `GET /api/orders/all`
**Access:** Kitchen Staff, Admin, Delivery Manager
**Purpose:** View all orders with filtering and pagination

**Request Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `customerId` (string): Filter by customer ID
- `mealType` (string): `"LUNCH"` or `"DINNER"`
- `scheduledForDate` (date): Filter by scheduled date (ISO 8601 format)
- `status` (string): `"active"`, `"delivered"`, `"cancelled"`, `"failed"`
- `includeDeleted` (boolean): Include soft-deleted orders (default: false)
- `sortBy` (string): Sort field (default: `"scheduledForDate"`)
- `sortOrder` (string): `"asc"` or `"desc"` (default: `"desc"`)
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)

**Example:**
```
GET /api/orders/all?mealType=LUNCH&scheduledForDate=2024-01-15&page=1&limit=50
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": {
    "orders": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "customerId": { "name": "Jane Smith" },
        "menuItem": { "menuItemId": { "name": "Paneer Tikka" } },
        "mealType": "LUNCH",
        "scheduledForDate": "2024-01-15T00:00:00Z",
        "orderStatus": { "placedAt": "..." }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalOrders": 45,
      "limit": 20
    }
  }
}
```

**Error Cases:**
- **401:** Missing or invalid token
- **403:** Insufficient permissions
- **500:** Server error

**Notes:**
- Useful for viewing order history and planning
- Orders are populated with customer and menu item details
- Use pagination for better performance with large datasets

---

### 11. View Single Order Details

**Endpoint:** `GET /api/orders/admin/:id`
**Access:** Kitchen Staff, Admin, Delivery Manager
**Purpose:** Get detailed information about a specific order

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` (string): MongoDB ObjectId of the order

**Example:**
```
GET /api/orders/admin/507f1f77bcf86cd799439011
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "customerId": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Jane Smith",
      "phone": "+9876543210",
      "address": {
        "street": "123 Main St",
        "city": "Mumbai",
        "state": "Maharashtra",
        "zipCode": "400001"
      }
    },
    "menuItem": {
      "menuItemId": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Paneer Tikka Masala",
        "category": "North Indian",
        "description": "Creamy paneer in rich tomato gravy",
        "imageUrl": "https://...",
        "price": 200
      },
      "quantity": 2
    },
    "addons": [
      {
        "addonId": {
          "_id": "507f1f77bcf86cd799439014",
          "name": "Extra Roti",
          "price": 10
        },
        "quantity": 4
      }
    ],
    "mealType": "LUNCH",
    "scheduledForDate": "2024-01-15T00:00:00Z",
    "orderStatus": {
      "placedAt": "2024-01-15T08:30:00Z",
      "acceptedAt": "2024-01-15T09:00:00Z",
      "preparingAt": "2024-01-15T09:05:00Z",
      "outForDeliveryAt": null,
      "deliveredAt": null,
      "cancelledAt": null,
      "failedAt": null
    },
    "totalPrice": 440,
    "specialInstructions": "Less spicy\n[Preparation: in-progress]",
    "subscriptionUsed": "507f1f77bcf86cd799439015",
    "vouchersConsumed": 1,
    "createdAt": "2024-01-15T08:30:00Z",
    "updatedAt": "2024-01-15T09:05:00Z"
  }
}
```

**Error Cases:**
- **400:** Invalid order ID format
- **401:** Missing or invalid token
- **403:** Insufficient permissions
- **404:** Order not found
- **500:** Server error

**Notes:**
- Provides complete order details including customer info and menu items
- Useful for reviewing order requirements before preparation
- Shows full order lifecycle with all timestamps

---

### 12. View Upcoming Orders

**Endpoint:** `GET /api/orders/upcoming`
**Access:** Kitchen Staff, Admin, Delivery Manager
**Purpose:** View orders scheduled for upcoming days (planning ahead)

**Request Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `days` (number): Number of days to look ahead (default: 1)
- `mealType` (string): Filter by `"LUNCH"` or `"DINNER"`

**Example:**
```
GET /api/orders/upcoming?days=3&mealType=LUNCH
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Upcoming orders retrieved",
  "data": {
    "orders": [
      {
        "_id": "507f1f77bcf86cd799439016",
        "scheduledForDate": "2024-01-16T00:00:00Z",
        "mealType": "LUNCH",
        "menuItem": { "menuItemId": { "name": "Dal Makhani" } },
        "customerId": { "name": "Mike Wilson" }
      }
    ],
    "summary": {
      "totalOrders": 30,
      "dateRange": {
        "from": "2024-01-16T00:00:00Z",
        "to": "2024-01-19T00:00:00Z"
      }
    }
  }
}
```

**Error Cases:**
- **401:** Missing or invalid token
- **403:** Insufficient permissions
- **500:** Server error

**Notes:**
- Helps kitchen staff plan ingredient purchases and staffing
- Excludes cancelled and failed orders
- Useful for capacity planning during holidays or events

---

## Response Structure

All API responses follow a standardized structure:

### Success Response
```json
{
  "success": true,
  "message": "Description of the successful operation",
  "data": {
    // Response data (object, array, or null)
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Description of the error",
  "data": null
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully (registration) |
| 400 | Bad Request | Invalid input, missing required fields |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Requested resource doesn't exist |
| 409 | Conflict | Resource already exists (duplicate username/email) |
| 500 | Internal Server Error | Server-side error |

### Common Error Messages

**Authentication Errors:**
- `"Authentication required. Please provide a valid token"` - Missing Authorization header
- `"Invalid token. Please login again"` - Malformed or invalid JWT
- `"Token expired. Please login again"` - JWT has expired (> 7 days)
- `"User no longer exists or has been deactivated"` - Account deleted or deactivated

**Authorization Errors:**
- `"Access denied. You do not have permission to access this resource"` - Wrong role

**Validation Errors:**
- `"Name, username, and password are required fields"` - Missing required fields
- `"Invalid order ID format"` - Malformed MongoDB ObjectId
- `"Invalid preparation status"` - Status not in allowed values

**Business Logic Errors:**
- `"Order is already accepted"` - Cannot accept twice
- `"Cannot accept cancelled order"` - Cannot modify cancelled orders
- `"Order must be accepted before updating preparation status"` - Wrong order state

---

## Workflow Guide

### Typical Kitchen Staff Daily Workflow

#### Morning Setup (Before Service)
1. **Login**
   ```
   POST /api/auth/admin/login
   ```
2. **Check Upcoming Orders**
   ```
   GET /api/orders/upcoming?days=1&mealType=LUNCH
   ```
3. **Review Kitchen Dashboard**
   ```
   GET /api/orders/kitchen/dashboard
   ```

#### During Service (Real-time Order Processing)

**Step 1: View New Orders**
```
GET /api/orders/kitchen/dashboard
```
- Check `pendingOrders` array for new orders waiting for acceptance

**Step 2: Accept Orders**

Option A - Accept individual order:
```
POST /api/orders/:orderId/accept
```

Option B - Accept all pending orders at once:
```
POST /api/orders/bulk-accept
Body: { "orderIds": ["id1", "id2", "id3"] }
```

**Step 3: Start Preparation**
```
PATCH /api/orders/:orderId/preparation-status
Body: { "preparationStatus": "started" }
```

**Step 4: Update Progress**
```
PATCH /api/orders/:orderId/preparation-status
Body: { "preparationStatus": "in-progress" }
```

**Step 5: Almost Done**
```
PATCH /api/orders/:orderId/preparation-status
Body: { "preparationStatus": "almost-ready" }
```

**Step 6: Mark Ready for Delivery**
```
POST /api/orders/:orderId/ready
```

#### Handling Issues

**If ingredient unavailable or cannot fulfill order:**
```
POST /api/orders/:orderId/reject
Body: { "reason": "Paneer out of stock" }
```

**If customer requests cancellation:**
```
PATCH /api/orders/:id/admin-cancel
Body: { "reason": "Customer requested cancellation" }
```

---

## Implementation Example (React Native)

### Setup Authentication

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://food-delivery-backend-y6lw.onrender.com/api';

// Login and store token
export const login = async (username, password) => {
  try {
    const response = await fetch(`${BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (data.success) {
      await AsyncStorage.setItem('authToken', data.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.data.admin));
      return { success: true, user: data.data.admin };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};

// Get stored token
export const getAuthToken = async () => {
  return await AsyncStorage.getItem('authToken');
};

// Authenticated API call helper
export const authenticatedFetch = async (endpoint, options = {}) => {
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
};
```

### Fetch Dashboard Data

```javascript
export const fetchKitchenDashboard = async () => {
  try {
    const response = await authenticatedFetch('/orders/kitchen/dashboard');
    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        stats: data.data.stats,
        pendingOrders: data.data.pendingOrders,
        preparingOrders: data.data.preparingOrders,
      };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    return { success: false, message: 'Failed to fetch dashboard' };
  }
};
```

### Accept Order

```javascript
export const acceptOrder = async (orderId) => {
  try {
    const response = await authenticatedFetch(`/orders/${orderId}/accept`, {
      method: 'POST',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Failed to accept order' };
  }
};
```

### Update Preparation Status

```javascript
export const updatePreparationStatus = async (orderId, status) => {
  try {
    const response = await authenticatedFetch(
      `/orders/${orderId}/preparation-status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ preparationStatus: status }),
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Failed to update status' };
  }
};
```

### Mark Order Ready

```javascript
export const markOrderReady = async (orderId) => {
  try {
    const response = await authenticatedFetch(`/orders/${orderId}/ready`, {
      method: 'POST',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Failed to mark order ready' };
  }
};
```

---

## Best Practices

1. **Token Management**
   - Store JWT token securely (AsyncStorage in React Native)
   - Implement token refresh logic before 7-day expiry
   - Clear token on logout

2. **Error Handling**
   - Always check `response.success` before accessing data
   - Handle 401 errors by redirecting to login
   - Show user-friendly error messages

3. **Real-time Updates**
   - Poll dashboard endpoint every 30-60 seconds during service
   - Consider implementing WebSocket for real-time updates (future enhancement)

4. **Offline Support**
   - Cache dashboard data for offline viewing
   - Queue order actions when offline and sync when online

5. **Performance**
   - Use pagination for order lists
   - Implement pull-to-refresh for dashboard
   - Cache user profile data

6. **UX Considerations**
   - Show loading states during API calls
   - Provide confirmation dialogs for reject/cancel actions
   - Display timestamps in local timezone
   - Use visual indicators for order status (colors, icons)

---

## Support & Additional Resources

**Backend Repository:** Check with admin for access
**Frontend Repository:** Check with admin for access
**Issue Reporting:** Contact development team

**Related Documentation:**
- [Cloudinary File Upload API](./src/cloudinary/README.md)
- Customer API Documentation (if available)
- Driver API Documentation (if available)

---

**Document prepared for:** React Native Frontend Development (Android & iOS)
**API Stability:** Production-ready
**Breaking Changes:** Will be communicated with version updates
