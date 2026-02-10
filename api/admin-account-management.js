// api/admin-account-management.js

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Function to verify admin token
const verifyAdminToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ message: "No token provided" });
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const admin = await pool.query(
      'SELECT * FROM admins WHERE staff_id = $1 AND role = $2',
      [decoded.id, 'admin']
    );

    if (admin.rows.length === 0) {
      res.status(403).json({ message: "Admin access required" });
      return null;
    }

    return admin.rows[0];
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: "Invalid token" });
    return null;
  }
};

module.exports = async (req, res) => {
  // Create new admin account
  if (req.method === 'POST') {
    try {
      // Verify admin token
      const admin = await verifyAdminToken(req, res);
      if (!admin) return; // Error response already sent

      const { full_name, staff_username, staff_password, verification_password } = req.body;

      // Check verification password
      const expectedVerificationPassword = process.env.ADMIN_ACCOUNT_VERIFICATION;
      if (!expectedVerificationPassword) {
        return res.status(500).json({ 
          error: "Verification system not configured. Please contact system administrator." 
        });
      }

      if (!verification_password || verification_password !== expectedVerificationPassword) {
        return res.status(403).json({ 
          error: "Invalid verification password. Admin account creation requires verification." 
        });
      }

      if (!full_name || !staff_username || !staff_password) {
        return res.status(400).json({ error: "Please fill in all fields." });
      }

      const client = await pool.connect();

      // Check if username already exists
      const checkResult = await client.query(
        "SELECT COUNT(*) as count FROM admins WHERE staff_username = $1",
        [staff_username]
      );

      if (checkResult.rows[0].count > 0) {
        return res.status(400).json({ error: "Username already taken." });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(staff_password, 10);

      // Insert new admin account
      const insertQuery = `
        INSERT INTO admins (full_name, staff_username, staff_password, role) 
        VALUES ($1, $2, $3, $4)
        RETURNING staff_id, full_name, staff_username, role
      `;
      
      const result = await client.query(insertQuery, [
        full_name, 
        staff_username, 
        hashedPassword, 
        'admin'
      ]);

      res.status(201).json({ 
        message: "Admin account created successfully!",
        admin: result.rows[0]
      });
      
      client.release();
    } catch (error) {
      console.error("Error creating admin account:", error);
      res.status(500).json({ error: "Failed to create admin account" });
    }
  }
  // Delete admin account (self-deletion)
  else if (req.method === 'DELETE') {
    try {
      // Verify admin token
      const admin = await verifyAdminToken(req, res);
      if (!admin) return; // Error response already sent

      const client = await pool.connect();

      // Delete the admin account
      const deleteQuery = `
        DELETE FROM admins 
        WHERE staff_id = $1 AND role = 'admin'
        RETURNING staff_id, full_name, staff_username
      `;
      
      const result = await client.query(deleteQuery, [admin.staff_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Admin account not found" });
      }

      res.status(200).json({ 
        message: "Admin account deleted successfully. You will be logged out.",
        deletedAdmin: result.rows[0]
      });
      
      client.release();
    } catch (error) {
      console.error("Error deleting admin account:", error);
      res.status(500).json({ error: "Failed to delete admin account" });
    }
  }
  // Get admin accounts list
  else if (req.method === 'GET') {
    try {
      // Verify admin token
      const admin = await verifyAdminToken(req, res);
      if (!admin) return; // Error response already sent

      const client = await pool.connect();

      // Get all admin accounts
      const query = `
        SELECT staff_id, full_name, staff_username, role
        FROM admins 
        WHERE role = 'admin'
        ORDER BY staff_id DESC
      `;
      
      const result = await client.query(query);

      res.status(200).json({ 
        admins: result.rows
      });
      
      client.release();
    } catch (error) {
      console.error("Error fetching admin accounts:", error);
      res.status(500).json({ error: "Failed to fetch admin accounts" });
    }
  }
  else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};
