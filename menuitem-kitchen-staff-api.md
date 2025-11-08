# Menu Items & Addons API Documentation - Kitchen Staff

**Base URL:** `https://food-delivery-backend-y6lw.onrender.com`

**Documentation Version:** 1.0
**Last Updated:** November 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Menu Items Management](#menu-items-management)
3. [Addons Management](#addons-management)
4. [Response Structure](#response-structure)
5. [Error Handling](#error-handling)
6. [Implementation Examples](#implementation-examples)

---

## Overview

This API enables kitchen staff to manage the menu items and addons for the tiffin service. Kitchen staff can create, read, update, and delete menu items and their associated addons, as well as control their visibility to customers.

**Authentication Type:** JWT (JSON Web Token)
**Access Level:** Kitchen Staff, Admin
**Authorization Header:** `Bearer <token>`

**Key Capabilities:**
- Create and manage menu items for LUNCH, DINNER, OTHER, and BOTH
- Toggle menu item visibility (isLive status)
- Create and manage addons for menu items
- Organize addons by categories (Beverages, Desserts, etc.)
- Soft delete and restore items
- Bulk operations for efficiency

---

## Menu Items Management

### 1. Create Menu Item

**Endpoint:** `POST /api/menu-items`
**Access:** Kitchen Staff, Admin
**Purpose:** Create a new menu item for lunch or dinner service

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Paneer Tikka Masala",
  "content": "Grilled paneer cubes in rich creamy tomato gravy with aromatic spices",
  "description": "Our signature dish featuring tender paneer marinated in yogurt and spices, grilled to perfection and simmered in a luscious tomato-based gravy. Served with rice and naan.",
  "media": {
    "thumbnail": "https://res.cloudinary.com/your-cloud/image/upload/v1234/paneer-tikka-thumb.jpg",
    "shuffle": [
      "https://res.cloudinary.com/your-cloud/image/upload/v1234/paneer-tikka-1.jpg",
      "https://res.cloudinary.com/your-cloud/image/upload/v1234/paneer-tikka-2.jpg"
    ]
  },
  "mealType": "LUNCH",
  "price": 180,
  "compareAtPrice": 220,
  "isLive": true
}
```

**Required Fields:**
- `name` (string, 2-100 chars): Menu item name
- `content` (string, 3-500 chars): Short description/tagline
- `mealType` (string): Must be `"LUNCH"`, `"DINNER"`, `"OTHER"`, or `"BOTH"`
- `price` (number, >= 0): Item price in rupees

**Optional Fields:**
- `description` (string, 10-1000 chars): Detailed description
- `media` (object): Images for the menu item
  - `thumbnail` (string): Main thumbnail image URL
  - `shuffle` (array of strings): Gallery images
- `compareAtPrice` (number, > price): Original price (for showing discounts)
- `isLive` (boolean, default: false): Whether item is visible to customers

**Success Response (201):**
```json
{
  "success": true,
  "message": "Menu item created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Paneer Tikka Masala",
    "content": "Grilled paneer cubes in rich creamy tomato gravy with aromatic spices",
    "description": "Our signature dish featuring tender paneer...",
    "media": {
      "thumbnail": "https://res.cloudinary.com/.../paneer-tikka-thumb.jpg",
      "shuffle": ["https://..."]
    },
    "mealType": "LUNCH",
    "price": 180,
    "compareAtPrice": 220,
    "isLive": true,
    "isDeleted": false,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Cases:**
- **400:** Missing required fields, invalid mealType, negative price, compareAtPrice <= price
- **401:** Missing or invalid token
- **500:** Server error

**Notes:**
- `mealType` is automatically converted to uppercase
- Prices are rounded to 2 decimal places
- `compareAtPrice` must be greater than `price` to show discount
- Items are created as `isLive: false` by default for review before publishing
- Use Cloudinary API to upload images first, then use the returned URLs

---

### 2. Get All Menu Items

**Endpoint:** `GET /api/menu-items`
**Access:** Public (but kitchen staff can see deleted items)
**Purpose:** View all menu items with filtering and pagination

**Request Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `mealType` (string): Filter by `"LUNCH"`, `"DINNER"`, `"OTHER"`, or `"BOTH"`
- `isLive` (boolean): Filter by live status (`true`/`false`)
- `includeDeleted` (boolean): Include deleted items (kitchen staff only)
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `search` (string): Text search in name, content, description
- `page` (number, default: 1): Page number
- `limit` (number, default: 20, max: 100): Items per page
- `sortBy` (string, default: "createdAt"): Sort field (name, price, createdAt, updatedAt)
- `sortOrder` (string, default: "desc"): `"asc"` or `"desc"`

**Example:**
```
GET /api/menu-items?mealType=LUNCH&isLive=true&sortBy=price&sortOrder=asc&page=1&limit=20
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Menu items retrieved successfully",
  "data": {
    "menuItems": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Dal Makhani",
        "content": "Creamy black lentils simmered overnight",
        "mealType": "LUNCH",
        "price": 120,
        "compareAtPrice": 150,
        "isLive": true,
        "media": {
          "thumbnail": "https://..."
        },
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 45,
      "itemsPerPage": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Error Cases:**
- **400:** Invalid page/limit values
- **500:** Server error

**Notes:**
- Public users only see `isLive: true` and `isDeleted: false` items
- Kitchen staff see all items when `includeDeleted=true`
- Text search uses MongoDB text index for efficient searching

---

### 3. Get Single Menu Item

**Endpoint:** `GET /api/menu-items/:id`
**Access:** Public (but kitchen staff can see deleted items)
**Purpose:** Get detailed information about a specific menu item

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` (string): Menu item ID (MongoDB ObjectId)

**Example:**
```
GET /api/menu-items/507f1f77bcf86cd799439011
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Menu item retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Paneer Tikka Masala",
    "content": "Grilled paneer cubes in rich creamy tomato gravy",
    "description": "Our signature dish featuring tender paneer...",
    "media": {
      "thumbnail": "https://res.cloudinary.com/.../paneer-tikka-thumb.jpg",
      "shuffle": [
        "https://res.cloudinary.com/.../paneer-tikka-1.jpg",
        "https://res.cloudinary.com/.../paneer-tikka-2.jpg"
      ]
    },
    "mealType": "LUNCH",
    "price": 180,
    "compareAtPrice": 220,
    "isLive": true,
    "isDeleted": false,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Cases:**
- **400:** Invalid ID format
- **404:** Menu item not found
- **500:** Server error

---

### 4. Update Menu Item

**Endpoint:** `PUT /api/menu-items/:id`
**Access:** Kitchen Staff, Admin
**Purpose:** Update an existing menu item

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
- `id` (string): Menu item ID

**Request Body (partial updates allowed):**
```json
{
  "name": "Premium Paneer Tikka Masala",
  "price": 200,
  "compareAtPrice": 250,
  "isLive": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Menu item updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Premium Paneer Tikka Masala",
    "price": 200,
    "compareAtPrice": 250,
    "isLive": true,
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

**Error Cases:**
- **400:** Invalid ID, invalid mealType, invalid price, compareAtPrice <= price
- **401:** Missing or invalid token
- **404:** Menu item not found or deleted
- **500:** Server error

**Notes:**
- Only provide fields you want to update (partial updates)
- Cannot modify: `_id`, `createdAt`, `isDeleted`, `deletedAt`
- String fields are automatically trimmed
- `mealType` is automatically converted to uppercase

---

### 5. Delete Menu Item (Soft Delete)

**Endpoint:** `DELETE /api/menu-items/:id`
**Access:** Kitchen Staff, Admin
**Purpose:** Soft delete a menu item (can be restored later)

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` (string): Menu item ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Menu item deleted successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "deletedAt": "2024-01-15T11:30:00Z"
  }
}
```

**Error Cases:**
- **400:** Invalid ID format
- **401:** Missing or invalid token
- **404:** Menu item not found or already deleted
- **500:** Server error

**Notes:**
- Soft delete sets `isDeleted: true` and `deletedAt: <timestamp>`
- Also automatically sets `isLive: false`
- Item is hidden from customers but can be restored
- Deleted items don't appear in public listings

---

### 6. Restore Menu Item

**Endpoint:** `POST /api/menu-items/:id/restore`
**Access:** Kitchen Staff, Admin
**Purpose:** Restore a soft-deleted menu item

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` (string): Menu item ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Menu item restored successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Paneer Tikka Masala",
    "isDeleted": false,
    "deletedAt": null,
    "isLive": false
  }
}
```

**Error Cases:**
- **400:** Invalid ID format
- **401:** Missing or invalid token
- **404:** Deleted menu item not found
- **500:** Server error

**Notes:**
- Restores `isDeleted: false` and sets `deletedAt: null`
- Does NOT automatically set `isLive: true` (you must toggle separately)
- Use this when accidentally deleted or want to bring back seasonal items

---

### 7. Permanently Delete Menu Item

**Endpoint:** `DELETE /api/menu-items/:id/permanent`
**Access:** Kitchen Staff, Admin
**Purpose:** Permanently delete a menu item from database (irreversible)

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` (string): Menu item ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Menu item permanently deleted",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Paneer Tikka Masala"
  }
}
```

**Error Cases:**
- **400:** Invalid ID format
- **401:** Missing or invalid token
- **404:** Menu item not found
- **500:** Server error

**Notes:**
- **IRREVERSIBLE** - Item is completely removed from database
- Use with extreme caution
- Consider soft delete instead for most cases
- Associated addons may become orphaned (check addons first)

---

### 8. Toggle Menu Item Live Status

**Endpoint:** `PATCH /api/menu-items/:id/toggle-live`
**Access:** Kitchen Staff, Admin
**Purpose:** Toggle menu item visibility to customers (publish/unpublish)

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` (string): Menu item ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Menu item activated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Paneer Tikka Masala",
    "isLive": true,
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Error Cases:**
- **400:** Invalid ID format
- **401:** Missing or invalid token
- **404:** Menu item not found or deleted
- **500:** Server error

**Notes:**
- Toggles between `isLive: true` and `isLive: false`
- Response message changes: "activated" or "deactivated"
- Only live items are visible to customers
- Use this to quickly enable/disable items during service
- Cannot toggle live status for deleted items

---

### 9. Bulk Update Menu Items

**Endpoint:** `PATCH /api/menu-items/bulk-update`
**Access:** Kitchen Staff, Admin
**Purpose:** Update multiple menu items at once (e.g., bulk activate/deactivate)

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "ids": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ],
  "updates": {
    "isLive": true,
    "compareAtPrice": null
  }
}
```

**Required Fields:**
- `ids` (array): Array of menu item IDs to update
- `updates` (object): Fields to update on all items

**Success Response (200):**
```json
{
  "success": true,
  "message": "Menu items updated successfully",
  "data": {
    "modifiedCount": 3,
    "requestedCount": 3
  }
}
```

**Error Cases:**
- **400:** Empty ids array, missing updates, invalid ID format
- **401:** Missing or invalid token
- **500:** Server error

**Notes:**
- Only updates non-deleted items
- Cannot modify: `_id`, `createdAt`, `isDeleted`, `deletedAt`
- `modifiedCount` may be less than `requestedCount` if some items don't exist
- Useful for seasonal menu changes or bulk price updates

---

### 10. Get Menu Item Statistics

**Endpoint:** `GET /api/menu-items/stats`
**Access:** Kitchen Staff, Admin
**Purpose:** Get statistics about menu items (total, live, by meal type, etc.)

**Request Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Menu item statistics retrieved",
  "data": {
    "total": 45,
    "live": 38,
    "deleted": 3,
    "byMealType": {
      "LUNCH": 25,
      "DINNER": 20
    },
    "priceRange": {
      "min": 80,
      "max": 350,
      "average": 165
    }
  }
}
```

**Error Cases:**
- **401:** Missing or invalid token
- **500:** Server error

**Notes:**
- Useful for dashboard and reporting
- Statistics exclude deleted items unless specified

---

## Addons Management

### 11. Create Addon

**Endpoint:** `POST /api/addons`
**Access:** Kitchen Staff, Admin
**Purpose:** Create a new addon for a menu item

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Extra Roti",
  "menuItemId": "507f1f77bcf86cd799439011",
  "contents": "Freshly made whole wheat roti",
  "description": "Soft and fluffy whole wheat roti made fresh on tawa. Perfect accompaniment to any curry.",
  "price": 10,
  "category": "SIDE_DISH",
  "tags": ["vegetarian", "bread", "wheat"],
  "imageUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234/roti.jpg",
  "isLive": true
}
```

**Required Fields:**
- `name` (string, 2-100 chars): Addon name
- `menuItemId` (string): ID of the parent menu item
- `price` (number, >= 0): Addon price in rupees

**Optional Fields:**
- `contents` (string, max 500 chars): Short content description
- `description` (string, 10-1000 chars): Detailed description
- `category` (string): One of the valid categories (see below)
- `tags` (array of strings): Searchable tags
- `imageUrl` (string): Image URL for the addon
- `isLive` (boolean, default: false): Visibility status

**Valid Categories:**
- `BEVERAGE` - Drinks and beverages
- `SWEETS` - Traditional sweets
- `CONDIMENT` - Chutneys, pickles, sauces
- `ICE_CREAM` - Ice cream items
- `LAVA_CAKE` - Lava cakes
- `DESSERT` - Other desserts
- `SNACK` - Snacks and appetizers
- `SIDE_DISH` - Side dishes and breads
- `OTHER` - Other items

**Success Response (201):**
```json
{
  "success": true,
  "message": "Addon created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Extra Roti",
    "menuItemId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Paneer Tikka Masala",
      "mealType": "LUNCH",
      "isLive": true
    },
    "contents": "Freshly made whole wheat roti",
    "description": "Soft and fluffy whole wheat roti...",
    "price": 10,
    "category": "SIDE_DISH",
    "tags": ["vegetarian", "bread", "wheat"],
    "imageUrl": "https://res.cloudinary.com/.../roti.jpg",
    "isLive": true,
    "isDeleted": false,
    "createdAt": "2024-01-15T13:00:00Z",
    "updatedAt": "2024-01-15T13:00:00Z"
  }
}
```

**Error Cases:**
- **400:** Missing required fields, invalid menuItemId format, invalid category, negative price
- **401:** Missing or invalid token
- **404:** Menu item not found
- **500:** Server error

**Notes:**
- Menu item must exist and not be deleted
- `category` is automatically converted to uppercase
- Tags are trimmed and must be non-empty strings
- Response includes populated menu item details
- ImageUrl must be a valid HTTP/HTTPS URL

---

### 12. Get All Addons

**Endpoint:** `GET /api/addons`
**Access:** Public (but kitchen staff can see all)
**Purpose:** Get all addons with filtering and pagination

**Request Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `menuItemId` (string): Filter by menu item
- `category` (string): Filter by category
- `isLive` (boolean): Filter by live status
- `includeDeleted` (boolean): Include deleted addons (kitchen staff only)
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `tags` (string): Comma-separated tags to filter
- `search` (string): Text search in name and description
- `populate` (boolean, default: false): Include menu item details
- `page` (number, default: 1): Page number
- `limit` (number, default: 20, max: 100): Items per page
- `sortBy` (string, default: "createdAt"): Sort field
- `sortOrder` (string, default: "desc"): `"asc"` or `"desc"`

**Example:**
```
GET /api/addons?category=BEVERAGE&isLive=true&populate=true&page=1&limit=20
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addons retrieved successfully",
  "data": {
    "addons": [
      {
        "_id": "507f1f77bcf86cd799439014",
        "name": "Mango Lassi",
        "menuItemId": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "Paneer Tikka Masala",
          "mealType": "LUNCH",
          "isLive": true
        },
        "price": 40,
        "category": "BEVERAGE",
        "tags": ["drink", "mango", "yogurt"],
        "isLive": true
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalItems": 25,
      "itemsPerPage": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Error Cases:**
- **400:** Invalid page/limit values
- **500:** Server error

**Notes:**
- Use `populate=true` to include menu item details
- Tags filter supports multiple comma-separated values
- Public users only see live, non-deleted addons

---

### 13. Get Addons by Menu Item

**Endpoint:** `GET /api/addons/menu-item/:menuItemId`
**Access:** Public (but kitchen staff can see all)
**Purpose:** Get all addons for a specific menu item

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `menuItemId` (string): Menu item ID

**Example:**
```
GET /api/addons/menu-item/507f1f77bcf86cd799439011
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addons retrieved successfully",
  "data": {
    "menuItem": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Paneer Tikka Masala",
      "mealType": "LUNCH"
    },
    "addons": [
      {
        "_id": "507f1f77bcf86cd799439014",
        "name": "Extra Roti",
        "price": 10,
        "category": "SIDE_DISH",
        "isLive": true
      },
      {
        "_id": "507f1f77bcf86cd799439015",
        "name": "Mango Lassi",
        "price": 40,
        "category": "BEVERAGE",
        "isLive": true
      }
    ],
    "count": 2
  }
}
```

**Error Cases:**
- **400:** Invalid menuItemId format
- **404:** Menu item not found
- **500:** Server error

**Notes:**
- Addons are sorted by category, then name
- Public users only see live addons
- Kitchen staff see all addons for the menu item

---

### 14. Get Single Addon

**Endpoint:** `GET /api/addons/:id`
**Access:** Public (but kitchen staff can see deleted)
**Purpose:** Get details of a specific addon

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` (string): Addon ID

**Query Parameters:**
- `populate` (boolean, default: false): Include menu item details

**Example:**
```
GET /api/addons/507f1f77bcf86cd799439014?populate=true
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addon retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Extra Roti",
    "menuItemId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Paneer Tikka Masala",
      "content": "Grilled paneer cubes...",
      "mealType": "LUNCH",
      "price": 180,
      "isLive": true
    },
    "contents": "Freshly made whole wheat roti",
    "description": "Soft and fluffy...",
    "price": 10,
    "category": "SIDE_DISH",
    "tags": ["vegetarian", "bread", "wheat"],
    "imageUrl": "https://...",
    "isLive": true,
    "isDeleted": false
  }
}
```

**Error Cases:**
- **400:** Invalid ID format
- **404:** Addon not found
- **500:** Server error

---

### 15. Update Addon

**Endpoint:** `PUT /api/addons/:id`
**Access:** Kitchen Staff, Admin
**Purpose:** Update an existing addon

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
- `id` (string): Addon ID

**Request Body (partial updates allowed):**
```json
{
  "name": "Extra Butter Roti",
  "price": 12,
  "category": "SIDE_DISH",
  "tags": ["vegetarian", "bread", "wheat", "butter"],
  "isLive": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addon updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Extra Butter Roti",
    "price": 12,
    "category": "SIDE_DISH",
    "tags": ["vegetarian", "bread", "wheat", "butter"],
    "isLive": true,
    "menuItemId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Paneer Tikka Masala",
      "mealType": "LUNCH",
      "isLive": true
    },
    "updatedAt": "2024-01-15T14:00:00Z"
  }
}
```

**Error Cases:**
- **400:** Invalid ID, invalid category, negative price, invalid menuItemId
- **401:** Missing or invalid token
- **404:** Addon or menu item not found
- **500:** Server error

**Notes:**
- Only provide fields you want to update
- Cannot modify: `_id`, `createdAt`, `isDeleted`, `deletedAt`
- If updating `menuItemId`, new menu item must exist and not be deleted
- Response includes populated menu item details

---

### 16. Delete Addon (Soft Delete)

**Endpoint:** `DELETE /api/addons/:id`
**Access:** Kitchen Staff, Admin
**Purpose:** Soft delete an addon (can be restored)

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` (string): Addon ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addon deleted successfully",
  "data": {
    "id": "507f1f77bcf86cd799439014",
    "deletedAt": "2024-01-15T15:00:00Z"
  }
}
```

**Error Cases:**
- **400:** Invalid ID format
- **401:** Missing or invalid token
- **404:** Addon not found or already deleted
- **500:** Server error

**Notes:**
- Sets `isDeleted: true` and `deletedAt: <timestamp>`
- Also sets `isLive: false` automatically
- Can be restored later
- Hidden from customers

---

### 17. Restore Addon

**Endpoint:** `POST /api/addons/:id/restore`
**Access:** Kitchen Staff, Admin
**Purpose:** Restore a soft-deleted addon

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` (string): Addon ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addon restored successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Extra Roti",
    "isDeleted": false,
    "deletedAt": null,
    "isLive": false,
    "menuItemId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Paneer Tikka Masala",
      "mealType": "LUNCH",
      "isLive": true
    }
  }
}
```

**Error Cases:**
- **400:** Cannot restore if parent menu item is deleted
- **401:** Missing or invalid token
- **404:** Deleted addon not found
- **500:** Server error

**Notes:**
- Checks if parent menu item still exists
- Cannot restore if menu item is deleted
- Sets `isDeleted: false`, `deletedAt: null`
- Does NOT set `isLive: true` automatically (toggle separately)

---

### 18. Permanently Delete Addon

**Endpoint:** `DELETE /api/addons/:id/permanent`
**Access:** Kitchen Staff, Admin
**Purpose:** Permanently delete addon from database (irreversible)

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` (string): Addon ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addon permanently deleted",
  "data": {
    "id": "507f1f77bcf86cd799439014",
    "name": "Extra Roti"
  }
}
```

**Error Cases:**
- **400:** Invalid ID format
- **401:** Missing or invalid token
- **404:** Addon not found
- **500:** Server error

**Notes:**
- **IRREVERSIBLE** - Completely removed from database
- Use with extreme caution
- Consider soft delete for most cases

---

### 19. Toggle Addon Live Status

**Endpoint:** `PATCH /api/addons/:id/toggle-live`
**Access:** Kitchen Staff, Admin
**Purpose:** Toggle addon visibility to customers

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` (string): Addon ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addon activated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Extra Roti",
    "isLive": true,
    "menuItemId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Paneer Tikka Masala",
      "mealType": "LUNCH",
      "isLive": true
    },
    "updatedAt": "2024-01-15T16:00:00Z"
  }
}
```

**Error Cases:**
- **400:** Invalid ID format
- **401:** Missing or invalid token
- **404:** Addon not found or deleted
- **500:** Server error

**Notes:**
- Toggles between `isLive: true` and `isLive: false`
- Response message: "activated" or "deactivated"
- Cannot toggle for deleted addons
- Quick way to enable/disable addons during service

---

### 20. Bulk Update Addons

**Endpoint:** `PATCH /api/addons/bulk-update`
**Access:** Kitchen Staff, Admin
**Purpose:** Update multiple addons at once

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "ids": [
    "507f1f77bcf86cd799439014",
    "507f1f77bcf86cd799439015",
    "507f1f77bcf86cd799439016"
  ],
  "updates": {
    "isLive": false,
    "category": "SIDE_DISH"
  }
}
```

**Required Fields:**
- `ids` (array): Array of addon IDs
- `updates` (object): Fields to update

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addons updated successfully",
  "data": {
    "modifiedCount": 3,
    "requestedCount": 3
  }
}
```

**Error Cases:**
- **400:** Empty ids array, missing updates, invalid ID format
- **401:** Missing or invalid token
- **500:** Server error

**Notes:**
- Only updates non-deleted addons
- Cannot modify: `_id`, `createdAt`, `isDeleted`, `deletedAt`
- Useful for bulk category changes or seasonal availability

---

### 21. Delete All Addons for Menu Item

**Endpoint:** `DELETE /api/addons/menu-item/:menuItemId`
**Access:** Kitchen Staff, Admin
**Purpose:** Soft delete all addons associated with a menu item

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `menuItemId` (string): Menu item ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "All addons for menu item deleted successfully",
  "data": {
    "menuItemId": "507f1f77bcf86cd799439011",
    "deletedCount": 5
  }
}
```

**Error Cases:**
- **400:** Invalid menuItemId format
- **401:** Missing or invalid token
- **404:** Menu item not found
- **500:** Server error

**Notes:**
- Soft deletes all addons for the menu item
- Sets `isDeleted: true` and `isLive: false` for all
- Useful when removing a menu item entirely

---

### 22. Get Addon Statistics

**Endpoint:** `GET /api/addons/stats`
**Access:** Kitchen Staff, Admin
**Purpose:** Get statistics about addons

**Request Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addon statistics retrieved",
  "data": {
    "total": 120,
    "live": 95,
    "deleted": 8,
    "byCategory": {
      "BEVERAGE": 25,
      "SIDE_DISH": 40,
      "DESSERT": 30,
      "CONDIMENT": 15,
      "OTHER": 10
    },
    "priceRange": {
      "min": 5,
      "max": 80,
      "average": 25
    }
  }
}
```

**Error Cases:**
- **401:** Missing or invalid token
- **500:** Server error

---

## Response Structure

All API responses follow a standardized structure:

### Success Response
```json
{
  "success": true,
  "message": "Description of the successful operation",
  "data": {
    // Response data
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
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input, validation error |
| 401 | Unauthorized | Missing or invalid token |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server-side error |

### Common Error Messages

**Validation Errors:**
- `"Missing required fields: name, content, mealType, and price are required"`
- `"Invalid mealType. Must be LUNCH, DINNER, OTHER, or BOTH"`
- `"Price must be a non-negative number"`
- `"Compare at price must be greater than price"`
- `"Invalid category. Must be one of: BEVERAGE, SWEETS, ..."`
- `"All tags must be non-empty strings"`

**Not Found Errors:**
- `"Menu item not found or has been deleted"`
- `"Addon not found"`
- `"Deleted menu item not found"`

**Business Logic Errors:**
- `"Cannot restore addon: the associated menu item no longer exists or has been deleted"`

---

## Implementation Examples

### React Native Implementation

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://food-delivery-backend-y6lw.onrender.com/api';

// Get auth token
const getAuthToken = async () => {
  return await AsyncStorage.getItem('authToken');
};

// Authenticated fetch helper
const authenticatedFetch = async (endpoint, options = {}) => {
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

// Create Menu Item
export const createMenuItem = async (menuItemData) => {
  try {
    const response = await authenticatedFetch('/menu-items', {
      method: 'POST',
      body: JSON.stringify(menuItemData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};

// Get All Menu Items
export const getMenuItems = async (filters = {}) => {
  const queryParams = new URLSearchParams(filters).toString();

  try {
    const response = await authenticatedFetch(
      `/menu-items${queryParams ? `?${queryParams}` : ''}`
    );

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};

// Toggle Menu Item Live Status
export const toggleMenuItemLive = async (menuItemId) => {
  try {
    const response = await authenticatedFetch(
      `/menu-items/${menuItemId}/toggle-live`,
      { method: 'PATCH' }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};

// Update Menu Item
export const updateMenuItem = async (menuItemId, updates) => {
  try {
    const response = await authenticatedFetch(`/menu-items/${menuItemId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};

// Delete Menu Item (Soft)
export const deleteMenuItem = async (menuItemId) => {
  try {
    const response = await authenticatedFetch(`/menu-items/${menuItemId}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};

// Create Addon
export const createAddon = async (addonData) => {
  try {
    const response = await authenticatedFetch('/addons', {
      method: 'POST',
      body: JSON.stringify(addonData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};

// Get Addons for Menu Item
export const getAddonsByMenuItem = async (menuItemId) => {
  try {
    const response = await authenticatedFetch(
      `/addons/menu-item/${menuItemId}`
    );

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};

// Toggle Addon Live Status
export const toggleAddonLive = async (addonId) => {
  try {
    const response = await authenticatedFetch(
      `/addons/${addonId}/toggle-live`,
      { method: 'PATCH' }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};

// Bulk Update Menu Items
export const bulkUpdateMenuItems = async (ids, updates) => {
  try {
    const response = await authenticatedFetch('/menu-items/bulk-update', {
      method: 'PATCH',
      body: JSON.stringify({ ids, updates }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};
```

### Usage Example in Component

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Switch } from 'react-native';
import { getMenuItems, toggleMenuItemLive } from './api';

const MenuItemsScreen = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    setLoading(true);
    const result = await getMenuItems({
      mealType: 'LUNCH',
      sortBy: 'name',
      sortOrder: 'asc'
    });

    if (result.success) {
      setMenuItems(result.data.menuItems);
    }
    setLoading(false);
  };

  const handleToggleLive = async (itemId) => {
    const result = await toggleMenuItemLive(itemId);

    if (result.success) {
      // Refresh list
      fetchMenuItems();
    }
  };

  const renderMenuItem = ({ item }) => (
    <View style={{ padding: 10, borderBottomWidth: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.name}</Text>
      <Text>₹{item.price}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
        <Text>Live: </Text>
        <Switch
          value={item.isLive}
          onValueChange={() => handleToggleLive(item._id)}
        />
      </View>
    </View>
  );

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <FlatList
      data={menuItems}
      renderItem={renderMenuItem}
      keyExtractor={(item) => item._id}
    />
  );
};

export default MenuItemsScreen;
```

---

## Best Practices

### Menu Items
1. **Always set compareAtPrice higher than price** for discount display
2. **Use descriptive names** (2-100 characters)
3. **Provide detailed descriptions** to help customers make decisions
4. **Upload images via Cloudinary first**, then use URLs
5. **Create items as isLive: false**, review, then activate
6. **Use soft delete** instead of permanent delete for seasonal items
7. **Bulk operations** for efficiency during menu updates

### Addons
1. **Choose appropriate categories** for better organization
2. **Use tags** for better searchability
3. **Link to active menu items** only
4. **Keep addon prices reasonable** relative to main item
5. **Provide clear descriptions** for add-on value
6. **Group related addons** using categories

### General
1. **Always handle errors gracefully** in your UI
2. **Show loading states** during API calls
3. **Confirm destructive actions** (delete, permanent delete)
4. **Cache frequently accessed data**
5. **Implement pull-to-refresh** for data updates
6. **Use pagination** for large lists

---

## Workflow Guide

### Adding a New Menu Item

1. **Upload images** to Cloudinary first
2. **Create menu item** with `isLive: false`
   ```
   POST /api/menu-items
   ```
3. **Create associated addons**
   ```
   POST /api/addons (for each addon)
   ```
4. **Review and test** the item
5. **Activate menu item**
   ```
   PATCH /api/menu-items/:id/toggle-live
   ```
6. **Activate addons**
   ```
   PATCH /api/addons/:id/toggle-live (for each)
   ```

### Updating Prices

**Single Item:**
```
PUT /api/menu-items/:id
Body: { "price": 200, "compareAtPrice": 250 }
```

**Multiple Items:**
```
PATCH /api/menu-items/bulk-update
Body: { "ids": [...], "updates": { "price": 200 } }
```

### Seasonal Menu Changes

**Disable off-season items:**
```
PATCH /api/menu-items/bulk-update
Body: { "ids": [winterItems], "updates": { "isLive": false } }
```

**Enable seasonal items:**
```
PATCH /api/menu-items/bulk-update
Body: { "ids": [summerItems], "updates": { "isLive": true } }
```

---

**Document prepared for:** React Native Frontend Development (Android & iOS)
**Related Documentation:**
- [Kitchen Staff Order Management API](./kitchen-staff-api.md)
- [Cloudinary File Upload API](./src/cloudinary/README.md)

**API Stability:** Production-ready
**Breaking Changes:** Will be communicated with version updates
