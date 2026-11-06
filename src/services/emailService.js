import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config.js';

/**
 * Sends a 6-digit OTP verification email to the user's Gmail address.
 * 1. Writes to Firestore 'mail' collection (standard Firebase Trigger Email Extension).
 * 2. Uses EmailJS REST API if environment variables are provided.
 * 3. Never displays or leaks the OTP inside the client UI.
 */
export async function sendVerificationEmailOtp({ email, name = 'Scorer', otp, type = 'registration' }) {
  const isReset = type === 'password_reset';
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !otp) return false;

  const subject = isReset
    ? `SmartCricket Password Reset Code: ${otp}`
    : `Your SmartCricket 6-Digit Verification Code: ${otp}`;

  const textBody = isReset
    ? `Hello,\n\nYou requested to reset your SmartCricket manager password.\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.\n\nBest regards,\nSmartCricket Team`
    : `Hello ${name},\n\nThank you for registering as a match manager on SmartCricket.\n\nYour 6-digit verification code is: ${otp}\n\nThis code is valid for 10 minutes. Please enter it in the app to complete your registration.\n\nBest regards,\nSmartCricket Team`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #0B132B; color: #FFFFFF; border-radius: 16px;">
      <h2 style="color: #22C55E; margin-top: 0;">SmartCricket Verification</h2>
      <p style="font-size: 14px; color: #94A3B8; line-height: 1.5;">${isReset ? 'You requested to reset your password.' : `Hello ${name}, thank you for registering.`}</p>
      <div style="background: rgba(34, 197, 94, 0.15); border: 2px dashed #22C55E; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-size: 12px; font-weight: bold; color: #94A3B8; display: block; letter-spacing: 1px; text-transform: uppercase;">Your 6-Digit Code</span>
        <span style="font-family: monospace; font-size: 32px; font-weight: 800; color: #22C55E; letter-spacing: 6px; display: inline-block; margin-top: 6px;">${otp}</span>
      </div>
      <p style="font-size: 12px; color: #64748B;">This code is valid for 10 minutes. Do not share this code with anyone.</p>
      <hr style="border: 0; border-top: 1px solid #1E293B; margin: 20px 0;" />
      <p style="font-size: 11px; color: #475569; text-align: center;">© 2026 SmartCricket. All rights reserved.</p>
    </div>
  `;

  let sent = false;

  // 1. Dispatch via Firestore 'mail' collection (Firebase Trigger Email Extension)
  try {
    if (db) {
      await addDoc(collection(db, 'mail'), {
        to: [cleanEmail],
        message: {
          subject,
          text: textBody,
          html: htmlBody,
        },
        createdAt: serverTimestamp(),
      });
      sent = true;
    }
  } catch (err) {
    console.warn('Firestore mail write notice:', err);
  }

  // 2. EmailJS REST API dispatch if configured
  const serviceId = import.meta.env?.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env?.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env?.VITE_EMAILJS_PUBLIC_KEY;

  if (serviceId && templateId && publicKey) {
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_email: cleanEmail,
            to_name: name,
            otp: otp,
            subject: subject,
            message: textBody,
          },
        }),
      });
      if (response.ok) {
        sent = true;
      }
    } catch (err) {
      console.warn('EmailJS dispatch notice:', err);
    }
  }

  return sent;
}
