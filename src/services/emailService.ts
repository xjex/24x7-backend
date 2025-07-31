import nodemailer from 'nodemailer';
import { IAppointment } from '../models/Appointment';
import { IUser } from '../models/User';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    };

    this.transporter = nodemailer.createTransport(config);
  }

  private formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  async sendNewAppointmentNotificationToDentist(
    dentistEmail: string,
    dentistName: string,
    appointment: any,
    patientName: string,
    serviceName: string
  ) {
    const subject = 'New Appointment Request - DentalCare+';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Appointment Request</h2>
        
        <p>Dear Dr. ${dentistName},</p>
        
        <p>You have received a new appointment request from <strong>${patientName}</strong>.</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Appointment Details</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Patient:</strong> ${patientName}</li>
            <li><strong>Service:</strong> ${serviceName}</li>
            <li><strong>Date:</strong> ${this.formatDate(appointment.date)}</li>
            <li><strong>Time:</strong> ${this.formatTime(appointment.time)}</li>
            <li><strong>Duration:</strong> ${appointment.duration} minutes</li>
            ${appointment.notes ? `<li><strong>Notes:</strong> ${appointment.notes}</li>` : ''}
          </ul>
        </div>
        
        <p>Please log in to your dashboard to review and approve this appointment.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dentist/appointments" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Review Appointment
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          Best regards,<br>
          DentalCare+ Team
        </p>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@dentalcare.com',
      to: dentistEmail,
      subject,
      html
    });
  }

  async sendAppointmentApprovedToPatient(
    patientEmail: string,
    patientName: string,
    appointment: any,
    dentistName: string,
    serviceName: string
  ) {
    const subject = 'Appointment Confirmed - DentalCare+';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Appointment Confirmed!</h2>
        
        <p>Dear ${patientName},</p>
        
        <p>Great news! Your appointment has been confirmed by Dr. ${dentistName}.</p>
        
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
          <h3 style="color: #374151; margin-top: 0;">Appointment Details</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Dentist:</strong> Dr. ${dentistName}</li>
            <li><strong>Service:</strong> ${serviceName}</li>
            <li><strong>Date:</strong> ${this.formatDate(appointment.date)}</li>
            <li><strong>Time:</strong> ${this.formatTime(appointment.time)}</li>
            <li><strong>Duration:</strong> ${appointment.duration} minutes</li>
          </ul>
        </div>
        
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;">
            <strong>Please arrive 15 minutes early</strong> for check-in and any necessary paperwork.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard/appointments" 
             style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View My Appointments
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          If you need to reschedule or cancel, please do so at least 24 hours in advance.<br><br>
          Best regards,<br>
          DentalCare+ Team
        </p>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@dentalcare.com',
      to: patientEmail,
      subject,
      html
    });
  }

  async sendAppointmentCompletedThankYou(
    patientEmail: string,
    patientName: string,
    appointment: any,
    dentistName: string,
    serviceName: string
  ) {
    const subject = 'Thank You for Your Visit - DentalCare+';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Thank You for Your Visit!</h2>
        
        <p>Dear ${patientName},</p>
        
        <p>Thank you for choosing DentalCare+ for your dental needs. We hope you had a positive experience with Dr. ${dentistName}.</p>
        
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Completed Appointment</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Service:</strong> ${serviceName}</li>
            <li><strong>Date:</strong> ${this.formatDate(appointment.date)}</li>
            <li><strong>Dentist:</strong> Dr. ${dentistName}</li>
          </ul>
        </div>
        
        <p>We would love to hear about your experience. Your feedback helps us improve our services.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/feedback?appointment=${appointment._id}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">
            Leave Feedback
          </a>
          <a href="${process.env.FRONTEND_URL}/dashboard/book" 
             style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Book Next Appointment
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          Thank you for trusting us with your dental care!<br><br>
          Best regards,<br>
          DentalCare+ Team
        </p>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@dentalcare.com',
      to: patientEmail,
      subject,
      html
    });
  }

  async sendNoShowRescheduleRequest(
    patientEmail: string,
    patientName: string,
    appointment: any,
    dentistName: string,
    serviceName: string
  ) {
    const subject = 'Missed Appointment - Reschedule Request';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Missed Appointment</h2>
        
        <p>Dear ${patientName},</p>
        
        <p>We noticed that you missed your scheduled appointment with Dr. ${dentistName} today. We understand that unexpected circumstances can arise.</p>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="color: #374151; margin-top: 0;">Missed Appointment</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Service:</strong> ${serviceName}</li>
            <li><strong>Date:</strong> ${this.formatDate(appointment.date)}</li>
            <li><strong>Time:</strong> ${this.formatTime(appointment.time)}</li>
            <li><strong>Dentist:</strong> Dr. ${dentistName}</li>
          </ul>
        </div>
        
        <p>Would you like to reschedule your appointment? We're here to help you maintain your dental health.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard/book" 
             style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Reschedule Appointment
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          If you have any questions or concerns, please don't hesitate to contact us.<br><br>
          Best regards,<br>
          DentalCare+ Team
        </p>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@dentalcare.com',
      to: patientEmail,
      subject,
      html
    });
  }

  async sendAppointmentCancellationConfirmation(
    patientEmail: string,
    patientName: string,
    appointment: any,
    dentistName: string,
    serviceName: string,
    cancelledBy: 'patient' | 'dentist'
  ) {
    const subject = 'Appointment Cancelled - DentalCare+';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Appointment Cancelled</h2>
        
        <p>Dear ${patientName},</p>
        
        <p>This is to confirm that your appointment has been cancelled ${cancelledBy === 'patient' ? 'as requested' : 'by Dr. ' + dentistName}.</p>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Cancelled Appointment</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Service:</strong> ${serviceName}</li>
            <li><strong>Date:</strong> ${this.formatDate(appointment.date)}</li>
            <li><strong>Time:</strong> ${this.formatTime(appointment.time)}</li>
            <li><strong>Dentist:</strong> Dr. ${dentistName}</li>
          </ul>
        </div>
        
        ${cancelledBy === 'dentist' ? 
          '<p style="color: #dc2626;"><strong>Note:</strong> This appointment was cancelled by your dentist. Please contact the office if you need clarification.</p>' : 
          '<p>We understand plans can change. We hope to see you again soon!</p>'
        }
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard/book" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Book New Appointment
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          If you have any questions, please don't hesitate to contact us.<br><br>
          Best regards,<br>
          DentalCare+ Team
        </p>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@dentalcare.com',
      to: patientEmail,
      subject,
      html
    });
  }
}

export default new EmailService();