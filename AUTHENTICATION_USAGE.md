# Admin Authentication & Authorization Usage Guide

## Overview
The admin authentication system has been implemented with JWT-based authentication and role-based authorization.

## API Endpoints

### 1. Register Admin
**POST** `/api/auth/admin/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "username": "johndoe",
  "password": "securepassword123",
  "email": "john@example.com",  // optional
  "phone": "+1234567890",        // optional
  "role": "ADMIN"                // optional, defaults to "KITCHEN_STAFF"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Admin registered successfully",
  "data": {
    "admin": {
      "id": "60d5ec49f8e5b12a3c4d5e6f",
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "ADMIN",
      "createdAt": "2025-10-30T10:30:00.000Z"
    }
  }
}
```

### 2. Login Admin
**POST** `/api/auth/admin/login`

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "60d5ec49f8e5b12a3c4d5e6f",
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "ADMIN"
    }
  }
}
```

## Using Authentication & Authorization Middleware

### Import the Middleware
```javascript
import { authenticate, authorize } from "./middleware/auth.middleware.js";
import { ADMIN_ROLES } from "./schema/Admin.js";
```

### Example 1: Protected Route (Any Authenticated Admin)
```javascript
router.get("/dashboard", authenticate, (req, res) => {
  // req.user contains: { id, username, role, type }
  res.json({
    success: true,
    message: "Dashboard data",
    data: {
      user: req.user
    }
  });
});
```

### Example 2: Admin-Only Route
```javascript
router.post(
  "/create-menu-item",
  authenticate,
  authorize(ADMIN_ROLES.ADMIN),
  createMenuItem
);
```

### Example 3: Multiple Roles Allowed
```javascript
router.get(
  "/view-orders",
  authenticate,
  authorize(ADMIN_ROLES.ADMIN, ADMIN_ROLES.KITCHEN_STAFF),
  viewOrders
);
```

### Example 4: Complete Route File
```javascript
import express from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { ADMIN_ROLES } from "../schema/Admin.js";
import {
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} from "./menu.controller.js";

const router = express.Router();

// Public route - no authentication needed
router.get("/menu-items", getAllMenuItems);

// Protected routes - authentication required
router.post(
  "/menu-items",
  authenticate,
  authorize(ADMIN_ROLES.ADMIN),
  createMenuItem
);

router.put(
  "/menu-items/:id",
  authenticate,
  authorize(ADMIN_ROLES.ADMIN),
  updateMenuItem
);

router.delete(
  "/menu-items/:id",
  authenticate,
  authorize(ADMIN_ROLES.ADMIN),
  deleteMenuItem
);

export default router;
```

## Making Authenticated Requests

### In Frontend/Client
When making requests to protected routes, include the JWT token in the Authorization header:

```javascript
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // from login response

fetch("http://localhost:3000/api/protected-route", {
  method: "GET",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  }
});
```

### Using Axios
```javascript
axios.get("http://localhost:3000/api/protected-route", {
  headers: {
    "Authorization": `Bearer ${token}`
  }
});
```

## Available Roles
- `ADMIN` - Full access to all administrative functions
- `KITCHEN_STAFF` - Limited access for kitchen operations

## Error Responses

### Authentication Errors
```json
{
  "success": false,
  "message": "Authentication required. Please provide a valid token",
  "data": null
}
```

### Authorization Errors
```json
{
  "success": false,
  "message": "Access denied. You do not have permission to access this resource",
  "data": null
}
```

### Token Expired
```json
{
  "success": false,
  "message": "Token expired. Please login again",
  "data": null
}
```

## Security Notes
1. Store JWT tokens securely in the client (httpOnly cookies recommended for web apps)
2. Never commit the `.env` file with actual secrets to version control
3. Change the `JWT_SECRET` in production to a strong, random string
4. Token expires in 7 days by default (configurable in the controller)
5. Passwords are hashed using bcrypt with 10 salt rounds

## Environment Variables
Make sure these are set in your `.env` file:
```
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```
