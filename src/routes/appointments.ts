import express from 'express';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.get('/', (req, res) => {
  res.json({ success: true, message: 'Get appointments endpoint' });
});

router.post('/', (req, res) => {
  res.json({ success: true, message: 'Create appointment endpoint' });
});

router.get('/:id', (req, res) => {
  res.json({ success: true, message: `Get appointment ${req.params.id}` });
});

router.put('/:id', (req, res) => {
  res.json({ success: true, message: `Update appointment ${req.params.id}` });
});

router.delete('/:id', (req, res) => {
  res.json({ success: true, message: `Cancel appointment ${req.params.id}` });
});

export default router; 
