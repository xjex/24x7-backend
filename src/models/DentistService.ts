import mongoose, { Document, Schema } from 'mongoose';

export interface IDentistService extends Document {
  dentistId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  customPrice: number;
  customDuration: number; // in minutes
  isOffered: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const dentistServiceSchema: Schema = new Schema({
  dentistId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Dentist ID is required']
  },
  serviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service ID is required']
  },
  customPrice: {
    type: Number,
    required: [true, 'Custom price is required'],
    min: [0, 'Price cannot be negative']
  },
  customDuration: {
    type: Number,
    required: [true, 'Custom duration is required'],
    min: [15, 'Duration must be at least 15 minutes'],
    max: [480, 'Duration cannot exceed 8 hours']
  },
  isOffered: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [200, 'Notes cannot exceed 200 characters']
  }
}, {
  timestamps: true
});

dentistServiceSchema.index({ dentistId: 1, serviceId: 1 }, { unique: true });
dentistServiceSchema.index({ dentistId: 1 });
dentistServiceSchema.index({ serviceId: 1 });
dentistServiceSchema.index({ isOffered: 1 });

export default mongoose.model<IDentistService>('DentistService', dentistServiceSchema);