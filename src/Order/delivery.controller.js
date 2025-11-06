/**
 * Delivery Controller
 * Handles all CRUD operations and business logic for deliveries
 * @module Delivery/Controller
 */

import Delivery from "../schema/Delivery.schema.js";
import Order from "../schema/Order.schema.js";
import Customer from "../schema/Customer.schema.js";
import DeliveryDriver from "../schema/DeliveryDriver.schema.js";
import { sendSuccess, sendError } from "../utils/response.util.js";
import mongoose from "mongoose";

/**
 * Create a new delivery
 * @access Admin only
 * @route POST /api/deliveries
 * @description Create a delivery record for an order
 */
export const createDelivery = async (req, res) => {
  try {
    const {
      orderId,
      deliveryDriverId,
      fromLocation,
      toLocation,
      estimatedDeliveryTime,
      deliveryNotes,
    } = req.body;

    // Validate required fields
    if (!orderId || !fromLocation || !toLocation) {
      return sendError(res, 400, "Missing required fields", {
        required: ["orderId", "fromLocation", "toLocation"],
      });
    }

    // Validate order exists
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return sendError(res, 400, "Invalid order ID format");
    }

    const order = await Order.findOne({ _id: orderId, isDeleted: false });

    if (!order) {
      return sendError(res, 404, "Order not found");
    }

    // Check if order is cancelled or failed
    if (order.orderStatus.cancelledAt) {
      return sendError(res, 400, "Cannot create delivery for cancelled order");
    }

    if (order.orderStatus.failedAt) {
      return sendError(res, 400, "Cannot create delivery for failed order");
    }

    // Check if delivery already exists for this order
    const existingDelivery = await Delivery.findOne({
      orderId,
      isDeleted: false,
    });

    if (existingDelivery) {
      return sendError(
        res,
        409,
        "Delivery already exists for this order"
      );
    }

    // Validate delivery driver if provided
    if (deliveryDriverId) {
      if (!mongoose.Types.ObjectId.isValid(deliveryDriverId)) {
        return sendError(res, 400, "Invalid delivery driver ID format");
      }

      const driver = await DeliveryDriver.findOne({
        _id: deliveryDriverId,
        isDeleted: false,
        isActive: true,
      });

      if (!driver) {
        return sendError(
          res,
          404,
          "Delivery driver not found or inactive"
        );
      }
    }

    // Validate location data
    if (
      !fromLocation.address ||
      !fromLocation.coordinates ||
      !fromLocation.coordinates.latitude ||
      !fromLocation.coordinates.longitude
    ) {
      return sendError(res, 400, "Invalid from location data", {
        required: ["address", "coordinates.latitude", "coordinates.longitude"],
      });
    }

    if (
      !toLocation.address ||
      !toLocation.coordinates ||
      !toLocation.coordinates.latitude ||
      !toLocation.coordinates.longitude
    ) {
      return sendError(res, 400, "Invalid to location data", {
        required: ["address", "coordinates.latitude", "coordinates.longitude"],
      });
    }

    // Create delivery
    const delivery = new Delivery({
      orderId,
      customerId: order.customerId,
      deliveryDriverId: deliveryDriverId || null,
      fromLocation,
      toLocation,
      estimatedDeliveryTime: estimatedDeliveryTime || null,
      deliveryNotes: deliveryNotes || "",
    });

    await delivery.save();

    // Populate references
    await delivery.populate([
      { path: "orderId" },
      { path: "customerId", select: "name phone email address" },
      { path: "deliveryDriverId", select: "name phone rating availabilityStatus" },
    ]);

    return sendSuccess(res, 201, "Delivery created successfully", delivery);
  } catch (error) {
    console.error("Error creating delivery:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation failed", { errors });
    }

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid ID format");
    }

    // Handle duplicate key error (order already has delivery)
    if (error.code === 11000) {
      return sendError(
        res,
        409,
        "Delivery already exists for this order"
      );
    }

    return sendError(res, 500, "Failed to create delivery. Please try again");
  }
};

/**
 * Get all deliveries (Admin)
 * @access Admin only
 * @route GET /api/deliveries/all
 * @description Get all deliveries with filtering and pagination
 */
export const getAllDeliveries = async (req, res) => {
  try {
    const {
      customerId,
      deliveryDriverId,
      orderId,
      status,
      includeDeleted = "false",
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    // Build filter
    const filter = {};

    if (customerId) {
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return sendError(res, 400, "Invalid customer ID format");
      }
      filter.customerId = customerId;
    }

    if (deliveryDriverId) {
      if (!mongoose.Types.ObjectId.isValid(deliveryDriverId)) {
        return sendError(res, 400, "Invalid delivery driver ID format");
      }
      filter.deliveryDriverId = deliveryDriverId;
    }

    if (orderId) {
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return sendError(res, 400, "Invalid order ID format");
      }
      filter.orderId = orderId;
    }

    // Status filter
    if (status) {
      filter["deliverySuccessStatus.message"] = status.toUpperCase();
    }

    if (includeDeleted !== "true") {
      filter.isDeleted = false;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const [deliveries, totalCount] = await Promise.all([
      Delivery.find(filter)
        .populate([
          { path: "orderId" },
          { path: "customerId", select: "name phone email address" },
          {
            path: "deliveryDriverId",
            select: "name phone rating availabilityStatus currentLocation",
          },
        ])
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Delivery.countDocuments(filter),
    ]);

    // Add computed fields
    const deliveriesWithStatus = deliveries.map((delivery) => {
      const currentStatus = getCurrentDeliveryStatus(delivery.status);
      return {
        ...delivery,
        currentStatus,
      };
    });

    return sendSuccess(res, 200, "Deliveries retrieved successfully", {
      deliveries: deliveriesWithStatus,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    return sendError(res, 500, "Failed to fetch deliveries. Please try again");
  }
};

/**
 * Get delivery by ID (Admin)
 * @access Admin only
 * @route GET /api/deliveries/:id
 * @description Get details of a specific delivery
 */
export const getDeliveryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid delivery ID format");
    }

    const delivery = await Delivery.findById(id).populate([
      { path: "orderId" },
      { path: "customerId", select: "name phone email address dietaryPreferences" },
      {
        path: "deliveryDriverId",
        select: "name phone rating availabilityStatus currentLocation vehicle",
      },
    ]);

    if (!delivery) {
      return sendError(res, 404, "Delivery not found");
    }

    const currentStatus = getCurrentDeliveryStatus(delivery.status);

    return sendSuccess(res, 200, "Delivery retrieved successfully", {
      ...delivery.toObject(),
      currentStatus,
    });
  } catch (error) {
    console.error("Error fetching delivery:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid delivery ID format");
    }

    return sendError(res, 500, "Failed to fetch delivery. Please try again");
  }
};

/**
 * Get delivery by order ID (Admin)
 * @access Admin only
 * @route GET /api/deliveries/order/:orderId
 * @description Get delivery for a specific order
 */
export const getDeliveryByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return sendError(res, 400, "Invalid order ID format");
    }

    const delivery = await Delivery.findOne({
      orderId,
      isDeleted: false,
    }).populate([
      { path: "orderId" },
      { path: "customerId", select: "name phone email address" },
      {
        path: "deliveryDriverId",
        select: "name phone rating availabilityStatus currentLocation",
      },
    ]);

    if (!delivery) {
      return sendError(res, 404, "Delivery not found for this order");
    }

    const currentStatus = getCurrentDeliveryStatus(delivery.status);

    return sendSuccess(res, 200, "Delivery retrieved successfully", {
      ...delivery.toObject(),
      currentStatus,
    });
  } catch (error) {
    console.error("Error fetching delivery by order ID:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid order ID format");
    }

    return sendError(res, 500, "Failed to fetch delivery. Please try again");
  }
};

/**
 * Assign delivery driver
 * @access Admin only
 * @route PATCH /api/deliveries/:id/assign-driver
 * @description Assign or reassign a delivery driver to a delivery
 */
export const assignDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryDriverId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid delivery ID format");
    }

    if (!deliveryDriverId) {
      return sendError(res, 400, "Delivery driver ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(deliveryDriverId)) {
      return sendError(res, 400, "Invalid delivery driver ID format");
    }

    // Find delivery
    const delivery = await Delivery.findOne({ _id: id, isDeleted: false });

    if (!delivery) {
      return sendError(res, 404, "Delivery not found");
    }

    // Check if delivery is already completed or failed
    if (delivery.deliverySuccessStatus.status === true) {
      return sendError(res, 400, "Cannot reassign driver for completed delivery");
    }

    if (delivery.deliverySuccessStatus.message === "FAILED") {
      return sendError(res, 400, "Cannot reassign driver for failed delivery");
    }

    // Validate delivery driver
    const driver = await DeliveryDriver.findOne({
      _id: deliveryDriverId,
      isDeleted: false,
      isActive: true,
    });

    if (!driver) {
      return sendError(res, 404, "Delivery driver not found or inactive");
    }

    // Check driver availability
    if (driver.availabilityStatus !== "AVAILABLE") {
      return sendError(
        res,
        400,
        `Driver is currently ${driver.availabilityStatus.toLowerCase()}`
      );
    }

    // Assign driver
    delivery.deliveryDriverId = deliveryDriverId;
    await delivery.save();

    // Update driver status to BUSY
    driver.availabilityStatus = "BUSY";
    await driver.save();

    await delivery.populate([
      { path: "orderId" },
      { path: "customerId", select: "name phone email address" },
      {
        path: "deliveryDriverId",
        select: "name phone rating availabilityStatus currentLocation",
      },
    ]);

    return sendSuccess(res, 200, "Driver assigned successfully", delivery);
  } catch (error) {
    console.error("Error assigning driver:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid ID format");
    }

    return sendError(res, 500, "Failed to assign driver. Please try again");
  }
};

/**
 * Update delivery status
 * @access Admin/Driver
 * @route PATCH /api/deliveries/:id/status
 * @description Update delivery status (picked up, out for delivery, delivered, failed)
 */
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, failedMessage } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid delivery ID format");
    }

    if (!status) {
      return sendError(res, 400, "Status is required");
    }

    const validStatuses = [
      "pickedUp",
      "outForDelivery",
      "delivered",
      "failed",
    ];

    if (!validStatuses.includes(status)) {
      return sendError(res, 400, "Invalid status", { validStatuses });
    }

    const delivery = await Delivery.findOne({ _id: id, isDeleted: false });

    if (!delivery) {
      return sendError(res, 404, "Delivery not found");
    }

    // Check if delivery is already completed or failed
    if (
      delivery.deliverySuccessStatus.status === true &&
      status !== "delivered"
    ) {
      return sendError(res, 400, "Delivery is already completed");
    }

    if (
      delivery.deliverySuccessStatus.message === "FAILED" &&
      status !== "failed"
    ) {
      return sendError(res, 400, "Delivery has already failed");
    }

    // Validate status progression
    const now = new Date();

    if (status === "pickedUp") {
      if (delivery.status.pickedUpAt) {
        return sendError(res, 400, "Delivery already marked as picked up");
      }
      delivery.status.pickedUpAt = now;
      delivery.deliverySuccessStatus.message = "IN_PROGRESS";
    }

    if (status === "outForDelivery") {
      if (!delivery.status.pickedUpAt) {
        return sendError(
          res,
          400,
          "Delivery must be picked up first"
        );
      }
      if (delivery.status.outForDeliveryAt) {
        return sendError(
          res,
          400,
          "Delivery already marked as out for delivery"
        );
      }
      delivery.status.outForDeliveryAt = now;
      delivery.deliverySuccessStatus.message = "IN_PROGRESS";
    }

    if (status === "delivered") {
      if (!delivery.status.outForDeliveryAt) {
        return sendError(
          res,
          400,
          "Delivery must be out for delivery first"
        );
      }
      if (delivery.status.deliveredAt) {
        return sendError(res, 400, "Delivery already marked as delivered");
      }
      delivery.status.deliveredAt = now;
      delivery.deliverySuccessStatus.status = true;
      delivery.deliverySuccessStatus.message = "DELIVERED";

      // Update driver availability to AVAILABLE
      if (delivery.deliveryDriverId) {
        await DeliveryDriver.findByIdAndUpdate(delivery.deliveryDriverId, {
          availabilityStatus: "AVAILABLE",
        });
      }
    }

    if (status === "failed") {
      if (delivery.status.deliveredAt) {
        return sendError(
          res,
          400,
          "Cannot mark delivered order as failed"
        );
      }
      if (delivery.status.failedToDeliverAt) {
        return sendError(res, 400, "Delivery already marked as failed");
      }

      if (!failedMessage || !failedMessage.trim()) {
        return sendError(
          res,
          400,
          "Failed message is required when marking delivery as failed"
        );
      }

      delivery.status.failedToDeliverAt = now;
      delivery.deliverySuccessStatus.status = false;
      delivery.deliverySuccessStatus.message = "FAILED";
      delivery.deliverySuccessStatus.failedMessage = failedMessage.trim();

      // Update driver availability to AVAILABLE
      if (delivery.deliveryDriverId) {
        await DeliveryDriver.findByIdAndUpdate(delivery.deliveryDriverId, {
          availabilityStatus: "AVAILABLE",
        });
      }
    }

    await delivery.save();

    await delivery.populate([
      { path: "orderId" },
      { path: "customerId", select: "name phone email address" },
      {
        path: "deliveryDriverId",
        select: "name phone rating availabilityStatus",
      },
    ]);

    const currentStatus = getCurrentDeliveryStatus(delivery.status);

    return sendSuccess(res, 200, `Delivery status updated to ${status}`, {
      ...delivery.toObject(),
      currentStatus,
    });
  } catch (error) {
    console.error("Error updating delivery status:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation failed", { errors });
    }

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid ID format");
    }

    return sendError(
      res,
      500,
      "Failed to update delivery status. Please try again"
    );
  }
};

/**
 * Update delivery details
 * @access Admin only
 * @route PUT /api/deliveries/:id
 * @description Update delivery details (locations, estimated time, notes)
 */
export const updateDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid delivery ID format");
    }

    const delivery = await Delivery.findOne({ _id: id, isDeleted: false });

    if (!delivery) {
      return sendError(res, 404, "Delivery not found");
    }

    // Prevent updates to completed or failed deliveries
    if (delivery.deliverySuccessStatus.status === true) {
      return sendError(res, 400, "Cannot update completed delivery");
    }

    if (delivery.deliverySuccessStatus.message === "FAILED") {
      return sendError(res, 400, "Cannot update failed delivery");
    }

    // Prevent modification of certain fields
    delete updates._id;
    delete updates.__v;
    delete updates.orderId;
    delete updates.customerId;
    delete updates.createdAt;
    delete updates.isDeleted;
    delete updates.deletedAt;
    delete updates.status;
    delete updates.deliverySuccessStatus;

    // Validate driver if being updated
    if (updates.deliveryDriverId) {
      if (!mongoose.Types.ObjectId.isValid(updates.deliveryDriverId)) {
        return sendError(res, 400, "Invalid delivery driver ID format");
      }

      const driver = await DeliveryDriver.findOne({
        _id: updates.deliveryDriverId,
        isDeleted: false,
        isActive: true,
      });

      if (!driver) {
        return sendError(res, 404, "Delivery driver not found or inactive");
      }
    }

    // Update delivery
    Object.assign(delivery, updates);
    await delivery.save();

    await delivery.populate([
      { path: "orderId" },
      { path: "customerId", select: "name phone email address" },
      {
        path: "deliveryDriverId",
        select: "name phone rating availabilityStatus",
      },
    ]);

    return sendSuccess(res, 200, "Delivery updated successfully", delivery);
  } catch (error) {
    console.error("Error updating delivery:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation failed", { errors });
    }

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid ID format");
    }

    return sendError(res, 500, "Failed to update delivery. Please try again");
  }
};

/**
 * Delete delivery (Soft delete)
 * @access Admin only
 * @route DELETE /api/deliveries/:id
 * @description Soft delete a delivery
 */
export const deleteDelivery = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid delivery ID format");
    }

    const delivery = await Delivery.findOne({ _id: id, isDeleted: false });

    if (!delivery) {
      return sendError(res, 404, "Delivery not found or already deleted");
    }

    // Soft delete
    delivery.isDeleted = true;
    delivery.deletedAt = new Date();
    await delivery.save();

    return sendSuccess(res, 200, "Delivery deleted successfully", {
      id: delivery._id,
      deletedAt: delivery.deletedAt,
    });
  } catch (error) {
    console.error("Error deleting delivery:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid delivery ID format");
    }

    return sendError(res, 500, "Failed to delete delivery. Please try again");
  }
};

/**
 * Restore deleted delivery
 * @access Admin only
 * @route PATCH /api/deliveries/:id/restore
 * @description Restore a soft-deleted delivery
 */
export const restoreDelivery = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid delivery ID format");
    }

    const delivery = await Delivery.findOne({ _id: id, isDeleted: true });

    if (!delivery) {
      return sendError(res, 404, "Deleted delivery not found");
    }

    // Restore
    delivery.isDeleted = false;
    delivery.deletedAt = null;
    await delivery.save();

    await delivery.populate([
      { path: "orderId" },
      { path: "customerId", select: "name phone email address" },
      {
        path: "deliveryDriverId",
        select: "name phone rating availabilityStatus",
      },
    ]);

    return sendSuccess(res, 200, "Delivery restored successfully", delivery);
  } catch (error) {
    console.error("Error restoring delivery:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid delivery ID format");
    }

    return sendError(res, 500, "Failed to restore delivery. Please try again");
  }
};

/**
 * Get deliveries by driver (Driver/Admin)
 * @access Driver/Admin
 * @route GET /api/deliveries/driver/:driverId
 * @description Get all deliveries assigned to a specific driver
 */
export const getDeliveriesByDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const {
      status,
      includeDeleted = "false",
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return sendError(res, 400, "Invalid driver ID format");
    }

    // Build filter
    const filter = { deliveryDriverId: driverId };

    if (status) {
      filter["deliverySuccessStatus.message"] = status.toUpperCase();
    }

    if (includeDeleted !== "true") {
      filter.isDeleted = false;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const [deliveries, totalCount] = await Promise.all([
      Delivery.find(filter)
        .populate([
          { path: "orderId" },
          { path: "customerId", select: "name phone address" },
        ])
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Delivery.countDocuments(filter),
    ]);

    // Add computed fields
    const deliveriesWithStatus = deliveries.map((delivery) => {
      const currentStatus = getCurrentDeliveryStatus(delivery.status);
      return {
        ...delivery,
        currentStatus,
      };
    });

    return sendSuccess(res, 200, "Deliveries retrieved successfully", {
      deliveries: deliveriesWithStatus,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching driver deliveries:", error);
    return sendError(
      res,
      500,
      "Failed to fetch driver deliveries. Please try again"
    );
  }
};

/**
 * Get delivery statistics
 * @access Admin only
 * @route GET /api/deliveries/stats
 * @description Get analytics and statistics about deliveries
 */
export const getDeliveryStats = async (req, res) => {
  try {
    const [
      totalDeliveries,
      pendingDeliveries,
      inProgressDeliveries,
      deliveredDeliveries,
      failedDeliveries,
      deliveriesByDriver,
      averageDeliveryTime,
    ] = await Promise.all([
      Delivery.countDocuments({ isDeleted: false }),
      Delivery.countDocuments({
        isDeleted: false,
        "deliverySuccessStatus.message": "PENDING",
      }),
      Delivery.countDocuments({
        isDeleted: false,
        "deliverySuccessStatus.message": "IN_PROGRESS",
      }),
      Delivery.countDocuments({
        isDeleted: false,
        "deliverySuccessStatus.message": "DELIVERED",
      }),
      Delivery.countDocuments({
        isDeleted: false,
        "deliverySuccessStatus.message": "FAILED",
      }),
      Delivery.aggregate([
        { $match: { isDeleted: false, deliveryDriverId: { $ne: null } } },
        {
          $group: {
            _id: "$deliveryDriverId",
            totalDeliveries: { $sum: 1 },
            successfulDeliveries: {
              $sum: {
                $cond: [{ $eq: ["$deliverySuccessStatus.status", true] }, 1, 0],
              },
            },
            failedDeliveries: {
              $sum: {
                $cond: [
                  { $eq: ["$deliverySuccessStatus.message", "FAILED"] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $lookup: {
            from: "deliverydrivers",
            localField: "_id",
            foreignField: "_id",
            as: "driver",
          },
        },
        { $unwind: "$driver" },
        {
          $project: {
            _id: 1,
            driverName: "$driver.name",
            driverPhone: "$driver.phone",
            totalDeliveries: 1,
            successfulDeliveries: 1,
            failedDeliveries: 1,
            successRate: {
              $cond: [
                { $gt: ["$totalDeliveries", 0] },
                {
                  $multiply: [
                    { $divide: ["$successfulDeliveries", "$totalDeliveries"] },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
        { $sort: { totalDeliveries: -1 } },
        { $limit: 10 },
      ]),
      Delivery.aggregate([
        {
          $match: {
            isDeleted: false,
            "status.pickedUpAt": { $ne: null },
            "status.deliveredAt": { $ne: null },
          },
        },
        {
          $project: {
            deliveryTime: {
              $subtract: ["$status.deliveredAt", "$status.pickedUpAt"],
            },
          },
        },
        {
          $group: {
            _id: null,
            averageTime: { $avg: "$deliveryTime" },
          },
        },
      ]),
    ]);

    // Convert average delivery time from milliseconds to minutes
    const avgTimeInMinutes = averageDeliveryTime[0]
      ? Math.round(averageDeliveryTime[0].averageTime / 1000 / 60)
      : 0;

    return sendSuccess(res, 200, "Delivery statistics retrieved successfully", {
      totalDeliveries,
      deliveriesByStatus: {
        pending: pendingDeliveries,
        inProgress: inProgressDeliveries,
        delivered: deliveredDeliveries,
        failed: failedDeliveries,
      },
      successRate:
        totalDeliveries > 0
          ? ((deliveredDeliveries / totalDeliveries) * 100).toFixed(2) + "%"
          : "0%",
      averageDeliveryTimeMinutes: avgTimeInMinutes,
      topDrivers: deliveriesByDriver,
    });
  } catch (error) {
    console.error("Error fetching delivery statistics:", error);
    return sendError(
      res,
      500,
      "Failed to fetch delivery statistics. Please try again"
    );
  }
};

/**
 * Get active deliveries (Admin/Driver)
 * @access Admin/Driver
 * @route GET /api/deliveries/active
 * @description Get all active deliveries (in progress)
 */
export const getActiveDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find({
      isDeleted: false,
      "deliverySuccessStatus.message": "IN_PROGRESS",
    })
      .populate([
        { path: "orderId" },
        { path: "customerId", select: "name phone address" },
        {
          path: "deliveryDriverId",
          select: "name phone rating availabilityStatus currentLocation",
        },
      ])
      .sort({ "status.outForDeliveryAt": -1, "status.pickedUpAt": -1 });

    const deliveriesWithStatus = deliveries.map((delivery) => {
      const currentStatus = getCurrentDeliveryStatus(delivery.status);
      return {
        ...delivery.toObject(),
        currentStatus,
      };
    });

    return sendSuccess(
      res,
      200,
      `Found ${deliveries.length} active deliveries`,
      deliveriesWithStatus
    );
  } catch (error) {
    console.error("Error fetching active deliveries:", error);
    return sendError(
      res,
      500,
      "Failed to fetch active deliveries. Please try again"
    );
  }
};

/**
 * Get pending deliveries (Admin)
 * @access Admin only
 * @route GET /api/deliveries/pending
 * @description Get all pending deliveries (not yet assigned or picked up)
 */
export const getPendingDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find({
      isDeleted: false,
      "deliverySuccessStatus.message": "PENDING",
    })
      .populate([
        { path: "orderId" },
        { path: "customerId", select: "name phone address" },
        {
          path: "deliveryDriverId",
          select: "name phone rating availabilityStatus",
        },
      ])
      .sort({ createdAt: 1 });

    return sendSuccess(
      res,
      200,
      `Found ${deliveries.length} pending deliveries`,
      deliveries
    );
  } catch (error) {
    console.error("Error fetching pending deliveries:", error);
    return sendError(
      res,
      500,
      "Failed to fetch pending deliveries. Please try again"
    );
  }
};

/**
 * Helper function to get current delivery status
 * @param {Object} status - Delivery status object
 * @returns {string} Current status
 */
function getCurrentDeliveryStatus(status) {
  if (status.deliveredAt) return "delivered";
  if (status.failedToDeliverAt) return "failed";
  if (status.outForDeliveryAt) return "outForDelivery";
  if (status.pickedUpAt) return "pickedUp";
  return "pending";
}
