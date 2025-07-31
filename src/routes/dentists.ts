import express from 'express';
import { body, param } from 'express-validator';
import {
  getDentistProfile,
  updateDentistProfile,
  getDentistPatients,
  getDentistAppointments,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  getDentistServices
} from '../controllers/dentist';
import { protect, authorize } from '../middleware/auth';
import User from '../models/User';
import Patient from '../models/Patient';

const router = express.Router();

// Apply authentication and authorization middleware
router.use(protect);
router.use(authorize('dentist'));

// Profile routes
router.get('/profile', getDentistProfile);

router.put('/profile', [
  body('licenseNumber')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('License number must be between 3 and 50 characters'),
  body('specialization')
    .optional()
    .isArray()
    .withMessage('Specialization must be an array'),
  body('experience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be between 0 and 50 years'),
  body('consultationFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Consultation fee must be a positive number'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio cannot exceed 1000 characters'),
  body('education')
    .optional()
    .isArray()
    .withMessage('Education must be an array')
], updateDentistProfile);



// Patient routes
router.get('/patients', getDentistPatients);

// All patients route (for patient selection during scheduling)
router.get('/all-patients', async (req, res, next) => {
  try {
    // Get all patients with basic info
    const allPatients = await User.find({ role: 'patient' })
      .select('-password')
      .sort({ name: 1 });

    // Get patient profiles
    const patientProfiles = await Patient.find({});

    // Combine user data with profile data
    const patientsWithProfiles = allPatients.map((patient: any) => {
      const profile = patientProfiles.find((p: any) => p.userId.toString() === patient._id.toString());
      return {
        ...patient.toObject(),
        profile: profile ? {
          phone: profile.phone,
          birthdate: profile.birthdate,
          gender: profile.gender,
          address: profile.address
        } : null
      };
    });

    res.status(200).json({
      success: true,
      patients: patientsWithProfiles
    });
  } catch (error) {
    next(error);
  }
});

// Service routes
router.get('/services', getDentistServices);

// Appointment routes
router.get('/appointments', getDentistAppointments);

router.post('/appointments', [
  body('patientId')
    .isMongoId()
    .withMessage('Invalid patient ID'),
  body('serviceId')
    .isMongoId()
    .withMessage('Invalid service ID'),
  body('date')
    .isISO8601()
    .withMessage('Invalid date format'),
  body('time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format (HH:MM)'),
  body('duration')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('Duration must be between 15 and 480 minutes'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
], createAppointment);

router.put('/appointments/:appointmentId', [
  param('appointmentId')
    .isMongoId()
    .withMessage('Invalid appointment ID'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format (HH:MM)'),
  body('duration')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('Duration must be between 15 and 480 minutes'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
], updateAppointment);

router.put('/appointments/:appointmentId/status', [
  param('appointmentId')
    .isMongoId()
    .withMessage('Invalid appointment ID'),
  body('status')
            .isIn(['pending', 'confirmed', 'completed', 'cancelled', 'no-show'])
    .withMessage('Invalid appointment status')
], updateAppointmentStatus);

export default router;