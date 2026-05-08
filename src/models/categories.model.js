import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
        // If user is null, it means it is a default global category.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    icon: {
      type: String,
      required: true,
    },
    // True if created by an Admin (meaning it applies to everyone globally)
    isDefault: {
      type: Boolean,
      default: false,
    },

  },
  {
    timestamps: true,
  }
);

// Ensure a user cannot have two categories with exactly the same name for themselves
categorySchema.index({ name: 1, user: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);

export default Category;
