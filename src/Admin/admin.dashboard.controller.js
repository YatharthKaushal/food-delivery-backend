/**
 * Admin Dashboard Controller
 * Handles dashboard analytics and statistics for admin panel
 * @module Admin/Dashboard
 */

import Order from "../schema/Order.schema.js";
import Subscription from "../schema/Subscription.schema.js";
import Customer from "../schema/Customer.schema.js";
import DeliveryDriver from "../schema/DeliveryDriver.schema.js";
import { sendSuccess, sendError } from "../utils/response.util.js";
import { HTTP_STATUS } from "../constants/index.js";

/**
 * Get overall statistics for admin dashboard
 * @access Admin only
 * @route GET /api/admin/dashboard/stats
 * @description Get key metrics for the admin dashboard
 */
export const getOverallStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalCustomers,
      activeSubscriptions,
      todayOrders,
      activeDrivers,
      todayRevenue,
      orderStatusBreakdown,
    ] = await Promise.all([
      // Total customers
      Customer.countDocuments({ isDeleted: false }),

      // Active subscriptions
      Subscription.countDocuments({
        status: "ACTIVE",
        isDeleted: false,
        expiryDate: { $gt: new Date() },
      }),

      // Today's orders
      Order.countDocuments({
        scheduledForDate: { $gte: today, $lt: tomorrow },
        isDeleted: false,
      }),

      // Active and available drivers
      DeliveryDriver.countDocuments({
        isActive: true,
        isDeleted: false,
      }),

      // Today's revenue (from delivered orders)
      Order.aggregate([
        {
          $match: {
            "orderStatus.deliveredAt": { $gte: today, $lt: tomorrow },
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
          },
        },
      ]),

      // Order status breakdown for today
      Order.aggregate([
        {
          $match: {
            scheduledForDate: { $gte: today, $lt: tomorrow },
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: null,
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
            outForDelivery: {
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
            delivered: {
              $sum: {
                $cond: [{ $ne: ["$orderStatus.deliveredAt", null] }, 1, 0],
              },
            },
            cancelled: {
              $sum: {
                $cond: [{ $ne: ["$orderStatus.cancelledAt", null] }, 1, 0],
              },
            },
            failed: {
              $sum: {
                $cond: [{ $ne: ["$orderStatus.failedAt", null] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    return sendSuccess(res, HTTP_STATUS.OK, "Dashboard stats retrieved successfully", {
      totalCustomers,
      activeSubscriptions,
      todayOrders,
      activeDrivers,
      todayRevenue: todayRevenue[0]?.total || 0,
      orderStatusBreakdown: orderStatusBreakdown[0] || {
        placed: 0,
        accepted: 0,
        preparing: 0,
        outForDelivery: 0,
        delivered: 0,
        cancelled: 0,
        failed: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching overall stats:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch dashboard stats. Please try again"
    );
  }
};

/**
 * Get order analytics
 * @access Admin only
 * @route GET /api/admin/dashboard/orders
 * @description Get detailed order analytics for a date range
 */
export const getOrderAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let matchStage = { isDeleted: false };

    if (startDate && endDate) {
      matchStage.scheduledForDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchStage.scheduledForDate = { $gte: thirtyDaysAgo };
    }

    const analytics = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$scheduledForDate" },
            },
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          lunchOrders: {
            $sum: { $cond: [{ $eq: ["$mealType", "LUNCH"] }, 1, 0] },
          },
          dinnerOrders: {
            $sum: { $cond: [{ $eq: ["$mealType", "DINNER"] }, 1, 0] },
          },
          withSubscription: {
            $sum: { $cond: [{ $ne: ["$subscriptionUsed", null] }, 1, 0] },
          },
          withoutSubscription: {
            $sum: { $cond: [{ $eq: ["$subscriptionUsed", null] }, 1, 0] },
          },
          delivered: {
            $sum: {
              $cond: [{ $ne: ["$orderStatus.deliveredAt", null] }, 1, 0],
            },
          },
          cancelled: {
            $sum: {
              $cond: [{ $ne: ["$orderStatus.cancelledAt", null] }, 1, 0],
            },
          },
        },
      },
      { $sort: { "_id.date": -1 } },
    ]);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      "Order analytics retrieved successfully",
      {
        analytics,
        dateRange: matchStage.scheduledForDate,
      }
    );
  } catch (error) {
    console.error("Error fetching order analytics:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch order analytics. Please try again"
    );
  }
};

/**
 * Get revenue report
 * @access Admin only
 * @route GET /api/admin/dashboard/revenue
 * @description Get revenue report grouped by time period
 */
export const getRevenueReport = async (req, res) => {
  try {
    const { period = "month" } = req.query; // day, week, month, year

    let groupBy;
    let sortLimit = 30;

    switch (period) {
      case "day":
        groupBy = {
          $dateToString: { format: "%Y-%m-%d", date: "$orderStatus.deliveredAt" },
        };
        sortLimit = 30; // Last 30 days
        break;
      case "week":
        groupBy = {
          year: { $year: "$orderStatus.deliveredAt" },
          week: { $week: "$orderStatus.deliveredAt" },
        };
        sortLimit = 12; // Last 12 weeks
        break;
      case "month":
        groupBy = {
          $dateToString: { format: "%Y-%m", date: "$orderStatus.deliveredAt" },
        };
        sortLimit = 12; // Last 12 months
        break;
      case "year":
        groupBy = { $year: "$orderStatus.deliveredAt" };
        sortLimit = 5; // Last 5 years
        break;
      default:
        groupBy = {
          $dateToString: { format: "%Y-%m", date: "$orderStatus.deliveredAt" },
        };
        sortLimit = 12;
    }

    const revenue = await Order.aggregate([
      {
        $match: {
          "orderStatus.deliveredAt": { $ne: null },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: groupBy,
          totalRevenue: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: "$totalAmount" },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: sortLimit },
    ]);

    // Calculate totals
    const totals = revenue.reduce(
      (acc, item) => ({
        totalRevenue: acc.totalRevenue + item.totalRevenue,
        totalOrders: acc.totalOrders + item.orderCount,
      }),
      { totalRevenue: 0, totalOrders: 0 }
    );

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      "Revenue report retrieved successfully",
      {
        period,
        revenue,
        summary: {
          ...totals,
          averageOrderValue:
            totals.totalOrders > 0 ? totals.totalRevenue / totals.totalOrders : 0,
        },
      }
    );
  } catch (error) {
    console.error("Error fetching revenue report:", error);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch revenue report. Please try again"
    );
  }
};
