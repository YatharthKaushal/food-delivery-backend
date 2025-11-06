import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Order Item subdocument schema
 * Stores menu item reference and the price at the time of order
 */
const orderItemSchema = new Schema(
  {
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: [true, "Menu item reference is required"],
    },
    orderPlacedPrice: {
      type: Number,
      required: [true, "Order placed price is required"],
      min: [0, "Order placed price cannot be negative"],
      validate: {
        validator: function (value) {
          return Number.isFinite(value) && value >= 0;
        },
        message: "Order placed price must be a valid non-negative number",
      },
    },
  },
  { _id: false }
);

/**
 * Addon Item subdocument schema
 * Stores addon reference and the price at the time of order
 */
const addonItemSchema = new Schema(
  {
    addonId: {
      type: Schema.Types.ObjectId,
      ref: "Addon",
      required: [true, "Addon item reference is required"],
    },
    orderPlacedPrice: {
      type: Number,
      required: [true, "Order placed price is required"],
      min: [0, "Order placed price cannot be negative"],
      validate: {
        validator: function (value) {
          return Number.isFinite(value) && value >= 0;
        },
        message: "Order placed price must be a valid non-negative number",
      },
    },
  },
  { _id: false }
);

/**
 * Order Status subdocument schema
 * Tracks the lifecycle of an order with timestamps
 */
const orderStatusSchema = new Schema(
  {
    placedAt: {
      type: Date,
      default: () => new Date(),
      required: true,
      immutable: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    preparingAt: {
      type: Date,
      default: null,
    },
    outForDeliveryAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

/**
 * Order schema for tracking customer orders
 */
const orderSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer reference is required"],
    },
    mealType: {
      type: String,
      required: [true, "Meal type is required"],
      enum: {
        values: ["LUNCH", "DINNER"],
        message: "{VALUE} is not a valid meal type",
      },
      uppercase: true,
    },
    scheduledForDate: {
      type: Date,
      required: [true, "Scheduled date is required"],
      validate: {
        validator: function (value) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return value >= today;
        },
        message: "Scheduled date cannot be in the past",
      },
    },
    isAutoOrder: {
      type: Boolean,
      default: false,
    },
    menuItem: {
      type: orderItemSchema,
      required: [true, "Menu item is required"],
    },
    addons: {
      type: [addonItemSchema],
      default: [],
    },
    subscriptionUsed: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
      index: true,
    },
    vouchersConsumed: {
      type: Number,
      default: 0,
      min: [0, "Vouchers consumed cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Vouchers consumed must be a whole number",
      },
    },
    orderStatus: {
      type: orderStatusSchema,
      required: true,
      default: () => ({}),
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
      validate: {
        validator: function (value) {
          return Number.isFinite(value) && value >= 0;
        },
        message: "Total amount must be a valid non-negative number",
      },
    },
    specialInstructions: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Special instructions cannot exceed 500 characters"],
    },
    packagingType: {
      type: String,
      required: [true, "Packaging type is required"],
      enum: {
        values: ["STEEL_DABBA", "DISPOSABLE"],
        message:
          "{VALUE} is not a valid packaging type. Must be either 'STEEL_DABBA' or 'DISPOSABLE'",
      },
      uppercase: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryDriver",
      default: null,
      index: true,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    pickedUpAt: {
      type: Date,
      default: null,
    },
    refundStatus: {
      type: String,
      enum: ["none", "pending", "processed", "rejected"],
      default: "none",
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: [0, "Refund amount cannot be negative"],
    },
    refundReason: {
      type: String,
      trim: true,
      maxlength: [500, "Refund reason cannot exceed 500 characters"],
    },
    refundRequestedAt: {
      type: Date,
      default: null,
    },
    refundProcessedAt: {
      type: Date,
      default: null,
    },
    refundProcessedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [500, "Admin notes cannot exceed 500 characters"],
    },
    isDeleted: {
      type: Boolean,
      default: false,
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Customer order history
orderSchema.index({ customerId: 1, scheduledForDate: -1 });
orderSchema.index({ customerId: 1, isDeleted: 1, createdAt: -1 });

// Meal type and date queries
orderSchema.index({ scheduledForDate: 1, mealType: 1 });
orderSchema.index({ mealType: 1, "orderStatus.placedAt": -1 });

// Status tracking
orderSchema.index({ "orderStatus.placedAt": -1 });
orderSchema.index({ "orderStatus.deliveredAt": -1 });
orderSchema.index({ "orderStatus.cancelledAt": 1 });

// Auto-order tracking
orderSchema.index({ isAutoOrder: 1, scheduledForDate: -1 });

// Subscription tracking
orderSchema.index({ subscriptionUsed: 1, scheduledForDate: -1 });

// Soft delete
orderSchema.index({ isDeleted: 1, deletedAt: 1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
