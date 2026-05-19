import mongoose, { Schema, Document } from 'mongoose';

export interface ISecurityAudit extends Document {
  organisationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  resource: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

const SecurityAuditSchema = new Schema({
  organisationId: { type: Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true, index: true },
  resource: { type: String, required: true },
  details: { type: Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },
}, { 
  timestamps: { createdAt: true, updatedAt: false }, // Immutable log, no updates allowed
  capped: { size: 1024 * 1024 * 100, max: 100000 } // 100MB capped collection for log rotation
});

export const SecurityAudit = mongoose.model<ISecurityAudit>('SecurityAudit', SecurityAuditSchema);
