import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Location subdocument schema
 * Stores geographical location with coordinates and address details
 */
const locationSchema = new Schema(
  {
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
      minlength: [5, "Address must be at least 5 characters long"],
      maxlength: [500, "Address cannot exceed 500 characters"],
    },
    coordinates: {
      latitude: {
        type: Number,
        required: [true, "Latitude is required"],
        min: [-90, "Latitude must be between -90 and 90"],
        max: [90, "Latitude must be between -90 and 90"],
        validate: {
          validator: function (value) {
            return Number.isFinite(value);
          },
          message: "Latitude must be a valid number",
        },
      },
      longitude: {
        type: Number,
        required: [true, "Longitude is required"],
        min: [-180, "Longitude must be between -180 and 180"],
        max: [180, "Longitude must be between -180 and 180"],
        validate: {
          validator: function (value) {
            return Number.isFinite(value);
          },
          message: "Longitude must be a valid number",
        },
      },
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: [200, "Landmark cannot exceed 200 characters"],
      default: "",
    },
  },
  { _id: false }
);

/**
 * Delivery Status subdocument schema
 * Tracks the delivery lifecycle with timestamps
 */
const deliveryStatusSchema = new Schema(
  {
    pickedUpAt: {
      type: Date,
      default: null,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return value instanceof Date && !isNaN(value);
        },
        message: "Picked up date must be a valid date",
      },
    },
    outForDeliveryAt: {
      type: Date,
      default: null,
      validate: {
        validator: function (value) {
          if (!value) return true;
          if (!(value instanceof Date) || isNaN(value)) return false;
          if (this.pickedUpAt && value < this.pickedUpAt) {
            return false;
          }
          return true;
        },
        message:
          "Out for delivery date must be a valid date and after picked up date",
      },
    },
    deliveredAt: {
      type: Date,
      default: null,
      validate: {
        validator: function (value) {
          if (!value) return true;
          if (!(value instanceof Date) || isNaN(value)) return false;
          if (this.outForDeliveryAt && value < this.outForDeliveryAt) {
            return false;
          }
          return true;
        },
        message:
          "Delivered date must be a valid date and after out for delivery date",
      },
    },
    failedToDeliverAt: {
      type: Date,
      default: null,
      validate: {
        validator: function (value) {
          if (!value) return true;
          if (!(value instanceof Date) || isNaN(value)) return false;
          if (this.deliveredAt && value) {
            return false;
          }
          return true;
        },
        message:
          "Failed to deliver date must be a valid date and cannot coexist with delivered date",
      },
    },
  },
  { _id: false }
);

/**
 * Delivery Success Status subdocument schema
 * Tracks final delivery outcome with detailed status and messages
 */
const deliverySuccessStatusSchema = new Schema(
  {
    status: {
      type: Boolean,
      required: [true, "Delivery status is required"],
      default: false,
    },
    message: {
      type: String,
      required: [true, "Status message is required"],
      enum: {
        values: ["DELIVERED", "FAILED", "PENDING", "IN_PROGRESS"],
        message:
          "{VALUE} is not a valid status message. Must be DELIVERED, FAILED, PENDING, or IN_PROGRESS",
      },
      uppercase: true,
      default: "PENDING",
      validate: {
        validator: function (value) {
          if (this.status === true && value !== "DELIVERED") {
            return false;
          }
          if (
            this.status === false &&
            this.failedMessage &&
            value !== "FAILED"
          ) {
            return false;
          }
          return true;
        },
        message:
          "Status message must align with status value (true=DELIVERED, false with failedMessage=FAILED)",
      },
    },
    failedMessage: {
      type: String,
      trim: true,
      maxlength: [500, "Failed message cannot exceed 500 characters"],
      default: null,
      validate: {
        validator: function (value) {
          if (value && (this.status === true || this.message !== "FAILED")) {
            return false;
          }
          return true;
        },
        message:
          "Failed message can only be set when status is false and message is FAILED",
      },
    },
  },
  { _id: false }
);

/**
 * Delivery schema for tracking order deliveries
 */
const deliverySchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order reference is required"],
      unique: true,
      sparse: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer reference is required"],
    },
    deliveryDriverId: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryDriver",
      default: null,
    },
    fromLocation: {
      type: locationSchema,
      required: [true, "From location is required"],
    },
    toLocation: {
      type: locationSchema,
      required: [true, "To location is required"],
    },
    status: {
      type: deliveryStatusSchema,
      required: true,
      default: () => ({}),
    },
    deliverySuccessStatus: {
      type: deliverySuccessStatusSchema,
      required: true,
      default: () => ({}),
    },
    estimatedDeliveryTime: {
      type: Date,
      default: null,
    },
    deliveryNotes: {
      type: String,
      trim: true,
      maxlength: [1000, "Delivery notes cannot exceed 1000 characters"],
      default: "",
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

// Order and customer lookups
deliverySchema.index({ orderId: 1 }, { unique: true, sparse: true });
deliverySchema.index({ customerId: 1, createdAt: -1 });

// Driver queries
deliverySchema.index({ deliveryDriverId: 1, createdAt: -1 });
deliverySchema.index({
  deliveryDriverId: 1,
  "deliverySuccessStatus.status": 1,
});

// Status tracking
deliverySchema.index({ "status.deliveredAt": -1 });
deliverySchema.index({ "status.failedToDeliverAt": -1 });
deliverySchema.index({ "status.outForDeliveryAt": 1 });
deliverySchema.index({ "deliverySuccessStatus.message": 1, createdAt: -1 });

// Soft delete
deliverySchema.index({ isDeleted: 1, deletedAt: 1 });

// Geospatial queries
deliverySchema.index({
  "toLocation.coordinates.latitude": 1,
  "toLocation.coordinates.longitude": 1,
});

const Delivery = mongoose.model("Delivery", deliverySchema);

export default Delivery;
