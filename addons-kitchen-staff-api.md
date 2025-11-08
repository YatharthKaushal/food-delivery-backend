# Addons Management API - Kitchen Staff

**Base URL:** `https://food-delivery-backend-y6lw.onrender.com`

**Documentation Version:** 1.0
**Last Updated:** November 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Addon Categories](#addon-categories)
3. [CRUD Operations](#crud-operations)
4. [Live Status Management](#live-status-management)
5. [Bulk Operations](#bulk-operations)
6. [Response Structure](#response-structure)
7. [Error Handling](#error-handling)
8. [React Native Examples](#react-native-examples)

---

## Overview

This API enables kitchen staff to manage addons (extras) for menu items. Addons are supplementary items customers can add to their orders like beverages, desserts, extra portions, etc.

**Authentication:** JWT (JSON Web Token)
**Access Level:** Kitchen Staff, Admin
**Authorization Header:** `Bearer <token>`

**Key Features:**
- Create, read, update, delete addons
- Link addons to menu items
- Toggle visibility with isLive status
- Organize by categories (Beverages, Desserts, etc.)
- Soft delete with restore capability
- Bulk operations for efficiency
- Filter and search addons

---

## Addon Categories

Addons must belong to one of these categories:

| Category | Description | Examples |
|----------|-------------|----------|
| `BEVERAGE` | Drinks and beverages | Lassi, Chai, Soft Drinks |
| `SWEETS` | Traditional sweets | Gulab Jamun, Jalebi, Rasgulla |
| `CONDIMENT` | Accompaniments | Chutney, Pickle, Papad |
| `ICE_CREAM` | Ice cream items | Kulfi, Ice Cream |
| `LAVA_CAKE` | Lava cakes | Chocolate Lava Cake |
| `DESSERT` | Other desserts | Kheer, Halwa |
| `SNACK` | Snacks and appetizers | Samosa, Pakora |
| `SIDE_DISH` | Breads and sides | Extra Roti, Rice, Raita |
| `OTHER` | Miscellaneous items | Any other addon |

---

## CRUD Operations

### 1. Create Addon

**Endpoint:** `POST /api/addons`
**Access:** Kitchen Staff, Admin
**Purpose:** Add a new addon to the menu

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Mango Lassi",
  "menuItemId": "507f1f77bcf86cd799439011",
  "contents": "Fresh mango blended with yogurt",
  "description": "Refreshing sweet mango yogurt drink made with fresh alphonso mangoes and creamy yogurt. Perfect complement to spicy dishes.",
  "price": 40,
  "category": "BEVERAGE",
  "tags": ["drink", "mango", "yogurt", "sweet"],
  "imageUrl": "https://res.cloudinary.com/your-cloud/mango-lassi.jpg",
  "isLive": true
}
```

**Required Fields:**
- `name` (string, 2-100 chars): Addon name
- `menuItemId` (string): MongoDB ObjectId of parent menu item
- `price` (number, >= 0): Price in rupees

**Optional Fields:**
- `contents` (string, max 500 chars): Short content description
- `description` (string, 10-1000 chars): Detailed description
- `category` (string): One of the valid categories
- `tags` (array of strings): Searchable tags
- `imageUrl` (string): Valid HTTP/HTTPS URL
- `isLive` (boolean, default: false): Visibility status

**Success Response (201):**
```json
{
  "success": true,
  "message": "Addon created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Mango Lassi",
    "menuItemId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Paneer Tikka Masala",
      "mealType": "LUNCH",
      "isLive": true
    },
    "contents": "Fresh mango blended with yogurt",
    "description": "Refreshing sweet mango yogurt drink...",
    "price": 40,
    "category": "BEVERAGE",
    "tags": ["drink", "mango", "yogurt", "sweet"],
    "imageUrl": "https://res.cloudinary.com/.../mango-lassi.jpg",
    "isLive": true,
    "isDeleted": false,
    "createdAt": "2024-01-15T13:00:00Z",
    "updatedAt": "2024-01-15T13:00:00Z"
  }
}
```

**Error Cases:**
- **400:** Missing required fields, invalid menuItemId format, invalid category, negative price, invalid tags
- **401:** Missing or invalid token
- **404:** Menu item not found or deleted
- **500:** Server error

**Notes:**
- Menu item must exist and not be deleted
- Category is auto-converted to uppercase
- Tags must be non-empty strings
- ImageUrl must be valid URL format
- Response includes populated menu item details

---

### 2. Get All Addons

**Endpoint:** `GET /api/addons`
**Access:** Public (but kitchen staff can see all)
**Purpose:** Retrieve addons with filtering and pagination

**Request Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `menuItemId` (string): Filter by menu item
- `category` (string): Filter by category
- `isLive` (boolean): Filter by live status
- `includeDeleted` (boolean): Include deleted (kitchen staff only)
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `tags` (string): Comma-separated tags
- `search` (string): Text search in name/description
- `populate` (boolean, default: false): Include menu item details
- `page` (number, default: 1): Page number
- `limit` (number, default: 20, max: 100): Items per page
- `sortBy` (string, default: "createdAt"): Sort field
- `sortOrder` (string, default: "desc"): "asc" or "desc"

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
          "price": 180,
          "isLive": true
        },
        "price": 40,
        "category": "BEVERAGE",
        "tags": ["drink", "mango", "yogurt"],
        "isLive": true,
        "createdAt": "2024-01-15T13:00:00Z"
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
- **400:** Invalid page/limit, invalid menuItemId, invalid category, invalid price values
- **500:** Server error

**Notes:**
- Public users see only live, non-deleted addons
- Kitchen staff can see all with `includeDeleted=true`
- Use `populate=true` for menu item details
- Tags filter supports multiple comma-separated values

---

### 3. Get Addons by Menu Item

**Endpoint:** `GET /api/addons/menu-item/:menuItemId`
**Access:** Public (kitchen staff see all)
**Purpose:** Get all addons for a specific menu item

**URL Parameters:**
- `menuItemId` (string): Menu item MongoDB ObjectId

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
- Addons sorted by category, then name
- Public users see only live addons
- Kitchen staff see all addons

---

### 4. Get Single Addon

**Endpoint:** `GET /api/addons/:id`
**Access:** Public (kitchen staff see deleted too)
**Purpose:** Get details of a specific addon

**URL Parameters:**
- `id` (string): Addon MongoDB ObjectId

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
    "name": "Mango Lassi",
    "menuItemId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Paneer Tikka Masala",
      "content": "Grilled paneer cubes...",
      "mealType": "LUNCH",
      "price": 180,
      "isLive": true
    },
    "contents": "Fresh mango blended with yogurt",
    "description": "Refreshing sweet mango yogurt drink...",
    "price": 40,
    "category": "BEVERAGE",
    "tags": ["drink", "mango", "yogurt", "sweet"],
    "imageUrl": "https://...",
    "isLive": true,
    "isDeleted": false,
    "createdAt": "2024-01-15T13:00:00Z",
    "updatedAt": "2024-01-15T13:00:00Z"
  }
}
```

**Error Cases:**
- **400:** Invalid ID format
- **404:** Addon not found
- **500:** Server error

---

### 5. Update Addon

**Endpoint:** `PUT /api/addons/:id`
**Access:** Kitchen Staff, Admin
**Purpose:** Update an existing addon

**URL Parameters:**
- `id` (string): Addon MongoDB ObjectId

**Request Body (partial updates allowed):**
```json
{
  "name": "Premium Mango Lassi",
  "price": 50,
  "category": "BEVERAGE",
  "tags": ["drink", "mango", "yogurt", "premium"],
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
    "name": "Premium Mango Lassi",
    "price": 50,
    "category": "BEVERAGE",
    "tags": ["drink", "mango", "yogurt", "premium"],
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
- **400:** Invalid ID, invalid category, negative price, invalid menuItemId, invalid tags
- **401:** Missing or invalid token
- **404:** Addon or menu item not found/deleted
- **500:** Server error

**Notes:**
- Only provide fields to update (partial updates)
- Cannot modify: `_id`, `createdAt`, `isDeleted`, `deletedAt`
- If updating `menuItemId`, new menu item must exist
- Response includes populated menu item

---

### 6. Delete Addon (Soft Delete)

**Endpoint:** `DELETE /api/addons/:id`
**Access:** Kitchen Staff, Admin
**Purpose:** Soft delete an addon (can be restored)

**URL Parameters:**
- `id` (string): Addon MongoDB ObjectId

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
- Hidden from customers immediately

---

### 7. Restore Addon

**Endpoint:** `POST /api/addons/:id/restore`
**Access:** Kitchen Staff, Admin
**Purpose:** Restore a soft-deleted addon

**URL Parameters:**
- `id` (string): Addon MongoDB ObjectId

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addon restored successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Mango Lassi",
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
- **400:** Cannot restore if parent menu item deleted
- **401:** Missing or invalid token
- **404:** Deleted addon not found
- **500:** Server error

**Notes:**
- Checks if parent menu item still exists
- Cannot restore if menu item is deleted
- Sets `isDeleted: false`, `deletedAt: null`
- Does NOT set `isLive: true` (toggle separately)

---

### 8. Permanently Delete Addon

**Endpoint:** `DELETE /api/addons/:id/permanent`
**Access:** Kitchen Staff, Admin
**Purpose:** Permanently delete addon (IRREVERSIBLE)

**URL Parameters:**
- `id` (string): Addon MongoDB ObjectId

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addon permanently deleted",
  "data": {
    "id": "507f1f77bcf86cd799439014",
    "name": "Mango Lassi"
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
- Prefer soft delete for most cases

---

## Live Status Management

### 9. Toggle Addon Live Status

**Endpoint:** `PATCH /api/addons/:id/toggle-live`
**Access:** Kitchen Staff, Admin
**Purpose:** Toggle addon visibility to customers

**URL Parameters:**
- `id` (string): Addon MongoDB ObjectId

**Success Response (200):**
```json
{
  "success": true,
  "message": "Addon activated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Mango Lassi",
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
- Message changes: "activated" or "deactivated"
- Cannot toggle for deleted addons
- Quick way to enable/disable during service

---

## Bulk Operations

### 10. Bulk Update Addons

**Endpoint:** `PATCH /api/addons/bulk-update`
**Access:** Kitchen Staff, Admin
**Purpose:** Update multiple addons at once

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
    "category": "BEVERAGE"
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
- `modifiedCount` may be less than `requestedCount`

---

### 11. Delete All Addons for Menu Item

**Endpoint:** `DELETE /api/addons/menu-item/:menuItemId`
**Access:** Kitchen Staff, Admin
**Purpose:** Soft delete all addons for a menu item

**URL Parameters:**
- `menuItemId` (string): Menu item MongoDB ObjectId

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

### 12. Get Addon Statistics

**Endpoint:** `GET /api/addons/stats`
**Access:** Kitchen Staff, Admin
**Purpose:** Get statistics about addons

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

**Notes:**
- Useful for dashboard and reporting
- Statistics exclude deleted items unless specified

---

## Response Structure

All responses follow this standardized structure:

### Success Response
```json
{
  "success": true,
  "message": "Description of success",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
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
- `"Missing required fields: name, menuItemId, and price are required"`
- `"Invalid category. Must be one of: BEVERAGE, SWEETS, ..."`
- `"Price must be a non-negative number"`
- `"All tags must be non-empty strings"`
- `"Invalid menuItemId format"`

**Not Found Errors:**
- `"Addon not found or has been deleted"`
- `"Menu item not found or has been deleted"`
- `"Deleted addon not found"`

**Business Logic Errors:**
- `"Cannot restore addon: the associated menu item no longer exists or has been deleted"`

---

## React Native Examples

### Setup

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
```

### Create Addon

```javascript
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

// Usage
const newAddon = {
  name: "Mango Lassi",
  menuItemId: "507f1f77bcf86cd799439011",
  price: 40,
  category: "BEVERAGE",
  isLive: true
};

const result = await createAddon(newAddon);
```

### Get Addons by Menu Item

```javascript
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
```

### Get All Addons with Filters

```javascript
export const getAddons = async (filters = {}) => {
  const queryParams = new URLSearchParams(filters).toString();

  try {
    const response = await authenticatedFetch(
      `/addons${queryParams ? `?${queryParams}` : ''}`
    );

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};

// Usage
const filters = {
  category: 'BEVERAGE',
  isLive: true,
  page: 1,
  limit: 20,
  populate: true
};

const result = await getAddons(filters);
```

### Toggle Addon Live Status

```javascript
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
```

### Update Addon

```javascript
export const updateAddon = async (addonId, updates) => {
  try {
    const response = await authenticatedFetch(`/addons/${addonId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};

// Usage
const updates = {
  name: "Premium Mango Lassi",
  price: 50
};

const result = await updateAddon("507f1f77bcf86cd799439014", updates);
```

### Delete Addon

```javascript
export const deleteAddon = async (addonId) => {
  try {
    const response = await authenticatedFetch(`/addons/${addonId}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};
```

### Bulk Update Addons

```javascript
export const bulkUpdateAddons = async (ids, updates) => {
  try {
    const response = await authenticatedFetch('/addons/bulk-update', {
      method: 'PATCH',
      body: JSON.stringify({ ids, updates }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};

// Usage - Deactivate all beverage addons
const beverageIds = ["id1", "id2", "id3"];
const result = await bulkUpdateAddons(beverageIds, { isLive: false });
```

### React Component Example

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Switch } from 'react-native';
import { getAddonsByMenuItem, toggleAddonLive } from './api';

const AddonsScreen = ({ menuItemId }) => {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAddons();
  }, [menuItemId]);

  const fetchAddons = async () => {
    setLoading(true);
    const result = await getAddonsByMenuItem(menuItemId);

    if (result.success) {
      setAddons(result.data.addons);
    }
    setLoading(false);
  };

  const handleToggleLive = async (addonId) => {
    const result = await toggleAddonLive(addonId);

    if (result.success) {
      fetchAddons(); // Refresh list
    }
  };

  const renderAddon = ({ item }) => (
    <View style={{ padding: 10, borderBottomWidth: 1 }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.name}</Text>
      <Text>Category: {item.category}</Text>
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
    return <Text>Loading addons...</Text>;
  }

  return (
    <View>
      <Text style={{ fontSize: 20, padding: 10 }}>
        Addons ({addons.length})
      </Text>
      <FlatList
        data={addons}
        renderItem={renderAddon}
        keyExtractor={(item) => item._id}
      />
    </View>
  );
};

export default AddonsScreen;
```

---

## Best Practices

### Addon Management
1. **Link to existing menu items** - Verify menu item exists before creating addon
2. **Use appropriate categories** - Choose the most relevant category for organization
3. **Add descriptive tags** - Helps with search and filtering
4. **Set reasonable prices** - Price should reflect addon value
5. **Provide clear descriptions** - Help customers understand the addon
6. **Upload images** - Use Cloudinary API first, then use returned URLs

### Lifecycle Management
1. **Create as isLive: false** - Review before making visible to customers
2. **Use soft delete** - Allows restoration if needed
3. **Check parent menu item** - Ensure menu item is active before activating addon
4. **Seasonal items** - Use isLive toggle instead of delete/restore

### Performance
1. **Use pagination** - Don't load all addons at once
2. **Filter by menu item** - When managing addons for specific items
3. **Cache frequently accessed data** - Reduce API calls
4. **Bulk operations** - Update multiple addons efficiently

### Error Handling
1. **Validate before API call** - Check required fields client-side
2. **Handle network errors** - Show user-friendly messages
3. **Confirm destructive actions** - Especially for permanent delete
4. **Show loading states** - Improve user experience

---

## Workflow Examples

### Adding New Addon to Menu Item

1. **Get menu item** to verify it exists
2. **Upload image** (optional) via Cloudinary API
3. **Create addon** with `isLive: false`
   ```
   POST /api/addons
   Body: { name, menuItemId, price, category, isLive: false }
   ```
4. **Review addon** details
5. **Activate addon**
   ```
   PATCH /api/addons/:id/toggle-live
   ```

### Managing Seasonal Addons

**Disable summer drinks:**
```
PATCH /api/addons/bulk-update
Body: {
  ids: [summerDrinkIds],
  updates: { isLive: false }
}
```

**Enable winter specials:**
```
PATCH /api/addons/bulk-update
Body: {
  ids: [winterDrinkIds],
  updates: { isLive: true }
}
```

### Updating Addon Prices

**Single addon:**
```
PUT /api/addons/:id
Body: { price: 50 }
```

**Multiple addons:**
```
PATCH /api/addons/bulk-update
Body: {
  ids: [addonIds],
  updates: { price: 50 }
}
```

---

**Document prepared for:** React Native Frontend Development (Android & iOS)
**Related Documentation:**
- [Kitchen Staff Order Management API](./kitchen-staff-api.md)
- [Menu Items Management API](./menuitem-kitchen-staff-api.md)
- [Cloudinary File Upload API](./src/cloudinary/README.md)

**API Stability:** Production-ready
**Breaking Changes:** Will be communicated with version updates
