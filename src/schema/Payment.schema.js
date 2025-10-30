import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0, "Amount cannot be negative"],
      validate: {
        validator: function (value) {
          return Number.isFinite(value) && value >= 0;
        },
        message: "Amount must be a valid positive number",
      },
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
      validate: {
        validator: function (value) {
          return /^[A-Z]{3}$/.test(value);
        },
        message: "Currency must be a valid 3-letter ISO code",
      },
    },

    method: {
      type: String,
      enum: {
        values: ['CARD', 'NETBANKING', 'UPI', 'WALLET', 'EMI', 'PAYLATER', 'COD', 'OTHER'],
        message: '{VALUE} is not a supported payment method',
      },
      trim: true,
    },

    status: {
      type: String,
      required: [true, "Payment status is required"],
      enum: {
        values: [
          "PENDING",
          "PROCESSING",
          "AUTHORIZED",
          "CAPTURED",
          "FAILED",
          "REFUNDED",
          "PARTIAL_REFUND",
          "CANCELLED",
        ],
        message: "{VALUE} is not a valid payment status",
      },
      default: "PENDING",
      trim: true,
    },

    razorpayOrderId: {
      type: String,
      trim: true,
      sparse: true,
    },

    razorpayPaymentId: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
      sparse: true,
    },

    razorpaySignature: {
      type: String,
      trim: true,
      select: false,
    },

    transactionId: {
      type: String,
      trim: true,
      sparse: true,
    },

    amountInPaisa: {
      type: Number,
      validate: {
        validator: function(value) {
          if (!value) return true;
          return Number.isInteger(value) && value >= 0;
        },
        message: "Amount in paisa must be a valid integer"
      },
    },

    paidAt: {
      type: Date,
      validate: {
        validator: function (value) {
          return !value || value <= new Date();
        },
        message: "Payment date cannot be in the future",
      },
    },

    failureReason: {
      type: String,
      trim: true,
      maxlength: [500, "Failure reason cannot exceed 500 characters"],
    },

    refundAmount: {
      type: Number,
      default: 0,
      min: [0, "Refund amount cannot be negative"],
    },

    refundId: {
      type: String,
      trim: true,
      sparse: true,
    },

    webhookData: {
      type: mongoose.Schema.Types.Mixed,
      select: false,
    },

    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer ID is required"],
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
  }
);

// Compound indexes for common queries
paymentSchema.index({ customerId: 1, status: 1 });
paymentSchema.index({ customerId: 1, createdAt: -1 });
paymentSchema.index({ orderId: 1, status: 1 });
paymentSchema.index({ subscriptionId: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ isDeleted: 1, deletedAt: 1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
