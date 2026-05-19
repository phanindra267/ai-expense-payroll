import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IIdempotencyRecord extends Document {
  key: string;
  method: string;
  path: string;
  statusCode: number;
  body: any;
  organisationId?: Types.ObjectId;
  createdAt: Date;
}

const idempotencyRecordSchema = new Schema<IIdempotencyRecord>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    method: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    statusCode: {
      type: Number,
      required: true,
    },
    body: {
      type: Schema.Types.Mixed,
      required: true,
    },
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Unique index on key
idempotencyRecordSchema.index({ key: 1 }, { unique: true });

// TTL index: auto-delete after 24 hours
idempotencyRecordSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model<IIdempotencyRecord>('IdempotencyRecord', idempotencyRecordSchema);
