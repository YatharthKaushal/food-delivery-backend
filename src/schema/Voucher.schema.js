import mongoose from "mongoose";

const { Schema } = mongoose;

const voucherSchema = new Schema(
  {
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: [true, "Subscription reference is required"],
    },
    usedForOrder: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
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
    isUsed: {
      type: Boolean,
      default: false,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
    usedDate: {
      type: Date,
      default: null,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return value <= new Date();
        },
        message: "Used date cannot be in the future",
      },
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
voucherSchema.index({ customerId: 1, isUsed: 1, isExpired: 1, isDeleted: 1 });
voucherSchema.index({ customerId: 1, expiryDate: 1 });
voucherSchema.index({ customerId: 1, mealType: 1, isUsed: 1 });

// Subscription vouchers
voucherSchema.index({ subscriptionId: 1, customerId: 1 });

// Usage tracking
voucherSchema.index({ usedDate: 1, usedForOrder: 1 });
voucherSchema.index({ isUsed: 1, isDeleted: 1 });

// Expiry management
voucherSchema.index({ expiryDate: 1, isExpired: 1 });
voucherSchema.index({ isExpired: 1, expiryDate: 1 });

// Soft delete
voucherSchema.index({ isDeleted: 1, deletedAt: 1 });

const Voucher = mongoose.model("Voucher", voucherSchema);

export default Voucher;
