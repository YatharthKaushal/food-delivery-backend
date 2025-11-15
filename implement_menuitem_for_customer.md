# Menu Item & Ordering API Documentation for Customer Frontend

**Target Platform**: React Native (without Expo)
**Base URL**: `https://tiffin-delivery-software.onrender.com`
**Authentication**: Firebase Authentication (Token-based)

---

## Table of Contents
1. [Authentication Setup](#authentication-setup)
2. [Menu Browsing](#menu-browsing)
3. [Addon Management](#addon-management)
4. [Order Management](#order-management)
5. [Profile Management](#profile-management)
6. [Standard Response Format](#standard-response-format)
7. [Error Handling Guidelines](#error-handling-guidelines)
8. [User Flows](#user-flows)

---

## Quick Reference: All Endpoints

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | GET | `/api/menu-items` | Optional | Get all menu items with filtering |
| 2 | GET | `/api/menu-items/:id` | Optional | Get single menu item details |
| 3 | GET | `/api/addons/menu-item/:menuItemId` | Optional | **Get addons for menu item** (for drawer) |
| 4 | GET | `/api/addons` | Optional | Get all addons (optional) |
| 5 | GET | `/api/addons/:id` | Optional | Get single addon details |
| 6 | POST | `/api/orders` | Required | **Create new order** (with addons) |
| 7 | GET | `/api/orders/my-orders` | Required | Get customer's orders |
| 8 | GET | `/api/orders/:id` | Required | Get order details |
| 9 | PATCH | `/api/orders/:id/cancel` | Required | Cancel order |
| 10 | POST | `/api/orders/:orderId/refund` | Required | Request refund |
| 11 | - | Customer Profile | - | Managed via Firebase Auth |

**Most Important Endpoints for Customer App:**
1. `GET /api/menu-items` - Browse menu
2. `GET /api/addons/menu-item/:menuItemId` - Get addons when user clicks "Order Now"
3. `POST /api/orders` - Create order with selected menu item and addons
4. `GET /api/orders/my-orders` - View order history
5. `GET /api/orders/:id` - Track order status

---

## Authentication Setup

### Firebase Token Authentication
All customer endpoints require Firebase authentication token in the request headers.

**Headers Required**:
```javascript
{
  "Authorization": "Bearer <firebase_id_token>"
}
```

**Middleware Used**:
- `verifyFirebaseToken` - Required authentication
- `verifyFirebaseTokenOptional` - Optional authentication (for public routes)
- `attachCustomer` - Automatically attaches customer data to request

**Implementation Notes**:
- Obtain Firebase ID token after user signs in with Firebase Auth
- Token should be refreshed periodically (Firebase handles this)
- Include token in all authenticated requests
- Handle 401 Unauthorized errors by redirecting to login

---

## Menu Browsing

### 1. Get All Menu Items

**Endpoint**: `GET /api/menu-items`
**Authentication**: Optional (public endpoint)
**Description**: Retrieve all available menu items with filtering and pagination

#### Request Parameters (Query String)
```javascript
{
  mealType?: "LUNCH" | "DINNER",           // Filter by meal type
  isLive?: boolean,                         // Filter by live status (true/false)
  includeDeleted?: boolean,                 // Admin only - include deleted items
  sortBy?: string,                          // Sort field (default: "createdAt")
  sortOrder?: "asc" | "desc",              // Sort order (default: "desc")
  page?: number,                            // Page number (default: 1)
  limit?: number                            // Items per page (default: 20, max: 100)
}
```

#### Success Response (200 OK)
```javascript
{
  success: true,
  message: "Menu items retrieved successfully",
  data: {
    menuItems: [
      {
        _id: "507f1f77bcf86cd799439011",
        name: "Dal Chawal Combo",
        content: "Dal, Rice, Roti, Salad",
        description: "Traditional dal with steamed rice, fresh roti and salad",
        price: 120,
        compareAtPrice: 150,  // Optional - original price (for showing discounts)
        mealType: "LUNCH",
        media: {
          thumbnail: "https://cloudinary.com/.../thumbnail.jpg",
          shuffle: [
            "https://cloudinary.com/.../image1.jpg",
            "https://cloudinary.com/.../image2.jpg"
          ]
        },
        isLive: true,
        isDeleted: false,
        deletedAt: null,
        createdAt: "2024-01-15T10:30:00.000Z",
        updatedAt: "2024-01-15T10:30:00.000Z"
      }
      // ... more items
    ],
    pagination: {
      currentPage: 1,
      totalPages: 5,
      totalItems: 95,
      itemsPerPage: 20,
      hasNextPage: true,
      hasPreviousPage: false
    }
  }
}
```

#### Error Responses
- **400 Bad Request**: Invalid query parameters
```javascript
{
  success: false,
  message: "Invalid meal type. Must be LUNCH or DINNER",
  data: null
}
```

- **500 Internal Server Error**: Server error
```javascript
{
  success: false,
  message: "Failed to retrieve menu items",
  data: null
}
```

#### Frontend Implementation Notes
- Show only items where `isLive: true` and `isDeleted: false`
- Use `media.thumbnail` for list view images
- Use `media.shuffle` array for image gallery in detail view
- Display `content` field to show what's included in the meal
- Show discount badge if `compareAtPrice` exists and is greater than `price`
- Implement infinite scroll or pagination
- Cache menu items to reduce API calls
- Refresh menu data when app comes to foreground
- Filter by meal type based on user preference or time of day
- Display placeholder images if `media.thumbnail` is missing

---

### 2. Get Single Menu Item

**Endpoint**: `GET /api/menu-items/:id`
**Authentication**: Optional (public endpoint)
**Description**: Get detailed information about a specific menu item

#### Request Parameters
- `:id` - Menu item ID (path parameter)

#### Success Response (200 OK)
```javascript
{
  success: true,
  message: "Menu item retrieved successfully",
  data: {
    _id: "507f1f77bcf86cd799439011",
    name: "Dal Chawal Combo",
    content: "Dal, Rice, Roti, Salad",
    description: "Traditional dal with steamed rice, fresh roti, pickle and salad. A wholesome and nutritious meal.",
    price: 120,
    compareAtPrice: 150,
    mealType: "LUNCH",
    media: {
      thumbnail: "https://cloudinary.com/.../thumbnail.jpg",
      shuffle: [
        "https://cloudinary.com/.../image1.jpg",
        "https://cloudinary.com/.../image2.jpg",
        "https://cloudinary.com/.../image3.jpg"
      ]
    },
    isLive: true,
    isDeleted: false,
    deletedAt: null,
    createdAt: "2024-01-15T10:30:00.000Z",
    updatedAt: "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses
- **404 Not Found**: Menu item doesn't exist
```javascript
{
  success: false,
  message: "Menu item not found",
  data: null
}
```

#### Frontend Implementation Notes
- Use for detailed view when user taps on menu item
- Handle 404 gracefully (show "Item not available" message)
- Display all details including description and price
- Show image gallery using `media.shuffle` array
- Display "What's Included" section using `content` field
- Show "Add to Cart" or "Order Now" button
- When user taps order button, fetch addons for this menu item (see Addon Management below)

---

## Addon Management

Addons are extra items that customers can add to their menu item order (e.g., Extra Roti, Beverage, Dessert, etc.). Each addon is linked to a specific menu item via `menuItemId`.

### 3. Get Addons for Menu Item

**Endpoint**: `GET /api/addons/menu-item/:menuItemId`
**Authentication**: Optional (public endpoint)
**Description**: Get all available addons for a specific menu item. Use this when user clicks on a menu item to show addon selection drawer.

#### Request Parameters
- `:menuItemId` - Menu Item ID (path parameter)

#### Success Response (200 OK)
```javascript
{
  success: true,
  message: "Addons retrieved successfully",
  data: {
    addons: [
      {
        _id: "507f1f77bcf86cd799439012",
        name: "Extra Roti",
        menuItemId: "507f1f77bcf86cd799439011",
        contents: "2 pieces",
        description: "Freshly made whole wheat roti",
        price: 15,
        category: "SIDE_DISH",
        tags: ["vegetarian", "popular"],
        imageUrl: "https://cloudinary.com/.../roti.jpg",
        isLive: true,
        isDeleted: false,
        deletedAt: null,
        createdAt: "2024-01-15T10:30:00.000Z",
        updatedAt: "2024-01-15T10:30:00.000Z"
      },
      {
        _id: "507f1f77bcf86cd799439013",
        name: "Mango Lassi",
        menuItemId: "507f1f77bcf86cd799439011",
        contents: "250ml",
        description: "Sweet and refreshing mango yogurt drink",
        price: 40,
        category: "BEVERAGE",
        tags: ["cold", "sweet", "popular"],
        imageUrl: "https://cloudinary.com/.../lassi.jpg",
        isLive: true,
        isDeleted: false,
        deletedAt: null,
        createdAt: "2024-01-15T10:30:00.000Z",
        updatedAt: "2024-01-15T10:30:00.000Z"
      },
      {
        _id: "507f1f77bcf86cd799439014",
        name: "Gulab Jamun",
        menuItemId: "507f1f77bcf86cd799439011",
        contents: "2 pieces",
        description: "Traditional Indian sweet dessert",
        price: 30,
        category: "SWEETS",
        tags: ["dessert", "sweet", "traditional"],
        imageUrl: "https://cloudinary.com/.../gulabjamun.jpg",
        isLive: true,
        isDeleted: false,
        deletedAt: null,
        createdAt: "2024-01-15T10:30:00.000Z",
        updatedAt: "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

#### Addon Categories
- `BEVERAGE` - Drinks (lassi, juice, etc.)
- `SWEETS` - Sweet items
- `DESSERT` - Desserts
- `CONDIMENT` - Extra sauces, chutneys
- `ICE_CREAM` - Ice cream
- `LAVA_CAKE` - Lava cakes
- `SNACK` - Snacks
- `SIDE_DISH` - Side dishes (extra roti, rice, etc.)
- `OTHER` - Other items

#### Error Responses
- **404 Not Found**: Menu item doesn't exist
```javascript
{
  success: false,
  message: "Menu item not found",
  data: null
}
```

- **500 Internal Server Error**: Server error
```javascript
{
  success: false,
  message: "Failed to retrieve addons",
  data: null
}
```

#### Frontend Implementation Notes
- Call this endpoint when user taps on "Order Now" or "Add to Cart" button
- Show addons in a bottom drawer/modal
- Group addons by category for better UX
- Show only addons where `isLive: true` and `isDeleted: false`
- Display addon images, name, price, and description
- Allow multiple addon selection (checkboxes)
- Calculate and display total price (menu item + selected addons)
- Handle empty addon list (show "No addons available" or skip this step)
- Use `contents` field to show quantity/size info
- Display tags for quick filtering (vegetarian, popular, etc.)

---

### 4. Get All Addons

**Endpoint**: `GET /api/addons`
**Authentication**: Optional (public endpoint)
**Description**: Get all addons with filtering and pagination. Useful for browsing all available addons across menu items.

#### Request Parameters (Query String)
```javascript
{
  category?: "BEVERAGE" | "SWEETS" | "DESSERT" | "CONDIMENT" | "ICE_CREAM" | "LAVA_CAKE" | "SNACK" | "SIDE_DISH" | "OTHER",
  isLive?: boolean,
  includeDeleted?: boolean,  // Admin only
  sortBy?: string,           // Default: "createdAt"
  sortOrder?: "asc" | "desc", // Default: "desc"
  page?: number,             // Default: 1
  limit?: number             // Default: 20, max: 100
}
```

#### Success Response (200 OK)
```javascript
{
  success: true,
  message: "Addons retrieved successfully",
  data: {
    addons: [
      {
        _id: "507f1f77bcf86cd799439012",
        name: "Extra Roti",
        menuItemId: "507f1f77bcf86cd799439011",
        contents: "2 pieces",
        description: "Freshly made whole wheat roti",
        price: 15,
        category: "SIDE_DISH",
        tags: ["vegetarian", "popular"],
        imageUrl: "https://cloudinary.com/.../roti.jpg",
        isLive: true,
        isDeleted: false,
        createdAt: "2024-01-15T10:30:00.000Z",
        updatedAt: "2024-01-15T10:30:00.000Z"
      }
      // ... more addons
    ],
    pagination: {
      currentPage: 1,
      totalPages: 3,
      totalItems: 52,
      itemsPerPage: 20,
      hasNextPage: true,
      hasPreviousPage: false
    }
  }
}
```

#### Frontend Implementation Notes
- This endpoint is optional - mainly use `GET /api/addons/menu-item/:menuItemId` instead
- Can be used for creating a standalone "Browse All Addons" feature
- Filter by category to show specific addon types

---

### 5. Get Single Addon

**Endpoint**: `GET /api/addons/:id`
**Authentication**: Optional (public endpoint)
**Description**: Get detailed information about a specific addon

#### Request Parameters
- `:id` - Addon ID (path parameter)

#### Success Response (200 OK)
```javascript
{
  success: true,
  message: "Addon retrieved successfully",
  data: {
    _id: "507f1f77bcf86cd799439012",
    name: "Extra Roti",
    menuItemId: "507f1f77bcf86cd799439011",
    contents: "2 pieces",
    description: "Freshly made whole wheat roti, perfect to complement your meal",
    price: 15,
    category: "SIDE_DISH",
    tags: ["vegetarian", "popular", "healthy"],
    imageUrl: "https://cloudinary.com/.../roti.jpg",
    isLive: true,
    isDeleted: false,
    deletedAt: null,
    createdAt: "2024-01-15T10:30:00.000Z",
    updatedAt: "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses
- **404 Not Found**: Addon doesn't exist
```javascript
{
  success: false,
  message: "Addon not found",
  data: null
}
```

#### Frontend Implementation Notes
- Use for showing addon detail modal/screen
- Display full description and image
- Show "Add to Cart" button
- Link back to parent menu item

---

## Order Management

### 6. Create Order

**Endpoint**: `POST /api/orders`
**Authentication**: Required (Firebase token)
**Description**: Create a new order for authenticated customer

#### Request Headers
```javascript
{
  "Authorization": "Bearer <firebase_id_token>",
  "Content-Type": "application/json"
}
```

#### Request Body
```javascript
{
  menuItemId: "507f1f77bcf86cd799439011",      // Required
  mealType: "LUNCH" | "DINNER",                // Required
  scheduledForDate: "2024-01-20",              // Required - YYYY-MM-DD format
  quantity: 1,                                  // Required - positive integer
  addons?: [                                    // Optional - array of addon IDs
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ],
  specialInstructions?: "No spicy food please", // Optional - string
  deliveryAddress: {                            // Required
    street: "123 Main Street",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    landmark?: "Near City Mall"
  }
}
```

#### Success Response (201 Created)
```javascript
{
  success: true,
  message: "Order created successfully",
  data: {
    _id: "507f1f77bcf86cd799439020",
    customerId: "507f1f77bcf86cd799439015",
    menuItemId: "507f1f77bcf86cd799439011",
    mealType: "LUNCH",
    scheduledForDate: "2024-01-20T00:00:00.000Z",
    quantity: 1,
    addons: ["507f1f77bcf86cd799439012"],
    specialInstructions: "No spicy food please",
    deliveryAddress: {
      street: "123 Main Street",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      landmark: "Near City Mall"
    },
    status: "placed",
    totalAmount: 150,
    createdAt: "2024-01-15T10:30:00.000Z",
    updatedAt: "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses
- **400 Bad Request**: Validation errors
```javascript
{
  success: false,
  message: "Validation failed",
  data: {
    errors: [
      "menuItemId is required",
      "scheduledForDate must be a future date",
      "Invalid meal type"
    ]
  }
}
```

- **401 Unauthorized**: Missing or invalid Firebase token
```javascript
{
  success: false,
  message: "Unauthorized. Please login again.",
  data: null
}
```

- **404 Not Found**: Menu item or addon not found
```javascript
{
  success: false,
  message: "Menu item not found or not available",
  data: null
}
```

- **409 Conflict**: Order already exists for this date/meal
```javascript
{
  success: false,
  message: "You already have an order for this meal on this date",
  data: null
}
```

#### Frontend Implementation Notes
- Validate all required fields before submission
- Ensure `scheduledForDate` is a future date (at least tomorrow)
- Show total amount calculation before order confirmation
- Handle quantity changes and recalculate total
- Store delivery address for future use
- Show loading state during order creation
- Navigate to order confirmation screen on success
- Handle all error cases with user-friendly messages

---

### 7. Get My Orders

**Endpoint**: `GET /api/orders/my-orders`
**Authentication**: Required (Firebase token)
**Description**: Get all orders for the authenticated customer

#### Request Parameters (Query String)
```javascript
{
  mealType?: "LUNCH" | "DINNER",               // Filter by meal type
  scheduledForDate?: "2024-01-20",             // Filter by date (YYYY-MM-DD)
  status?: "active" | "delivered" | "cancelled", // Filter by status
  includeDeleted?: boolean,                     // Include deleted orders
  sortBy?: string,                              // Sort field (default: "scheduledForDate")
  sortOrder?: "asc" | "desc",                  // Sort order (default: "desc")
  page?: number,                                // Page number (default: 1)
  limit?: number                                // Items per page (default: 20, max: 100)
}
```

#### Success Response (200 OK)
```javascript
{
  success: true,
  message: "Orders retrieved successfully",
  data: {
    orders: [
      {
        _id: "507f1f77bcf86cd799439020",
        customerId: "507f1f77bcf86cd799439015",
        menuItemId: {
          _id: "507f1f77bcf86cd799439011",
          name: "Dal Chawal Combo",
          imageUrl: "https://cloudinary.com/...",
          price: 120
        },
        mealType: "LUNCH",
        scheduledForDate: "2024-01-20T00:00:00.000Z",
        quantity: 1,
        status: "placed",
        preparationStatus: null,
        totalAmount: 150,
        deliveryAddress: {
          street: "123 Main Street",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001"
        },
        createdAt: "2024-01-15T10:30:00.000Z",
        updatedAt: "2024-01-15T10:30:00.000Z"
      }
      // ... more orders
    ],
    pagination: {
      currentPage: 1,
      totalPages: 3,
      totalItems: 52,
      itemsPerPage: 20,
      hasNextPage: true,
      hasPreviousPage: false
    }
  }
}
```

#### Order Status Values
- `placed` - Order placed, awaiting acceptance
- `accepted` - Order accepted by kitchen
- `preparing` - Order is being prepared
- `ready` - Order ready for delivery
- `outForDelivery` - Order out for delivery
- `delivered` - Order delivered successfully
- `cancelled` - Order cancelled
- `failed` - Order failed

#### Preparation Status Values
- `null` - Not started
- `started` - Preparation started
- `in-progress` - In progress
- `almost-ready` - Almost ready

#### Frontend Implementation Notes
- Show orders grouped by date or status
- Display order status with appropriate icons/colors
- Implement pull-to-refresh functionality
- Show upcoming orders at the top
- Allow filtering by meal type and status
- Display "No orders" message when empty
- Show cancellation option only for eligible orders

---

### 8. Get Order by ID

**Endpoint**: `GET /api/orders/:id`
**Authentication**: Required (Firebase token)
**Description**: Get detailed information about a specific order (customer's own order only)

#### Request Parameters
- `:id` - Order ID (path parameter)

#### Success Response (200 OK)
```javascript
{
  success: true,
  message: "Order retrieved successfully",
  data: {
    _id: "507f1f77bcf86cd799439020",
    customerId: "507f1f77bcf86cd799439015",
    menuItemId: {
      _id: "507f1f77bcf86cd799439011",
      name: "Dal Chawal Combo",
      description: "Traditional dal with steamed rice",
      imageUrl: "https://cloudinary.com/...",
      price: 120
    },
    addons: [
      {
        _id: "507f1f77bcf86cd799439012",
        name: "Extra Roti",
        price: 15
      }
    ],
    mealType: "LUNCH",
    scheduledForDate: "2024-01-20T00:00:00.000Z",
    quantity: 1,
    specialInstructions: "No spicy food please",
    status: "preparing",
    preparationStatus: "in-progress",
    totalAmount: 150,
    deliveryAddress: {
      street: "123 Main Street",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      landmark: "Near City Mall"
    },
    deliveryDetails: {
      driverId: "507f1f77bcf86cd799439030",
      driverName: "Rajesh Kumar",
      driverPhone: "+919876543210",
      estimatedDeliveryTime: "2024-01-20T12:30:00.000Z"
    },
    refundDetails: {
      status: null,
      requestedAt: null,
      processedAt: null,
      amount: null,
      reason: null
    },
    createdAt: "2024-01-15T10:30:00.000Z",
    updatedAt: "2024-01-20T11:00:00.000Z"
  }
}
```

#### Error Responses
- **401 Unauthorized**: Not logged in
```javascript
{
  success: false,
  message: "Unauthorized. Please login again.",
  data: null
}
```

- **403 Forbidden**: Trying to access another customer's order
```javascript
{
  success: false,
  message: "You don't have permission to view this order",
  data: null
}
```

- **404 Not Found**: Order doesn't exist
```javascript
{
  success: false,
  message: "Order not found",
  data: null
}
```

#### Frontend Implementation Notes
- Use for order detail/tracking screen
- Show real-time status updates (consider implementing polling or websockets)
- Display driver information when available
- Show estimated delivery time
- Allow cancellation if eligible
- Display refund status if applicable

---

### 9. Cancel Order

**Endpoint**: `PATCH /api/orders/:id/cancel`
**Authentication**: Required (Firebase token)
**Description**: Cancel customer's own order (subject to time restrictions)

#### Request Parameters
- `:id` - Order ID (path parameter)

#### Request Body
```javascript
{
  reason?: "Changed my mind" | "Ordered by mistake" | "Other"  // Optional
}
```

#### Success Response (200 OK)
```javascript
{
  success: true,
  message: "Order cancelled successfully",
  data: {
    _id: "507f1f77bcf86cd799439020",
    status: "cancelled",
    cancelledAt: "2024-01-19T10:30:00.000Z",
    cancellationReason: "Changed my mind"
  }
}
```

#### Error Responses
- **400 Bad Request**: Cannot cancel (time restriction or status issue)
```javascript
{
  success: false,
  message: "Cannot cancel order. Cancellation deadline has passed.",
  data: {
    deadline: "2024-01-19T23:00:00.000Z",
    currentStatus: "preparing"
  }
}
```

- **403 Forbidden**: Not your order
```javascript
{
  success: false,
  message: "You don't have permission to cancel this order",
  data: null
}
```

- **404 Not Found**: Order not found
```javascript
{
  success: false,
  message: "Order not found",
  data: null
}
```

- **409 Conflict**: Order already cancelled or delivered
```javascript
{
  success: false,
  message: "Order is already cancelled",
  data: null
}
```

#### Cancellation Rules
- Orders can typically be cancelled up to a certain time before scheduled delivery
- Orders in `delivered` status cannot be cancelled (use refund instead)
- Orders in `outForDelivery` status may not be cancellable
- Check backend business rules for specific time restrictions

#### Frontend Implementation Notes
- Show cancellation option only when allowed
- Display warning dialog before cancellation
- Show reason selection UI
- Handle time restriction errors gracefully
- Redirect to refund option if cancellation not allowed
- Update order list after successful cancellation

---

### 10. Request Refund

**Endpoint**: `POST /api/orders/:orderId/refund`
**Authentication**: Required (Firebase token)
**Description**: Request refund for a delivered or cancelled order

#### Request Parameters
- `:orderId` - Order ID (path parameter)

#### Request Body
```javascript
{
  reason: "Food quality issue" | "Wrong item delivered" | "Late delivery" | "Other"  // Optional
}
```

#### Success Response (200 OK)
```javascript
{
  success: true,
  message: "Refund request submitted successfully. Admin will review it shortly.",
  data: {
    orderId: "507f1f77bcf86cd799439020",
    refundDetails: {
      status: "pending",
      requestedAt: "2024-01-20T14:30:00.000Z",
      amount: 150,
      reason: "Food quality issue",
      customerNotes: null,
      adminNotes: null
    }
  }
}
```

#### Error Responses
- **400 Bad Request**: Cannot request refund
```javascript
{
  success: false,
  message: "Refund already requested for this order",
  data: null
}
```

- **403 Forbidden**: Not your order
```javascript
{
  success: false,
  message: "You don't have permission to request refund for this order",
  data: null
}
```

- **404 Not Found**: Order not found
```javascript
{
  success: false,
  message: "Order not found",
  data: null
}
```

#### Refund Status Values
- `pending` - Refund requested, awaiting admin review
- `processed` - Refund approved and processed
- `rejected` - Refund request rejected

#### Frontend Implementation Notes
- Show refund option for delivered orders
- Allow refund request only once per order
- Show reason selection UI
- Display refund status in order details
- Show admin notes when refund is processed/rejected
- Notify user when refund status changes

---

## Profile Management

### 11. Get Customer Profile

**Note**: Based on the routes provided, customer profile endpoints are managed through Firebase Authentication. The `attachCustomer` middleware automatically attaches customer data to requests.

#### Customer Data Structure (from middleware)
```javascript
{
  customerId: "507f1f77bcf86cd799439015",
  firebaseUid: "firebase_uid_string",
  email: "customer@example.com",
  phone: "+919876543210",
  name: "John Doe",
  // ... other customer fields
}
```

#### Frontend Implementation Notes
- Customer profile is managed through Firebase Auth
- Access customer data from `attachCustomer` middleware response
- Update profile using Firebase Auth methods
- Store frequently used data (delivery addresses) locally
- Implement address management for faster checkout

---

## Standard Response Format

All API responses follow this consistent structure:

### Success Response
```javascript
{
  success: true,
  message: "Operation completed successfully",
  data: { /* response data */ }
}
```

### Error Response
```javascript
{
  success: false,
  message: "Error message describing what went wrong",
  data: null // or error details object
}
```

---

## Error Handling Guidelines

### 1. Network Errors
```javascript
try {
  const response = await fetch(url, options);
  // Handle response
} catch (error) {
  // Network error - no internet, server down, timeout
  console.error('Network error:', error);
  showToast('Please check your internet connection');
}
```

### 2. HTTP Status Codes
```javascript
const response = await fetch(url, options);

if (!response.ok) {
  const errorData = await response.json();

  switch (response.status) {
    case 400:
      // Bad Request - validation errors
      handleValidationErrors(errorData);
      break;
    case 401:
      // Unauthorized - invalid/expired token
      handleAuthError();
      break;
    case 403:
      // Forbidden - insufficient permissions
      showToast('You don\'t have permission to perform this action');
      break;
    case 404:
      // Not Found - resource doesn't exist
      showToast('Requested item not found');
      break;
    case 409:
      // Conflict - duplicate or state conflict
      showToast(errorData.message);
      break;
    case 500:
      // Server Error
      showToast('Something went wrong. Please try again later');
      break;
    default:
      showToast('An unexpected error occurred');
  }
}
```

### 3. Token Refresh Handling
```javascript
// Implement automatic token refresh
const getAuthToken = async () => {
  const user = auth().currentUser;
  if (user) {
    const token = await user.getIdToken(true); // Force refresh
    return token;
  }
  throw new Error('User not authenticated');
};

// Use interceptor pattern
const apiCall = async (url, options = {}) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      // Token might be expired, try refresh once
      const newToken = await getAuthToken();
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`,
        },
      });
      return retryResponse;
    }

    return response;
  } catch (error) {
    throw error;
  }
};
```

### 4. Edge Cases to Handle

#### Menu Items
- Empty menu list (no items available)
- All items marked as not live
- Missing or broken image URLs (both `media.thumbnail` and `media.shuffle`)
- Price changes between viewing and ordering
- Item becomes unavailable during checkout
- Menu item has no addons available
- Addons become unavailable after selection
- Invalid addon IDs in order request

#### Orders
- Duplicate order prevention (same meal, same date)
- Past date selection prevention
- Quantity limits (min/max)
- Network failure during order submission
- Order status not updating
- Driver assignment delays
- Late delivery scenarios

#### Authentication
- Token expiration during session
- User logged out on another device
- Firebase auth state changes
- Network issues during auth
- Biometric authentication failures

#### Pagination
- End of list handling
- Empty result sets
- Inconsistent page sizes
- Data changes during pagination

### 5. Recommended Error UI Patterns

```javascript
// Toast for minor errors
showToast('Please fill in all required fields');

// Alert dialog for critical errors
Alert.alert(
  'Order Failed',
  'Unable to create order. Please try again.',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Retry', onPress: () => retryOrder() }
  ]
);

// Error boundary for component crashes
class ErrorBoundary extends React.Component {
  // ... implementation
}

// Inline error messages for form validation
<TextInput
  error={errors.phone}
  helperText={errors.phone ? 'Invalid phone number' : ''}
/>

// Loading states
{isLoading ? <ActivityIndicator /> : <OrderList />}

// Empty states
{orders.length === 0 && !isLoading && (
  <EmptyState
    icon="receipt"
    title="No orders yet"
    message="Start ordering your favorite meals!"
  />
)}
```

### 6. Retry Logic
```javascript
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Exponential backoff: wait 1s, 2s, 4s
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Usage
const orders = await retryWithBackoff(() =>
  fetchOrders({ page: 1, limit: 20 })
);
```

---

## User Flows

### Flow 1: Browse Menu and Create Order

```
1. User opens app
   ├─ App checks auth state
   └─ If authenticated, proceed; else redirect to login

2. User views menu screen
   ├─ GET /api/menu-items?mealType=LUNCH&page=1&limit=20
   ├─ Display menu items in grid/list
   └─ Show filter/sort options

3. User filters by meal type
   ├─ GET /api/menu-items?mealType=DINNER&page=1&limit=20
   └─ Update display

4. User taps on menu item
   ├─ GET /api/menu-items/:id
   └─ Show detail modal/screen with image gallery

5. User taps "Order Now" or "Add to Cart"
   ├─ GET /api/addons/menu-item/:menuItemId
   └─ Show addon selection drawer/bottom sheet

6. Addon selection drawer opens
   ├─ Display all available addons grouped by category
   ├─ Show addon images, names, prices, and descriptions
   ├─ User selects desired addons (checkboxes/toggle)
   ├─ Calculate total: menuItem.price + sum(selectedAddons.price)
   ├─ Display running total at bottom
   └─ User taps "Continue" or "Proceed to Order"

7. User fills order details
   ├─ Navigate to order form
   ├─ Pre-fill menu item details and selected addons
   ├─ Select scheduled date (must be future date)
   ├─ Select quantity (default: 1)
   ├─ Add special instructions (optional)
   ├─ Select/enter delivery address
   └─ Review total amount (shows breakdown: item + addons)

8. User confirms order
   ├─ Validate all fields
   ├─ POST /api/orders with order details including addon IDs
   ├─ Request body includes: menuItemId, addons array, mealType, scheduledForDate, quantity, deliveryAddress
   ├─ Show loading state
   └─ Handle response

9. Success
   ├─ Show success message
   ├─ Navigate to order tracking screen
   └─ GET /api/orders/:id to show order details

10. Error
   ├─ Parse error message
   ├─ Show appropriate error UI
   └─ Allow user to retry or modify
```

### Flow 2: View and Track Orders

```
1. User navigates to "My Orders"
   ├─ GET /api/orders/my-orders?sortBy=scheduledForDate&sortOrder=desc
   └─ Display orders grouped by status or date

2. User filters orders
   ├─ User selects filter (Upcoming, Past, Cancelled)
   ├─ GET /api/orders/my-orders?status=active
   └─ Update display

3. User taps on order
   ├─ GET /api/orders/:id
   └─ Show full order details

4. User tracks order status
   ├─ Display current status with progress indicator
   ├─ Show preparation status if available
   ├─ Show driver details if assigned
   └─ Poll for updates every 30-60 seconds (when order is active)

5. User wants to cancel
   ├─ Check if cancellation is allowed (based on status and time)
   ├─ Show confirmation dialog
   ├─ PATCH /api/orders/:id/cancel
   └─ Update order list on success
```

### Flow 3: Cancel Order and Request Refund

```
1. User opens order details
   └─ GET /api/orders/:id

2. User taps "Cancel Order"
   ├─ Check order status and scheduled time
   ├─ Show cancellation confirmation dialog
   └─ Show reason selection (optional)

3. User confirms cancellation
   ├─ PATCH /api/orders/:id/cancel
   └─ Handle response

4. Cancellation Success
   ├─ Show success message
   ├─ Update order status to "cancelled"
   └─ Refresh order list

5. Cancellation Failed (time restriction)
   ├─ Show error message
   ├─ Suggest refund option instead
   └─ Show "Request Refund" button

6. User requests refund
   ├─ Show refund reason selection
   └─ POST /api/orders/:orderId/refund

7. Refund request submitted
   ├─ Show success message
   ├─ Update order with refund status "pending"
   └─ Notify user that admin will review

8. User checks refund status
   ├─ GET /api/orders/:id
   ├─ Check refundDetails.status
   └─ Show status and admin notes if available
```

### Flow 4: Handle Order Status Updates

```
Order Status Progression:
1. placed → Order created, awaiting kitchen acceptance
2. accepted → Kitchen accepted the order
3. preparing → Order is being prepared (with preparationStatus updates)
4. ready → Order ready for delivery
5. outForDelivery → Driver picked up, on the way
6. delivered → Order delivered successfully

Alternative paths:
- cancelled → User or admin cancelled
- failed → Order failed for some reason

Preparation Status (when status = "preparing"):
- started → Kitchen started preparing
- in-progress → Actively cooking
- almost-ready → Almost done

UI Implementation:
├─ Show progress bar based on status
├─ Display status-specific icons and colors
├─ Show estimated time for each status
├─ Enable/disable actions based on status
└─ Poll for updates when order is active
```

### Flow 5: Addon Selection Drawer

```
1. User taps "Order Now" on menu item detail screen
   ├─ Store selected menu item in state
   └─ GET /api/addons/menu-item/:menuItemId

2. API returns addon list
   ├─ Check if addons array is empty
   ├─ If empty: Skip addon step, go directly to order form
   └─ If not empty: Show addon selection drawer

3. Addon drawer opens from bottom
   ├─ Show menu item summary at top (name, price, image)
   ├─ Display "Add Extras" or "Customize Your Order" header
   └─ List all addons grouped by category

4. Display addons by category
   ├─ BEVERAGES section
   │  └─ Show all beverage addons with checkbox/toggle
   ├─ SIDE_DISH section
   │  └─ Show all side dish addons
   ├─ SWEETS/DESSERTS section
   │  └─ Show all dessert addons
   └─ OTHER categories as applicable

5. User browses and selects addons
   ├─ Tap checkbox to select/deselect addon
   ├─ See addon image, name, price, contents
   ├─ Total price updates in real-time
   ├─ Total = menuItem.price + sum(selectedAddons.price)
   └─ Display total prominently at drawer bottom

6. Addon card displays
   ├─ Addon image (thumbnail)
   ├─ Addon name
   ├─ Contents (e.g., "2 pieces", "250ml")
   ├─ Price (e.g., "+₹15")
   ├─ Checkbox/toggle for selection
   └─ Optional: Tags (vegetarian, popular, etc.)

7. Bottom section shows
   ├─ Total amount: ₹XXX
   ├─ Breakdown: Item (₹120) + 2 addons (₹55)
   └─ "Continue" or "Add to Cart" button

8. User taps "Continue"
   ├─ Close addon drawer
   ├─ Navigate to order form
   ├─ Pass selected addons to next screen
   └─ Pre-fill: menuItem, selectedAddonIds array

9. Edge cases to handle
   ├─ No addons available → Skip drawer, go directly to order form
   ├─ API error fetching addons → Show error, allow skip or retry
   ├─ User closes drawer without selecting → Ask if they want to continue without addons
   └─ All addons marked not live → Show "No addons available" message
```

### Flow 6: Error Recovery Patterns

```
Network Error:
├─ Show "No internet connection" message
├─ Provide "Retry" button
└─ Cache data for offline viewing

Auth Error (401):
├─ Clear local auth state
├─ Redirect to login screen
└─ Return to original screen after login

Validation Error (400):
├─ Parse error.data.errors array
├─ Highlight invalid fields
├─ Show inline error messages
└─ Enable user to correct and resubmit

Server Error (500):
├─ Show generic error message
├─ Log error details for debugging
├─ Provide "Try again later" message
└─ Implement retry logic with backoff

Not Found (404):
├─ Show "Item not found" message
├─ Remove item from local cache
└─ Navigate back to list view

Conflict (409):
├─ Show specific conflict message
├─ Suggest alternative action
└─ Update local state
```

---

## Additional Implementation Recommendations

### 1. State Management
- Use Redux, Context API, or Zustand for global state
- Cache menu items to reduce API calls
- Store user preferences (filters, sort order)
- Implement optimistic UI updates for better UX

### 2. Performance Optimization
- Implement pagination/infinite scroll for large lists
- Use React.memo for menu item components
- Lazy load images with placeholder
- Debounce search and filter operations
- Cache API responses with appropriate TTL

### 3. Offline Support
- Cache menu items for offline viewing
- Queue orders when offline, submit when online
- Show offline indicator in UI
- Sync data when connection restored

### 4. Security
- Never store Firebase token in AsyncStorage (use secure storage)
- Validate all user inputs before submission
- Sanitize special instructions and user-generated content
- Implement rate limiting on client side
- Use HTTPS for all API calls (already using Render HTTPS)

### 5. Analytics & Monitoring
- Track user actions (view menu, create order, cancel, etc.)
- Monitor API call success/failure rates
- Track error occurrences and types
- Measure app performance metrics

### 6. Testing Checklist
- Test with slow/unstable network
- Test with expired/invalid tokens
- Test all error scenarios
- Test with empty states (no orders, no menu items)
- Test pagination edge cases
- Test date/time validations
- Test cancellation time restrictions
- Test concurrent order creation

### 7. Accessibility
- Add proper labels for screen readers
- Ensure sufficient color contrast
- Support text scaling
- Keyboard navigation support
- Error messages should be announced

---

## API Testing Examples (for Development)

### Using cURL

```bash
# Get menu items
curl -X GET "https://tiffin-delivery-software.onrender.com/api/menu-items?mealType=LUNCH&page=1&limit=10"

# Create order (replace TOKEN with actual Firebase token)
curl -X POST "https://tiffin-delivery-software.onrender.com/api/orders" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "menuItemId": "507f1f77bcf86cd799439011",
    "mealType": "LUNCH",
    "scheduledForDate": "2024-01-25",
    "quantity": 1,
    "deliveryAddress": {
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    }
  }'

# Get my orders
curl -X GET "https://tiffin-delivery-software.onrender.com/api/orders/my-orders" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### Using JavaScript/Fetch

```javascript
// Get menu items
const getMenuItems = async () => {
  const response = await fetch(
    'https://tiffin-delivery-software.onrender.com/api/menu-items?mealType=LUNCH',
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch menu items');
  }

  const data = await response.json();
  return data;
};

// Create order
const createOrder = async (orderData, firebaseToken) => {
  const response = await fetch(
    'https://tiffin-delivery-software.onrender.com/api/orders',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseToken}`,
      },
      body: JSON.stringify(orderData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const data = await response.json();
  return data;
};
```

---

## Conclusion

This documentation provides comprehensive guidance for implementing the customer-facing menu and ordering functionality in React Native, including the **addon selection drawer** workflow. Remember to:

1. **Handle ALL error cases** - Network, validation, authentication, server errors
2. **Consider edge cases** - Empty states, date validations, concurrent operations, missing addons
3. **Implement proper loading states** - Show user feedback during async operations
4. **Implement addon drawer properly** - Fetch addons when user clicks "Order Now", group by category, calculate real-time totals
5. **Test thoroughly** - Network conditions, auth states, error scenarios, addon selection flows
6. **Optimize performance** - Cache data, paginate results, lazy load images
7. **Ensure security** - Secure token storage, input validation, HTTPS only
8. **Monitor and log** - Track errors, user actions, and performance metrics

### Key Implementation Points

**Menu Item Structure:**
- Menu items use `media` object with `thumbnail` and `shuffle` arrays (not `imageUrl`)
- Display `content` field to show what's included
- Show discount badge if `compareAtPrice` > `price`

**Addon Selection Flow:**
1. User clicks menu item → Show detail screen
2. User clicks "Order Now" → Fetch addons via `GET /api/addons/menu-item/:menuItemId`
3. Show drawer with addons grouped by category
4. User selects addons → Calculate total in real-time
5. User clicks "Continue" → Navigate to order form with selected addon IDs
6. Submit order with `addons` array in request body

**Critical Filters:**
- Only show items/addons where `isLive: true` and `isDeleted: false`
- Handle empty addon lists gracefully (skip drawer if no addons)

For any questions or issues with the API, check the response messages and status codes. All endpoints follow the standard response format, making error handling consistent across the application.

**Backend Hosted On**: Render (https://tiffin-delivery-software.onrender.com)
**Authentication**: Firebase Authentication with JWT tokens
**Response Format**: JSON with standardized success/error structure

---

**Document Version**: 1.1
**Last Updated**: Includes addon management and drawer implementation
**Target Platform**: React Native (without Expo)
