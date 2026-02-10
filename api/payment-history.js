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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify token
    authenticateToken(req);

    const { studentId } = req.query;
    
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    // Get payment history for the specific student
    const result = await pool.query(`
      SELECT 
        pt.transaction_id,
        pt.amount_paid,
        pt.payment_date,
        pt.payment_method,
        pt.reference_number,
        pt.remarks,
        pt.payment_status,
        e.enrollment_status,
        p.program_name
      FROM payment_transactions pt
      JOIN enrollments e ON pt.enrollment_id = e.enrollment_id
      JOIN program p ON e.program_id = p.program_id
      WHERE pt.student_id = $1
      ORDER BY pt.payment_date DESC
    `, [studentId]);

    console.log('Debug - Payment History for Student:', studentId, 'Count:', result.rows.length);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch payment history',
      details: error.message
    });
  }
};