import express from 'express';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, message: 'Get dentists endpoint' });
});

router.get('/:id', (req, res) => {
  res.json({ success: true, message: `Get dentist ${req.params.id}` });
});

router.post('/', protect, authorize('admin'), (req, res) => {
  res.json({ success: true, message: 'Create dentist endpoint' });
});

export default router; 
