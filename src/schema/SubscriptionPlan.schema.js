import { Schema, model } from "mongoose";

const subscriptionPlanSchema = new Schema(
  {
    planName: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
      minlength: [3, "Plan name must be at least 3 characters long"],
      maxlength: [100, "Plan name cannot exceed 100 characters"],
    },
    days: {
      type: String,
      required: [true, "Plan duration is required"],
      enum: {
        values: ["7D", "14D", "30D", "60D"],
        message:
          "{VALUE} is not a valid plan duration. Must be one of: 7D, 14D, 30D, 60D",
      },
    },
    planType: {
      type: String,
      required: [true, "Plan type is required"],
      enum: {
        values: ["BOTH", "LUNCH_ONLY", "DINNER_ONLY"],
        message:
          "{VALUE} is not a valid plan type. Must be BOTH, LUNCH_ONLY, or DINNER_ONLY",
      },
      default: "BOTH",
      uppercase: true,
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
    },
    planPrice: {
      type: Number,
      required: [true, "Plan price is required"],
      min: [0, "Plan price cannot be negative"],
      validate: {
        validator: function (value) {
          return Number.isFinite(value) && value >= 0;
        },
        message: "Plan price must be a valid positive number",
      },
      set: (value) => Math.round(value * 100) / 100,
    },
    compareAtPlanPrice: {
      type: Number,
      default: null,
      min: [0, "Compare at price cannot be negative"],
      validate: {
        validator: function (value) {
          if (value === null || value === undefined) return true;
          return Number.isFinite(value) && value >= this.planPrice;
        },
        message: "Compare at price must be greater than or equal to plan price",
      },
      set: (value) => (value ? Math.round(value * 100) / 100 : null),
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Filter and sort indexes
subscriptionPlanSchema.index({ isActive: 1, planType: 1, days: 1 });
subscriptionPlanSchema.index({ isActive: 1, planPrice: 1 });
subscriptionPlanSchema.index({ planType: 1, isActive: 1 });

const SubscriptionPlan = model("SubscriptionPlan", subscriptionPlanSchema);

export default SubscriptionPlan;
