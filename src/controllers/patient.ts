import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Patient from '../models/Patient';
import Dentist from '../models/Dentist';
import Service from '../models/Service';
import DentistService from '../models/DentistService';
import Appointment from '../models/Appointment';
import emailService from '../services/emailService';

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
        select: 'name email'
      })
      .populate({
        path: 'serviceId',
        model: 'Service',
        select: 'name category description defaultDuration defaultPrice'
      })
      .sort({ date: -1, time: -1 });



    const dentistIds = appointments.map(apt => (apt.dentistId as any)?._id).filter(Boolean);
    const dentistProfiles = await Dentist.find({ userId: { $in: dentistIds } });

    const appointmentsWithDentistData = appointments.map(appointment => {
      const dentistUser = appointment.dentistId as any;
      const dentistProfile = dentistProfiles.find(
        profile => profile.userId.toString() === dentistUser?._id?.toString()
      );
      
      return {
        ...appointment.toObject(),
        dentistId: dentistUser ? {
          _id: dentistUser._id,
          name: dentistUser.name || 'Unknown',
          email: dentistUser.email || '',
          specialization: dentistProfile?.specialization || [],
          licenseNumber: dentistProfile?.licenseNumber || ''
        } : null
      };
    });

    res.status(200).json({
      success: true,
      appointments: appointmentsWithDentistData
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

    // Send cancellation email to patient
    try {
      const patient = await User.findById(userId);
      const dentist = await User.findById(appointment.dentistId);
      const service = await Service.findById(appointment.serviceId);
      
      if (patient && dentist && service) {
        await emailService.sendAppointmentCancellationConfirmation(
          patient.email,
          patient.name,
          appointment,
          dentist.name,
          service.name,
          'patient'
        );
      }
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
      // Don't fail the cancellation if email fails
    }

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

   
    const oldDate = appointment.date;
    const oldTime = appointment.time;

    appointment.date = date;
    appointment.time = time;
    appointment.status = 'pending';
    await appointment.save();


    try {
      const patient = await User.findById(userId);
      const dentist = await User.findById(appointment.dentistId);
      const service = await Service.findById(appointment.serviceId);
      
      if (patient && dentist && service) {
        // Send notification to dentist
        await emailService.sendAppointmentRescheduledNotificationToDentist(
          dentist.email,
          dentist.name,
          appointment,
          patient.name,
          service.name,
          oldDate,
          oldTime
        );

       
        await emailService.sendAppointmentRescheduledConfirmationToPatient(
          patient.email,
          patient.name,
          appointment,
          dentist.name,
          service.name,
          oldDate,
          oldTime
        );
      }
    } catch (emailError) {
      console.error('Failed to send reschedule email notifications:', emailError);
      
    }

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

export const getDoctorAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dentistId, startDate, endDate } = req.query;

    if (!dentistId) {
      return res.status(400).json({
        success: false,
        error: 'Dentist ID is required'
      });
    }

    const dentist = await Dentist.findOne({ userId: dentistId });
    if (!dentist) {
      return res.status(404).json({
        success: false,
        error: 'Dentist not found'
      });
    }

  
    const start = startDate ? new Date(startDate as string) : new Date();
    const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const availabilityData = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

      const workingDay = dentist.workingHours[dayName as keyof typeof dentist.workingHours];
      
      if (!workingDay?.isWorking) {
        availabilityData.push({
          date: dateStr,
          status: 'unavailable',
          reason: 'Not working',
          timeSlots: []
        });
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const existingAppointments = await Appointment.find({
        dentistId,
        date: dateStr,
        status: { $in: ['pending', 'confirmed'] }
      }).select('time duration');

      const timeSlots = generateTimeSlots(workingDay.start, workingDay.end);
      const bookedTimes = existingAppointments.map(apt => apt.time);
 
      const formattedSlots = timeSlots.map(slot => {
        const isBooked = bookedTimes.includes(slot);
        return {
          time24: slot,
          time12: convertTo12Hour(slot),
          isAvailable: !isBooked,
          isBooked
        };
      });

      const availableCount = formattedSlots.filter(slot => slot.isAvailable).length;
      const totalSlots = formattedSlots.length;

      let status = 'available';
      if (availableCount === 0) {
        status = 'fully-booked';
      } else if (availableCount <= totalSlots * 0.3) {
        status = 'limited';
      }

      availabilityData.push({
        date: dateStr,
        status,
        availableSlots: availableCount,
        totalSlots,
        timeSlots: formattedSlots
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.status(200).json({
      success: true,
      availability: availabilityData
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

    // Get dentist working hours for the specific date
    const dentist = await Dentist.findOne({ userId: dentistId });
    if (!dentist) {
      return res.status(404).json({
        success: false,
        error: 'Dentist not found'
      });
    }

    const requestDate = new Date(date as string);
    const dayName = requestDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const workingDay = dentist.workingHours[dayName as keyof typeof dentist.workingHours];

    if (!workingDay?.isWorking) {
      return res.status(200).json({
        success: true,
        slots: [],
        message: 'Dentist not available on this day'
      });
    }

    const existingAppointments = await Appointment.find({
      dentistId,
      date: date as string,
      status: { $in: ['pending', 'confirmed'] }
    }).select('time duration');

   
    const timeSlots = generateTimeSlots(workingDay.start, workingDay.end);
    const bookedTimes = existingAppointments.map(apt => apt.time);
    
    const availableSlots = timeSlots
      .filter(time => !bookedTimes.includes(time))
      .map(time => ({
        date: date as string,
        time24: time,
        time12: convertTo12Hour(time)
      }));

    res.status(200).json({
      success: true,
      slots: availableSlots
    });
  } catch (error) {
    next(error);
  }
};

function generateTimeSlots(startTime: string, endTime: string): string[] {
  const slots = [];
  const start = convertTimeToMinutes(startTime);
  const end = convertTimeToMinutes(endTime);
  
  for (let time = start; time < end; time += 30) {
    slots.push(convertMinutesToTime(time));
  }
  
  return slots;
}

function convertTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function convertMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function convertTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export const bookAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?._id;
    const { dentistId, serviceId, date, time, notes } = req.body;

    console.log('Booking attempt:', { userId, dentistId, serviceId, date, time, notes });

    // Check if this user already has a pending/confirmed appointment for the same slot
    const userExistingAppointment = await Appointment.findOne({
      patientId: userId,
      dentistId,
      date,
      time,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (userExistingAppointment) {
      console.log('User already has appointment at this slot:', userExistingAppointment._id);
      return res.status(409).json({
        success: false,
        error: 'You already have an appointment at this time slot'
      });
    }

    // Check if any other user has this time slot
    const existingAppointment = await Appointment.findOne({
      dentistId,
      date,
      time,
      status: { $in: ['pending', 'confirmed'] }
    });

    console.log('Existing appointment check:', existingAppointment);

    if (existingAppointment) {
      console.log('Conflict detected with:', {
        existingId: existingAppointment._id,
        existingPatient: existingAppointment.patientId,
        existingStatus: existingAppointment.status,
        requestingUser: userId,
        isSameUser: existingAppointment.patientId.toString() === userId.toString()
      });
      
      if (existingAppointment.patientId.toString() === userId.toString()) {
        return res.status(409).json({
          success: false,
          error: 'You already have an appointment at this time slot'
        });
      } else {
        return res.status(409).json({
          success: false,
          error: 'This time slot is already booked'
        });
      }
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
      status: 'pending',
      notes
    });

    console.log('Creating appointment:', appointment.toObject());
    await appointment.save();
    console.log('Appointment created successfully:', appointment._id);

    // Get patient and dentist details for email
    const patient = await User.findById(userId);
    const dentist = await User.findById(dentistId);
    
    if (patient && dentist) {
      try {
        // Send notification to dentist about new appointment
        await emailService.sendNewAppointmentNotificationToDentist(
          dentist.email,
          dentist.name,
          appointment,
          patient.name,
          service.name
        );
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the appointment creation if email fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment
    });
  } catch (error) {
    next(error);
  }
};