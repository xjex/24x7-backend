import mongoose, { Document, Schema } from 'mongoose'

export interface ITreatment extends Document {
  appointmentId: mongoose.Types.ObjectId
  diagnosis: string
  treatment: string
  prescription?: string
  followUpRequired: boolean
  followUpDate?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const TreatmentSchema: Schema = new Schema({
  appointmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Appointment',
    required: [true, 'Appointment ID is required'],
    unique: true
  },
  diagnosis: {
    type: String,
    required: [true, 'Diagnosis is required'],
    trim: true,
    maxlength: [500, 'Diagnosis cannot exceed 500 characters']
  },
  treatment: {
    type: String,
    required: [true, 'Treatment description is required'],
    trim: true,
    maxlength: [1000, 'Treatment description cannot exceed 1000 characters']
  },
  prescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Prescription cannot exceed 500 characters']
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true
})

TreatmentSchema.index({ appointmentId: 1 }, { unique: true })
TreatmentSchema.index({ followUpRequired: 1, followUpDate: 1 })

export default mongoose.model<ITreatment>('Treatment', TreatmentSchema)