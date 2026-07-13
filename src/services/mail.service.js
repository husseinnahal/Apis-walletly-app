import axios from 'axios';
import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

let transporter = null;

// Lazily initialize SMTP transporter
const getTransporter = () => {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        logger.warn('SMTP email credentials missing in .env. Emails will be logged to console.');
        return null;
    }

    try {
        const transportConfig = host === 'smtp.gmail.com' 
            ? {
                service: 'gmail',
                auth: { user, pass }
              }
            : {
                host,
                port: Number(port),
                secure: Number(port) === 465, // true for 465, false for 587
                auth: { user, pass }
              };

        transporter = nodemailer.createTransport(transportConfig);
        return transporter;
    } catch (error) {
        logger.error('Failed to create Nodemailer transport:', error);
        return null;
    }
};

/**
 * Send an OTP verification code to a user's email
 * @param {string} email - Destination email address
 * @param {string} otp - 6-digit verification code
 * @param {string} username - User's name for personalization
 */
export const sendOtpEmail = async (email, otp, username) => {
    // 1. HTTP API Fallback for Render (Resend)
    if (process.env.RESEND_API_KEY) {
        try {
            // Free Resend account defaults to sending from onboarding@resend.dev unless custom domain is verified
            const fromAddress = process.env.SMTP_FROM && !process.env.SMTP_FROM.includes('noreply@walletly.com')
                ? process.env.SMTP_FROM 
                : 'Walletly <onboarding@resend.dev>';
                
            logger.info(`Sending OTP email to: ${email} via Resend HTTP API`);

            const response = await axios.post('https://api.resend.com/emails', {
                from: fromAddress,
                to: [email],
                subject: `${otp} is your Walletly verification code`,
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #f9fbfd; border-radius: 12px; border: 1px solid #e8eef3;">
                        <div style="text-align: center; margin-bottom: 25px;">
                            <h2 style="color: #6be6b0; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Walletly</h2>
                        </div>
                        <div style="background-color: #ffffff; padding: 25px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                            <p style="font-size: 16px; color: #2c3e50; margin-top: 0;">Hi ${username},</p>
                            <p style="font-size: 15px; color: #50667e; line-height: 1.6;">Thank you for registering at Walletly! To complete your registration and secure your money management dashboard, please verify your email using the 6-digit code below:</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <span style="display: inline-block; font-size: 36px; font-weight: 800; color: #1e293b; letter-spacing: 6px; padding: 12px 30px; background-color: #f1f5f9; border-radius: 10px; border: 1px dashed #cbd5e1;">
                                    ${otp}
                                </span>
                            </div>
                            <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 0;">This code is valid for 10 minutes. If you did not request this, you can safely ignore this email.</p>
                        </div>
                        <div style="text-align: center; margin-top: 25px; font-size: 12px; color: #94a3b8;">
                            &copy; 2026 Walletly. All rights reserved.
                        </div>
                    </div>
                `
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200 || response.status === 201) {
                logger.info(`Verification OTP sent successfully via Resend API to: ${email}`);
                return true;
            }
        } catch (error) {
            const apiError = error.response?.data || error.message;
            logger.error(`Resend API failed to send verification email to: ${email}`, apiError);
            
            // Fallback to console printout if API fails
            console.log(`\n==============================================`);
            console.log(`⚠️  [RESEND API FAILED - FALLBACK TO CONSOLE LOG]`);
            console.log(`To: ${email}`);
            console.log(`OTP Code: ${otp}`);
            console.log(`==============================================\n`);
            return true;
        }
    }

    // 2. Standard SMTP Fallback
    const fromAddress = process.env.SMTP_FROM || 'Walletly <noreply@walletly.com>';
    const mailOptions = {
        from: fromAddress,
        to: email,
        subject: `${otp} is your Walletly verification code`,
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #f9fbfd; border-radius: 12px; border: 1px solid #e8eef3;">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h2 style="color: #6be6b0; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Walletly</h2>
                </div>
                <div style="background-color: #ffffff; padding: 25px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                    <p style="font-size: 16px; color: #2c3e50; margin-top: 0;">Hi ${username},</p>
                    <p style="font-size: 15px; color: #50667e; line-height: 1.6;">Thank you for registering at Walletly! To complete your registration and secure your money management dashboard, please verify your email using the 6-digit code below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="display: inline-block; font-size: 36px; font-weight: 800; color: #1e293b; letter-spacing: 6px; padding: 12px 30px; background-color: #f1f5f9; border-radius: 10px; border: 1px dashed #cbd5e1;">
                            ${otp}
                        </span>
                    </div>
                    <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 0;">This code is valid for 10 minutes. If you did not request this, you can safely ignore this email.</p>
                </div>
                <div style="text-align: center; margin-top: 25px; font-size: 12px; color: #94a3b8;">
                    &copy; 2026 Walletly. All rights reserved.
                </div>
            </div>
        `,
    };

    const smtpTransporter = getTransporter();

    if (!smtpTransporter) {
        // Fallback: Console log delivery for local development without SMTP
        console.log(`\n==============================================`);
        console.log(`✉️  [MOCK EMAIL SENT]`);
        console.log(`To: ${email}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`OTP Code: ${otp}`);
        console.log(`==============================================\n`);
        return true;
    }

    try {
        await smtpTransporter.sendMail(mailOptions);
        logger.info(`Verification OTP sent successfully to email: ${email}`);
        return true;
    } catch (error) {
        logger.error(`Failed to send verification email to: ${email}`, error);
        // Fallback to console if SMTP sends fail during runtime so the app doesn't break
        console.log(`\n==============================================`);
        console.log(`⚠️  [SMTP EMAIL FAILED - FALLBACK TO CONSOLE LOG]`);
        console.log(`To: ${email}`);
        console.log(`OTP Code: ${otp}`);
        console.log(`==============================================\n`);
        return true;
    }
};
