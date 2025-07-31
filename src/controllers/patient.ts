import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Patient from '../models/Patient';
import Dentist from '../models/Dentist';
import Service from '../models/Service';
import DentistService from '../models/DentistService';
import Appointment from '../models/Appointment';

export const getPatientProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?._id;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const patient = await Patient.findOne({ userId });
    
    const patientProfile = {
      ...user.toObject(),
      ...patient?.toObject()
    };

    res.status(200).json({
      success: true,
      patient: patientProfile
    });
  } catch (error) {
    next(error);
  }
};

export const updatePatientProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?._id;
    const { name, email, phone, birthdate, gender, address } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { name, email },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let patient = await Patient.findOne({ userId });
    
    if (!patient) {
      patient = new Patient({
        userId,
        phone,
        birthdate,
        gender,
        address
      });
    } else {
      patient.phone = phone || patient.phone;
      patient.birthdate = birthdate || patient.birthdate;
      patient.gender = gender || patient.gender;
      patient.address = address || patient.address;
    }

    await patient.save();

    const patientProfile = {
      ...user.toObject(),
      ...patient.toObject()
    };

    res.status(200).json({
      success: true,
      patient: patientProfile
    });
  } catch (error) {
    next(error);
  }
};

export const getPatientAppointments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?._id;

    const appointments = await Appointment.find({ patientId: userId })
      .populate({
        path: 'dentistId',
        model: 'User',
        select: 'name email',
        populate: {
          path: '_id',
          model: 'Dentist',
          select: 'specialization licenseNumber'
        }
      })
      .populate({
        path: 'serviceId',
        model: 'Service',
        select: 'name category description defaultDuration defaultPrice'
      })
      .sort({ date: -1, time: -1 });

    res.status(200).json({
      success: true,
      appointments
    });
  } catch (error) {
    next(error);
  }
};

export const cancelAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appointmentId } = req.params;
    const userId = (req.user as any)?._id;

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patientId: userId
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel this appointment'
      });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const rescheduleAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appointmentId } = req.params;
    const { date, time } = req.body;
    const userId = (req.user as any)?._id;

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patientId: userId
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot reschedule this appointment'
      });
    }

    appointment.date = date;
    appointment.time = time;
    appointment.status = 'pending';
    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment
    });
  } catch (error) {
    next(error);
  }
};

export const getAvailableDentists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dentistUsers = await User.find({ role: 'dentist' }).select('name email');
    const dentistIds = dentistUsers.map(user => user._id);
    
    const dentistProfiles = await Dentist.find({ userId: { $in: dentistIds } });

    const dentists = dentistUsers.map(user => {
      const profile = dentistProfiles.find(d => d.userId.toString() === (user._id as string).toString());
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        specialization: profile?.specialization || [],
        licenseNumber: profile?.licenseNumber || '',
        experience: profile?.experience || 0,
        bio: profile?.bio || '',
        consultationFee: profile?.consultationFee || 0,
        isAvailable: profile?.isActive ?? true
      };
    });

    res.status(200).json({
      success: true,
      dentists: dentists.filter(d => d.isAvailable)
    });
  } catch (error) {
    next(error);
  }
};

export const getAvailableServices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const services = await Service.find({ isActive: true })
      .select('name description category defaultDuration defaultPrice');

    const formattedServices = services.map(service => ({
      _id: service._id,
      name: service.name,
      description: service.description,
      category: service.category,
      duration: service.defaultDuration,
      price: service.defaultPrice
    }));

    res.status(200).json({
      success: true,
      services: formattedServices
    });
  } catch (error) {
    next(error);
  }
};

export const getAvailableSlots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dentistId, date } = req.query;

    if (!dentistId || !date) {
      return res.status(400).json({
        success: false,
        error: 'Dentist ID and date are required'
      });
    }

    const existingAppointments = await Appointment.find({
      dentistId,
      date: date as string,
      status: { $in: ['scheduled', 'confirmed'] }
    }).select('time duration');

    const workingHours = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
    ];

    const bookedTimes = existingAppointments.map(apt => apt.time);
    const availableSlots = workingHours
      .filter(time => !bookedTimes.includes(time))
      .map(time => ({
        date: date as string,
        time
      }));

    res.status(200).json({
      success: true,
      slots: availableSlots
    });
  } catch (error) {
    next(error);
  }
};

export const bookAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?._id;
    const { dentistId, serviceId, date, time, notes } = req.body;

    const existingAppointment = await Appointment.findOne({
      dentistId,
      date,
      time,
      status: { $in: ['scheduled', 'confirmed'] }
    });

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        error: 'This time slot is already booked'
      });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    const dentistService = await DentistService.findOne({
      dentistId,
      serviceId,
      isActive: true
    });

    const duration = dentistService?.customDuration || service.defaultDuration;

    const appointment = new Appointment({
      patientId: userId,
      dentistId,
      serviceId,
      date,
      time,
      duration,
      status: 'scheduled',
      notes
    });

    await appointment.save();

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment
    });
  } catch (error) {
    next(error);
  }
};