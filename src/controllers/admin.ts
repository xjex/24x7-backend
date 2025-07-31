import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/User';
import Patient from '../models/Patient';
import Dentist from '../models/Dentist';
import Service from '../models/Service';
import DentistService from '../models/DentistService';
import { AuthRequest } from '../middleware/auth';

export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    
    const filter: any = {};
    if (role && role !== 'all') {
      filter.role = role;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const users = await User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      users,
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

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-password');
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    let profileData = null;
    if (user.role === 'patient') {
      profileData = await Patient.findOne({ userId: user._id });
    } else if (user.role === 'dentist') {
      profileData = await Dentist.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      user: {
        ...user.toObject(),
        profile: profileData
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createDentistProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }

    const {
      name,
      email,
      password,
      licenseNumber,
      specialization,
      experience,
      education,
      bio,
      consultationFee
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
      return;
    }

    const existingLicense = await Dentist.findOne({ licenseNumber });
    if (existingLicense) {
      res.status(400).json({
        success: false,
        error: 'License number already exists'
      });
      return;
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'dentist',
      isActive: true
    });

    const dentist = await Dentist.create({
      userId: user._id,
      licenseNumber,
      specialization,
      experience,
      education: education || [],
      bio: bio || '',
      consultationFee,
      rating: 0,
      totalReviews: 0,
      isActive: true
    });

    res.status(201).json({
      success: true,
      user: {
        ...user.toObject(),
        profile: dentist
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateDentistProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }

    const { id } = req.params;
    const {
      name,
      licenseNumber,
      specialization,
      experience,
      education,
      bio,
      consultationFee,
      isActive
    } = req.body;

    const user = await User.findById(id);
    if (!user || user.role !== 'dentist') {
      res.status(404).json({
        success: false,
        error: 'Dentist not found'
      });
      return;
    }

    const dentist = await Dentist.findOne({ userId: id });
    if (!dentist) {
      res.status(404).json({
        success: false,
        error: 'Dentist profile not found'
      });
      return;
    }

    if (licenseNumber && licenseNumber !== dentist.licenseNumber) {
      const existingLicense = await Dentist.findOne({ licenseNumber });
      if (existingLicense) {
        res.status(400).json({
          success: false,
          error: 'License number already exists'
        });
        return;
      }
    }

    if (name) {
      await User.findByIdAndUpdate(id, { name }, { new: true, runValidators: true });
    }

    const dentistUpdateFields: any = {};
    if (licenseNumber) dentistUpdateFields.licenseNumber = licenseNumber;
    if (specialization) dentistUpdateFields.specialization = specialization;
    if (experience !== undefined) dentistUpdateFields.experience = experience;
    if (education) dentistUpdateFields.education = education;
    if (bio !== undefined) dentistUpdateFields.bio = bio;
    if (consultationFee !== undefined) dentistUpdateFields.consultationFee = consultationFee;
    if (isActive !== undefined) dentistUpdateFields.isActive = isActive;

    const updatedDentist = await Dentist.findOneAndUpdate(
      { userId: id },
      dentistUpdateFields,
      { new: true, runValidators: true }
    );

    const updatedUser = await User.findById(id).select('-password');

    res.status(200).json({
      success: true,
      user: {
        ...updatedUser?.toObject(),
        profile: updatedDentist
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDentist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user || user.role !== 'dentist') {
      res.status(404).json({
        success: false,
        error: 'Dentist not found'
      });
      return;
    }

    await Dentist.findOneAndDelete({ userId: id });
    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Dentist deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getUserStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const totalDentists = await User.countDocuments({ role: 'dentist' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const activeUsers = await User.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalPatients,
        totalDentists,
        totalAdmins,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }

    const { id } = req.params;
    const { role } = req.body;

    const authReq = req as AuthRequest;
    if (authReq.user && (authReq.user._id as any).toString() === id) {
      res.status(400).json({
        success: false,
        error: 'Cannot change your own role'
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const authReq = req as AuthRequest;
    if (authReq.user && (authReq.user._id as any).toString() === id) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    if (user.role === 'patient') {
      await Patient.findOneAndDelete({ userId: id });
    } else if (user.role === 'dentist') {
      await Dentist.findOneAndDelete({ userId: id });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getAllDentists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const dentists = await User.find({ role: 'dentist' })
      .select('-password')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const dentistIds = dentists.map(user => user._id);
    const dentistProfiles = await Dentist.find({ userId: { $in: dentistIds } });

    const dentistsWithProfiles = dentists.map(user => {
      const profile = dentistProfiles.find(p => p.userId.toString() === (user._id as string).toString());
      return {
        ...user.toObject(),
        profile: profile ? {
          licenseNumber: profile.licenseNumber,
          specialization: profile.specialization,
          experience: profile.experience,
          consultationFee: profile.consultationFee,
          bio: profile.bio,
          education: profile.education,
          isActive: profile.isActive,
          joinedDate: profile.joinedDate
        } : null
      };
    });

    const total = await User.countDocuments({ role: 'dentist' });

    res.status(200).json({
      success: true,
      dentists: dentistsWithProfiles,
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

export const getAllPatients = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const patients = await User.find({ role: 'patient' })
      .select('-password')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const patientIds = patients.map(user => user._id);
    const patientProfiles = await Patient.find({ userId: { $in: patientIds } });

    const patientsWithProfiles = patients.map(user => {
      const profile = patientProfiles.find(p => p.userId.toString() === (user._id as string).toString());
      return {
        ...user.toObject(),
        profile: profile ? {
          phone: profile.phone,
          birthdate: profile.birthdate,
          gender: profile.gender,
          address: profile.address
        } : null
      };
    });

    const total = await User.countDocuments({ role: 'patient' });

    res.status(200).json({
      success: true,
      patients: patientsWithProfiles,
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