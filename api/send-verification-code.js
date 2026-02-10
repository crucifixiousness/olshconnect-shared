const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Email service configuration - using Resend (modern alternative to Nodemailer)
const sendEmail = async (to, subject, html) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL || 'OLSHCO <noreply@olshco.edu.ph>',
      to: [to],
      subject: subject,
      html: html,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Email sending failed: ${error.message}`);
  }

  return await response.json();
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store verification codes temporarily (in production, use Redis or database)
const verificationCodes = new Map();

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { email, phoneNumber, type } = req.body; // type: 'email' or 'phone'

    try {
      if (!email && !phoneNumber) {
        return res.status(400).json({ error: 'Email or phone number is required' });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      if (type === 'email' && email) {
        // Send email verification using Resend
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #c70202; margin: 0;">OLSHCO Registration</h1>
              <p style="color: #666; margin: 10px 0 0 0;">Email Verification</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin: 20px 0;">
              <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Verify Your Email Address</h2>
              <p style="color: #666; text-align: center; margin-bottom: 30px;">
                Thank you for registering with OLSHCO. Please use the following verification code to complete your registration:
              </p>
              
              <div style="background-color: #c70202; color: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <h1 style="font-size: 36px; margin: 0; letter-spacing: 8px; font-weight: bold;">${otp}</h1>
              </div>
              
              <p style="color: #666; text-align: center; font-size: 14px;">
                This code will expire in 10 minutes.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                If you didn't request this verification, please ignore this email.
              </p>
              <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
                © 2024 Our Lady of the Sacred Heart College of Guimba, Inc.
              </p>
            </div>
          </div>
        `;

        await sendEmail(email, 'OLSHCO Registration - Email Verification', emailHtml);

        // Store verification code
        verificationCodes.set(email, { otp, expiresAt, type: 'email' });

        res.json({ 
          success: true, 
          message: 'Verification code sent to email',
          expiresIn: 600 // 10 minutes in seconds
        });

      } else if (type === 'phone' && phoneNumber) {
        // For SMS, you would integrate with a service like Twilio, Semaphore, etc.
        // For now, we'll just store the code and return success
        // In production, implement actual SMS sending here
        
        // Store verification code
        verificationCodes.set(phoneNumber, { otp, expiresAt, type: 'phone' });

        // TODO: Implement actual SMS sending
        // Example with Twilio:
        // const twilio = require('twilio');
        // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        // await client.messages.create({
        //   body: `Your OLSHCO verification code is: ${otp}. This code expires in 10 minutes.`,
        //   from: process.env.TWILIO_PHONE_NUMBER,
        //   to: phoneNumber
        // });

        res.json({ 
          success: true, 
          message: 'Verification code sent to phone',
          expiresIn: 600,
          // For development, include the OTP in response (remove in production)
          developmentOTP: process.env.NODE_ENV === 'development' ? otp : undefined
        });
      } else {
        return res.status(400).json({ error: 'Invalid verification type' });
      }

    } catch (error) {
      console.error('Error sending verification code:', error);
      res.status(500).json({ 
        error: 'Failed to send verification code',
        details: error.message 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};

// Clean up expired codes every hour
setInterval(() => {
  const now = new Date();
  for (const [key, value] of verificationCodes.entries()) {
    if (value.expiresAt < now) {
      verificationCodes.delete(key);
    }
  }
}, 60 * 60 * 1000); // Run every hour
