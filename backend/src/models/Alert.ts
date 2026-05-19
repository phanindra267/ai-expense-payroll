import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAlert extends Document {
  type: 'budget_warning' | 'budget_critical' | 'anomaly' | 'system';
  message: string;
  category?: string;
  month?: string;
  severity: 'info' | 'warning' | 'critical';
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  metadata?: Record<string, any>;
  organisationId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const alertSchema = new Schema<IAlert>(
  {
    type: {
      type: String,
      enum: ['budget_warning', 'budget_critical', 'anomaly', 'system'],
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Alert message is required'],
    },
    category: { type: String },
    month: { type: String },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'warning',
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
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

// Indexes
alertSchema.index({ organisationId: 1, createdAt: -1 });
alertSchema.index({ organisationId: 1, resolved: 1 });

export default mongoose.model<IAlert>('Alert', alertSchema);
