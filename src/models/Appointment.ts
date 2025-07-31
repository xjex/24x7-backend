import mongoose, { Document, Schema } from 'mongoose';

export interface IAppointment extends Document {
  patientId: mongoose.Types.ObjectId;
  dentistId: mongoose.Types.ObjectId;
  serviceId?: mongoose.Types.ObjectId;
  date: string;
  time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema: Schema = new Schema({
  patientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Patient ID is required'],
    index: true
  },
  dentistId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Dentist ID is required'],
    index: true
  },
  serviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    index: true
  },
  date: {
    type: String,
    required: [true, 'Appointment date is required'],
    index: true
  },
  time: {
    type: String,
    required: [true, 'Appointment time is required'],
    index: true
  },
  duration: {
    type: Number,
    required: [true, 'Appointment duration is required'],
    min: [15, 'Duration must be at least 15 minutes'],
    max: [480, 'Duration cannot exceed 8 hours']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'pending',
    index: true
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    default: ''
  }
}, {
  timestamps: true
});

AppointmentSchema.index({ patientId: 1, appointmentDate: 1 });
AppointmentSchema.index({ dentistId: 1, appointmentDate: 1 });
AppointmentSchema.index({ appointmentDate: 1, status: 1 });
AppointmentSchema.index({ status: 1, appointmentDate: 1 });

export default mongoose.model<IAppointment>('Appointment', AppointmentSchema); 
