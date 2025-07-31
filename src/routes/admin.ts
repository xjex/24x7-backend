import express from 'express';
import { body, query } from 'express-validator';
import {
  getAllUsers,
  getUserById,
  createDentistProfile,
  updateDentistProfile,
  deleteDentist,
  getUserStats,
  updateUserRole,
  deleteUser,
  getAllDentists,
  getAllPatients
} from '../controllers/admin';
import {
  getAllServices,
  createService,
  updateService,
  deleteService,
  assignServiceToDentist,
  getDentistServices,
  removeServiceFromDentist
} from '../controllers/service';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/users/stats', getUserStats);

router.get('/users', [
  query('role')
    .optional()
    .isIn(['patient', 'dentist', 'admin', 'all'])
    .withMessage('Role must be patient, dentist, admin, or all'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], getAllUsers);

router.get('/users/:id', getUserById);

router.get('/dentists', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], getAllDentists);

router.get('/patients', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], getAllPatients);

router.post('/dentists', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('licenseNumber')
    .trim()
    .notEmpty()
    .withMessage('License number is required'),
  body('specialization')
    .isArray({ min: 1 })
    .withMessage('At least one specialization is required'),
  body('specialization.*')
    .isIn([
      'General Dentistry',
      'Orthodontics',
      'Endodontics',
      'Periodontics',
      'Prosthodontics',
      'Oral Surgery',
      'Pediatric Dentistry',
      'Cosmetic Dentistry',
      'Implantology'
    ])
    .withMessage('Invalid specialization'),
  body('experience')
    .isInt({ min: 0 })
    .withMessage('Experience must be a non-negative integer'),
  body('consultationFee')
    .isFloat({ min: 0 })
    .withMessage('Consultation fee must be a non-negative number'),
  body('bio')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Bio cannot exceed 1000 characters'),
  body('education')
    .optional()
    .isArray()
    .withMessage('Education must be an array'),
  body('education.*.degree')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Degree is required'),
  body('education.*.university')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('University is required'),
  body('education.*.year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Year must be valid')
], createDentistProfile);

router.put('/dentists/:id', [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('licenseNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('License number cannot be empty'),
  body('specialization')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one specialization is required'),
  body('specialization.*')
    .optional()
    .isIn([
      'General Dentistry',
      'Orthodontics',
      'Endodontics',
      'Periodontics',
      'Prosthodontics',
      'Oral Surgery',
      'Pediatric Dentistry',
      'Cosmetic Dentistry',
      'Implantology'
    ])
    .withMessage('Invalid specialization'),
  body('experience')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Experience must be a non-negative integer'),
  body('consultationFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Consultation fee must be a non-negative number'),
  body('bio')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Bio cannot exceed 1000 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('education')
    .optional()
    .isArray()
    .withMessage('Education must be an array')
], updateDentistProfile);

router.delete('/dentists/:id', deleteDentist);

router.put('/users/:id/role', [
  body('role')
    .isIn(['patient', 'dentist', 'admin'])
    .withMessage('Role must be patient, dentist, or admin')
], updateUserRole);

router.delete('/users/:id', deleteUser);

// Service Management Routes
router.get('/services', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('category')
    .optional()
    .isIn(['all', 'Preventive', 'Restorative', 'Cosmetic', 'Orthodontic', 'Surgical', 'Emergency', 'Consultation'])
    .withMessage('Invalid category')
], getAllServices);

router.post('/services', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Service name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('category')
    .isIn(['Preventive', 'Restorative', 'Cosmetic', 'Orthodontic', 'Surgical', 'Emergency', 'Consultation'])
    .withMessage('Invalid category'),
  body('defaultDuration')
    .isInt({ min: 15, max: 480 })
    .withMessage('Duration must be between 15 and 480 minutes'),
  body('defaultPrice')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
], createService);

router.put('/services/:id', [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Service name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('category')
    .optional()
    .isIn(['Preventive', 'Restorative', 'Cosmetic', 'Orthodontic', 'Surgical', 'Emergency', 'Consultation'])
    .withMessage('Invalid category'),
  body('defaultDuration')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('Duration must be between 15 and 480 minutes'),
  body('defaultPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
], updateService);

router.delete('/services/:id', deleteService);

// Service Assignment Routes
router.post('/services/assign', [
  body('dentistId')
    .isMongoId()
    .withMessage('Invalid dentist ID'),
  body('serviceId')
    .isMongoId()
    .withMessage('Invalid service ID'),
  body('customPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Custom price must be a positive number'),
  body('customDuration')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('Custom duration must be between 15 and 480 minutes'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Notes cannot exceed 200 characters')
], assignServiceToDentist);

router.get('/dentists/:dentistId/services', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], getDentistServices);

router.delete('/dentists/:dentistId/services/:serviceId', removeServiceFromDentist);

export default router;