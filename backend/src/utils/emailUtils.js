const nodemailer = require('nodemailer');

/**
 * Create reusable transporter using env credentials
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Generate a 6-digit numeric OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP verification email (for signup)
 */
const sendOTPEmail = async (toEmail, otp) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"VALO Parking" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Email Verification OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1f2937; margin-bottom: 8px;">Email Verification</h2>
        <p style="color: #6b7280; margin-bottom: 24px;">Use the OTP below to verify your email address. It will expire in <strong>10 minutes</strong>.</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; letter-spacing: 8px; font-size: 32px; font-weight: bold; color: #111827;">
          ${otp}
        </div>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  });
};

/**
 * Send OTP for password reset
 */
const sendResetPasswordEmail = async (toEmail, otp) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"VALO Parking" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Reset Your Password — VALO Parking',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1f2937; margin-bottom: 8px;">Password Reset</h2>
        <p style="color: #6b7280; margin-bottom: 24px;">Use the OTP below to reset your password. It will expire in <strong>15 minutes</strong>.</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; letter-spacing: 8px; font-size: 32px; font-weight: bold; color: #111827;">
          ${otp}
        </div>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">If you did not request a password reset, please ignore this email.</p>
      </div>
    `,
  });
};

/**
 * Send Booking Confirmation Email
 */
const sendBookingConfirmationEmail = async (toEmail, bookingDetails) => {
  const transporter = createTransporter();
  const { bookingId, arrivalTime, parkingSlot, licensePlate } = bookingDetails;
  
  await transporter.sendMail({
    from: `"VALO Parking" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Booking Confirmed — VALO Parking',
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #050505; color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        
        <!-- Header Banner -->
        <div style="background: #000000; padding: 25px; text-align: center; border-bottom: 3px solid #FFDF00;">
          <img src="https://res.cloudinary.com/dlelhpfjn/image/upload/v1780239706/valo_parking/assets/xrgz2v4wkd84qyipa9p4.png" alt="VALO PARKING" style="max-height: 50px; width: auto; margin: 0 auto; display: block;" />
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #f1f5f9; margin-top: 0; margin-bottom: 16px; font-size: 20px;">Booking Confirmed! ✅</h2>
          <p style="color: #cbd5e1; line-height: 1.6; margin-bottom: 24px;">Thank you for choosing ValoParking. Your parking spot has been successfully reserved. Below are your booking details:</p>
          
          <div style="background-color: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155;">
            <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 14px;">BOOKING ID: <span style="color: #f1f5f9; font-weight: bold; float: right;">${bookingId}</span></p>
            <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 14px;">ARRIVAL TIME: <span style="color: #f1f5f9; font-weight: bold; float: right;">${arrivalTime}</span></p>
            <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 14px;">PARKING SLOT: <span style="color: #f1f5f9; font-weight: bold; float: right;">${parkingSlot}</span></p>
            <p style="margin: 0; color: #94a3b8; font-size: 14px;">LICENSE PLATE: <span style="color: #f1f5f9; font-weight: bold; float: right;">${licensePlate}</span></p>
          </div>
          
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${bookingId}&bgcolor=1e293b&color=60a5fa" alt="Booking QR Code" style="border-radius: 8px; border: 4px solid #3b82f6;" />
            <p style="color: #94a3b8; font-size: 13px; margin-top: 12px;">Scan this QR code at the Kiosk upon arrival.</p>
          </div>
          
          <p style="color: #94a3b8; font-size: 13px; text-align: center; border-top: 1px solid #334155; padding-top: 16px; margin: 0;">
            Need help? Reply to this email or visit our <a href="#" style="color: #60a5fa; text-decoration: none;">Help Center</a>.
          </p>
        </div>
      </div>
    `,
  });
};

/**
 * Send Booking Reminder Email
 */
const sendBookingReminderEmail = async (toEmail, bookingDetails) => {
  const transporter = createTransporter();
  const { bookingId, arrivalTime, parkingSlot } = bookingDetails;
  
  await transporter.sendMail({
    from: `"VALO Parking" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Action Required: Your Parking Reservation is Soon',
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #050505; color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        
        <!-- Header Banner -->
        <div style="background: #000000; padding: 25px; text-align: center; border-bottom: 3px solid #FFDF00;">
          <img src="https://res.cloudinary.com/dlelhpfjn/image/upload/v1780239706/valo_parking/assets/xrgz2v4wkd84qyipa9p4.png" alt="VALO PARKING" style="max-height: 50px; width: auto; margin: 0 auto; display: block;" />
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #f1f5f9; margin-top: 0; margin-bottom: 16px; font-size: 20px;">Upcoming Reservation ⏰</h2>
          <p style="color: #cbd5e1; line-height: 1.6; margin-bottom: 24px;">This is a friendly reminder that your parking reservation starts soon. Please plan to arrive on time to ensure a smooth check-in.</p>
          
          <div style="background-color: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155;">
            <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 14px;">BOOKING ID: <span style="color: #f1f5f9; font-weight: bold; float: right;">${bookingId}</span></p>
            <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 14px;">ARRIVAL TIME: <span style="color: #eab308; font-weight: bold; float: right;">${arrivalTime}</span></p>
            <p style="margin: 0; color: #94a3b8; font-size: 14px;">PARKING SLOT: <span style="color: #f1f5f9; font-weight: bold; float: right;">${parkingSlot}</span></p>
          </div>
          
          <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">If you need to change or cancel your booking, please do so via the ValoParking app at least 30 minutes prior to arrival.</p>
        </div>
      </div>
    `,
  });
};

/**
 * Send Booking Cancellation Email
 */
const sendBookingCancellationEmail = async (toEmail, bookingDetails) => {
  const transporter = createTransporter();
  const { bookingId, cancellationTime } = bookingDetails;
  
  await transporter.sendMail({
    from: `"VALO Parking" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Booking Cancelled — VALO Parking',
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #050505; color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        
        <!-- Header Banner -->
        <div style="background: #000000; padding: 25px; text-align: center; border-bottom: 3px solid #FFDF00;">
          <img src="https://res.cloudinary.com/dlelhpfjn/image/upload/v1780239706/valo_parking/assets/xrgz2v4wkd84qyipa9p4.png" alt="VALO PARKING" style="max-height: 50px; width: auto; margin: 0 auto; display: block;" />
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #f1f5f9; margin-top: 0; margin-bottom: 16px; font-size: 20px;">Booking Cancelled ❌</h2>
          <p style="color: #cbd5e1; line-height: 1.6; margin-bottom: 24px;">Your parking reservation has been successfully cancelled. If a refund is applicable based on our cancellation policy, it will be processed to your Valo wallet or original payment method shortly.</p>
          
          <div style="background-color: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155;">
            <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 14px;">BOOKING ID: <span style="color: #f1f5f9; font-weight: bold; float: right;">${bookingId}</span></p>
            <p style="margin: 0; color: #94a3b8; font-size: 14px;">CANCELLED AT: <span style="color: #f1f5f9; font-weight: bold; float: right;">${cancellationTime}</span></p>
          </div>
          
          <p style="color: #94a3b8; font-size: 13px; text-align: center; border-top: 1px solid #334155; padding-top: 16px; margin: 0;">
            We hope to see you again soon at ValoParking.
          </p>
        </div>
      </div>
    `,
  });
};

const sendKioskCheckInEmail = async (toEmail, checkInDetails) => {
  const transporter = createTransporter();
  const { sessionId, checkInTime, expectedCheckoutTime, duration, parkingSlot, licensePlate, vehicleType } = checkInDetails;
  
  await transporter.sendMail({
    from: `"VALO Parking" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Vehicle Checked In — VALO Parking',
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #050505; color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        
        <!-- Header Banner -->
        <div style="background: #000000; padding: 25px; text-align: center; border-bottom: 3px solid #FFDF00;">
          <img src="https://res.cloudinary.com/dlelhpfjn/image/upload/v1780239706/valo_parking/assets/xrgz2v4wkd84qyipa9p4.png" alt="VALO PARKING" style="max-height: 40px; width: auto; margin: 0 auto; display: block;" />
          <p style="color: #888; font-size: 14px; margin-top: 15px; margin-bottom: 0; letter-spacing: 1px; text-transform: uppercase;">Smart Kiosk Check-In</p>
        </div>

        <div style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #ffffff; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Check-In Successful <span style="font-size: 24px;">🏎️</span></h2>
            <p style="color: #a3a3a3; line-height: 1.6; margin: 0; font-size: 15px;">Your vehicle has successfully entered the parking lot. We'll keep it safe! Here are your session details:</p>
          </div>
          
          <!-- Details Card -->
          <div style="background-color: #121212; border-radius: 12px; padding: 25px; border: 1px solid #222;">
            
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; line-height: 2;">
              <tr>
                <td style="color: #888; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">Session ID</td>
                <td style="color: #ffffff; font-weight: bold; text-align: right; font-size: 16px;">#${sessionId}</td>
              </tr>
              <tr><td colspan="2"><hr style="border: 0; border-top: 1px dashed #333; margin: 12px 0;"></td></tr>
              
              <tr>
                <td style="color: #888; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">Check-In Time</td>
                <td style="color: #FFDF00; font-weight: bold; text-align: right;">${checkInTime}</td>
              </tr>
              <tr><td colspan="2"><hr style="border: 0; border-top: 1px dashed #333; margin: 12px 0;"></td></tr>
              
              ${expectedCheckoutTime ? `
              <tr>
                <td style="color: #888; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">Expected Checkout</td>
                <td style="color: #FFDF00; font-weight: bold; text-align: right;">${expectedCheckoutTime} <span style="color: #555; font-weight: normal; font-size: 12px;">(${duration} hrs)</span></td>
              </tr>
              <tr><td colspan="2"><hr style="border: 0; border-top: 1px dashed #333; margin: 12px 0;"></td></tr>
              ` : ''}

              <tr>
                <td style="color: #888; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">License Plate</td>
                <td style="color: #ffffff; font-weight: bold; text-align: right; font-size: 18px; letter-spacing: 1px;">${licensePlate}</td>
              </tr>
              <tr><td colspan="2"><hr style="border: 0; border-top: 1px dashed #333; margin: 12px 0;"></td></tr>
              
              <tr>
                <td style="color: #888; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">Vehicle Type</td>
                <td style="color: #ffffff; font-weight: bold; text-align: right; text-transform: capitalize;">${vehicleType}</td>
              </tr>
              <tr><td colspan="2"><hr style="border: 0; border-top: 1px dashed #333; margin: 12px 0;"></td></tr>
              
              <tr>
                <td style="color: #888; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">Parking Slot</td>
                <td style="color: #ffffff; font-weight: bold; text-align: right; font-size: 16px;">${parkingSlot}</td>
              </tr>
            </table>
            
          </div>
          
          <div style="text-align: center; margin-top: 40px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/customer/history" style="display: inline-block; background-color: #FFDF00; color: #000000; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 30px; letter-spacing: 1px; text-transform: uppercase; font-size: 14px;">View Live Session</a>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div style="background-color: #000000; padding: 20px; text-align: center;">
          <p style="color: #666; font-size: 12px; margin: 0;">© 2026 Valo Parking. All rights reserved.</p>
          <p style="color: #444; font-size: 11px; margin: 5px 0 0 0;">Need help? Reply to this email or visit our help center.</p>
        </div>
      </div>
    `,
  });
};

/**
 * Send Checkout Email
 */
const sendCheckoutEmail = async (toEmail, checkoutDetails) => {
  const transporter = createTransporter();
  const { sessionId, checkInTime, checkOutTime, duration, parkingSlot, licensePlate, vehicleType, totalPrice } = checkoutDetails;
  
  await transporter.sendMail({
    from: `"VALO Parking" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Checkout Successful — VALO Parking',
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #050505; color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        
        <!-- Header Banner -->
        <div style="background: #000000; padding: 25px; text-align: center; border-bottom: 3px solid #FFDF00;">
          <img src="https://res.cloudinary.com/dlelhpfjn/image/upload/v1780239706/valo_parking/assets/xrgz2v4wkd84qyipa9p4.png" alt="VALO PARKING" style="max-height: 40px; width: auto; margin: 0 auto; display: block;" />
          <p style="color: #888; font-size: 14px; margin-top: 15px; margin-bottom: 0; letter-spacing: 1px; text-transform: uppercase;">Smart Kiosk Checkout</p>
        </div>

        <div style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #ffffff; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Checkout Successful <span style="font-size: 24px;">🏁</span></h2>
            <p style="color: #a3a3a3; line-height: 1.6; margin: 0; font-size: 15px;">Your vehicle has successfully exited the parking lot. Thank you for using VALO Parking! We hope to see you again soon.</p>
          </div>
          
          <!-- Details Card -->
          <div style="background-color: #121212; border-radius: 12px; padding: 25px; border: 1px solid #222;">
            
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; line-height: 2;">
              <tr>
                <td style="color: #888; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">Session ID</td>
                <td style="color: #ffffff; font-weight: bold; text-align: right; font-size: 16px;">#${sessionId}</td>
              </tr>
              <tr><td colspan="2"><hr style="border: 0; border-top: 1px dashed #333; margin: 12px 0;"></td></tr>
              
              <tr>
                <td style="color: #888; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">Check-In Time</td>
                <td style="color: #ffffff; font-weight: bold; text-align: right;">${checkInTime}</td>
              </tr>
              <tr><td colspan="2"><hr style="border: 0; border-top: 1px dashed #333; margin: 12px 0;"></td></tr>
              
              <tr>
                <td style="color: #888; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">Check-Out Time</td>
                <td style="color: #ffffff; font-weight: bold; text-align: right;">${checkOutTime} <span style="color: #555; font-weight: normal; font-size: 12px;">(${duration})</span></td>
              </tr>
              <tr><td colspan="2"><hr style="border: 0; border-top: 1px dashed #333; margin: 12px 0;"></td></tr>

              <tr>
                <td style="color: #888; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">License Plate</td>
                <td style="color: #ffffff; font-weight: bold; text-align: right; font-size: 18px; letter-spacing: 1px;">${licensePlate}</td>
              </tr>
              <tr><td colspan="2"><hr style="border: 0; border-top: 1px dashed #333; margin: 12px 0;"></td></tr>
              
              <tr>
                <td style="color: #888; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">Total Price</td>
                <td style="color: #FFDF00; font-weight: bold; text-align: right; font-size: 18px;">$${totalPrice}</td>
              </tr>
            </table>
            
          </div>
          
          <div style="text-align: center; margin-top: 40px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/customer/history" style="display: inline-block; background-color: #FFDF00; color: #000000; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 30px; letter-spacing: 1px; text-transform: uppercase; font-size: 14px;">View Parking History</a>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div style="background-color: #000000; padding: 20px; text-align: center;">
          <p style="color: #666; font-size: 12px; margin: 0;">© 2026 Valo Parking. All rights reserved.</p>
          <p style="color: #444; font-size: 11px; margin: 5px 0 0 0;">Need help? Reply to this email or visit our help center.</p>
        </div>
      </div>
    `,
  });
};

module.exports = { 
  generateOTP, 
  sendOTPEmail, 
  sendResetPasswordEmail,
  sendBookingConfirmationEmail,
  sendBookingReminderEmail,
  sendBookingCancellationEmail,
  sendKioskCheckInEmail,
  sendCheckoutEmail
};
