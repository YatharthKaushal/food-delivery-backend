import mongoose from "mongoose";

const { Schema } = mongoose;

const addonSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Addon name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: [true, "Menu item reference is required"],
    },
    contents: {
      type: String,
      trim: true,
      maxlength: [500, "Contents cannot exceed 500 characters"],
    },
    description: {
      type: String,
      trim: true,
      // minlength: [10, "Description must be at least 10 characters long"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
      validate: {
        validator: function (value) {
          return Number.isFinite(value) && value >= 0;
        },
        message: "Price must be a valid non-negative number",
      },
      set: (value) => Math.round(value * 100) / 100,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags) {
          return tags.every((tag) => tag.trim().length > 0);
        },
        message: "Tags cannot be empty strings",
      },
    },
    category: {
      type: String,
      trim: true,
      enum: {
        values: [
          "BEVERAGE",
          "SWEETS",
          "CONDIMENT",
          "ICE_CREAM",
          "LAVA_CAKE",
          "DESSERT",
          "SNACK",
          "SIDE_DISH",
          "OTHER",
        ],
        message: "{VALUE} is not a valid category",
      },
    },
    imageUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (url) {
          if (!url) return true;
          return /^https?:\/\/.+/.test(url);
        },
        message: "Image URL must be a valid URL",
      },
    },
    isLive: {
      type: Boolean,
      default: false,
      required: true,
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

// Reference indexes
addonSchema.index({ menuItemId: 1, isDeleted: 1 });

// Filter indexes
addonSchema.index({ category: 1, isLive: 1, isDeleted: 1 });
addonSchema.index({ isLive: 1, isDeleted: 1 });
addonSchema.index({ price: 1, isLive: 1, isDeleted: 1 });
addonSchema.index({ isDeleted: 1, deletedAt: 1 });

// Text search
addonSchema.index({ name: "text", description: "text" });

const Addon = mongoose.model("Addon", addonSchema);

export default Addon;
