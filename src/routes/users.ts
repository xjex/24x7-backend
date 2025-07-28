import express from 'express';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin'), (req, res) => {
  res.json({ success: true, message: 'Get users endpoint' });
});

router.get('/:id', (req, res) => {
  res.json({ success: true, message: `Get user ${req.params.id}` });
});

export default router; 
