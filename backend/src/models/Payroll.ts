import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLogEntry {
  fromStatus: string;
  toStatus: string;
  changedBy: Types.ObjectId;
  changedAt: Date;
  reason?: string;
}

export interface IPayroll extends Document {
  employeeId: Types.ObjectId;
  employeeName: string;
  month: string; // YYYY-MM
  baseSalary: number;
  totalBonuses: number;
  totalDeductions: number;
  overtimePay: number;
  leaveDeductions: number;
  netPay: number;
  status: 'draft' | 'audited' | 'approved' | 'paid';
  auditLog: IAuditLogEntry[];
  organisationId: Types.ObjectId;
  processedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLogEntry>(
  {
    fromStatus: { type: String, required: true },
    toStatus: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
    reason: { type: String },
  },
  { _id: false }
);

const payrollSchema = new Schema<IPayroll>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    month: {
      type: String,
      required: [true, 'Month is required'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'],
    },
    baseSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    totalBonuses: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDeductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    overtimePay: {
      type: Number,
      default: 0,
      min: 0,
    },
    leaveDeductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    netPay: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'audited', 'approved', 'paid'],
      default: 'draft',
    },
    auditLog: {
      type: [auditLogSchema],
      default: [],
    },
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
payrollSchema.index({ organisationId: 1, month: 1, employeeId: 1 });
payrollSchema.index({ month: 1, status: 1 });

export default mongoose.model<IPayroll>('Payroll', payrollSchema);
