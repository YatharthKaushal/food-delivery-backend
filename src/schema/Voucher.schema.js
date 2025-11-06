import mongoose from "mongoose";

const { Schema } = mongoose;

const voucherSchema = new Schema(
  {
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: [true, "Subscription reference is required"],
      unique: true, // One voucher record per subscription
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer reference is required"],
    },
    mealType: {
      type: String,
      enum: {
        values: ["BOTH", "LUNCH", "DINNER"],
        message: "{VALUE} is not a valid meal type",
      },
      default: "BOTH",
      uppercase: true,
    },
    issuedDate: {
      type: Date,
      required: [true, "Issued date is required"],
      default: () => new Date(),
      immutable: true,
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
      validate: {
        validator: function (value) {
          return value > this.issuedDate;
        },
        message: "Expiry date must be after issued date",
      },
      immutable: true,
    },
    totalVouchers: {
      type: Number,
      required: [true, "Total vouchers is required"],
      min: [1, "Total vouchers must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Total vouchers must be a whole number",
      },
      immutable: true,
    },
    remainingVouchers: {
      type: Number,
      required: [true, "Remaining vouchers is required"],
      min: [0, "Remaining vouchers cannot be negative"],
      validate: [
        {
          validator: Number.isInteger,
          message: "Remaining vouchers must be a whole number",
        },
        {
          validator: function (value) {
            return value <= this.totalVouchers;
          },
          message: "Remaining vouchers cannot exceed total vouchers",
        },
      ],
    },
    isExpired: {
      type: Boolean,
      default: false,
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

// Customer voucher queries
voucherSchema.index({ customerId: 1, isExpired: 1, isDeleted: 1 });
voucherSchema.index({ customerId: 1, expiryDate: 1 });
voucherSchema.index({ customerId: 1, mealType: 1, remainingVouchers: 1 });

// Subscription vouchers (unique index is already on subscriptionId in schema)
voucherSchema.index({ subscriptionId: 1, customerId: 1 });

// Voucher availability tracking
voucherSchema.index({ remainingVouchers: 1, isExpired: 1, isDeleted: 1 });

// Expiry management
voucherSchema.index({ expiryDate: 1, isExpired: 1 });
voucherSchema.index({ isExpired: 1, expiryDate: 1 });

// Soft delete
voucherSchema.index({ isDeleted: 1, deletedAt: 1 });

const Voucher = mongoose.model("Voucher", voucherSchema);

export default Voucher;
