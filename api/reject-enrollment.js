const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const authenticateToken = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    throw new Error('No token provided');
  }

  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = async (req, res) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { enrollmentId } = req.body;
  if (!enrollmentId) {
    return res.status(400).json({ error: 'Enrollment ID is required' });
  }

  try {
    // Verify token
    authenticateToken(req);

    // Update enrollment status
    const result = await pool.query(`
      UPDATE enrollments 
      SET enrollment_status = 'Rejected'
      WHERE enrollment_id = $1
      RETURNING enrollment_id
    `, [enrollmentId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Update payment transaction
    await pool.query(`
      UPDATE payment_transactions 
      SET remarks = 'Rejected'
      WHERE enrollment_id = $1
    `, [enrollmentId]);

    res.status(200).json({ 
      message: 'Enrollment rejected successfully',
      enrollmentId: result.rows[0].enrollment_id
    });
  } catch (error) {
    console.error('Error rejecting enrollment:', error);
    res.status(500).json({ 
      error: 'Failed to reject enrollment',
      details: error.message 
    });
  }
}; 