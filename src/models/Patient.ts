import mongoose, { Document, Schema } from 'mongoose'

export interface IPatient extends Document {
  userId: mongoose.Types.ObjectId
  birthdate: Date
  gender: 'male' | 'female' | 'other'
  phone: string
  address: string
  createdAt: Date
  updatedAt: Date
}

const PatientSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  birthdate: {
    type: Date,
    required: [true, 'Birthdate is required']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: [true, 'Gender is required']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  }
}, {
  timestamps: true
})

PatientSchema.index({ userId: 1 }, { unique: true })
PatientSchema.index({ phone: 1 })

export default mongoose.model<IPatient>('Patient', PatientSchema)