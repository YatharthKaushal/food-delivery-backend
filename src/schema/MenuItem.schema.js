import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Media subdocument schema for menu item images
 */
const mediaSchema = new Schema(
  {
    thumbnail: {
      type: String,
      trim: true,
    },
    shuffle: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

/**
 * MenuItem schema for tiffin/dabba menu items
 */
const menuItemSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Menu item name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    content: {
      type: String,
      required: [true, "Menu item content is required"],
      trim: true,
      minlength: [3, "Content must be at least 3 characters long"],
      maxlength: [500, "Content cannot exceed 500 characters"],
    },
    description: {
      type: String,
      trim: true,
      // minlength: [10, "Description must be at least 10 characters long"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    media: {
      type: mediaSchema,
    },
    mealType: {
      type: String,
      required: [true, "Meal type is required"],
      enum: {
        values: ["LUNCH", "DINNER", "OTHER", "BOTH"],
        message: "{VALUE} is not a valid meal type",
      },
      uppercase: true,
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
    compareAtPrice: {
      type: Number,
      default: null,
      min: [0, "Compare at price cannot be negative"],
      validate: {
        validator: function (value) {
          if (value === null || value === undefined) return true;
          return Number.isFinite(value) && value > this.price;
        },
        message: "Compare at price must be greater than price",
      },
      set: (value) => (value ? Math.round(value * 100) / 100 : null),
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

// Compound indexes for filtering
menuItemSchema.index({ mealType: 1, isLive: 1, isDeleted: 1 });
menuItemSchema.index({ isLive: 1, isDeleted: 1 });
menuItemSchema.index({ price: 1, isLive: 1, isDeleted: 1 });
menuItemSchema.index({ isDeleted: 1, deletedAt: 1 });

// Text search index
menuItemSchema.index({ name: "text", content: "text", description: "text" });

const MenuItem = mongoose.model("MenuItem", menuItemSchema);

export default MenuItem;
