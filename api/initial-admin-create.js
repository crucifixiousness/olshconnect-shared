// api/initial-admin-create.js

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const { staff_username, staff_password, full_name, role = 'admin', verification_password } = req.body;
    
    // Check verification password
    const expectedVerificationPassword = process.env.ADMIN_ACCOUNT_VERIFICATION;
    if (!expectedVerificationPassword) {
      return res.status(500).json({
        success: false,
        message: 'Verification system not configured. Please contact system administrator.',
        error: 'VERIFICATION_NOT_CONFIGURED'
      });
    }

    if (!verification_password || verification_password !== expectedVerificationPassword) {
      return res.status(403).json({
        success: false,
        message: 'Invalid verification password. Admin account creation requires verification.',
        error: 'INVALID_VERIFICATION_PASSWORD'
      });
    }
    
    // Validation
    if (!staff_username || !staff_password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
        error: 'MISSING_FIELDS'
      });
    }
    
    if (staff_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
        error: 'WEAK_PASSWORD'
      });
    }
    
    try {
      const client = await pool.connect();
      
      // Check if any admin accounts exist first
      const adminCheckResult = await client.query(`
        SELECT COUNT(*) as admin_count 
        FROM admins 
        WHERE role = 'admin'
      `);
      
      const adminCount = parseInt(adminCheckResult.rows[0].admin_count);
      
      if (adminCount > 0) {
        client.release();
        return res.status(403).json({
          success: false,
          message: 'Admin accounts already exist. Initial admin creation is not available.',
          error: 'ADMINS_EXIST'
        });
      }
      
      // Check if username already exists
      const existingUser = await client.query(`
        SELECT staff_id FROM admins WHERE staff_username = $1
      `, [staff_username]);
      
      if (existingUser.rows.length > 0) {
        client.release();
        return res.status(400).json({
          success: false,
          message: 'Username already exists',
          error: 'USERNAME_EXISTS'
        });
      }
      
      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(staff_password, saltRounds);
      
      // Create admin account
      const result = await client.query(`
        INSERT INTO admins (
          staff_username, 
          staff_password, 
          full_name, 
          role
        ) VALUES ($1, $2, $3, $4)
        RETURNING staff_id, staff_username, full_name, role
      `, [staff_username, hashedPassword, full_name, role]);
      
      const newAdmin = result.rows[0];
      
      client.release();
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          adminId: newAdmin.staff_id, 
          username: newAdmin.staff_username,
          role: newAdmin.role 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      
      res.json({
        success: true,
        message: 'Initial admin account created successfully',
        admin: {
          staff_id: newAdmin.staff_id,
          staff_username: newAdmin.staff_username,
          full_name: newAdmin.full_name,
          role: newAdmin.role
        },
        token
      });
      
    } catch (error) {
      console.error('Error creating initial admin:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating initial admin account',
        error: error.message
      });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
};
