import mongoose, { Document, Schema } from 'mongoose';

export interface IService extends Document {
  name: string;
  description: string;
  category: string;
  defaultDuration: number; // in minutes
  defaultPrice: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [100, 'Service name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true,
    maxlength: [500, 'Service description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Service category is required'],
    enum: ['Preventive', 'Restorative', 'Cosmetic', 'Orthodontic', 'Surgical', 'Emergency', 'Consultation']
  },
  defaultDuration: {
    type: Number,
    required: [true, 'Default duration is required'],
    min: [15, 'Duration must be at least 15 minutes'],
    max: [480, 'Duration cannot exceed 8 hours']
  },
  defaultPrice: {
    type: Number,
    required: [true, 'Default price is required'],
    min: [0, 'Price cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

serviceSchema.index({ name: 1 });
serviceSchema.index({ category: 1 });
serviceSchema.index({ isActive: 1 });

export default mongoose.model<IService>('Service', serviceSchema);