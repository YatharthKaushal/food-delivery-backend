import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, "Please provide a valid 10-digit phone number"],
    },
    authMethod: {
      type: String,
      required: [true, 'Authentication method is required'],
      enum: {
        values: ['EMAIL', 'PHONE'],
        message: '{VALUE} is not a valid authentication method'
      },
      uppercase: true,
    },
    address: {
      addressLine: {
        type: String,
        trim: true,
        minlength: [10, "Address must be at least 10 characters long"],
        maxlength: [500, "Address cannot exceed 500 characters"],
      },
      dontRingBell: {
        type: Boolean,
        default: false,
      },
      dontCall: {
        type: Boolean,
        default: false,
      },
      deliveryNote: {
        type: String,
        trim: true,
        maxlength: [200, "Delivery note cannot exceed 200 characters"],
        default: "",
      },
    },
    dietaryPreferences: {
      foodType: {
        type: String,
        enum: {
          values: ["VEG", "NON-VEG", "VEGAN"],
          message: "{VALUE} is not a valid food type",
        },
        default: "VEG",
      },
      eggiterian: {
        type: Boolean,
        default: false,
      },
      jainFriendly: {
        type: Boolean,
        default: false,
      },
      dabbaType: {
        type: String,
        enum: {
          values: ["DISPOSABLE", "STEEL DABBA"],
          message: "{VALUE} is not a valid dabba type",
        },
        default: "DISPOSABLE",
      },
      spiceLevel: {
        type: String,
        enum: {
          values: ["HIGH", "MEDIUM", "LOW"],
          message: "{VALUE} is not a valid spice level",
        },
        default: "MEDIUM",
      },
    },
    activeSubscription: {
      status: {
        type: Boolean,
        default: false,
      },
      subscriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subscription",
        default: null,
      },
    },
    autoOrder: {
      isEnabled: {
        type: Boolean,
        default: false,
      },
      preferences: {
        lunchEnabled: {
          type: Boolean,
          default: false,
        },
        dinnerEnabled: {
          type: Boolean,
          default: false,
        },
        skipDays: {
          type: [String],
          enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
          default: [],
        },
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
      required: true,
      index: true,
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
      transform: function(_doc, ret) {
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform: function(_doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Single field indexes
customerSchema.index({ email: 1 }, { sparse: true });
customerSchema.index({ phone: 1 }, { sparse: true });
customerSchema.index({ isDeleted: 1 });

// Compound indexes for common queries
customerSchema.index({ isDeleted: 1, createdAt: -1 });
customerSchema.index({ 'activeSubscription.status': 1, isDeleted: 1 });

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
