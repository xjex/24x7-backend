import express from 'express';
import { body, param, query } from 'express-validator';
import {
  getPatientProfile,
  updatePatientProfile,
  getPatientAppointments,
  cancelAppointment,
  rescheduleAppointment,
  getAvailableDentists,
  getAvailableServices,
  getDoctorAvailability,
  getAvailableSlots,
  bookAppointment
} from '../controllers/patient';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(authorize('patient'));

router.get('/profile', getPatientProfile);

router.put('/profile', [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('birthdate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  body('address')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Address cannot be empty'),
  body('emergencyContact.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Emergency contact name cannot be empty'),
  body('emergencyContact.phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid emergency contact phone number'),
  body('emergencyContact.relationship')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Emergency contact relationship cannot be empty')
], updatePatientProfile);

router.get('/appointments', getPatientAppointments);

router.patch('/appointments/:appointmentId/cancel', [
  param('appointmentId')
    .isMongoId()
    .withMessage('Invalid appointment ID')
], cancelAppointment);

router.patch('/appointments/:appointmentId/reschedule', [
  param('appointmentId')
    .isMongoId()
    .withMessage('Invalid appointment ID'),
  body('date')
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide a valid time in HH:MM format')
], rescheduleAppointment);

router.get('/dentists', getAvailableDentists);

router.get('/services', getAvailableServices);

router.get('/doctor-availability', [
  query('dentistId')
    .isMongoId()
    .withMessage('Invalid dentist ID'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid start date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid end date')
], getDoctorAvailability);

router.get('/available-slots', [
  query('dentistId')
    .isMongoId()
    .withMessage('Invalid dentist ID'),
  query('date')
    .isISO8601()
    .withMessage('Please provide a valid date')
], getAvailableSlots);

router.post('/appointments', [
  body('dentistId')
    .isMongoId()
    .withMessage('Invalid dentist ID'),
  body('serviceId')
    .isMongoId()
    .withMessage('Invalid service ID'),
  body('date')
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide a valid time in HH:MM format'),
  body('notes')
    .optional()
    .trim()
], bookAppointment);

export default router;