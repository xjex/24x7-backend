import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import passport from 'passport';
import User, { IUser } from '../models/User';
import { config } from '../config/config';
import { AuthRequest } from '../middleware/auth';

const generateToken = (id: string): string => {
  
  const secretBuffer = Buffer.from(config.jwtSecret);
  
  
  const options: SignOptions = { 
    expiresIn: '7d' 
  };
  
  return jwt.sign(
    { id }, 
    secretBuffer,
    options
  );
};

const sendTokenResponse = (user: IUser, statusCode: number, res: Response): void => {
  const token = generateToken((user._id as any).toString());
  
  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict' as const
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    });
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      firstName,
      lastName,
      email,
      password,
      phone,
      dateOfBirth,
      address,
      emergencyContact,
      medicalHistory
    } = req.body;

    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
      return;
    }

    
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      res.status(400).json({
        success: false,
        error: 'User already exists with this phone number'
      });
      return;
    }

    
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      dateOfBirth: new Date(dateOfBirth),
      address,
      emergencyContact,
      medicalHistory: medicalHistory || {
        allergies: [],
        medications: [],
        conditions: [],
        notes: ''
      }
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

export const login = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('local', { session: false }, (err: Error, user: IUser, info: any) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: info?.message || 'Invalid credentials'
      });
    }

    sendTokenResponse(user, 200, res);
  })(req, res, next);
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  res.status(200).json({
    success: true,
    user: authReq.user
  });
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const authReq = req as AuthRequest;
    
    if (!authReq.user || !authReq.user._id) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const fieldsToUpdate: any = {};
    const allowedFields = [
      'firstName',
      'lastName',
      'phone',
      'address',
      'emergencyContact',
      'medicalHistory'
    ];

    
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        fieldsToUpdate[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      authReq.user._id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const authReq = req as AuthRequest;
    
    if (!authReq.user || !authReq.user._id) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    
    const user = await User.findById(authReq.user._id).select('+password');
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    
    const isCurrentPasswordCorrect = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordCorrect) {
      res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
      return;
    }

    
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const { email } = req.body;

    const user = await User.findOne({ email });
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    
    
    
    
    
    res.status(200).json({
      success: true,
      message: 'Password reset email sent (simulated)',
      resetToken 
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    
    
    
    
    
    
    res.status(200).json({
      success: true,
      message: 'Password reset successfully (simulated)'
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: 'Refresh token is required'
      });
      return;
    }

    try {
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as { id: string };
      
      const user = await User.findById(decoded.id);
      
      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          error: 'Invalid refresh token'
        });
        return;
      }

      sendTokenResponse(user, 200, res);
    } catch (tokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }
  } catch (error) {
    next(error);
  }
}; 
