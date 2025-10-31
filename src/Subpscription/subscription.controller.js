import Subscription from "../schema/Subscription.schema.js";
import SubscriptionPlan from "../schema/SubscriptionPlan.schema.js";
import Customer from "../schema/Customer.schema.js";
import { sendSuccess, sendError } from "../utils/response.util.js";

/**
 * Create a new subscription (Purchase subscription)
 * @access Customer (Firebase authenticated)
 * @description Allows customers to purchase a subscription plan
 */
export const createSubscription = async (req, res) => {
  try {
    const { planId, amountPaid } = req.body;
    const firebaseUid = req.firebaseUser?.uid;

    // Validate required fields
    if (!planId || amountPaid === undefined) {
      return sendError(res, 400, "Missing required fields", {
        required: ["planId", "amountPaid"],
      });
    }

    if (!firebaseUid) {
      return sendError(res, 401, "Authentication required");
    }

    // Find customer by Firebase UID
    const customer = await Customer.findOne({ firebaseUid, isDeleted: false });

    if (!customer) {
      return sendError(
        res,
        404,
        "Customer not found. Please complete registration first"
      );
    }

    // Verify subscription plan exists and is active
    const plan = await SubscriptionPlan.findOne({
      _id: planId,
      isActive: true,
    });

    if (!plan) {
      return sendError(
        res,
        404,
        "Subscription plan not found or is no longer available"
      );
    }

    // Validate amount paid matches plan price (with small tolerance for rounding)
    const priceDifference = Math.abs(amountPaid - plan.planPrice);
    if (priceDifference > 0.01) {
      return sendError(res, 400, "Amount paid does not match plan price", {
        expectedAmount: plan.planPrice,
        providedAmount: amountPaid,
      });
    }

    // Check if customer already has an active subscription for this plan type
    const existingActiveSubscription = await Subscription.findOne({
      customerId: customer._id,
      status: "ACTIVE",
      isDeleted: false,
      expiryDate: { $gt: new Date() },
    }).populate("planId");

    if (existingActiveSubscription) {
      // Check if same plan type
      if (existingActiveSubscription.planId.planType === plan.planType) {
        return sendError(
          res,
          409,
          `You already have an active ${plan.planType} subscription`,
          {
            existingSubscription: existingActiveSubscription,
          }
        );
      }
    }

    // Calculate expiry date
    const purchaseDate = new Date();
    const expiryDate = new Date(purchaseDate);
    expiryDate.setDate(expiryDate.getDate() + plan.days);

    // Create new subscription
    const subscription = new Subscription({
      planId: plan._id,
      customerId: customer._id,
      purchaseDate,
      expiryDate,
      totalVouchers: plan.totalVouchers,
      usedVouchers: 0,
      amountPaid,
      status: "ACTIVE",
    });

    await subscription.save();

    // Populate plan and customer details
    await subscription.populate("planId customerId");

    return sendSuccess(
      res,
      201,
      "Subscription purchased successfully",
      subscription
    );
  } catch (error) {
    console.error("Error creating subscription:", error);

    // Handle validation errors
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
      "Failed to create subscription. Please try again"
    );
  }
};

/**
 * Get customer's own subscriptions
 * @access Customer (Firebase authenticated)
 * @description Retrieve all subscriptions for the authenticated customer
 */
export const getMySubscriptions = async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser?.uid;
    const { status, includeDeleted = "false", sortBy = "purchaseDate", sortOrder = "desc" } = req.query;

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

    if (status) {
      filter.status = status.toUpperCase();
    }

    if (includeDeleted !== "true") {
      filter.isDeleted = false;
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Fetch subscriptions
    const subscriptions = await Subscription.find(filter)
      .populate("planId")
      .sort(sortOptions);

    // Calculate remaining vouchers for each subscription
    const subscriptionsWithDetails = subscriptions.map((sub) => {
      const remainingVouchers = sub.totalVouchers - sub.usedVouchers;
      const isExpired = new Date() > sub.expiryDate;
      const isExhausted = sub.usedVouchers >= sub.totalVouchers;

      return {
        ...sub.toObject(),
        remainingVouchers,
        isExpired,
        isExhausted,
      };
    });

    return sendSuccess(
      res,
      200,
      "Subscriptions retrieved successfully",
      subscriptionsWithDetails
    );
  } catch (error) {
    console.error("Error fetching customer subscriptions:", error);
    return sendError(
      res,
      500,
      "Failed to fetch subscriptions. Please try again"
    );
  }
};

/**
 * Get customer's active subscriptions
 * @access Customer (Firebase authenticated)
 * @description Get only active subscriptions with available vouchers
 */
export const getMyActiveSubscriptions = async (req, res) => {
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

    // Fetch active subscriptions
    const subscriptions = await Subscription.find({
      customerId: customer._id,
      status: "ACTIVE",
      isDeleted: false,
      expiryDate: { $gt: new Date() },
    })
      .populate("planId")
      .sort({ expiryDate: 1 });

    // Calculate remaining vouchers
    const activeSubscriptions = subscriptions
      .map((sub) => {
        const remainingVouchers = sub.totalVouchers - sub.usedVouchers;
        return {
          ...sub.toObject(),
          remainingVouchers,
        };
      })
      .filter((sub) => sub.remainingVouchers > 0);

    return sendSuccess(
      res,
      200,
      "Active subscriptions retrieved successfully",
      activeSubscriptions
    );
  } catch (error) {
    console.error("Error fetching active subscriptions:", error);
    return sendError(
      res,
      500,
      "Failed to fetch active subscriptions. Please try again"
    );
  }
};

/**
 * Get subscription by ID (Customer's own subscription)
 * @access Customer (Firebase authenticated)
 */
export const getMySubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const firebaseUid = req.firebaseUser?.uid;

    if (!id) {
      return sendError(res, 400, "Subscription ID is required");
    }

    if (!firebaseUid) {
      return sendError(res, 401, "Authentication required");
    }

    // Find customer
    const customer = await Customer.findOne({ firebaseUid, isDeleted: false });

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    // Find subscription
    const subscription = await Subscription.findOne({
      _id: id,
      customerId: customer._id,
    }).populate("planId");

    if (!subscription) {
      return sendError(res, 404, "Subscription not found");
    }

    // Calculate details
    const remainingVouchers = subscription.totalVouchers - subscription.usedVouchers;
    const isExpired = new Date() > subscription.expiryDate;
    const isExhausted = subscription.usedVouchers >= subscription.totalVouchers;

    const subscriptionDetails = {
      ...subscription.toObject(),
      remainingVouchers,
      isExpired,
      isExhausted,
    };

    return sendSuccess(
      res,
      200,
      "Subscription retrieved successfully",
      subscriptionDetails
    );
  } catch (error) {
    console.error("Error fetching subscription:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription ID format");
    }

    return sendError(
      res,
      500,
      "Failed to fetch subscription. Please try again"
    );
  }
};

/**
 * Cancel subscription
 * @access Customer (Firebase authenticated)
 * @description Allows customer to cancel their active subscription
 */
export const cancelMySubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const firebaseUid = req.firebaseUser?.uid;

    if (!id) {
      return sendError(res, 400, "Subscription ID is required");
    }

    if (!firebaseUid) {
      return sendError(res, 401, "Authentication required");
    }

    // Find customer
    const customer = await Customer.findOne({ firebaseUid, isDeleted: false });

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    // Find subscription
    const subscription = await Subscription.findOne({
      _id: id,
      customerId: customer._id,
    });

    if (!subscription) {
      return sendError(res, 404, "Subscription not found");
    }

    // Check if already cancelled
    if (subscription.status === "CANCELLED") {
      return sendError(res, 400, "Subscription is already cancelled");
    }

    // Check if already expired or exhausted
    if (subscription.status === "EXPIRED") {
      return sendError(res, 400, "Cannot cancel an expired subscription");
    }

    if (subscription.status === "EXHAUSTED") {
      return sendError(res, 400, "Cannot cancel an exhausted subscription");
    }

    // Cancel subscription
    subscription.status = "CANCELLED";
    await subscription.save();

    await subscription.populate("planId");

    return sendSuccess(
      res,
      200,
      "Subscription cancelled successfully",
      subscription
    );
  } catch (error) {
    console.error("Error cancelling subscription:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription ID format");
    }

    return sendError(
      res,
      500,
      "Failed to cancel subscription. Please try again"
    );
  }
};

/**
 * Use a voucher from subscription
 * @access Customer (Firebase authenticated) or System
 * @description Decrements available vouchers when customer uses one
 */
export const useVoucher = async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const firebaseUid = req.firebaseUser?.uid;

    if (!subscriptionId) {
      return sendError(res, 400, "Subscription ID is required");
    }

    if (!firebaseUid) {
      return sendError(res, 401, "Authentication required");
    }

    // Find customer
    const customer = await Customer.findOne({ firebaseUid, isDeleted: false });

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    // Find subscription
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      customerId: customer._id,
      isDeleted: false,
    });

    if (!subscription) {
      return sendError(res, 404, "Subscription not found");
    }

    // Check if subscription is active
    if (subscription.status !== "ACTIVE") {
      return sendError(
        res,
        400,
        `Cannot use voucher: Subscription is ${subscription.status.toLowerCase()}`
      );
    }

    // Check if subscription has expired
    if (new Date() > subscription.expiryDate) {
      subscription.status = "EXPIRED";
      await subscription.save();
      return sendError(res, 400, "Subscription has expired");
    }

    // Check if vouchers are available
    const remainingVouchers = subscription.totalVouchers - subscription.usedVouchers;

    if (remainingVouchers <= 0) {
      subscription.status = "EXHAUSTED";
      await subscription.save();
      return sendError(res, 400, "No vouchers remaining in this subscription");
    }

    // Use voucher
    subscription.usedVouchers += 1;

    // Check if this was the last voucher
    if (subscription.usedVouchers >= subscription.totalVouchers) {
      subscription.status = "EXHAUSTED";
    }

    await subscription.save();
    await subscription.populate("planId");

    const updatedRemainingVouchers = subscription.totalVouchers - subscription.usedVouchers;

    return sendSuccess(res, 200, "Voucher used successfully", {
      subscription,
      remainingVouchers: updatedRemainingVouchers,
      voucherUsed: true,
    });
  } catch (error) {
    console.error("Error using voucher:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription ID format");
    }

    return sendError(res, 500, "Failed to use voucher. Please try again");
  }
};

/**
 * Check if customer has active subscription for a plan type
 * @access Customer (Firebase authenticated)
 * @description Check if customer has active subscription for LUNCH_ONLY, DINNER_ONLY, or BOTH
 */
export const checkActiveSubscription = async (req, res) => {
  try {
    const { planType } = req.query;
    const firebaseUid = req.firebaseUser?.uid;

    if (!firebaseUid) {
      return sendError(res, 401, "Authentication required");
    }

    // Find customer
    const customer = await Customer.findOne({ firebaseUid, isDeleted: false });

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    // Build filter
    const filter = {
      customerId: customer._id,
      status: "ACTIVE",
      isDeleted: false,
      expiryDate: { $gt: new Date() },
    };

    // Find active subscriptions
    const subscriptions = await Subscription.find(filter).populate("planId");

    // Filter by plan type if specified
    let relevantSubscriptions = subscriptions;

    if (planType) {
      const upperPlanType = planType.toUpperCase();
      relevantSubscriptions = subscriptions.filter(
        (sub) => sub.planId.planType === upperPlanType || sub.planId.planType === "BOTH"
      );
    }

    // Filter out exhausted subscriptions
    const activeWithVouchers = relevantSubscriptions.filter(
      (sub) => sub.usedVouchers < sub.totalVouchers
    );

    const hasActiveSubscription = activeWithVouchers.length > 0;

    return sendSuccess(res, 200, "Subscription check completed", {
      hasActiveSubscription,
      activeSubscriptions: activeWithVouchers.map((sub) => ({
        ...sub.toObject(),
        remainingVouchers: sub.totalVouchers - sub.usedVouchers,
      })),
    });
  } catch (error) {
    console.error("Error checking subscription:", error);
    return sendError(
      res,
      500,
      "Failed to check subscription. Please try again"
    );
  }
};

/**
 * Get all subscriptions (Admin)
 * @access Admin only
 * @description Get all subscriptions with filtering and pagination
 */
export const getAllSubscriptions = async (req, res) => {
  try {
    const {
      status,
      customerId,
      planId,
      includeDeleted = "false",
      sortBy = "purchaseDate",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    // Build filter
    const filter = {};

    if (status) {
      filter.status = status.toUpperCase();
    }

    if (customerId) {
      filter.customerId = customerId;
    }

    if (planId) {
      filter.planId = planId;
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
    const [subscriptions, totalCount] = await Promise.all([
      Subscription.find(filter)
        .populate("planId customerId")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Subscription.countDocuments(filter),
    ]);

    // Add remaining vouchers to each subscription
    const subscriptionsWithDetails = subscriptions.map((sub) => {
      const remainingVouchers = sub.totalVouchers - sub.usedVouchers;
      const isExpired = new Date() > sub.expiryDate;
      const isExhausted = sub.usedVouchers >= sub.totalVouchers;

      return {
        ...sub.toObject(),
        remainingVouchers,
        isExpired,
        isExhausted,
      };
    });

    return sendSuccess(res, 200, "Subscriptions retrieved successfully", {
      subscriptions: subscriptionsWithDetails,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return sendError(
      res,
      500,
      "Failed to fetch subscriptions. Please try again"
    );
  }
};

/**
 * Get subscription by ID (Admin)
 * @access Admin only
 */
export const getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 400, "Subscription ID is required");
    }

    const subscription = await Subscription.findById(id).populate(
      "planId customerId"
    );

    if (!subscription) {
      return sendError(res, 404, "Subscription not found");
    }

    // Calculate details
    const remainingVouchers = subscription.totalVouchers - subscription.usedVouchers;
    const isExpired = new Date() > subscription.expiryDate;
    const isExhausted = subscription.usedVouchers >= subscription.totalVouchers;

    const subscriptionDetails = {
      ...subscription.toObject(),
      remainingVouchers,
      isExpired,
      isExhausted,
    };

    return sendSuccess(
      res,
      200,
      "Subscription retrieved successfully",
      subscriptionDetails
    );
  } catch (error) {
    console.error("Error fetching subscription:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription ID format");
    }

    return sendError(
      res,
      500,
      "Failed to fetch subscription. Please try again"
    );
  }
};

/**
 * Update subscription status (Admin)
 * @access Admin only
 * @description Allows admin to manually update subscription status
 */
export const updateSubscriptionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return sendError(res, 400, "Subscription ID is required");
    }

    if (!status) {
      return sendError(res, 400, "Status is required");
    }

    const validStatuses = ["ACTIVE", "EXPIRED", "CANCELLED", "EXHAUSTED"];
    if (!validStatuses.includes(status.toUpperCase())) {
      return sendError(res, 400, "Invalid status value", {
        validStatuses,
      });
    }

    const subscription = await Subscription.findById(id);

    if (!subscription) {
      return sendError(res, 404, "Subscription not found");
    }

    // Update status
    subscription.status = status.toUpperCase();
    await subscription.save();

    await subscription.populate("planId customerId");

    return sendSuccess(
      res,
      200,
      "Subscription status updated successfully",
      subscription
    );
  } catch (error) {
    console.error("Error updating subscription status:", error);

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
      "Failed to update subscription. Please try again"
    );
  }
};

/**
 * Delete subscription (Soft delete) (Admin)
 * @access Admin only
 */
export const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 400, "Subscription ID is required");
    }

    const subscription = await Subscription.findById(id);

    if (!subscription) {
      return sendError(res, 404, "Subscription not found");
    }

    // Soft delete
    subscription.isDeleted = true;
    subscription.deletedAt = new Date();
    await subscription.save();

    await subscription.populate("planId customerId");

    return sendSuccess(
      res,
      200,
      "Subscription deleted successfully",
      subscription
    );
  } catch (error) {
    console.error("Error deleting subscription:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription ID format");
    }

    return sendError(
      res,
      500,
      "Failed to delete subscription. Please try again"
    );
  }
};

/**
 * Restore deleted subscription (Admin)
 * @access Admin only
 */
export const restoreSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 400, "Subscription ID is required");
    }

    const subscription = await Subscription.findById(id);

    if (!subscription) {
      return sendError(res, 404, "Subscription not found");
    }

    if (!subscription.isDeleted) {
      return sendError(res, 400, "Subscription is not deleted");
    }

    // Restore
    subscription.isDeleted = false;
    subscription.deletedAt = null;
    await subscription.save();

    await subscription.populate("planId customerId");

    return sendSuccess(
      res,
      200,
      "Subscription restored successfully",
      subscription
    );
  } catch (error) {
    console.error("Error restoring subscription:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription ID format");
    }

    return sendError(
      res,
      500,
      "Failed to restore subscription. Please try again"
    );
  }
};

/**
 * Get subscription statistics (Admin)
 * @access Admin only
 * @description Get analytics and statistics about subscriptions
 */
export const getSubscriptionStats = async (_req, res) => {
  try {
    const [
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      exhaustedSubscriptions,
      subscriptionsByPlan,
      revenueStats,
    ] = await Promise.all([
      Subscription.countDocuments({ isDeleted: false }),
      Subscription.countDocuments({
        status: "ACTIVE",
        isDeleted: false,
        expiryDate: { $gt: new Date() },
      }),
      Subscription.countDocuments({ status: "EXPIRED", isDeleted: false }),
      Subscription.countDocuments({ status: "CANCELLED", isDeleted: false }),
      Subscription.countDocuments({ status: "EXHAUSTED", isDeleted: false }),
      Subscription.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: "$planId",
            count: { $sum: 1 },
            totalRevenue: { $sum: "$amountPaid" },
            totalVouchersIssued: { $sum: "$totalVouchers" },
            totalVouchersUsed: { $sum: "$usedVouchers" },
          },
        },
        {
          $lookup: {
            from: "subscriptionplans",
            localField: "_id",
            foreignField: "_id",
            as: "plan",
          },
        },
        { $unwind: "$plan" },
      ]),
      Subscription.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amountPaid" },
            averageAmount: { $avg: "$amountPaid" },
            totalVouchersIssued: { $sum: "$totalVouchers" },
            totalVouchersUsed: { $sum: "$usedVouchers" },
          },
        },
      ]),
    ]);

    const voucherUsageRate =
      revenueStats[0]?.totalVouchersIssued > 0
        ? (revenueStats[0].totalVouchersUsed / revenueStats[0].totalVouchersIssued) * 100
        : 0;

    return sendSuccess(res, 200, "Subscription statistics retrieved", {
      totalSubscriptions,
      subscriptionsByStatus: {
        active: activeSubscriptions,
        expired: expiredSubscriptions,
        cancelled: cancelledSubscriptions,
        exhausted: exhaustedSubscriptions,
      },
      subscriptionsByPlan,
      revenue: {
        total: revenueStats[0]?.totalRevenue || 0,
        average: revenueStats[0]?.averageAmount || 0,
      },
      vouchers: {
        totalIssued: revenueStats[0]?.totalVouchersIssued || 0,
        totalUsed: revenueStats[0]?.totalVouchersUsed || 0,
        usageRate: voucherUsageRate.toFixed(2) + "%",
      },
    });
  } catch (error) {
    console.error("Error fetching subscription statistics:", error);
    return sendError(
      res,
      500,
      "Failed to fetch subscription statistics. Please try again"
    );
  }
};

/**
 * Update expired subscriptions (System/Cron job)
 * @access Admin only
 * @description Updates all subscriptions that have passed their expiry date
 */
export const updateExpiredSubscriptions = async (_req, res) => {
  try {
    const result = await Subscription.updateMany(
      {
        status: "ACTIVE",
        expiryDate: { $lte: new Date() },
        isDeleted: false,
      },
      {
        $set: { status: "EXPIRED" },
      }
    );

    return sendSuccess(res, 200, "Expired subscriptions updated", {
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error updating expired subscriptions:", error);
    return sendError(
      res,
      500,
      "Failed to update expired subscriptions. Please try again"
    );
  }
};

/**
 * Get customer subscription summary
 * @access Customer (Firebase authenticated)
 * @description Get summary of customer's subscriptions with counts and totals
 */
export const getMySubscriptionSummary = async (req, res) => {
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

    // Get subscription counts
    const [
      totalSubscriptions,
      activeSubscriptions,
      totalSpent,
      totalVouchers,
      usedVouchers,
    ] = await Promise.all([
      Subscription.countDocuments({
        customerId: customer._id,
        isDeleted: false,
      }),
      Subscription.countDocuments({
        customerId: customer._id,
        status: "ACTIVE",
        isDeleted: false,
        expiryDate: { $gt: new Date() },
      }),
      Subscription.aggregate([
        { $match: { customerId: customer._id, isDeleted: false } },
        { $group: { _id: null, total: { $sum: "$amountPaid" } } },
      ]),
      Subscription.aggregate([
        { $match: { customerId: customer._id, isDeleted: false } },
        { $group: { _id: null, total: { $sum: "$totalVouchers" } } },
      ]),
      Subscription.aggregate([
        { $match: { customerId: customer._id, isDeleted: false } },
        { $group: { _id: null, total: { $sum: "$usedVouchers" } } },
      ]),
    ]);

    const totalVouchersCount = totalVouchers[0]?.total || 0;
    const usedVouchersCount = usedVouchers[0]?.total || 0;
    const remainingVouchersCount = totalVouchersCount - usedVouchersCount;

    return sendSuccess(res, 200, "Subscription summary retrieved", {
      totalSubscriptions,
      activeSubscriptions,
      totalSpent: totalSpent[0]?.total || 0,
      vouchers: {
        total: totalVouchersCount,
        used: usedVouchersCount,
        remaining: remainingVouchersCount,
      },
    });
  } catch (error) {
    console.error("Error fetching subscription summary:", error);
    return sendError(
      res,
      500,
      "Failed to fetch subscription summary. Please try again"
    );
  }
};
