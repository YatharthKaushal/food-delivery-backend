import SubscriptionPlan from "../schema/SubscriptionPlan.schema.js";
import { sendSuccess, sendError } from "../utils/response.util.js";

/**
 * Create a new subscription plan
 * @access Admin only
 */
export const createSubscriptionPlan = async (req, res) => {
  try {
    const {
      planName,
      days,
      planType,
      totalVouchers,
      planPrice,
      compareAtPlanPrice,
      description,
      isActive,
    } = req.body;

    // Validate required fields
    if (!planName || !days || !planType || !totalVouchers || planPrice === undefined) {
      return sendError(res, 400, "Missing required fields", {
        required: ["planName", "days", "planType", "totalVouchers", "planPrice"],
      });
    }

    // Check for duplicate plan with same name, type, and duration
    const existingPlan = await SubscriptionPlan.findOne({
      planName: planName.trim(),
      days,
      planType,
      isActive: true,
    });

    if (existingPlan) {
      return sendError(
        res,
        409,
        "A subscription plan with the same name, type, and duration already exists"
      );
    }

    // Create new subscription plan
    const subscriptionPlan = new SubscriptionPlan({
      planName,
      days,
      planType,
      totalVouchers,
      planPrice,
      compareAtPlanPrice,
      description,
      isActive: isActive !== undefined ? isActive : true,
    });

    await subscriptionPlan.save();

    return sendSuccess(
      res,
      201,
      "Subscription plan created successfully",
      subscriptionPlan
    );
  } catch (error) {
    console.error("Error creating subscription plan:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation failed", { errors });
    }

    return sendError(
      res,
      500,
      "Failed to create subscription plan. Please try again"
    );
  }
};

/**
 * Get all subscription plans (Admin view - includes inactive)
 * @access Admin only
 */
export const getAllSubscriptionPlansAdmin = async (req, res) => {
  try {
    const {
      planType,
      days,
      isActive,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    // Build filter query
    const filter = {};

    if (planType) {
      filter.planType = planType.toUpperCase();
    }

    if (days) {
      filter.days = days;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.planPrice = {};
      if (minPrice !== undefined) {
        filter.planPrice.$gte = parseFloat(minPrice);
      }
      if (maxPrice !== undefined) {
        filter.planPrice.$lte = parseFloat(maxPrice);
      }
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [subscriptionPlans, totalCount] = await Promise.all([
      SubscriptionPlan.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      SubscriptionPlan.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, "Subscription plans retrieved successfully", {
      subscriptionPlans,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    return sendError(
      res,
      500,
      "Failed to fetch subscription plans. Please try again"
    );
  }
};

/**
 * Get all active subscription plans (Public view)
 * @access Public
 */
export const getActiveSubscriptionPlans = async (req, res) => {
  try {
    const { planType, days, sortBy = "planPrice", sortOrder = "asc" } = req.query;

    // Build filter query - only active plans
    const filter = { isActive: true };

    if (planType) {
      filter.planType = planType.toUpperCase();
    }

    if (days) {
      filter.days = days;
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const subscriptionPlans = await SubscriptionPlan.find(filter).sort(
      sortOptions
    );

    return sendSuccess(
      res,
      200,
      "Active subscription plans retrieved successfully",
      subscriptionPlans
    );
  } catch (error) {
    console.error("Error fetching active subscription plans:", error);
    return sendError(
      res,
      500,
      "Failed to fetch subscription plans. Please try again"
    );
  }
};

/**
 * Get subscription plan by ID (Admin view)
 * @access Admin only
 */
export const getSubscriptionPlanByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 400, "Subscription plan ID is required");
    }

    const subscriptionPlan = await SubscriptionPlan.findById(id);

    if (!subscriptionPlan) {
      return sendError(res, 404, "Subscription plan not found");
    }

    return sendSuccess(
      res,
      200,
      "Subscription plan retrieved successfully",
      subscriptionPlan
    );
  } catch (error) {
    console.error("Error fetching subscription plan:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription plan ID format");
    }

    return sendError(
      res,
      500,
      "Failed to fetch subscription plan. Please try again"
    );
  }
};

/**
 * Get active subscription plan by ID (Public view)
 * @access Public
 */
export const getActiveSubscriptionPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 400, "Subscription plan ID is required");
    }

    const subscriptionPlan = await SubscriptionPlan.findOne({
      _id: id,
      isActive: true,
    });

    if (!subscriptionPlan) {
      return sendError(res, 404, "Subscription plan not found or inactive");
    }

    return sendSuccess(
      res,
      200,
      "Subscription plan retrieved successfully",
      subscriptionPlan
    );
  } catch (error) {
    console.error("Error fetching subscription plan:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription plan ID format");
    }

    return sendError(
      res,
      500,
      "Failed to fetch subscription plan. Please try again"
    );
  }
};

/**
 * Update subscription plan
 * @access Admin only
 */
export const updateSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      planName,
      days,
      planType,
      totalVouchers,
      planPrice,
      compareAtPlanPrice,
      description,
      isActive,
    } = req.body;

    if (!id) {
      return sendError(res, 400, "Subscription plan ID is required");
    }

    // Find existing plan
    const subscriptionPlan = await SubscriptionPlan.findById(id);

    if (!subscriptionPlan) {
      return sendError(res, 404, "Subscription plan not found");
    }

    // Check for duplicate plan if name, type, or duration is being changed
    if (planName || days || planType) {
      const nameToCheck = planName || subscriptionPlan.planName;
      const daysToCheck = days || subscriptionPlan.days;
      const typeToCheck = planType || subscriptionPlan.planType;

      const duplicatePlan = await SubscriptionPlan.findOne({
        _id: { $ne: id },
        planName: nameToCheck.trim(),
        days: daysToCheck,
        planType: typeToCheck,
        isActive: true,
      });

      if (duplicatePlan) {
        return sendError(
          res,
          409,
          "A subscription plan with the same name, type, and duration already exists"
        );
      }
    }

    // Update fields
    if (planName !== undefined) subscriptionPlan.planName = planName;
    if (days !== undefined) subscriptionPlan.days = days;
    if (planType !== undefined) subscriptionPlan.planType = planType;
    if (totalVouchers !== undefined) subscriptionPlan.totalVouchers = totalVouchers;
    if (planPrice !== undefined) subscriptionPlan.planPrice = planPrice;
    if (compareAtPlanPrice !== undefined) {
      subscriptionPlan.compareAtPlanPrice = compareAtPlanPrice;
    }
    if (description !== undefined) subscriptionPlan.description = description;
    if (isActive !== undefined) subscriptionPlan.isActive = isActive;

    await subscriptionPlan.save();

    return sendSuccess(
      res,
      200,
      "Subscription plan updated successfully",
      subscriptionPlan
    );
  } catch (error) {
    console.error("Error updating subscription plan:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription plan ID format");
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation failed", { errors });
    }

    return sendError(
      res,
      500,
      "Failed to update subscription plan. Please try again"
    );
  }
};

/**
 * Delete subscription plan (soft delete - set isActive to false)
 * @access Admin only
 */
export const deleteSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 400, "Subscription plan ID is required");
    }

    const subscriptionPlan = await SubscriptionPlan.findById(id);

    if (!subscriptionPlan) {
      return sendError(res, 404, "Subscription plan not found");
    }

    // Soft delete by setting isActive to false
    subscriptionPlan.isActive = false;
    await subscriptionPlan.save();

    return sendSuccess(
      res,
      200,
      "Subscription plan deleted successfully",
      subscriptionPlan
    );
  } catch (error) {
    console.error("Error deleting subscription plan:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription plan ID format");
    }

    return sendError(
      res,
      500,
      "Failed to delete subscription plan. Please try again"
    );
  }
};

/**
 * Permanently delete subscription plan (hard delete)
 * @access Admin only
 * @warning Use with caution - this permanently removes the plan from database
 */
export const permanentlyDeleteSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 400, "Subscription plan ID is required");
    }

    const subscriptionPlan = await SubscriptionPlan.findByIdAndDelete(id);

    if (!subscriptionPlan) {
      return sendError(res, 404, "Subscription plan not found");
    }

    return sendSuccess(
      res,
      200,
      "Subscription plan permanently deleted",
      subscriptionPlan
    );
  } catch (error) {
    console.error("Error permanently deleting subscription plan:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription plan ID format");
    }

    return sendError(
      res,
      500,
      "Failed to permanently delete subscription plan. Please try again"
    );
  }
};

/**
 * Activate/Reactivate subscription plan
 * @access Admin only
 */
export const activateSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 400, "Subscription plan ID is required");
    }

    const subscriptionPlan = await SubscriptionPlan.findById(id);

    if (!subscriptionPlan) {
      return sendError(res, 404, "Subscription plan not found");
    }

    if (subscriptionPlan.isActive) {
      return sendError(res, 400, "Subscription plan is already active");
    }

    // Check for duplicate active plan
    const duplicatePlan = await SubscriptionPlan.findOne({
      _id: { $ne: id },
      planName: subscriptionPlan.planName,
      days: subscriptionPlan.days,
      planType: subscriptionPlan.planType,
      isActive: true,
    });

    if (duplicatePlan) {
      return sendError(
        res,
        409,
        "Cannot activate: A subscription plan with the same name, type, and duration is already active"
      );
    }

    subscriptionPlan.isActive = true;
    await subscriptionPlan.save();

    return sendSuccess(
      res,
      200,
      "Subscription plan activated successfully",
      subscriptionPlan
    );
  } catch (error) {
    console.error("Error activating subscription plan:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription plan ID format");
    }

    return sendError(
      res,
      500,
      "Failed to activate subscription plan. Please try again"
    );
  }
};

/**
 * Get subscription plans grouped by type
 * @access Public
 */
export const getSubscriptionPlansByType = async (_req, res) => {
  try {
    const subscriptionPlans = await SubscriptionPlan.find({ isActive: true }).sort({
      planType: 1,
      days: 1,
      planPrice: 1,
    });

    // Group by plan type
    const groupedPlans = subscriptionPlans.reduce((acc, plan) => {
      if (!acc[plan.planType]) {
        acc[plan.planType] = [];
      }
      acc[plan.planType].push(plan);
      return acc;
    }, {});

    return sendSuccess(
      res,
      200,
      "Subscription plans grouped by type",
      groupedPlans
    );
  } catch (error) {
    console.error("Error fetching subscription plans by type:", error);
    return sendError(
      res,
      500,
      "Failed to fetch subscription plans. Please try again"
    );
  }
};

/**
 * Get subscription plan statistics
 * @access Admin only
 */
export const getSubscriptionPlanStats = async (_req, res) => {
  try {
    const [totalPlans, activePlans, inactivePlans, plansByType] = await Promise.all([
      SubscriptionPlan.countDocuments(),
      SubscriptionPlan.countDocuments({ isActive: true }),
      SubscriptionPlan.countDocuments({ isActive: false }),
      SubscriptionPlan.aggregate([
        {
          $group: {
            _id: "$planType",
            count: { $sum: 1 },
            averagePrice: { $avg: "$planPrice" },
            minPrice: { $min: "$planPrice" },
            maxPrice: { $max: "$planPrice" },
          },
        },
      ]),
    ]);

    return sendSuccess(res, 200, "Subscription plan statistics retrieved", {
      totalPlans,
      activePlans,
      inactivePlans,
      plansByType,
    });
  } catch (error) {
    console.error("Error fetching subscription plan statistics:", error);
    return sendError(
      res,
      500,
      "Failed to fetch subscription plan statistics. Please try again"
    );
  }
};
