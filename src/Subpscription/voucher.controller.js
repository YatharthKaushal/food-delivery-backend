import Voucher from "../schema/Voucher.schema.js";
import Subscription from "../schema/Subscription.schema.js";
import Customer from "../schema/Customer.schema.js";
import { sendSuccess, sendError } from "../utils/response.util.js";

/**
 * Generate vouchers for a subscription
 * @access System/Internal - Called when subscription is created
 * @description Creates individual voucher records for a subscription
 */
export const generateVouchersForSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return sendError(res, 400, "Subscription ID is required");
    }

    // Find subscription
    const subscription = await Subscription.findById(subscriptionId).populate(
      "planId"
    );

    if (!subscription) {
      return sendError(res, 404, "Subscription not found");
    }

    // Check if vouchers already exist for this subscription
    const existingVouchers = await Voucher.countDocuments({
      subscriptionId: subscription._id,
    });

    if (existingVouchers > 0) {
      return sendError(
        res,
        409,
        "Vouchers already exist for this subscription",
        {
          existingCount: existingVouchers,
        }
      );
    }

    // Determine meal type based on plan type
    let mealType = "BOTH";
    if (subscription.planId.planType === "LUNCH_ONLY") {
      mealType = "LUNCH";
    } else if (subscription.planId.planType === "DINNER_ONLY") {
      mealType = "DINNER";
    }

    // Create vouchers
    const vouchers = [];
    const voucherCount = subscription.totalVouchers;

    for (let i = 0; i < voucherCount; i++) {
      vouchers.push({
        subscriptionId: subscription._id,
        customerId: subscription.customerId,
        mealType,
        issuedDate: subscription.purchaseDate,
        expiryDate: subscription.expiryDate,
        isUsed: false,
        isExpired: false,
      });
    }

    // Bulk insert vouchers
    const createdVouchers = await Voucher.insertMany(vouchers);

    return sendSuccess(
      res,
      201,
      `${createdVouchers.length} vouchers generated successfully`,
      {
        voucherCount: createdVouchers.length,
        vouchers: createdVouchers,
      }
    );
  } catch (error) {
    console.error("Error generating vouchers:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription ID format");
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation failed", { errors });
    }

    return sendError(
      res,
      500,
      "Failed to generate vouchers. Please try again"
    );
  }
};

/**
 * Get customer's own vouchers
 * @access Customer (Firebase authenticated)
 * @description Retrieve all vouchers for the authenticated customer
 */
export const getMyVouchers = async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser?.uid;
    const {
      mealType,
      isUsed,
      isExpired,
      includeDeleted = "false",
      sortBy = "issuedDate",
      sortOrder = "desc",
    } = req.query;

    if (!firebaseUid) {
      return sendError(res, 401, "Authentication required");
    }

    // Find customer
    const customer = await Customer.findOne({ firebaseUid, isDeleted: false });

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    // Build filter
    const filter = { customerId: customer._id };

    if (mealType) {
      filter.mealType = mealType.toUpperCase();
    }

    if (isUsed !== undefined) {
      filter.isUsed = isUsed === "true";
    }

    if (isExpired !== undefined) {
      filter.isExpired = isExpired === "true";
    }

    if (includeDeleted !== "true") {
      filter.isDeleted = false;
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Fetch vouchers
    const vouchers = await Voucher.find(filter)
      .populate("subscriptionId")
      .sort(sortOptions);

    return sendSuccess(res, 200, "Vouchers retrieved successfully", vouchers);
  } catch (error) {
    console.error("Error fetching customer vouchers:", error);
    return sendError(res, 500, "Failed to fetch vouchers. Please try again");
  }
};

/**
 * Get customer's available vouchers
 * @access Customer (Firebase authenticated)
 * @description Get only unused, non-expired vouchers
 */
export const getMyAvailableVouchers = async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser?.uid;
    const { mealType } = req.query;

    if (!firebaseUid) {
      return sendError(res, 401, "Authentication required");
    }

    // Find customer
    const customer = await Customer.findOne({ firebaseUid, isDeleted: false });

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    // Build filter for available vouchers
    const filter = {
      customerId: customer._id,
      isUsed: false,
      isExpired: false,
      isDeleted: false,
      expiryDate: { $gt: new Date() },
    };

    if (mealType) {
      const upperMealType = mealType.toUpperCase();
      // Match specific meal type or BOTH
      filter.$or = [{ mealType: upperMealType }, { mealType: "BOTH" }];
    }

    // Fetch available vouchers
    const vouchers = await Voucher.find(filter)
      .populate("subscriptionId")
      .sort({ expiryDate: 1 }); // Sort by expiry date (closest first)

    return sendSuccess(
      res,
      200,
      "Available vouchers retrieved successfully",
      vouchers
    );
  } catch (error) {
    console.error("Error fetching available vouchers:", error);
    return sendError(
      res,
      500,
      "Failed to fetch available vouchers. Please try again"
    );
  }
};

/**
 * Get voucher by ID (Customer's own voucher)
 * @access Customer (Firebase authenticated)
 */
export const getMyVoucherById = async (req, res) => {
  try {
    const { id } = req.params;
    const firebaseUid = req.firebaseUser?.uid;

    if (!id) {
      return sendError(res, 400, "Voucher ID is required");
    }

    if (!firebaseUid) {
      return sendError(res, 401, "Authentication required");
    }

    // Find customer
    const customer = await Customer.findOne({ firebaseUid, isDeleted: false });

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    // Find voucher
    const voucher = await Voucher.findOne({
      _id: id,
      customerId: customer._id,
    }).populate("subscriptionId usedForOrder");

    if (!voucher) {
      return sendError(res, 404, "Voucher not found");
    }

    return sendSuccess(res, 200, "Voucher retrieved successfully", voucher);
  } catch (error) {
    console.error("Error fetching voucher:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid voucher ID format");
    }

    return sendError(res, 500, "Failed to fetch voucher. Please try again");
  }
};

/**
 * Use/Redeem a voucher
 * @access Customer (Firebase authenticated) or System
 * @description Marks a voucher as used and associates it with an order
 */
export const useVoucher = async (req, res) => {
  try {
    const { voucherId, orderId } = req.body;
    const firebaseUid = req.firebaseUser?.uid;

    if (!voucherId) {
      return sendError(res, 400, "Voucher ID is required");
    }

    if (!firebaseUid) {
      return sendError(res, 401, "Authentication required");
    }

    // Find customer
    const customer = await Customer.findOne({ firebaseUid, isDeleted: false });

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    // Find voucher
    const voucher = await Voucher.findOne({
      _id: voucherId,
      customerId: customer._id,
      isDeleted: false,
    });

    if (!voucher) {
      return sendError(res, 404, "Voucher not found");
    }

    // Check if already used
    if (voucher.isUsed) {
      return sendError(res, 400, "Voucher has already been used", {
        usedDate: voucher.usedDate,
        usedForOrder: voucher.usedForOrder,
      });
    }

    // Check if expired
    if (voucher.isExpired || new Date() > voucher.expiryDate) {
      voucher.isExpired = true;
      await voucher.save();
      return sendError(res, 400, "Voucher has expired");
    }

    // Mark voucher as used
    voucher.isUsed = true;
    voucher.usedDate = new Date();

    if (orderId) {
      voucher.usedForOrder = orderId;
    }

    await voucher.save();
    await voucher.populate("subscriptionId usedForOrder");

    return sendSuccess(res, 200, "Voucher redeemed successfully", voucher);
  } catch (error) {
    console.error("Error using voucher:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid ID format");
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation failed", { errors });
    }

    return sendError(res, 500, "Failed to use voucher. Please try again");
  }
};

/**
 * Get voucher count summary
 * @access Customer (Firebase authenticated)
 * @description Get counts of vouchers by status
 */
export const getMyVoucherSummary = async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser?.uid;

    if (!firebaseUid) {
      return sendError(res, 401, "Authentication required");
    }

    // Find customer
    const customer = await Customer.findOne({ firebaseUid, isDeleted: false });

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    // Get voucher counts
    const [
      totalVouchers,
      availableVouchers,
      usedVouchers,
      expiredVouchers,
      vouchersByMealType,
    ] = await Promise.all([
      Voucher.countDocuments({
        customerId: customer._id,
        isDeleted: false,
      }),
      Voucher.countDocuments({
        customerId: customer._id,
        isUsed: false,
        isExpired: false,
        isDeleted: false,
        expiryDate: { $gt: new Date() },
      }),
      Voucher.countDocuments({
        customerId: customer._id,
        isUsed: true,
        isDeleted: false,
      }),
      Voucher.countDocuments({
        customerId: customer._id,
        isExpired: true,
        isDeleted: false,
      }),
      Voucher.aggregate([
        {
          $match: {
            customerId: customer._id,
            isDeleted: false,
            isUsed: false,
            isExpired: false,
            expiryDate: { $gt: new Date() },
          },
        },
        {
          $group: {
            _id: "$mealType",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Format meal type counts
    const mealTypeCounts = {
      LUNCH: 0,
      DINNER: 0,
      BOTH: 0,
    };

    vouchersByMealType.forEach((item) => {
      mealTypeCounts[item._id] = item.count;
    });

    return sendSuccess(res, 200, "Voucher summary retrieved successfully", {
      totalVouchers,
      availableVouchers,
      usedVouchers,
      expiredVouchers,
      availableByMealType: mealTypeCounts,
    });
  } catch (error) {
    console.error("Error fetching voucher summary:", error);
    return sendError(
      res,
      500,
      "Failed to fetch voucher summary. Please try again"
    );
  }
};

/**
 * Get all vouchers (Admin)
 * @access Admin only
 * @description Get all vouchers with filtering and pagination
 */
export const getAllVouchers = async (req, res) => {
  try {
    const {
      customerId,
      subscriptionId,
      mealType,
      isUsed,
      isExpired,
      includeDeleted = "false",
      sortBy = "issuedDate",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    // Build filter
    const filter = {};

    if (customerId) {
      filter.customerId = customerId;
    }

    if (subscriptionId) {
      filter.subscriptionId = subscriptionId;
    }

    if (mealType) {
      filter.mealType = mealType.toUpperCase();
    }

    if (isUsed !== undefined) {
      filter.isUsed = isUsed === "true";
    }

    if (isExpired !== undefined) {
      filter.isExpired = isExpired === "true";
    }

    if (includeDeleted !== "true") {
      filter.isDeleted = false;
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [vouchers, totalCount] = await Promise.all([
      Voucher.find(filter)
        .populate("subscriptionId customerId usedForOrder")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Voucher.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, "Vouchers retrieved successfully", {
      vouchers,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    return sendError(res, 500, "Failed to fetch vouchers. Please try again");
  }
};

/**
 * Get voucher by ID (Admin)
 * @access Admin only
 */
export const getVoucherById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 400, "Voucher ID is required");
    }

    const voucher = await Voucher.findById(id).populate(
      "subscriptionId customerId usedForOrder"
    );

    if (!voucher) {
      return sendError(res, 404, "Voucher not found");
    }

    return sendSuccess(res, 200, "Voucher retrieved successfully", voucher);
  } catch (error) {
    console.error("Error fetching voucher:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid voucher ID format");
    }

    return sendError(res, 500, "Failed to fetch voucher. Please try again");
  }
};

/**
 * Update voucher status (Admin)
 * @access Admin only
 * @description Allows admin to manually update voucher status (for corrections)
 */
export const updateVoucherStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isUsed, isExpired, usedForOrder } = req.body;

    if (!id) {
      return sendError(res, 400, "Voucher ID is required");
    }

    const voucher = await Voucher.findById(id);

    if (!voucher) {
      return sendError(res, 404, "Voucher not found");
    }

    // Update fields if provided
    if (isUsed !== undefined) {
      voucher.isUsed = isUsed;

      if (isUsed && !voucher.usedDate) {
        voucher.usedDate = new Date();
      } else if (!isUsed) {
        // Reset if unmarking as used
        voucher.usedDate = null;
        voucher.usedForOrder = null;
      }
    }

    if (isExpired !== undefined) {
      voucher.isExpired = isExpired;
    }

    if (usedForOrder !== undefined) {
      voucher.usedForOrder = usedForOrder;
    }

    await voucher.save();
    await voucher.populate("subscriptionId customerId usedForOrder");

    return sendSuccess(
      res,
      200,
      "Voucher status updated successfully",
      voucher
    );
  } catch (error) {
    console.error("Error updating voucher status:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid ID format");
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation failed", { errors });
    }

    return sendError(
      res,
      500,
      "Failed to update voucher status. Please try again"
    );
  }
};

/**
 * Delete voucher (Soft delete) (Admin)
 * @access Admin only
 */
export const deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 400, "Voucher ID is required");
    }

    const voucher = await Voucher.findById(id);

    if (!voucher) {
      return sendError(res, 404, "Voucher not found");
    }

    // Soft delete
    voucher.isDeleted = true;
    voucher.deletedAt = new Date();
    await voucher.save();

    await voucher.populate("subscriptionId customerId usedForOrder");

    return sendSuccess(res, 200, "Voucher deleted successfully", voucher);
  } catch (error) {
    console.error("Error deleting voucher:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid voucher ID format");
    }

    return sendError(res, 500, "Failed to delete voucher. Please try again");
  }
};

/**
 * Restore deleted voucher (Admin)
 * @access Admin only
 */
export const restoreVoucher = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 400, "Voucher ID is required");
    }

    const voucher = await Voucher.findById(id);

    if (!voucher) {
      return sendError(res, 404, "Voucher not found");
    }

    if (!voucher.isDeleted) {
      return sendError(res, 400, "Voucher is not deleted");
    }

    // Restore
    voucher.isDeleted = false;
    voucher.deletedAt = null;
    await voucher.save();

    await voucher.populate("subscriptionId customerId usedForOrder");

    return sendSuccess(res, 200, "Voucher restored successfully", voucher);
  } catch (error) {
    console.error("Error restoring voucher:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid voucher ID format");
    }

    return sendError(res, 500, "Failed to restore voucher. Please try again");
  }
};

/**
 * Update expired vouchers (System/Cron job)
 * @access Admin only
 * @description Marks all vouchers past expiry date as expired
 */
export const updateExpiredVouchers = async (_req, res) => {
  try {
    const result = await Voucher.updateMany(
      {
        isExpired: false,
        isDeleted: false,
        expiryDate: { $lte: new Date() },
      },
      {
        $set: { isExpired: true },
      }
    );

    return sendSuccess(res, 200, "Expired vouchers updated successfully", {
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error updating expired vouchers:", error);
    return sendError(
      res,
      500,
      "Failed to update expired vouchers. Please try again"
    );
  }
};

/**
 * Get voucher statistics (Admin)
 * @access Admin only
 * @description Get analytics and statistics about vouchers
 */
export const getVoucherStats = async (_req, res) => {
  try {
    const [
      totalVouchers,
      availableVouchers,
      usedVouchers,
      expiredVouchers,
      vouchersByMealType,
      usageByDate,
    ] = await Promise.all([
      Voucher.countDocuments({ isDeleted: false }),
      Voucher.countDocuments({
        isUsed: false,
        isExpired: false,
        isDeleted: false,
        expiryDate: { $gt: new Date() },
      }),
      Voucher.countDocuments({ isUsed: true, isDeleted: false }),
      Voucher.countDocuments({ isExpired: true, isDeleted: false }),
      Voucher.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: "$mealType",
            total: { $sum: 1 },
            used: {
              $sum: { $cond: [{ $eq: ["$isUsed", true] }, 1, 0] },
            },
            available: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$isUsed", false] },
                      { $eq: ["$isExpired", false] },
                      { $gt: ["$expiryDate", new Date()] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      Voucher.aggregate([
        { $match: { isUsed: true, isDeleted: false } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$usedDate" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 30 }, // Last 30 days
      ]),
    ]);

    const usageRate =
      totalVouchers > 0 ? ((usedVouchers / totalVouchers) * 100).toFixed(2) : 0;

    return sendSuccess(res, 200, "Voucher statistics retrieved successfully", {
      totalVouchers,
      availableVouchers,
      usedVouchers,
      expiredVouchers,
      usageRate: `${usageRate}%`,
      vouchersByMealType,
      recentUsage: usageByDate,
    });
  } catch (error) {
    console.error("Error fetching voucher statistics:", error);
    return sendError(
      res,
      500,
      "Failed to fetch voucher statistics. Please try again"
    );
  }
};

/**
 * Get vouchers by subscription (Admin)
 * @access Admin only
 * @description Get all vouchers for a specific subscription
 */
export const getVouchersBySubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return sendError(res, 400, "Subscription ID is required");
    }

    const vouchers = await Voucher.find({
      subscriptionId,
      isDeleted: false,
    })
      .populate("customerId usedForOrder")
      .sort({ issuedDate: 1 });

    const summary = {
      total: vouchers.length,
      used: vouchers.filter((v) => v.isUsed).length,
      available: vouchers.filter(
        (v) => !v.isUsed && !v.isExpired && new Date() <= v.expiryDate
      ).length,
      expired: vouchers.filter((v) => v.isExpired).length,
    };

    return sendSuccess(
      res,
      200,
      "Vouchers retrieved successfully",
      {
        vouchers,
        summary,
      }
    );
  } catch (error) {
    console.error("Error fetching vouchers by subscription:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription ID format");
    }

    return sendError(res, 500, "Failed to fetch vouchers. Please try again");
  }
};

/**
 * Bulk delete vouchers by subscription (Admin)
 * @access Admin only
 * @description Soft delete all vouchers for a subscription
 */
export const bulkDeleteVouchersBySubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return sendError(res, 400, "Subscription ID is required");
    }

    const result = await Voucher.updateMany(
      {
        subscriptionId,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      }
    );

    return sendSuccess(
      res,
      200,
      "Vouchers deleted successfully",
      {
        deletedCount: result.modifiedCount,
      }
    );
  } catch (error) {
    console.error("Error bulk deleting vouchers:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription ID format");
    }

    return sendError(
      res,
      500,
      "Failed to delete vouchers. Please try again"
    );
  }
};
