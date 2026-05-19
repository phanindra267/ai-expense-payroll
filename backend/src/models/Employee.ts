import mongoose, { Schema, Document, Types } from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption';

export interface IMonthlyAdjustment {
  month: string; // YYYY-MM format
  type: 'bonus' | 'deduction' | 'overtime' | 'leave';
  amount: number;
  reason?: string;
}

export interface IEmployee extends Document {
  name: string;
  email: string;
  department: string;
  baseSalary: number;
  joiningDate: Date;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  };
  monthlyAdjustments: IMonthlyAdjustment[];
  organisationId: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const monthlyAdjustmentSchema = new Schema<IMonthlyAdjustment>(
  {
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'],
    },
    type: {
      type: String,
      required: true,
      enum: ['bonus', 'deduction', 'overtime', 'leave'],
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount must be >= 0'],
    },
    reason: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const employeeSchema = new Schema<IEmployee>(
  {
    name: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    baseSalary: {
      type: Number,
      required: [true, 'Base salary is required'],
      min: [0, 'Base salary must be >= 0'],
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    bankAccount: {
      bankName: { type: String, default: '' },
      accountNumber: { 
        type: String, 
        default: '',
        set: (val: string) => val ? encrypt(val) : val,
        get: (val: string) => val ? decrypt(val) : val
      },
      ifscCode: { type: String, default: '' },
    },
    monthlyAdjustments: {
      type: [monthlyAdjustmentSchema],
      default: [],
    },
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

// Indexes
employeeSchema.index({ organisationId: 1, email: 1 });
employeeSchema.index({ organisationId: 1, department: 1 });

export default mongoose.model<IEmployee>('Employee', employeeSchema);
