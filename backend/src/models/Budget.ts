import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBudget extends Document {
  category: string;
  month: string; // YYYY-MM
  limit: number;
  spentSoFar: number;
  organisationId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const budgetSchema = new Schema<IBudget>(
  {
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    month: {
      type: String,
      required: [true, 'Month is required'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'],
    },
    limit: {
      type: Number,
      required: [true, 'Budget limit is required'],
      min: [0, 'Budget limit must be >= 0'],
    },
    spentSoFar: {
      type: Number,
      default: 0,
      min: 0,
    },
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index
budgetSchema.index({ organisationId: 1, month: 1, category: 1 }, { unique: true });

export default mongoose.model<IBudget>('Budget', budgetSchema);
