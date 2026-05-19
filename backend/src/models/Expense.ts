import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExpense extends Document {
  description: string;
  amount: number;
  date: Date;
  vendor: string;
  paymentMethod: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'upi' | 'other';
  category: string;
  categoryOverride: boolean;
  receipt?: string;
  ocrText?: string;
  flagged: boolean;
  anomalyReason?: string;
  anomalyScore?: number;
  organisationId: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: 3,
      maxlength: 500,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    vendor: {
      type: String,
      required: [true, 'Vendor is required'],
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'upi', 'other'],
      default: 'other',
    },
    category: {
      type: String,
      default: 'uncategorized',
      trim: true,
    },
    categoryOverride: {
      type: Boolean,
      default: false,
    },
    receipt: {
      type: String, // file path or URL
    },
    ocrText: {
      type: String,
    },
    flagged: {
      type: Boolean,
      default: false,
    },
    anomalyReason: {
      type: String,
    },
    anomalyScore: {
      type: Number,
    },
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for multi-tenant queries
expenseSchema.index({ organisationId: 1, date: -1 });
expenseSchema.index({ organisationId: 1, category: 1, date: 1 });
expenseSchema.index({ organisationId: 1, flagged: 1 });

// Text index for fallback semantic search (when ChromaDB is not available)
expenseSchema.index({ description: 'text', vendor: 'text', category: 'text' });

export default mongoose.model<IExpense>('Expense', expenseSchema);
