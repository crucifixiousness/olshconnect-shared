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
    const { program, date } = req.query;

    client = await pool.connect();
    
    let query = `
      SELECT 
        pt.transaction_id,
        pt.payment_date,
        pt.amount_paid,
        pt.payment_method,
        pt.reference_number,
        pt.payment_status,
        CONCAT(s.last_name, ', ', s.first_name, ' ', 
          CASE WHEN s.middle_name IS NOT NULL 
          THEN LEFT(s.middle_name, 1) || '.' 
          ELSE '' END,
          CASE WHEN s.suffix IS NOT NULL 
          THEN ' ' || s.suffix 
          ELSE '' END
        ) as student_name,
        p.program_name,
        a.full_name as processed_by_name
      FROM payment_transactions pt
      JOIN students s ON pt.student_id = s.id
      JOIN enrollments e ON pt.enrollment_id = e.enrollment_id
      JOIN program p ON e.program_id = p.program_id
      LEFT JOIN admins a ON pt.processed_by = a.staff_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (program) {
      query += ` AND p.program_name = $${paramCount}`;
      params.push(program);
      paramCount++;
    }

    if (date) {
      query += ` AND DATE(pt.payment_date) = $${paramCount}`;
      params.push(date);
    }

    query += ` ORDER BY pt.payment_date DESC`;

    const result = await client.query(query, params);
    res.status(200).json(result.rows);

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching payment history: ' + error.message 
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};