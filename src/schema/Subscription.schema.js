import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Subscription schema for tracking customer subscriptions
 * Links customers to subscription plans with voucher management
 */
const subscriptionSchema = new Schema(
  {
    planId: {
      type: Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: [true, "Subscription plan reference is required"],
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer reference is required"],
    },
    purchaseDate: {
      type: Date,
      required: [true, "Purchase date is required"],
      default: () => new Date(),
      validate: {
        validator: function (value) {
          return value <= new Date();
        },
        message: "Purchase date cannot be in the future",
      },
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
      validate: {
        validator: function(value) {
          return value > this.purchaseDate;
        },
        message: "Expiry date must be after purchase date"
      },
    },
    totalVouchers: {
      type: Number,
      required: [true, "Total vouchers is required"],
      min: [1, "Total vouchers must be at least 1"],
      max: [1000, "Total vouchers cannot exceed 1000"],
      validate: {
        validator: Number.isInteger,
        message: "Total vouchers must be a whole number",
      },
      immutable: true,
    },
    usedVouchers: {
      type: Number,
      required: [true, "Used vouchers count is required"],
      default: 0,
      min: [0, "Used vouchers cannot be negative"],
      validate: [
        {
          validator: Number.isInteger,
          message: "Used vouchers must be a whole number",
        },
        {
          validator: function (value) {
            return value <= this.totalVouchers;
          },
          message: "Used vouchers cannot exceed total vouchers",
        },
      ],
    },
    amountPaid: {
      type: Number,
      required: [true, "Amount paid is required"],
      min: [0, "Amount paid cannot be negative"],
      validate: {
        validator: function (value) {
          return Number.isFinite(value) && value >= 0;
        },
        message: "Amount paid must be a valid non-negative number",
      },
      set: (value) => Math.round(value * 100) / 100,
      immutable: true,
    },
    status: {
      type: String,
      required: [true, "Subscription status is required"],
      enum: {
        values: ["ACTIVE", "EXPIRED", "CANCELLED", "EXHAUSTED"],
        message: "{VALUE} is not a valid subscription status"
      },
      default: "ACTIVE",
      uppercase: true,
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
    versionKey: true,
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

// Customer queries
subscriptionSchema.index({ customerId: 1, status: 1, purchaseDate: -1 });
subscriptionSchema.index({ customerId: 1, isDeleted: 1 });

// Plan analytics
subscriptionSchema.index({ planId: 1, status: 1, purchaseDate: -1 });

// Expiry tracking
subscriptionSchema.index({ expiryDate: 1, status: 1 });
subscriptionSchema.index({ status: 1, expiryDate: 1 });

// Soft delete
subscriptionSchema.index({ isDeleted: 1, deletedAt: 1 });

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
