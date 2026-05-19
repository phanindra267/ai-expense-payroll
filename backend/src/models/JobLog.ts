import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IJobLog extends Document {
  jobId: string;
  queue: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead-letter';
  result?: any;
  error?: string;
  attempts: number;
  maxAttempts: number;
  organisationId?: Types.ObjectId;
  metadata?: Record<string, any>;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const jobLogSchema = new Schema<IJobLog>(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
    },
    queue: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'dead-letter'],
      default: 'pending',
    },
    result: {
      type: Schema.Types.Mixed,
    },
    error: {
      type: String,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes
jobLogSchema.index({ jobId: 1 }, { unique: true });
jobLogSchema.index({ queue: 1, status: 1 });

export default mongoose.model<IJobLog>('JobLog', jobLogSchema);
