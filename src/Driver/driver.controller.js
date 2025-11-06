/**
 * Driver Controller
 * Handles delivery-related operations for drivers
 * @module Driver/Controller
 */

import Order from "../schema/Order.schema.js";
import DeliveryDriver from "../schema/DeliveryDriver.schema.js";
import { sendSuccess, sendError } from "../utils/response.util.js";
import { releaseDriver } from "../utils/deliveryAssignment.util.js";
import { HTTP_STATUS, ERROR_MESSAGES } from "../constants/index.js";
import mongoose from "mongoose";

/**
 * Get driver's assigned deliveries
 * @access Driver (JWT authenticated)
 * @route GET /api/driver/my-deliveries
 * @description Get all orders assigned to the authenticated driver
 */
export const getMyDeliveries = async (req, res) => {
  try {
    const driverId = req.user?.userId;

    if (!driverId) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.AUTHENTICATION_REQUIRED
      );
    }

    // Find orders assigned to this driver that are not yet delivered
    const orders = await Order.find({
      driverId,
      "orderStatus.deliveredAt": null,
      "orderStatus.cancelledAt": null,
      "orderStatus.failedAt": null,
      isDeleted: false,
    })
      .populate([
        { path: "customerId", select: "name phone address" },
        { path: "menuItem.menuItemId" },
        { path: "addons.addonId" },
        { path: "subscriptionUsed" },
      ])
      .sort({ assignedAt: -1 });

    // Get driver's delivery history (last 10 completed deliveries)
    const deliveryHistory = await Order.find({
      driverId,
      "orderStatus.deliveredAt": { $ne: null },
      isDeleted: false,
    })
      .populate([
        { path: "customerId", select: "name phone address" },
        { path: "menuItem.menuItemId" },
      ])
      .sort({ "orderStatus.deliveredAt": -1 })
      .limit(10);

    return sendSuccess(res, HTTP_STATUS.OK, "Deliveries retrieved successfully", {
      activeDeliveries: orders,
      deliveryHistory,
    });
  } catch (error) {
    console.error("Error fetching driver deliveries:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch deliveries. Please try again"
    );
  }
};

/**
 * Confirm pickup from kitchen
 * @access Driver (JWT authenticated)
 * @route POST /api/driver/orders/:orderId/pickup
 * @description Driver confirms they have picked up the order from kitchen
 */
export const confirmPickup = async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.user?.userId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    if (!driverId) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.AUTHENTICATION_REQUIRED
      );
    }

    // Find order assigned to this driver
    const order = await Order.findOne({
      _id: orderId,
      driverId,
      isDeleted: false,
    });

    if (!order) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Order not found or not assigned to you"
      );
    }

    // Check order status
    if (order.orderStatus.cancelledAt || order.orderStatus.failedAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot pickup cancelled or failed order"
      );
    }

    if (order.pickedUpAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Order already marked as picked up"
      );
    }

    // Mark as picked up
    order.pickedUpAt = new Date();

    // Ensure order status shows out for delivery
    if (!order.orderStatus.outForDeliveryAt) {
      order.orderStatus.outForDeliveryAt = new Date();
    }

    await order.save();

    await order.populate([
      { path: "customerId", select: "name phone address" },
      { path: "menuItem.menuItemId" },
      { path: "addons.addonId" },
    ]);

    return sendSuccess(res, HTTP_STATUS.OK, "Pickup confirmed successfully", order);
  } catch (error) {
    console.error("Error confirming pickup:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Pickup confirmation failed. Please try again"
    );
  }
};

/**
 * Confirm delivery to customer
 * @access Driver (JWT authenticated)
 * @route POST /api/driver/orders/:orderId/deliver
 * @description Driver confirms successful delivery to customer
 */
export const confirmDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.user?.userId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    if (!driverId) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.AUTHENTICATION_REQUIRED
      );
    }

    // Find order assigned to this driver
    const order = await Order.findOne({
      _id: orderId,
      driverId,
      isDeleted: false,
    });

    if (!order) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Order not found or not assigned to you"
      );
    }

    // Check order status
    if (order.orderStatus.cancelledAt || order.orderStatus.failedAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot deliver cancelled or failed order"
      );
    }

    if (order.orderStatus.deliveredAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Order already marked as delivered"
      );
    }

    if (!order.orderStatus.outForDeliveryAt) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Order must be out for delivery before confirming"
      );
    }

    // Mark as delivered
    order.orderStatus.deliveredAt = new Date();
    await order.save();

    // Release driver (make available for new deliveries)
    await releaseDriver(driverId);

    await order.populate([
      { path: "customerId", select: "name phone address" },
      { path: "menuItem.menuItemId" },
      { path: "addons.addonId" },
    ]);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      "Delivery confirmed successfully",
      order
    );
  } catch (error) {
    console.error("Error confirming delivery:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Delivery confirmation failed. Please try again"
    );
  }
};

/**
 * Update delivery status with location
 * @access Driver (JWT authenticated)
 * @route PATCH /api/driver/orders/:orderId/status
 * @description Update delivery status and optionally driver location
 */
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { location } = req.body;
    const driverId = req.user?.userId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid order ID format");
    }

    if (!driverId) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.AUTHENTICATION_REQUIRED
      );
    }

    // Verify order belongs to this driver
    const order = await Order.findOne({
      _id: orderId,
      driverId,
      isDeleted: false,
    });

    if (!order) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Order not found or not assigned to you"
      );
    }

    // Update driver location if provided
    if (location && location.latitude && location.longitude) {
      await DeliveryDriver.findByIdAndUpdate(driverId, {
        $set: {
          "currentLocation.latitude": location.latitude,
          "currentLocation.longitude": location.longitude,
          "currentLocation.lastUpdated": new Date(),
        },
      });
    }

    return sendSuccess(res, HTTP_STATUS.OK, "Status updated successfully", {
      orderId: order._id,
      currentStatus: order.orderStatus,
      locationUpdated: !!location,
    });
  } catch (error) {
    console.error("Error updating delivery status:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Status update failed. Please try again"
    );
  }
};

/**
 * Get driver's own profile
 * @access Driver (JWT authenticated)
 * @route GET /api/driver/me
 * @description Get authenticated driver's profile and stats
 */
export const getMyProfile = async (req, res) => {
  try {
    const driverId = req.user?.userId;

    if (!driverId) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.AUTHENTICATION_REQUIRED
      );
    }

    const driver = await DeliveryDriver.findById(driverId).select("-password");

    if (!driver) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Driver not found");
    }

    // Get delivery stats
    const [totalDeliveries, todayDeliveries, activeOrders] = await Promise.all([
      Order.countDocuments({
        driverId,
        "orderStatus.deliveredAt": { $ne: null },
        isDeleted: false,
      }),
      Order.countDocuments({
        driverId,
        "orderStatus.deliveredAt": {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
        isDeleted: false,
      }),
      Order.countDocuments({
        driverId,
        "orderStatus.deliveredAt": null,
        "orderStatus.cancelledAt": null,
        "orderStatus.failedAt": null,
        isDeleted: false,
      }),
    ]);

    return sendSuccess(res, HTTP_STATUS.OK, "Profile retrieved successfully", {
      driver,
      stats: {
        totalDeliveries,
        todayDeliveries,
        activeOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching driver profile:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch profile. Please try again"
    );
  }
};
