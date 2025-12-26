import mongoose from "mongoose";

const { Schema } = mongoose;

// Role enum for type safety
const ADMIN_ROLES = {
  ADMIN: "ADMIN",
  KITCHEN_STAFF: "KITCHEN_STAFF",
  DELIVERY_DRIVER: "DELIVERY_DRIVER",
};

const adminSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    username: {
      type: String,
      sparse: true,
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
      minlength: [8, "Password must be at least 8 characters long"],
      select: false, // Don't include password by default in queries
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true, // Allows multiple null values but enforces uniqueness for non-null values
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      enum: {
        values: Object.values(ADMIN_ROLES),
        message:
          "{VALUE} is not a valid role. Must be either ADMIN or KITCHEN_STAFF",
      },
      default: ADMIN_ROLES.KITCHEN_STAFF,
      uppercase: true,
    },
    // Soft delete fields
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: "admins",
  }
);

// Indexes for better query performance
// adminSchema.index({ username: 1, isDeleted: 1 });
// adminSchema.index({ email: 1, isDeleted: 1 });
// adminSchema.index({ role: 1, isDeleted: 1 });
// adminSchema.index({ createdAt: -1 });

// Export the model
const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
export { ADMIN_ROLES };
