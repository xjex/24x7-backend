import mongoose, { Document, Schema } from 'mongoose';

export interface IDentist extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  specialization: string[];
  experience: number;
  education: {
    degree: string;
    university: string;
    year: number;
  }[];
  bio: string;
  profileImage?: string;
  workingHours: {
    [key: string]: {
      start: string;
      end: string;
      isWorking: boolean;
    };
  };
  availability: {
    date: Date;
    timeSlots: {
      start: string;
      end: string;
      isAvailable: boolean;
    }[];
  }[];
  consultationFee: number;
  rating: number;
  totalReviews: number;
  isActive: boolean;
  joinedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DentistSchema: Schema = new Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true,
    trim: true
  },
  specialization: [{
    type: String,
    enum: [
      'General Dentistry',
      'Orthodontics',
      'Endodontics',
      'Periodontics',
      'Prosthodontics',
      'Oral Surgery',
      'Pediatric Dentistry',
      'Cosmetic Dentistry',
      'Implantology'
    ],
    required: true
  }],
  experience: {
    type: Number,
    required: [true, 'Years of experience is required'],
    min: [0, 'Experience cannot be negative']
  },
  education: [{
    degree: { type: String, required: true },
    university: { type: String, required: true },
    year: { type: Number, required: true }
  }],
  bio: {
    type: String,
    maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    default: ''
  },
  profileImage: {
    type: String,
    default: null
  },
  workingHours: {
    monday: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '17:00' },
      isWorking: { type: Boolean, default: true }
    },
    tuesday: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '17:00' },
      isWorking: { type: Boolean, default: true }
    },
    wednesday: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '17:00' },
      isWorking: { type: Boolean, default: true }
    },
    thursday: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '17:00' },
      isWorking: { type: Boolean, default: true }
    },
    friday: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '17:00' },
      isWorking: { type: Boolean, default: true }
    },
    saturday: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '13:00' },
      isWorking: { type: Boolean, default: false }
    },
    sunday: {
      start: { type: String, default: '00:00' },
      end: { type: String, default: '00:00' },
      isWorking: { type: Boolean, default: false }
    }
  },
  availability: [{
    date: { type: Date, required: true },
    timeSlots: [{
      start: { type: String, required: true },
      end: { type: String, required: true },
      isAvailable: { type: Boolean, default: true }
    }]
  }],
  consultationFee: {
    type: Number,
    required: [true, 'Consultation fee is required'],
    min: [0, 'Fee cannot be negative']
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  joinedDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

DentistSchema.index({ email: 1 });
DentistSchema.index({ licenseNumber: 1 });
DentistSchema.index({ specialization: 1 });
DentistSchema.index({ isActive: 1 });
DentistSchema.index({ rating: -1 });

DentistSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

DentistSchema.methods.getAvailableSlots = function(date: Date) {
  const dayAvailability = this.availability.find((avail: any) => 
    avail.date.toDateString() === date.toDateString()
  );
  
  if (!dayAvailability) return [];
  
  return dayAvailability.timeSlots.filter((slot: any) => slot.isAvailable);
};

DentistSchema.methods.updateAvailability = function(date: Date, timeSlot: string, isAvailable: boolean) {
  const dayAvailability = this.availability.find((avail: any) => 
    avail.date.toDateString() === date.toDateString()
  );
  
  if (dayAvailability) {
    const slot = dayAvailability.timeSlots.find((slot: any) => slot.start === timeSlot);
    if (slot) {
      slot.isAvailable = isAvailable;
    }
  }
};

export default mongoose.model<IDentist>('Dentist', DentistSchema); 
