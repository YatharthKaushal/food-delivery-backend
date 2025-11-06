/**
 * Order Controller
 * Handles all CRUD operations and business logic for orders
 * @module Order/Controller
 */

import Order from "../schema/Order.schema.js";
import Customer from "../schema/Customer.schema.js";
import MenuItem from "../schema/MenuItem.schema.js";
import Addon from "../schema/Addon.schema.js";
import Subscription from "../schema/Subscription.schema.js";
import Delivery from "../schema/Delivery.schema.js";
import DeliveryDriver from "../schema/DeliveryDriver.schema.js";
import { updateCustomerSubscriptionStatus } from "../Subscription/subscription.controller.js";
import { sendSuccess, sendError } from "../utils/response.util.js";
import { canPlaceOrder, canCancelOrder } from "../utils/orderTimings.util.js";
import {
  findAvailableDriver,
  assignDriverToOrder,
} from "../utils/deliveryAssignment.util.js";
import {
  HTTP_STATUS,
  MEAL_TYPES,
  PACKAGING_TYPES,
  SUBSCRIPTION_STATUS,
  PLAN_TYPES,
  PAGINATION,
  ERROR_MESSAGES,
} from "../constants/index.js";
import mongoose from "mongoose";

/**
 * Create a new order
 * @access Customer (Firebase authenticated)
 * @route POST /api/orders
 * @description Allows customers to place a new order
 */
export const createOrder = async (req, res) => {
  try {
    const {
      mealType,
      scheduledForDate,
      menuItemId,
      addonIds = [],
      useSubscriptionVoucher = false,
      specialInstructions,
      packagingType,
    } = req.body;
    const firebaseUid = req.firebaseUser?.uid;

    // Validate required fields
    if (!mealType || !scheduledForDate || !menuItemId || !packagingType) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Missing required fields",
        {
          required: [
            "mealType",
            "scheduledForDate",
            "menuItemId",
            "packagingType",
          ],
        }
      );
    }

    if (!firebaseUid) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.AUTHENTICATION_REQUIRED
      );
    }

    // Find customer
    const customer = await Customer.findOne({
      firebaseUid,
      isDeleted: false,
    });

    if (!customer) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Customer not found. Please complete registration first"
      );
    }

    // Validate meal type
    const upperMealType = mealType.toUpperCase();
    if (!Object.values(MEAL_TYPES).includes(upperMealType)) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Invalid meal type. Must be ${Object.values(MEAL_TYPES).join(" or ")}`
      );
    }

    // Validate packaging type
    const upperPackagingType = packagingType.toUpperCase();
    if (!Object.values(PACKAGING_TYPES).includes(upperPackagingType)) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Invalid packaging type. Must be ${Object.values(PACKAGING_TYPES).join(
          " or "
        )}`
      );
    }

    // Validate scheduled date (must be today or future)
    const scheduledDate = new Date(scheduledForDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    scheduledDate.setHours(0, 0, 0, 0);

    if (scheduledDate < today) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Scheduled date cannot be in the past"
      );
    }

    // Validate time restrictions for placing orders
    const timeCheck = canPlaceOrder(upperMealType, scheduledForDate);
    if (!timeCheck.allowed) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, timeCheck.reason);
    }

    // Phase 4: Check if customer already has an order for this meal, date, and menu item
    // This prevents duplicate orders (same customer, meal type, date, menu item)
    const existingOrder = await Order.findOne({
      customerId: customer._id,
      mealType: upperMealType,
      scheduledForDate: scheduledDate,
      "menuItem.menuItemId": menuItemId,
      isDeleted: false,
      "orderStatus.cancelledAt": null,
      "orderStatus.failedAt": null,
    });

    if (existingOrder) {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        `You already have an order for ${upperMealType} with this menu item on ${scheduledDate.toDateString()}`
      );
    }

    // Verify menu item exists and is active
    const menuItem = await MenuItem.findOne({
      _id: menuItemId,
      isLive: true,
      isDeleted: false,
      mealType: upperMealType,
    });

    if (!menuItem) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.MENU_ITEM_NOT_FOUND +
          " or is not available for this meal type"
      );
    }

    // Calculate total amount
    let totalAmount = menuItem.price;

    // Process addons if provided
    const addonItems = [];
    if (addonIds && addonIds.length > 0) {
      const addons = await Addon.find({
        _id: { $in: addonIds },
        isLive: true,
        isDeleted: false,
      });

      if (addons.length !== addonIds.length) {
        return sendError(
          res,
          HTTP_STATUS.NOT_FOUND,
          ERROR_MESSAGES.ADDON_NOT_FOUND + " or inactive"
        );
      }

      for (const addon of addons) {
        addonItems.push({
          addonId: addon._id,
          orderPlacedPrice: addon.price,
        });
        totalAmount += addon.price;
      }
    }

    // Apply subscription voucher if requested
    let usedSubscription = null;
    let vouchersUsed = 0;

    if (useSubscriptionVoucher) {
      // Find active subscription with available vouchers
      const subscription = await Subscription.findOne({
        customerId: customer._id,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        isDeleted: false,
        expiryDate: { $gt: new Date() },
        $expr: { $lt: ["$usedVouchers", "$totalVouchers"] },
      }).populate("planId");

      if (!subscription) {
        return sendError(
          res,
          HTTP_STATUS.NOT_FOUND,
          ERROR_MESSAGES.NO_ACTIVE_SUBSCRIPTION + " with available vouchers"
        );
      }

      // Validate plan type matches meal type
      const planType = subscription.planId.planType;
      if (
        (planType === PLAN_TYPES.LUNCH_ONLY &&
          upperMealType !== MEAL_TYPES.LUNCH) ||
        (planType === PLAN_TYPES.DINNER_ONLY &&
          upperMealType !== MEAL_TYPES.DINNER)
      ) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          `Your ${planType} subscription does not cover ${upperMealType} orders`
        );
      }

      // Calculate vouchers needed (1 per menu item)
      vouchersUsed = 1;

      // Check if enough vouchers available
      const remainingVouchers =
        subscription.totalVouchers - subscription.usedVouchers;
      if (remainingVouchers < vouchersUsed) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_MESSAGES.INSUFFICIENT_VOUCHERS +
            `. Available: ${remainingVouchers}, Required: ${vouchersUsed}`
        );
      }

      // Voucher covers the menu item price
      // Deduct menu item price from total (addons still cost money)
      totalAmount -= menuItem.price;
      totalAmount = Math.max(totalAmount, 0); // Ensure non-negative

      usedSubscription = subscription._id;

      // Update subscription
      subscription.usedVouchers += vouchersUsed;

      // Check if subscription should be marked as exhausted
      if (subscription.usedVouchers >= subscription.totalVouchers) {
        subscription.status = SUBSCRIPTION_STATUS.EXHAUSTED;
      }

      await subscription.save();

      // Update customer's active subscription status
      await updateCustomerSubscriptionStatus(customer._id);
    }

    // Create order
    const order = new Order({
      customerId: customer._id,
      mealType: upperMealType,
      scheduledForDate: scheduledDate,
      isAutoOrder: false,
      menuItem: {
        menuItemId: menuItem._id,
        orderPlacedPrice: menuItem.price,
      },
      addons: addonItems,
      subscriptionUsed: usedSubscription,
      vouchersConsumed: vouchersUsed,
      totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
      specialInstructions: specialInstructions || "",
      packagingType: upperPackagingType,
    });

    await order.save();

    // Populate references
    await order.populate([
      { path: "customerId", select: "-__v" },
      { path: "menuItem.menuItemId" },
      { path: "addons.addonId" },
      { path: "subscriptionUsed" },
    ]);

    return sendSuccess(
      res,
      HTTP_STATUS.CREATED,
      "Order placed successfully",
      order
    );
  } catch (error) {
    console.error("Error creating order:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Validation failed", {
        errors,
      });
    }

    if (error.name === "CastError") {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid ID format");
    }

    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create order. Please try again"
    );
  }
};

/**
 * Get customer's own orders
 * @access Customer (Firebase authenticated)
 * @route GET /api/orders/my-orders
 * @description Retrieve all orders for the authenticated customer
 */
export const getMyOrders = async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser?.uid;
    const {
      mealType,
      scheduledForDate,
      status,
      includeDeleted = "false",
      sortBy = "scheduledForDate",
      sortOrder = "desc",
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
    } = req.query;

    if (!firebaseUid) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.AUTHENTICATION_REQUIRED
      );
    }

    // Find customer
    const customer = await Customer.findOne({
      firebaseUid,
      isDeleted: false,
    });

    if (!customer) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.CUSTOMER_NOT_FOUND
      );
    }

    // Build filter
    const filter = { customerId: customer._id };

    if (mealType) {
      filter.mealType = mealType.toUpperCase();
    }

    if (scheduledForDate) {
      const date = new Date(scheduledForDate);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      filter.scheduledForDate = { $gte: date, $lt: nextDate };
    }

    // Status filter (active, cancelled, delivered, etc.)
    if (status) {
      const statusKey = `orderStatus.${status}At`;
      if (status === "active") {
        // Active orders: placed but not delivered, cancelled, or failed
        filter["orderStatus.deliveredAt"] = null;
        filter["orderStatus.cancelledAt"] = null;
        filter["orderStatus.failedAt"] = null;
      } else {
        filter[statusKey] = { $ne: null };
      }
    }

    if (includeDeleted !== "true") {
      filter.isDeleted = false;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const [orders, totalCount] = await Promise.all([
      Order.find(filter)
        .populate([
          { path: "customerId", select: "name phone email" },
          { path: "menuItem.menuItemId" },
          { path: "addons.addonId" },
          { path: "subscriptionUsed" },
        ])
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),
    ]);

    // Add computed fields
    const ordersWithStatus = orders.map((order) => {
      const currentStatus = getCurrentOrderStatus(order.orderStatus);
      return {
        ...order,
        currentStatus,
      };
    });

    return sendSuccess(res, HTTP_STATUS.OK, "Orders retrieved successfully", {
      orders: ordersWithStatus,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch orders. Please try again"
    );
  }
};

/**
 * Get order by ID (Customer's own order)
 * @access Customer (Firebase authenticated)
 * @route GET /api/orders/:id
 * @description Get details of a specific order
 */
export const getMyOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const firebaseUid = req.firebaseUser?.uid;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    if (!firebaseUid) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.AUTHENTICATION_REQUIRED
      );
    }

    // Find customer
    const customer = await Customer.findOne({
      firebaseUid,
      isDeleted: false,
    });

    if (!customer) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.CUSTOMER_NOT_FOUND
      );
    }

    // Find order
    const order = await Order.findOne({
      _id: id,
      customerId: customer._id,
    }).populate([
      { path: "customerId", select: "name phone email address" },
      { path: "menuItem.menuItemId" },
      { path: "addons.addonId" },
      { path: "subscriptionUsed" },
    ]);

    if (!order) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ORDER_NOT_FOUND
      );
    }

    const currentStatus = getCurrentOrderStatus(order.orderStatus);

    return sendSuccess(res, HTTP_STATUS.OK, "Order retrieved successfully", {
      ...order.toObject(),
      currentStatus,
    });
  } catch (error) {
    console.error("Error fetching order:", error);

    if (error.name === "CastError") {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch order. Please try again"
    );
  }
};

/**
 * Cancel order
 * @access Customer (Firebase authenticated)
 * @route PATCH /api/orders/:id/cancel
 * @description Allows customer to cancel their order
 */
export const cancelMyOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const firebaseUid = req.firebaseUser?.uid;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    if (!firebaseUid) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.AUTHENTICATION_REQUIRED
      );
    }

    // Find customer
    const customer = await Customer.findOne({
      firebaseUid,
      isDeleted: false,
    });

    if (!customer) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.CUSTOMER_NOT_FOUND
      );
    }

    // Find order
    const order = await Order.findOne({
      _id: id,
      customerId: customer._id,
      isDeleted: false,
    });

    if (!order) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ORDER_NOT_FOUND
      );
    }

    // Check if order can be cancelled
    if (order.orderStatus.cancelledAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Order is already cancelled"
      );
    }

    if (order.orderStatus.deliveredAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot cancel a delivered order"
      );
    }

    if (order.orderStatus.failedAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot cancel a failed order"
      );
    }

    if (order.orderStatus.outForDeliveryAt) {
      return sendError(
        res,
        400,
        "Cannot cancel order that is out for delivery"
      );
    }

    // Validate time restrictions for cancelling orders
    const cancelCheck = canCancelOrder(order);
    if (!cancelCheck.allowed) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, cancelCheck.reason);
    }

    // Cancel order
    order.orderStatus.cancelledAt = new Date();
    await order.save();

    await order.populate([
      { path: "customerId", select: "name phone email" },
      { path: "menuItem.menuItemId" },
      { path: "addons.addonId" },
      { path: "subscriptionUsed" },
    ]);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      "Order cancelled successfully",
      order
    );
  } catch (error) {
    console.error("Error cancelling order:", error);

    if (error.name === "CastError") {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to cancel order. Please try again"
    );
  }
};

/**
 * Get all orders (Admin)
 * @access Admin only
 * @route GET /api/orders/all
 * @description Get all orders with filtering and pagination
 */
export const getAllOrders = async (req, res) => {
  try {
    const {
      customerId,
      mealType,
      scheduledForDate,
      status,
      includeDeleted = "false",
      sortBy = "scheduledForDate",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    // Build filter
    const filter = {};

    if (customerId) {
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          "Invalid customer ID format"
        );
      }
      filter.customerId = customerId;
    }

    if (mealType) {
      filter.mealType = mealType.toUpperCase();
    }

    if (scheduledForDate) {
      const date = new Date(scheduledForDate);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      filter.scheduledForDate = { $gte: date, $lt: nextDate };
    }

    // Status filter
    if (status) {
      const statusKey = `orderStatus.${status}At`;
      if (status === "active") {
        filter["orderStatus.deliveredAt"] = null;
        filter["orderStatus.cancelledAt"] = null;
        filter["orderStatus.failedAt"] = null;
      } else {
        filter[statusKey] = { $ne: null };
      }
    }

    if (includeDeleted !== "true") {
      filter.isDeleted = false;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const [orders, totalCount] = await Promise.all([
      Order.find(filter)
        .populate([
          { path: "customerId", select: "name phone email address" },
          { path: "menuItem.menuItemId" },
          { path: "addons.addonId" },
          { path: "subscriptionUsed" },
        ])
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),
    ]);

    // Add computed fields
    const ordersWithStatus = orders.map((order) => {
      const currentStatus = getCurrentOrderStatus(order.orderStatus);
      return {
        ...order,
        currentStatus,
      };
    });

    return sendSuccess(res, HTTP_STATUS.OK, "Orders retrieved successfully", {
      orders: ordersWithStatus,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch orders. Please try again"
    );
  }
};

/**
 * Get order by ID (Admin)
 * @access Admin only
 * @route GET /api/orders/admin/:id
 * @description Get details of any order
 */
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    const order = await Order.findById(id).populate([
      {
        path: "customerId",
        select: "name phone email address dietaryPreferences",
      },
      { path: "menuItem.menuItemId" },
      { path: "addons.addonId" },
      { path: "subscriptionUsed" },
    ]);

    if (!order) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ORDER_NOT_FOUND
      );
    }

    const currentStatus = getCurrentOrderStatus(order.orderStatus);

    return sendSuccess(res, HTTP_STATUS.OK, "Order retrieved successfully", {
      ...order.toObject(),
      currentStatus,
    });
  } catch (error) {
    console.error("Error fetching order:", error);

    if (error.name === "CastError") {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch order. Please try again"
    );
  }
};

/**
 * Update order status (Admin)
 * @access Admin only
 * @route PATCH /api/orders/:id/status
 * @description Update order status (accept, preparing, out for delivery, delivered, failed)
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    if (!status) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Status is required");
    }

    const validStatuses = [
      "accepted",
      "preparing",
      "outForDelivery",
      "delivered",
      "failed",
    ];

    if (!validStatuses.includes(status)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid status", {
        validStatuses,
      });
    }

    const order = await Order.findOne({ _id: id, isDeleted: false });

    if (!order) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ORDER_NOT_FOUND
      );
    }

    // Check if order is already cancelled or failed
    if (order.orderStatus.cancelledAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot update status of cancelled order"
      );
    }

    if (order.orderStatus.failedAt && status !== "failed") {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot update status of failed order"
      );
    }

    if (order.orderStatus.deliveredAt && status !== "delivered") {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot update status of delivered order"
      );
    }

    // Update status with timestamp
    const now = new Date();
    const statusKey = `${status}At`;

    // Validate status progression
    if (status === "accepted" && order.orderStatus.acceptedAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Order is already accepted"
      );
    }

    if (status === "preparing") {
      if (!order.orderStatus.acceptedAt) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          "Order must be accepted first"
        );
      }
      if (order.orderStatus.preparingAt) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          "Order is already being prepared"
        );
      }
    }

    if (status === "outForDelivery") {
      if (!order.orderStatus.preparingAt) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          "Order must be in preparing status first"
        );
      }
      if (order.orderStatus.outForDeliveryAt) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          "Order is already out for delivery"
        );
      }
    }

    if (status === "delivered") {
      if (!order.orderStatus.outForDeliveryAt) {
        return sendError(res, 400, "Order must be out for delivery first");
      }
      if (order.orderStatus.deliveredAt) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          "Order is already delivered"
        );
      }
    }

    // Phase 4: Check if we need to create delivery record before updating status
    const wasNotAccepted = !order.orderStatus.acceptedAt;

    order.orderStatus[statusKey] = now;
    await order.save();

    // Phase 4: Auto-create delivery record when order is accepted for the first time
    if (status === "accepted" && wasNotAccepted) {
      try {
        // Check if delivery record already exists
        const existingDelivery = await Delivery.findOne({ orderId: order._id });

        if (!existingDelivery) {
          // Get customer details for delivery location
          const customer = await Customer.findById(order.customerId);

          // Create delivery record with placeholder coordinates
          // TODO: Real coordinates should be provided by admin/frontend
          const delivery = new Delivery({
            orderId: order._id,
            customerId: order.customerId,
            fromLocation: {
              address: "Kitchen - Main Location",
              coordinates: {
                latitude: 0.0,
                longitude: 0.0,
              },
              landmark: "Restaurant Kitchen",
            },
            toLocation: {
              address: customer?.address?.addressLine || "Customer Address",
              coordinates: {
                latitude: 0.0,
                longitude: 0.0,
              },
              landmark: customer?.address?.deliveryNote || "",
            },
            estimatedDeliveryTime: order.scheduledForDate,
            deliveryNotes: `Meal Type: ${order.mealType}, Packaging: ${order.packagingType}`,
          });

          await delivery.save();
          console.log(`Auto-created delivery record for order ${order._id}`);
        }
      } catch (deliveryError) {
        // Log error but don't fail the order status update
        console.error("Failed to auto-create delivery record:", deliveryError);
      }
    }

    await order.populate([
      { path: "customerId", select: "name phone email address" },
      { path: "menuItem.menuItemId" },
      { path: "addons.addonId" },
      { path: "subscriptionUsed" },
    ]);

    const currentStatus = getCurrentOrderStatus(order.orderStatus);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      `Order status updated to ${status}`,
      {
        ...order.toObject(),
        currentStatus,
      }
    );
  } catch (error) {
    console.error("Error updating order status:", error);

    if (error.name === "CastError") {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    return sendError(
      res,
      500,
      "Failed to update order status. Please try again"
    );
  }
};

/**
 * Delete order (Soft delete) (Admin)
 * @access Admin only
 * @route DELETE /api/orders/:id
 * @description Soft delete an order
 */
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    const order = await Order.findOne({ _id: id, isDeleted: false });

    if (!order) {
      return sendError(res, 404, "Order not found or already deleted");
    }

    // Soft delete
    order.isDeleted = true;
    order.deletedAt = new Date();
    await order.save();

    return sendSuccess(res, HTTP_STATUS.OK, "Order deleted successfully", {
      id: order._id,
      deletedAt: order.deletedAt,
    });
  } catch (error) {
    console.error("Error deleting order:", error);

    if (error.name === "CastError") {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete order. Please try again"
    );
  }
};

/**
 * Restore deleted order (Admin)
 * @access Admin only
 * @route PATCH /api/orders/:id/restore
 * @description Restore a soft-deleted order
 */
export const restoreOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    const order = await Order.findOne({ _id: id, isDeleted: true });

    if (!order) {
      return sendError(res, 404, "Deleted order not found");
    }

    // Restore
    order.isDeleted = false;
    order.deletedAt = null;
    await order.save();

    await order.populate([
      { path: "customerId", select: "name phone email" },
      { path: "menuItem.menuItemId" },
      { path: "addons.addonId" },
      { path: "subscriptionUsed" },
    ]);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      "Order restored successfully",
      order
    );
  } catch (error) {
    console.error("Error restoring order:", error);

    if (error.name === "CastError") {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to restore order. Please try again"
    );
  }
};

/**
 * Get orders by date range (Admin)
 * @access Admin only
 * @route GET /api/orders/date-range
 * @description Get orders within a specific date range
 */
export const getOrdersByDateRange = async (req, res) => {
  try {
    const { startDate, endDate, mealType } = req.query;

    if (!startDate || !endDate) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Start date and end date are required"
      );
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Start date must be before end date"
      );
    }

    const filter = {
      scheduledForDate: { $gte: start, $lte: end },
      isDeleted: false,
    };

    if (mealType) {
      filter.mealType = mealType.toUpperCase();
    }

    const orders = await Order.find(filter)
      .populate([
        { path: "customerId", select: "name phone email address" },
        { path: "menuItem.menuItemId" },
        { path: "addons.addonId" },
      ])
      .sort({ scheduledForDate: 1, mealType: 1 });

    const ordersWithStatus = orders.map((order) => {
      const currentStatus = getCurrentOrderStatus(order.orderStatus);
      return {
        ...order.toObject(),
        currentStatus,
      };
    });

    return sendSuccess(
      res,
      200,
      `Found ${orders.length} orders in date range`,
      {
        orders: ordersWithStatus,
        dateRange: { startDate: start, endDate: end },
      }
    );
  } catch (error) {
    console.error("Error fetching orders by date range:", error);
    return sendError(
      res,
      500,
      "Failed to fetch orders by date range. Please try again"
    );
  }
};

/**
 * Get order statistics (Admin)
 * @access Admin only
 * @route GET /api/orders/stats
 * @description Get analytics and statistics about orders
 */
export const getOrderStats = async (req, res) => {
  try {
    const [
      totalOrders,
      activeOrders,
      deliveredOrders,
      cancelledOrders,
      failedOrders,
      ordersByMealType,
      revenueStats,
      todaysOrders,
    ] = await Promise.all([
      Order.countDocuments({ isDeleted: false }),
      Order.countDocuments({
        isDeleted: false,
        "orderStatus.deliveredAt": null,
        "orderStatus.cancelledAt": null,
        "orderStatus.failedAt": null,
      }),
      Order.countDocuments({
        isDeleted: false,
        "orderStatus.deliveredAt": { $ne: null },
      }),
      Order.countDocuments({
        isDeleted: false,
        "orderStatus.cancelledAt": { $ne: null },
      }),
      Order.countDocuments({
        isDeleted: false,
        "orderStatus.failedAt": { $ne: null },
      }),
      Order.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: "$mealType",
            count: { $sum: 1 },
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
      ]),
      Order.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            averageOrderValue: { $avg: "$totalAmount" },
          },
        },
      ]),
      (async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return Order.countDocuments({
          scheduledForDate: { $gte: today, $lt: tomorrow },
          isDeleted: false,
        });
      })(),
    ]);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      "Order statistics retrieved successfully",
      {
        totalOrders,
        ordersByStatus: {
          active: activeOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
          failed: failedOrders,
        },
        ordersByMealType,
        revenue: {
          total: revenueStats[0]?.totalRevenue || 0,
          average: revenueStats[0]?.averageOrderValue || 0,
        },
        todaysOrders,
      }
    );
  } catch (error) {
    console.error("Error fetching order statistics:", error);
    return sendError(
      res,
      500,
      "Failed to fetch order statistics. Please try again"
    );
  }
};

/**
 * Get upcoming orders (Admin/Kitchen)
 * @access Admin only
 * @route GET /api/orders/upcoming
 * @description Get orders scheduled for today or upcoming days
 */
export const getUpcomingOrders = async (req, res) => {
  try {
    const { days = 1, mealType } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + parseInt(days));

    const filter = {
      scheduledForDate: { $gte: today, $lt: futureDate },
      isDeleted: false,
      "orderStatus.cancelledAt": null,
      "orderStatus.failedAt": null,
    };

    if (mealType) {
      filter.mealType = mealType.toUpperCase();
    }

    const orders = await Order.find(filter)
      .populate([
        {
          path: "customerId",
          select: "name phone email address dietaryPreferences",
        },
        { path: "menuItem.menuItemId" },
        { path: "addons.addonId" },
      ])
      .sort({ scheduledForDate: 1, mealType: 1 });

    const ordersWithStatus = orders.map((order) => {
      const currentStatus = getCurrentOrderStatus(order.orderStatus);
      return {
        ...order.toObject(),
        currentStatus,
      };
    });

    return sendSuccess(
      res,
      200,
      `Found ${orders.length} upcoming orders`,
      ordersWithStatus
    );
  } catch (error) {
    console.error("Error fetching upcoming orders:", error);
    return sendError(
      res,
      500,
      "Failed to fetch upcoming orders. Please try again"
    );
  }
};

/**
 * Update order details (Admin)
 * @access Admin only
 * @route PUT /api/orders/:id
 * @description Update order details (special instructions, packaging type, etc.)
 */
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    const order = await Order.findOne({ _id: id, isDeleted: false });

    if (!order) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ORDER_NOT_FOUND
      );
    }

    // Prevent updates to delivered, cancelled, or failed orders
    if (order.orderStatus.deliveredAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot update delivered order"
      );
    }

    if (order.orderStatus.cancelledAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot update cancelled order"
      );
    }

    if (order.orderStatus.failedAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot update failed order"
      );
    }

    // Prevent modification of certain fields
    delete updates._id;
    delete updates.__v;
    delete updates.customerId;
    delete updates.createdAt;
    delete updates.isDeleted;
    delete updates.deletedAt;
    delete updates.orderStatus;
    delete updates.totalAmount;

    // Validate packaging type if provided
    if (updates.packagingType) {
      const upperPackagingType = updates.packagingType.toUpperCase();
      if (!Object.values(PACKAGING_TYPES).includes(upperPackagingType)) {
        return sendError(
          res,
          400,
          "Invalid packaging type. Must be STEEL_DABBA or DISPOSABLE"
        );
      }
      updates.packagingType = upperPackagingType;
    }

    // Trim special instructions
    if (updates.specialInstructions !== undefined) {
      updates.specialInstructions = updates.specialInstructions.trim();
    }

    // Update order
    Object.assign(order, updates);
    await order.save();

    await order.populate([
      { path: "customerId", select: "name phone email address" },
      { path: "menuItem.menuItemId" },
      { path: "addons.addonId" },
      { path: "subscriptionUsed" },
    ]);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      "Order updated successfully",
      order
    );
  } catch (error) {
    console.error("Error updating order:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Validation failed", {
        errors,
      });
    }

    if (error.name === "CastError") {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid ID format");
    }

    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update order. Please try again"
    );
  }
};

/**
 * Cancel order (Admin)
 * @access Admin only
 * @route PATCH /api/orders/:id/admin-cancel
 * @description Allows admin to cancel any order, with optional time restriction bypass
 */
export const adminCancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { bypassTimeRestrictions = false, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    // Find order
    const order = await Order.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!order) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ORDER_NOT_FOUND
      );
    }

    // Check if order can be cancelled
    if (order.orderStatus.cancelledAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Order is already cancelled"
      );
    }

    if (order.orderStatus.deliveredAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot cancel a delivered order"
      );
    }

    if (order.orderStatus.failedAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot cancel a failed order"
      );
    }

    // Validate time restrictions unless admin chooses to bypass
    if (!bypassTimeRestrictions) {
      const cancelCheck = canCancelOrder(order);
      if (!cancelCheck.allowed) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          cancelCheck.reason + " (Set bypassTimeRestrictions=true to override)"
        );
      }
    }

    // Cancel order
    order.orderStatus.cancelledAt = new Date();

    // Add cancellation reason if provided
    if (reason) {
      order.specialInstructions =
        (order.specialInstructions || "") + `\n[Admin Cancelled: ${reason}]`;
    }

    await order.save();

    // If order used subscription voucher, refund it
    if (order.subscriptionUsed && order.vouchersConsumed > 0) {
      const subscription = await Subscription.findById(order.subscriptionUsed);
      if (subscription) {
        subscription.usedVouchers -= order.vouchersConsumed;

        // If subscription was exhausted, reactivate it
        if (
          subscription.status === SUBSCRIPTION_STATUS.EXHAUSTED &&
          subscription.usedVouchers < subscription.totalVouchers &&
          subscription.expiryDate > new Date()
        ) {
          subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
        }

        await subscription.save();

        // Update customer's subscription status
        await updateCustomerSubscriptionStatus(subscription.customerId);
      }
    }

    await order.populate([
      { path: "customerId", select: "name phone email" },
      { path: "menuItem.menuItemId" },
      { path: "addons.addonId" },
      { path: "subscriptionUsed" },
    ]);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      "Order cancelled successfully by admin",
      order
    );
  } catch (error) {
    console.error("Error cancelling order (admin):", error);

    if (error.name === "CastError") {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to cancel order. Please try again"
    );
  }
};

/**
 * Helper function to get current order status
 * @param {Object} orderStatus - Order status object
 * @returns {string} Current status
 */
function getCurrentOrderStatus(orderStatus) {
  if (orderStatus.deliveredAt) return "delivered";
  if (orderStatus.cancelledAt) return "cancelled";
  if (orderStatus.failedAt) return "failed";
  if (orderStatus.outForDeliveryAt) return "outForDelivery";
  if (orderStatus.preparingAt) return "preparing";
  if (orderStatus.acceptedAt) return "accepted";
  return "placed";
}

/**
 * Get kitchen dashboard
 * @access Kitchen Staff, Admin
 * @route GET /api/orders/kitchen/dashboard
 * @description Get dashboard view for kitchen staff with today's orders
 */
export const getKitchenDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get status counts for today
    const stats = await Order.aggregate([
      {
        $match: {
          scheduledForDate: { $gte: today, $lt: tomorrow },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          placed: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$orderStatus.acceptedAt", null] },
                    { $eq: ["$orderStatus.cancelledAt", null] },
                    { $eq: ["$orderStatus.failedAt", null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          accepted: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$orderStatus.acceptedAt", null] },
                    { $eq: ["$orderStatus.preparingAt", null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          preparing: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$orderStatus.preparingAt", null] },
                    { $eq: ["$orderStatus.outForDeliveryAt", null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          ready: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$orderStatus.outForDeliveryAt", null] },
                    { $eq: ["$orderStatus.deliveredAt", null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Get pending orders (placed but not accepted)
    const pendingOrders = await Order.find({
      scheduledForDate: { $gte: today, $lt: tomorrow },
      "orderStatus.acceptedAt": null,
      "orderStatus.cancelledAt": null,
      "orderStatus.failedAt": null,
      isDeleted: false,
    })
      .populate([
        { path: "customerId", select: "name phone address" },
        { path: "menuItem.menuItemId" },
        { path: "addons.addonId" },
      ])
      .sort({ "orderStatus.placedAt": 1 });

    // Get preparing orders
    const preparingOrders = await Order.find({
      scheduledForDate: { $gte: today, $lt: tomorrow },
      "orderStatus.preparingAt": { $ne: null },
      "orderStatus.outForDeliveryAt": null,
      isDeleted: false,
    })
      .populate([
        { path: "customerId", select: "name phone address" },
        { path: "menuItem.menuItemId" },
        { path: "addons.addonId" },
      ])
      .sort({ "orderStatus.preparingAt": 1 });

    return sendSuccess(res, HTTP_STATUS.OK, "Kitchen dashboard data retrieved", {
      stats: stats[0] || {
        totalOrders: 0,
        placed: 0,
        accepted: 0,
        preparing: 0,
        ready: 0,
      },
      pendingOrders,
      preparingOrders,
    });
  } catch (error) {
    console.error("Error fetching kitchen dashboard:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch kitchen dashboard. Please try again"
    );
  }
};

/**
 * Accept order (Kitchen Staff)
 * @access Kitchen Staff, Admin
 * @route POST /api/orders/:orderId/accept
 * @description Kitchen staff accepts a placed order
 */
export const acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    const order = await Order.findOne({ _id: orderId, isDeleted: false });

    if (!order) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ORDER_NOT_FOUND
      );
    }

    // Check if order is in correct state
    if (order.orderStatus.cancelledAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot accept cancelled order"
      );
    }

    if (order.orderStatus.failedAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot accept failed order"
      );
    }

    if (order.orderStatus.acceptedAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Order is already accepted"
      );
    }

    // Accept order
    order.orderStatus.acceptedAt = new Date();
    await order.save();

    await order.populate([
      { path: "customerId", select: "name phone address" },
      { path: "menuItem.menuItemId" },
      { path: "addons.addonId" },
    ]);

    return sendSuccess(res, HTTP_STATUS.OK, "Order accepted successfully", order);
  } catch (error) {
    console.error("Error accepting order:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to accept order. Please try again"
    );
  }
};

/**
 * Reject order (Kitchen Staff)
 * @access Kitchen Staff, Admin
 * @route POST /api/orders/:orderId/reject
 * @description Kitchen staff rejects a placed order
 */
export const rejectOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    const order = await Order.findOne({ _id: orderId, isDeleted: false });

    if (!order) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ORDER_NOT_FOUND
      );
    }

    // Check if order can be rejected
    if (order.orderStatus.cancelledAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Order is already cancelled"
      );
    }

    if (order.orderStatus.failedAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Order is already marked as failed"
      );
    }

    if (order.orderStatus.deliveredAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot reject delivered order"
      );
    }

    // Mark as failed
    order.orderStatus.failedAt = new Date();
    if (reason) {
      order.specialInstructions =
        (order.specialInstructions || "") + `\n[Kitchen Rejected: ${reason}]`;
    }
    await order.save();

    // If order used subscription voucher, refund it
    if (order.subscriptionUsed && order.vouchersConsumed > 0) {
      const subscription = await Subscription.findById(order.subscriptionUsed);
      if (subscription) {
        subscription.usedVouchers -= order.vouchersConsumed;

        // If subscription was exhausted, reactivate it
        if (
          subscription.status === SUBSCRIPTION_STATUS.EXHAUSTED &&
          subscription.usedVouchers < subscription.totalVouchers &&
          subscription.expiryDate > new Date()
        ) {
          subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
        }

        await subscription.save();

        // Update customer's subscription status
        await updateCustomerSubscriptionStatus(subscription.customerId);
      }
    }

    await order.populate([
      { path: "customerId", select: "name phone address" },
      { path: "menuItem.menuItemId" },
      { path: "addons.addonId" },
    ]);

    return sendSuccess(res, HTTP_STATUS.OK, "Order rejected successfully", order);
  } catch (error) {
    console.error("Error rejecting order:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to reject order. Please try again"
    );
  }
};

/**
 * Update preparation status
 * @access Kitchen Staff, Admin
 * @route PATCH /api/orders/:orderId/preparation-status
 * @description Update order preparation status
 */
export const updatePreparationStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { preparationStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    if (!preparationStatus) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Preparation status is required"
      );
    }

    const validStatuses = ["started", "in-progress", "almost-ready"];
    if (!validStatuses.includes(preparationStatus)) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid preparation status",
        { validStatuses }
      );
    }

    const order = await Order.findOne({ _id: orderId, isDeleted: false });

    if (!order) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ORDER_NOT_FOUND
      );
    }

    // Check if order is accepted
    if (!order.orderStatus.acceptedAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Order must be accepted before updating preparation status"
      );
    }

    if (order.orderStatus.cancelledAt || order.orderStatus.failedAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot update preparation status of cancelled/failed order"
      );
    }

    // Update to preparing status if not already
    if (!order.orderStatus.preparingAt) {
      order.orderStatus.preparingAt = new Date();
    }

    // Store preparation status in special instructions for now
    // (Ideally this would be a separate field in the schema)
    order.specialInstructions =
      (order.specialInstructions || "").replace(
        /\[Preparation: .*?\]/g,
        ""
      ) + `\n[Preparation: ${preparationStatus}]`;

    await order.save();

    await order.populate([
      { path: "customerId", select: "name phone address" },
      { path: "menuItem.menuItemId" },
      { path: "addons.addonId" },
    ]);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      "Preparation status updated successfully",
      order
    );
  } catch (error) {
    console.error("Error updating preparation status:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update preparation status. Please try again"
    );
  }
};

/**
 * Mark order ready for delivery
 * @access Kitchen Staff, Admin
 * @route POST /api/orders/:orderId/ready
 * @description Mark order as ready and out for delivery
 */
export const markReadyForDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    const order = await Order.findOne({ _id: orderId, isDeleted: false });

    if (!order) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ORDER_NOT_FOUND
      );
    }

    // Check if order is in correct state
    if (!order.orderStatus.preparingAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Order must be in preparing status first"
      );
    }

    if (order.orderStatus.cancelledAt || order.orderStatus.failedAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot mark cancelled/failed order as ready"
      );
    }

    if (order.orderStatus.outForDeliveryAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Order is already marked as ready/out for delivery"
      );
    }

    // Mark as ready (out for delivery)
    order.orderStatus.outForDeliveryAt = new Date();
    await order.save();

    await order.populate([
      { path: "customerId", select: "name phone address" },
      { path: "menuItem.menuItemId" },
      { path: "addons.addonId" },
    ]);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      "Order marked ready for delivery",
      order
    );
  } catch (error) {
    console.error("Error marking order ready:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to mark order ready. Please try again"
    );
  }
};

/**
 * Bulk accept orders
 * @access Kitchen Staff, Admin
 * @route POST /api/orders/bulk-accept
 * @description Accept multiple orders at once
 */
export const bulkAcceptOrders = async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "orderIds array is required"
      );
    }

    // Validate all order IDs
    for (const id of orderIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          `Invalid order ID format: ${id}`
        );
      }
    }

    const result = await Order.updateMany(
      {
        _id: { $in: orderIds },
        "orderStatus.acceptedAt": null,
        "orderStatus.cancelledAt": null,
        "orderStatus.failedAt": null,
        isDeleted: false,
      },
      {
        $set: {
          "orderStatus.acceptedAt": new Date(),
        },
      }
    );

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      `${result.modifiedCount} orders accepted`,
      {
        modifiedCount: result.modifiedCount,
        requestedCount: orderIds.length,
      }
    );
  } catch (error) {
    console.error("Error bulk accepting orders:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Bulk accept failed. Please try again"
    );
  }
};

/**
 * Assign driver manually (Admin)
 * @access Admin
 * @route POST /api/orders/:orderId/assign-driver
 * @description Manually assign a specific driver to an order
 */
export const assignDriverManually = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid driver ID format");
    }

    // Verify order exists and is ready
    const order = await Order.findOne({ _id: orderId, isDeleted: false });

    if (!order) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ORDER_NOT_FOUND
      );
    }

    if (
      order.orderStatus.cancelledAt ||
      order.orderStatus.failedAt ||
      order.orderStatus.deliveredAt
    ) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot assign driver to cancelled, failed, or delivered order"
      );
    }

    // Verify driver is available
    const driver = await DeliveryDriver.findOne({
      _id: driverId,
      isActive: true,
      isDeleted: false,
    });

    if (!driver) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Driver not found or inactive"
      );
    }

    if (!driver.isAvailable) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Driver is currently unavailable or on another delivery"
      );
    }

    // Assign driver
    const updatedOrder = await assignDriverToOrder(orderId, driverId);

    if (!updatedOrder) {
      return sendError(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Failed to assign driver"
      );
    }

    await updatedOrder.populate([
      { path: "customerId", select: "name phone address" },
      { path: "menuItem.menuItemId" },
      { path: "addons.addonId" },
      { path: "driverId", select: "name phone vehicle" },
    ]);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      "Driver assigned successfully",
      updatedOrder
    );
  } catch (error) {
    console.error("Error assigning driver manually:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Driver assignment failed. Please try again"
    );
  }
};

/**
 * Auto-assign driver (Admin/System)
 * @access Admin
 * @route POST /api/orders/:orderId/auto-assign-driver
 * @description Automatically assign an available driver to an order
 */
export const autoAssignDriver = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    // Verify order exists and is ready
    const order = await Order.findOne({ _id: orderId, isDeleted: false });

    if (!order) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ORDER_NOT_FOUND
      );
    }

    if (
      order.orderStatus.cancelledAt ||
      order.orderStatus.failedAt ||
      order.orderStatus.deliveredAt
    ) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot assign driver to cancelled, failed, or delivered order"
      );
    }

    if (order.driverId) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Order already has a driver assigned"
      );
    }

    // Find available driver
    const driver = await findAvailableDriver(null);

    if (!driver) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        "No available drivers found at this time"
      );
    }

    // Assign driver
    const updatedOrder = await assignDriverToOrder(orderId, driver._id);

    if (!updatedOrder) {
      return sendError(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Failed to assign driver"
      );
    }

    await updatedOrder.populate([
      { path: "customerId", select: "name phone address" },
      { path: "menuItem.menuItemId" },
      { path: "addons.addonId" },
      { path: "driverId", select: "name phone vehicle" },
    ]);

    return sendSuccess(res, HTTP_STATUS.OK, "Driver auto-assigned successfully", {
      order: updatedOrder,
      driver: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        vehicleNumber: driver.vehicle?.vehicleNumber,
      },
    });
  } catch (error) {
    console.error("Error auto-assigning driver:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Auto-assignment failed. Please try again"
    );
  }
};

/**
 * Request refund (Customer)
 * @access Customer (Firebase authenticated)
 * @route POST /api/orders/:orderId/refund
 * @description Customer requests a refund for their order
 */
export const requestRefund = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const firebaseUid = req.firebaseUser?.uid;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    if (!firebaseUid) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.AUTHENTICATION_REQUIRED
      );
    }

    // Find customer
    const customer = await Customer.findOne({
      firebaseUid,
      isDeleted: false,
    });

    if (!customer) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.CUSTOMER_NOT_FOUND
      );
    }

    // Find order
    const order = await Order.findOne({
      _id: orderId,
      customerId: customer._id,
      isDeleted: false,
    });

    if (!order) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ORDER_NOT_FOUND
      );
    }

    // Check if refund already requested
    if (order.refundStatus !== "none") {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Refund already ${order.refundStatus} for this order`
      );
    }

    // Cannot refund delivered orders
    if (order.orderStatus.deliveredAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot refund delivered orders. Please contact support"
      );
    }

    // Request refund
    order.refundStatus = "pending";
    order.refundReason = reason || "Customer requested refund";
    order.refundRequestedAt = new Date();
    order.refundAmount = order.totalAmount;

    await order.save();

    await order.populate([
      { path: "customerId", select: "name phone email" },
      { path: "menuItem.menuItemId" },
      { path: "addons.addonId" },
    ]);

    return sendSuccess(res, HTTP_STATUS.OK, "Refund request submitted successfully", order);
  } catch (error) {
    console.error("Error requesting refund:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Refund request failed. Please try again"
    );
  }
};

/**
 * Process refund (Admin)
 * @access Admin only
 * @route POST /api/orders/:orderId/refund/process
 * @description Admin approves or rejects a refund request
 */
export const processRefund = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, adminNotes } = req.body;
    const adminId = req.user?.userId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    if (!action || !["approve", "reject"].includes(action)) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid action. Use 'approve' or 'reject'"
      );
    }

    if (!adminId) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.AUTHENTICATION_REQUIRED
      );
    }

    const order = await Order.findOne({ _id: orderId, isDeleted: false });

    if (!order) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ORDER_NOT_FOUND
      );
    }

    if (order.refundStatus !== "pending") {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `No pending refund for this order. Current status: ${order.refundStatus}`
      );
    }

    if (action === "approve") {
      // Approve refund
      order.refundStatus = "processed";
      order.refundProcessedAt = new Date();
      order.refundProcessedBy = adminId;
      order.orderStatus.cancelledAt = new Date();
      order.adminNotes = adminNotes || "Refund approved by admin";

      // If voucher was used, restore it
      if (order.subscriptionUsed && order.vouchersConsumed > 0) {
        const subscription = await Subscription.findById(order.subscriptionUsed);
        if (subscription) {
          subscription.usedVouchers -= order.vouchersConsumed;

          // If subscription was exhausted, reactivate it
          if (
            subscription.status === SUBSCRIPTION_STATUS.EXHAUSTED &&
            subscription.usedVouchers < subscription.totalVouchers &&
            subscription.expiryDate > new Date()
          ) {
            subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
          }

          await subscription.save();

          // Update customer's subscription status
          await updateCustomerSubscriptionStatus(subscription.customerId);
        }
      }

      await order.save();

      // TODO: Process actual payment refund via payment gateway

      await order.populate([
        { path: "customerId", select: "name phone email" },
        { path: "menuItem.menuItemId" },
        { path: "refundProcessedBy", select: "name email" },
      ]);

      return sendSuccess(
        res,
        HTTP_STATUS.OK,
        "Refund approved and processed successfully",
        order
      );
    } else {
      // Reject refund
      order.refundStatus = "rejected";
      order.refundProcessedAt = new Date();
      order.refundProcessedBy = adminId;
      order.adminNotes = adminNotes || "Refund rejected by admin";

      await order.save();

      await order.populate([
        { path: "customerId", select: "name phone email" },
        { path: "menuItem.menuItemId" },
        { path: "refundProcessedBy", select: "name email" },
      ]);

      return sendSuccess(res, HTTP_STATUS.OK, "Refund rejected", order);
    }
  } catch (error) {
    console.error("Error processing refund:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Refund processing failed. Please try again"
    );
  }
};

/**
 * Get refund requests (Admin)
 * @access Admin only
 * @route GET /api/orders/refunds
 * @description Get all refund requests filtered by status
 */
export const getRefundRequests = async (req, res) => {
  try {
    const { status = "pending" } = req.query;

    const validStatuses = ["none", "pending", "processed", "rejected"];
    if (!validStatuses.includes(status)) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid status. Valid values: none, pending, processed, rejected"
      );
    }

    const refunds = await Order.find({
      refundStatus: status,
      isDeleted: false,
    })
      .populate([
        { path: "customerId", select: "name phone email" },
        { path: "menuItem.menuItemId" },
        { path: "refundProcessedBy", select: "name email" },
      ])
      .sort({ refundRequestedAt: -1 });

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      `Refund requests with status '${status}' retrieved successfully`,
      {
        count: refunds.length,
        refunds,
      }
    );
  } catch (error) {
    console.error("Error fetching refund requests:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch refund requests. Please try again"
    );
  }
};
