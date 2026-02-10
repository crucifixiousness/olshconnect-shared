// api/initial-admin-check.js

const { Pool } = require('pg');

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const client = await pool.connect();
      
      // Check admins table for admin accounts
      const result = await client.query(`
        SELECT COUNT(*) as admin_count 
        FROM admins 
        WHERE role = 'admin'
      `);
      
      const adminCount = parseInt(result.rows[0].admin_count);
      
      client.release();
      
      const isAvailable = adminCount === 0;
      
      res.json({
        success: true,
        isAvailable,
        adminCount,
        message: isAvailable 
          ? 'Initial admin creation is available' 
          : 'Admin accounts already exist'
      });
      
    } catch (error) {
      console.error('Error checking initial admin availability:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking initial admin availability',
        error: error.message
      });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
};
