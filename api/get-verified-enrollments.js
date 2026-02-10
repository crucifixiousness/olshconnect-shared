const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
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

  let client;
  try {
    authenticateToken(req);

    client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        e.enrollment_id,
        e.student_id,
        e.total_fee,
        e.amount_paid,
        e.remaining_balance,
        e.payment_status,
        e.academic_year,
        e.semester,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.suffix,
        p.program_name
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN program p ON e.program_id = p.program_id
      WHERE e.enrollment_status = 'Verified'
      ORDER BY e.enrollment_date DESC
    `);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error('Error fetching verified enrollments:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching enrollments: ' + error.message 
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};