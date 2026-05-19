import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganisation extends Document {
  name: string;
  schemaVersion: number;
  settings: {
    currency: string;
    timezone: string;
    fiscalYearStart: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const organisationSchema = new Schema<IOrganisation>(
  {
    name: {
      type: String,
      required: [true, 'Organisation name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    schemaVersion: {
      type: Number,
      default: 1,
    },
    settings: {
      currency: { type: String, default: 'USD' },
      timezone: { type: String, default: 'UTC' },
      fiscalYearStart: { type: Number, default: 1, min: 1, max: 12 },
    },
  },
  {
    timestamps: true,
  }
);

organisationSchema.index({ name: 1 });

export default mongoose.model<IOrganisation>('Organisation', organisationSchema);
