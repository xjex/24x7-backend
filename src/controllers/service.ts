import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Service from '../models/Service';
import DentistService from '../models/DentistService';
import User from '../models/User';

// Service Management Functions
export const getAllServices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 10, category } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (category && category !== 'all') {
      filter.category = category;
    }

    const services = await Service.find(filter)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await Service.countDocuments(filter);

    res.status(200).json({
      success: true,
      services,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
      return;
    }

    const { name, description, category, defaultDuration, defaultPrice } = req.body;

    const existingService = await Service.findOne({ name });
    if (existingService) {
      res.status(409).json({
        success: false,
        message: 'Service with this name already exists'
      });
      return;
    }

    const service = await Service.create({
      name,
      description,
      category,
      defaultDuration,
      defaultPrice,
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: service,
      message: 'Service created successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const updateService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
      return;
    }

    const { id } = req.params;
    const { name, description, category, defaultDuration, defaultPrice, isActive } = req.body;

    if (name) {
      const existingService = await Service.findOne({ name, _id: { $ne: id } });
      if (existingService) {
        res.status(409).json({
          success: false,
          message: 'Service with this name already exists'
        });
        return;
      }
    }

    const service = await Service.findByIdAndUpdate(
      id,
      { name, description, category, defaultDuration, defaultPrice, isActive },
      { new: true, runValidators: true }
    );

    if (!service) {
      res.status(404).json({
        success: false,
        message: 'Service not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: service,
      message: 'Service updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id);
    if (!service) {
      res.status(404).json({
        success: false,
        message: 'Service not found'
      });
      return;
    }

    // Check if service is assigned to any dentists
    const assignedCount = await DentistService.countDocuments({ serviceId: id });
    if (assignedCount > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete service. It is currently assigned to dentists.'
      });
      return;
    }

    await Service.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const assignServiceToDentist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
      return;
    }

    const { dentistId, serviceId, customPrice, customDuration, notes } = req.body;

    // Verify dentist exists and has dentist role
    const dentist = await User.findOne({ _id: dentistId, role: 'dentist' });
    if (!dentist) {
      res.status(404).json({
        success: false,
        message: 'Dentist not found'
      });
      return;
    }

    // Verify service exists
    const service = await Service.findById(serviceId);
    if (!service) {
      res.status(404).json({
        success: false,
        message: 'Service not found'
      });
      return;
    }

    // Check if assignment already exists
    const existingAssignment = await DentistService.findOne({ dentistId, serviceId });
    if (existingAssignment) {
      res.status(409).json({
        success: false,
        message: 'Service is already assigned to this dentist'
      });
      return;
    }

    const dentistService = await DentistService.create({
      dentistId,
      serviceId,
      customPrice: customPrice || service.defaultPrice,
      customDuration: customDuration || service.defaultDuration,
      isOffered: true,
      notes: notes || ''
    });

    const populatedDentistService = await DentistService.findById(dentistService._id)
      .populate('serviceId', 'name description category')
      .populate('dentistId', 'name email');

    res.status(201).json({
      success: true,
      data: populatedDentistService,
      message: 'Service assigned to dentist successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getDentistServices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dentistId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Verify dentist exists
    const dentist = await User.findOne({ _id: dentistId, role: 'dentist' });
    if (!dentist) {
      res.status(404).json({
        success: false,
        message: 'Dentist not found'
      });
      return;
    }

    const dentistServices = await DentistService.find({ dentistId })
      .populate('serviceId', 'name description category defaultPrice defaultDuration')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await DentistService.countDocuments({ dentistId });

    res.status(200).json({
      success: true,
      services: dentistServices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const removeServiceFromDentist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dentistId, serviceId } = req.params;

    const dentistService = await DentistService.findOneAndDelete({ dentistId, serviceId });
    
    if (!dentistService) {
      res.status(404).json({
        success: false,
        message: 'Service assignment not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Service removed from dentist successfully'
    });
  } catch (error) {
    next(error);
  }
};