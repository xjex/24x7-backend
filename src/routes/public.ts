import express from 'express';
import { query } from 'express-validator';
import {
  getAvailableDentists,
  getAvailableServices,
  getDoctorAvailability,
  getAvailableSlots
} from '../controllers/patient';

const router = express.Router();

// Public routes - no authentication required
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

export default router;