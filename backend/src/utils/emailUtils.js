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

module.exports = { generateOTP, sendOTPEmail, sendResetPasswordEmail };

