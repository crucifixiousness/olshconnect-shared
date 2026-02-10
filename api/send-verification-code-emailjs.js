const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

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
        // Store verification code
        verificationCodes.set(email, { otp, expiresAt, type: 'email' });

        res.json({ 
          success: true, 
          message: 'Verification code generated. Please check your email.',
          otp: otp, // For development/testing - remove in production
          expiresIn: 600, // 10 minutes in seconds
          // EmailJS template data
          emailData: {
            to_email: email,
            to_name: 'Student',
            from_name: 'OLSHCO Registration',
            message: `Your OLSHCO verification code is: ${otp}. This code expires in 10 minutes.`,
            subject: 'OLSHCO Registration - Email Verification'
          }
        });

      } else if (type === 'phone' && phoneNumber) {
        // Store verification code
        verificationCodes.set(phoneNumber, { otp, expiresAt, type: 'phone' });

        res.json({ 
          success: true, 
          message: 'Verification code generated. Please check your phone.',
          otp: otp, // For development/testing - remove in production
          expiresIn: 600,
          // For SMS, you would integrate with a service like Twilio, Semaphore, etc.
          // For now, we'll just store the code and return success
        });
      } else {
        return res.status(400).json({ error: 'Invalid verification type' });
      }

    } catch (error) {
      console.error('Error generating verification code:', error);
      res.status(500).json({ 
        error: 'Failed to generate verification code',
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
