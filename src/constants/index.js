/**
 * Application-wide constants
 */

// Pagination constants
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1,
};

// Order status constants
export const ORDER_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  PREPARING: "preparing",
  READY: "ready",
  IN_TRANSIT: "in_transit",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

// Meal type constants
export const MEAL_TYPES = {
  LUNCH: "LUNCH",
  DINNER: "DINNER",
};

// Subscription status constants
export const SUBSCRIPTION_STATUS = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  EXHAUSTED: "EXHAUSTED",
  CANCELLED: "CANCELLED",
};

// Subscription plan types
export const PLAN_TYPES = {
  LUNCH_ONLY: "LUNCH_ONLY",
  DINNER_ONLY: "DINNER_ONLY",
  BOTH: "BOTH",
};

// Packaging type constants
export const PACKAGING_TYPES = {
  STEEL_DABBA: "STEEL_DABBA",
  DISPOSABLE: "DISPOSABLE",
};

// Delivery status constants
export const DELIVERY_STATUS = {
  PENDING: "pending",
  ASSIGNED: "assigned",
  PICKED_UP: "picked_up",
  IN_TRANSIT: "in_transit",
  DELIVERED: "delivered",
  FAILED: "failed",
};

// Payment status constants
export const PAYMENT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
};

// Payment method constants
export const PAYMENT_METHODS = {
  RAZORPAY: "razorpay",
  CASH: "cash",
  UPI: "upi",
};

// User roles
export const USER_ROLES = {
  ADMIN: "admin",
  DRIVER: "driver",
  CUSTOMER: "customer",
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

// Error messages
export const ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: "Authentication required",
  INVALID_CREDENTIALS: "Invalid credentials",
  USER_NOT_FOUND: "User not found",
  CUSTOMER_NOT_FOUND: "Customer not found",
  ORDER_NOT_FOUND: "Order not found",
  SUBSCRIPTION_NOT_FOUND: "Subscription not found",
  MENU_ITEM_NOT_FOUND: "Menu item not found",
  ADDON_NOT_FOUND: "Addon not found",
  DUPLICATE_ORDER: "An order for this meal already exists for the selected date",
  NO_ACTIVE_SUBSCRIPTION: "No active subscription found",
  INSUFFICIENT_VOUCHERS: "Not enough vouchers available",
  INVALID_PLAN_TYPE: "Your subscription plan does not cover this meal type",
  UNAUTHORIZED_ACCESS: "You are not authorized to access this resource",
  SERVER_ERROR: "An error occurred. Please try again later",
};

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Login successful",
  LOGOUT_SUCCESS: "Logout successful",
  REGISTRATION_SUCCESS: "Registration successful",
  ORDER_CREATED: "Order created successfully",
  ORDER_UPDATED: "Order updated successfully",
  ORDER_CANCELLED: "Order cancelled successfully",
  SUBSCRIPTION_CREATED: "Subscription created successfully",
  SUBSCRIPTION_CANCELLED: "Subscription cancelled successfully",
  PROFILE_UPDATED: "Profile updated successfully",
};

// Date/Time constants
export const DATE_TIME = {
  MILLISECONDS_IN_DAY: 24 * 60 * 60 * 1000,
  MILLISECONDS_IN_HOUR: 60 * 60 * 1000,
  MILLISECONDS_IN_MINUTE: 60 * 1000,
};
