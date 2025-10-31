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

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      sparse: true,
      trim: true,
    },

    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
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

    isProfileComplete: {
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
  }
);

// Unique field indexes (sparse)
deliveryDriverSchema.index({ phone: 1 }, { unique: true, sparse: true });
deliveryDriverSchema.index(
  { "govId.idNumber": 1 },
  { unique: true, sparse: true }
);
deliveryDriverSchema.index(
  { "vehicle.vehicleNumber": 1 },
  { unique: true, sparse: true }
);

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
