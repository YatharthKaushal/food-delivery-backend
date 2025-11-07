import mongoose from "mongoose";

const deliveryDriverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Driver name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters long"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      validate: {
        validator: function (v) {
          // Only alphanumeric characters and underscores, no spaces or special characters
          return /^[a-z0-9_]+$/.test(v);
        },
        message:
          "Username can only contain lowercase letters, numbers, and underscores (no spaces or special characters)",
      },
      index: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false, // Don't include password by default in queries
    },

    phone: {
      type: String,
      trim: true,
      sparse: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },

    govId: {
      idNumber: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        uppercase: true,
      },
      picture: {
        type: String,
        trim: true,
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be less than 0"],
      max: [5, "Rating cannot be more than 5"],
    },

    availabilityStatus: {
      type: String,
      required: [true, "Availability status is required"],
      enum: {
        values: ["AVAILABLE", "BUSY", "OFFLINE"],
        message: "{VALUE} is not a valid availability status",
      },
      default: "OFFLINE",
      uppercase: true,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    currentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    lastDeliveryAt: {
      type: Date,
      default: null,
    },

    currentLocation: {
      latitude: {
        type: Number,
        min: [-90, "Latitude must be between -90 and 90"],
        max: [90, "Latitude must be between -90 and 90"],
      },
      longitude: {
        type: Number,
        min: [-180, "Longitude must be between -180 and 180"],
        max: [180, "Longitude must be between -180 and 180"],
      },
      lastUpdated: {
        type: Date,
        default: null,
      },
    },

    vehicle: {
      vehicleType: {
        type: String,
        // required: [true, "Vehicle type is required"],
        enum: {
          values: ["TWO WHEELER", "FOUR WHEELER"],
          message:
            "{VALUE} is not a valid vehicle type. Must be TWO WHEELER or FOUR WHEELER",
        },
        uppercase: true,
        trim: true,
      },
      vehicleNumber: {
        type: String,
        // required: [true, "Vehicle number is required"],
        unique: true,
        sparse: true,
        trim: true,
        uppercase: true,
      },
      documents: {
        type: [String],
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
  }
);

// Unique field indexes (sparse)
deliveryDriverSchema.index({ username: 1, isDeleted: 1 });
deliveryDriverSchema.index({ email: 1, isDeleted: 1 });
deliveryDriverSchema.index({ phone: 1 }, { unique: true, sparse: true });

// Availability and performance
deliveryDriverSchema.index({ isActive: 1, availabilityStatus: 1, rating: -1 });
deliveryDriverSchema.index({ availabilityStatus: 1, isActive: 1 });

// Location-based queries
deliveryDriverSchema.index({
  "currentLocation.latitude": 1,
  "currentLocation.longitude": 1,
  availabilityStatus: 1,
});

const DeliveryDriver = mongoose.model("DeliveryDriver", deliveryDriverSchema);

export default DeliveryDriver;
