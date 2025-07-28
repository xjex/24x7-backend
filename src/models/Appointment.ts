import mongoose, { Document, Schema } from 'mongoose';

export interface IAppointment extends Document {
  patient: mongoose.Types.ObjectId;
  dentist: mongoose.Types.ObjectId;
  appointmentDate: Date;
  timeSlot: {
    start: string;
    end: string;
  };
  serviceType: string;
  description: string;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  duration: number; 
  fee: number;
  isPaid: boolean;
  paymentMethod?: string;
  paymentId?: string;
  notes: {
    patientNotes: string;
    dentistNotes: string;
    officeNotes: string;
  };
  remindersSent: {
    email: boolean;
    sms: boolean;
    lastEmailSent?: Date;
    lastSmsSent?: Date;
  };
  followUpRequired: boolean;
  followUpDate?: Date;
  cancellationReason?: string;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  rescheduledFrom?: mongoose.Types.ObjectId;
  rescheduledTo?: mongoose.Types.ObjectId;
  rescheduledReason?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  canBeCancelled(): boolean;
  canBeRescheduled(): boolean;
  getStatusColor(): string;
}

const AppointmentSchema: Schema = new Schema({
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Patient is required'],
    index: true
  },
  dentist: {
    type: Schema.Types.ObjectId,
    ref: 'Dentist',
    required: [true, 'Dentist is required'],
    index: true
  },
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required'],
    index: true
  },
  timeSlot: {
    start: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM']
    },
    end: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM']
    }
  },
  serviceType: {
    type: String,
    required: [true, 'Service type is required'],
    enum: [
      'Consultation',
      'Cleaning',
      'Filling',
      'Root Canal',
      'Crown',
      'Extraction',
      'Whitening',
      'Orthodontic Checkup',
      'Implant Consultation',
      'Emergency',
      'Follow-up',
      'Other'
    ]
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [15, 'Minimum appointment duration is 15 minutes'],
    max: [480, 'Maximum appointment duration is 8 hours']
  },
  fee: {
    type: Number,
    required: [true, 'Fee is required'],
    min: [0, 'Fee cannot be negative']
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'insurance', 'bank_transfer', 'other']
  },
  paymentId: {
    type: String
  },
  notes: {
    patientNotes: {
      type: String,
      maxlength: [1000, 'Patient notes cannot exceed 1000 characters'],
      default: ''
    },
    dentistNotes: {
      type: String,
      maxlength: [1000, 'Dentist notes cannot exceed 1000 characters'],
      default: ''
    },
    officeNotes: {
      type: String,
      maxlength: [1000, 'Office notes cannot exceed 1000 characters'],
      default: ''
    }
  },
  remindersSent: {
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    lastEmailSent: { type: Date },
    lastSmsSent: { type: Date }
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  cancellationReason: {
    type: String,
    maxlength: [200, 'Cancellation reason cannot exceed 200 characters']
  },
  cancelledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: {
    type: Date
  },
  rescheduledFrom: {
    type: Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  rescheduledTo: {
    type: Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  rescheduledReason: {
    type: String,
    maxlength: [200, 'Reschedule reason cannot exceed 200 characters']
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

AppointmentSchema.index({ patient: 1, appointmentDate: 1 });
AppointmentSchema.index({ dentist: 1, appointmentDate: 1 });
AppointmentSchema.index({ appointmentDate: 1, status: 1 });
AppointmentSchema.index({ status: 1, appointmentDate: 1 });

AppointmentSchema.pre<IAppointment>('save', function(next) {
  if (this.isNew && this.appointmentDate < new Date()) {
    return next(new Error('Appointment date must be in the future'));
  }
  next();
});

AppointmentSchema.pre<IAppointment>('save', function(next) {
  const startTime = this.timeSlot.start.split(':').map(Number);
  const endTime = this.timeSlot.end.split(':').map(Number);
  
  const startMinutes = startTime[0] * 60 + startTime[1];
  const endMinutes = endTime[0] * 60 + endTime[1];
  
  if (endMinutes <= startMinutes) {
    return next(new Error('End time must be after start time'));
  }
  next();
});

AppointmentSchema.virtual('formattedDuration').get(function(this: IAppointment) {
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
});

AppointmentSchema.virtual('fullDateTime').get(function(this: IAppointment) {
  const date = this.appointmentDate.toDateString();
  return `${date} at ${this.timeSlot.start} - ${this.timeSlot.end}`;
});

AppointmentSchema.methods.canBeCancelled = function(this: IAppointment) {
  const now = new Date();
  const appointmentDateTime = new Date(this.appointmentDate);
  const [hours, minutes] = this.timeSlot.start.split(':').map(Number);
  appointmentDateTime.setHours(hours, minutes);
  
  
  const timeDiff = appointmentDateTime.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 3600);
  
  return hoursDiff > 24 && !['cancelled', 'completed', 'no-show'].includes(this.status);
};

AppointmentSchema.methods.canBeRescheduled = function(this: IAppointment) {
  return this.canBeCancelled();
};

AppointmentSchema.methods.getStatusColor = function(this: IAppointment) {
  const statusColors: Record<string, string> = {
    scheduled: '#3B82F6',    
    confirmed: '#10B981',    
    'in-progress': '#F59E0B', 
    completed: '#059669',     
    cancelled: '#EF4444',     
    'no-show': '#6B7280'      
  };
  return statusColors[this.status] || '#6B7280';
};

export default mongoose.model<IAppointment>('Appointment', AppointmentSchema); 
