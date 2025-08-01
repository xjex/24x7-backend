import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/User';
import Patient from '../models/Patient';
import Dentist from '../models/Dentist';
import Appointment from '../models/Appointment';
import DentistService from '../models/DentistService';
import Service from '../models/Service';
import emailService from '../services/emailService';

import { AuthRequest } from '../middleware/auth';

// Get dentist profile
export const getDentistProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    const dentistProfile = await Dentist.findOne({ userId }).populate('userId', '-password');
    
    if (!dentistProfile) {
      res.status(404).json({
        success: false,
        message: 'Dentist profile not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: dentistProfile
    });
  } catch (error) {
    next(error);
  }
};

// Update working hours
export const updateWorkingHours = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;
    const { workingHours } = req.body;

    const dentist = await Dentist.findOne({ userId });
    if (!dentist) {
      res.status(404).json({
        success: false,
        message: 'Dentist profile not found'
      });
      return;
    }

    // Validate working hours format
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of daysOfWeek) {
      if (!workingHours[day]) {
        res.status(400).json({
          success: false,
          message: `Working hours for ${day} are required`
        });
        return;
      }

      const { start, end, isWorking } = workingHours[day];
      
      if (isWorking && (!start || !end)) {
        res.status(400).json({
          success: false,
          message: `Start and end times are required for working days`
        });
        return;
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (isWorking && (!timeRegex.test(start) || !timeRegex.test(end))) {
        res.status(400).json({
          success: false,
          message: `Invalid time format for ${day}. Use HH:MM format`
        });
        return;
      }

      // Validate that end time is after start time
      if (isWorking && start >= end) {
        res.status(400).json({
          success: false,
          message: `End time must be after start time for ${day}`
        });
        return;
      }
    }

    dentist.workingHours = workingHours;
    await dentist.save();

    res.status(200).json({
      success: true,
      data: dentist.workingHours,
      message: 'Working hours updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get working hours
export const getWorkingHours = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    const dentist = await Dentist.findOne({ userId });
    if (!dentist) {
      res.status(404).json({
        success: false,
        message: 'Dentist profile not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: dentist.workingHours
    });
  } catch (error) {
    next(error);
  }
};

// Update specific day availability
export const updateDayAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;
    const { date, timeSlots } = req.body;

    const dentist = await Dentist.findOne({ userId });
    if (!dentist) {
      res.status(404).json({
        success: false,
        message: 'Dentist profile not found'
      });
      return;
    }

    // Find existing availability for the date
    const existingAvailabilityIndex = dentist.availability.findIndex(
      (avail: any) => avail.date.toISOString().split('T')[0] === date
    );

    if (existingAvailabilityIndex >= 0) {
      // Update existing availability
      dentist.availability[existingAvailabilityIndex].timeSlots = timeSlots;
    } else {
      // Add new availability
      dentist.availability.push({
        date: new Date(date),
        timeSlots
      });
    }

    await dentist.save();

    res.status(200).json({
      success: true,
      message: 'Day availability updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update dentist profile
export const updateDentistProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;
    
    const { licenseNumber, specialization, experience, consultationFee, bio, education } = req.body;

    // Check if license number is already taken by another dentist
    if (licenseNumber) {
      const existingLicense = await Dentist.findOne({ 
        licenseNumber, 
        userId: { $ne: userId } 
      });
      
      if (existingLicense) {
        res.status(409).json({
          success: false,
          message: 'License number already exists'
        });
        return;
      }
    }

    const updatedProfile = await Dentist.findOneAndUpdate(
      { userId },
      { licenseNumber, specialization, experience, consultationFee, bio, education },
      { new: true, runValidators: true }
    ).populate('userId', '-password');

    if (!updatedProfile) {
      res.status(404).json({
        success: false,
        message: 'Dentist profile not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
};



// Get dentist's patients
export const getDentistPatients = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const dentistUserId = authReq.user?._id;

    // Get all appointments for this dentist to find associated patients
    const appointments = await Appointment.find({ dentistId: dentistUserId })
      .populate('patientId', '-password')
      .select('patientId');

    // Extract unique patient IDs
    const patientIds = [...new Set(appointments.map(apt => apt.patientId._id.toString()))];

    // Get detailed patient information
    const patients = await User.find({ 
      _id: { $in: patientIds },
      role: 'patient' 
    }).select('-password');

    // Get patient profiles
    const patientProfiles = await Patient.find({ 
      userId: { $in: patientIds } 
    });

    // Combine user data with profile data and appointment stats
    const patientsWithDetails = await Promise.all(
      patients.map(async (patient) => {
        const profile = patientProfiles.find(p => p.userId.toString() === (patient._id as string).toString());
        
        // Get appointment stats for this patient
        const patientAppointments = await Appointment.find({ 
          patientId: patient._id,
          dentistId: dentistUserId 
        });

        const lastVisit = patientAppointments
          .filter(apt => apt.status === 'completed')
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        return {
          ...patient.toObject(),
          profile: profile ? {
            phone: profile.phone,
            birthdate: profile.birthdate,
            gender: profile.gender,
            address: profile.address
          } : null,
          totalAppointments: patientAppointments.length,
          lastVisit: lastVisit ? lastVisit.date : null
        };
      })
    );

    res.status(200).json({
      success: true,
      patients: patientsWithDetails
    });
  } catch (error) {
    next(error);
  }
};

// Get dentist's appointments
export const getDentistAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const dentistUserId = authReq.user?._id;
    const { date, status } = req.query;

    const filter: any = { dentistId: dentistUserId };
    
    if (date) {
      filter.date = date;
    }
    if (status) {
      filter.status = status;
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId', '-password')
      .populate('serviceId', 'name category description')
      .sort({ date: 1, time: 1 });

    res.status(200).json({
      success: true,
      appointments
    });
  } catch (error) {
    next(error);
  }
};

// Create appointment
export const createAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const authReq = req as AuthRequest;
    const dentistUserId = authReq.user?._id;
    const { patientId, serviceId, date, time, duration, notes } = req.body;

    // Verify patient exists
    const patient = await User.findOne({ _id: patientId, role: 'patient' });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
      return;
    }

    // Verify service exists and is offered by this dentist
    const dentistService = await DentistService.findOne({ 
      dentistId: dentistUserId, 
      serviceId, 
      isActive: true 
    });
    
    if (!dentistService) {
      res.status(400).json({
        success: false,
        message: 'Service not available for this dentist'
      });
      return;
    }

    // Check for conflicting appointments
    const conflictingAppointment = await Appointment.findOne({
      dentistId: dentistUserId,
      date,
      time,
      status: { $in: ['scheduled', 'confirmed'] }
    });

    if (conflictingAppointment) {
      res.status(409).json({
        success: false,
        message: 'Time slot already booked'
      });
      return;
    }

    const appointment = await Appointment.create({
      patientId,
      dentistId: dentistUserId,
      serviceId,
      date,
      time,
      duration: duration || dentistService.customDuration,
      status: 'scheduled',
      notes: notes || ''
    });

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', '-password')
      .populate('serviceId', 'name category description');

    res.status(201).json({
      success: true,
      data: populatedAppointment,
      message: 'Appointment created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update appointment
export const updateAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const authReq = req as AuthRequest;
    const dentistUserId = authReq.user?._id;
    const { appointmentId } = req.params;
    const { date, time, duration, notes } = req.body;

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      dentistId: dentistUserId
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
      return;
    }

    // Check for conflicting appointments if date/time is being changed
    if (date || time) {
      const conflictingAppointment = await Appointment.findOne({
        _id: { $ne: appointmentId },
        dentistId: dentistUserId,
        date: date || appointment.date,
        time: time || appointment.time,
        status: { $in: ['scheduled', 'confirmed'] }
      });

      if (conflictingAppointment) {
        res.status(409).json({
          success: false,
          message: 'Time slot already booked'
        });
        return;
      }
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { date, time, duration, notes },
      { new: true, runValidators: true }
    ).populate('patientId', '-password')
     .populate('serviceId', 'name category description');

    res.status(200).json({
      success: true,
      data: updatedAppointment,
      message: 'Appointment updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update appointment status
export const updateAppointmentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const authReq = req as AuthRequest;
    const dentistUserId = authReq.user?._id;
    const { appointmentId } = req.params;
    const { status } = req.body;

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      dentistId: dentistUserId
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
      return;
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status },
      { new: true, runValidators: true }
    ).populate('patientId', '-password')
     .populate('serviceId', 'name category description');

    // Send email notifications based on status change
    if (updatedAppointment) {
      try {
        const patient = updatedAppointment.patientId as any;
        const service = updatedAppointment.serviceId as any;
        const dentist = await User.findById(dentistUserId);

        if (patient && service && dentist) {
          switch (status) {
            case 'confirmed':
              await emailService.sendAppointmentApprovedToPatient(
                patient.email,
                patient.name,
                updatedAppointment,
                dentist.name,
                service.name
              );
              break;
            
            case 'completed':
              await emailService.sendAppointmentCompletedThankYou(
                patient.email,
                patient.name,
                updatedAppointment,
                dentist.name,
                service.name
              );
              break;
            
            case 'no-show':
              await emailService.sendNoShowRescheduleRequest(
                patient.email,
                patient.name,
                updatedAppointment,
                dentist.name,
                service.name
              );
              break;
            
            case 'cancelled':
              await emailService.sendAppointmentCancellationConfirmation(
                patient.email,
                patient.name,
                updatedAppointment,
                dentist.name,
                service.name,
                'dentist'
              );
              break;
          }
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the status update if email fails
      }
    }

    res.status(200).json({
      success: true,
      data: updatedAppointment,
      message: 'Appointment status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get dentist's services
export const getDentistServices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const dentistUserId = authReq.user?._id;

    const dentistServices = await DentistService.find({ dentistId: dentistUserId })
      .populate('serviceId', 'name description category defaultPrice defaultDuration')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      services: dentistServices
    });
  } catch (error) {
    next(error);
  }
};