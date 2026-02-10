const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        s.id as student_id,
        CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
        p.program_name,
        py.year_level,
        e.semester,
        e.total_fee,
        e.remaining_balance as balance,
        e.enrollment_status,
        (
          SELECT MAX(payment_date) 
          FROM payment_transactions 
          WHERE enrollment_id = e.enrollment_id
        ) as last_payment_date
      FROM students s
      JOIN enrollments e ON s.id = e.student_id
      JOIN program p ON e.program_id = p.program_id
      JOIN program_year py ON e.year_id = py.year_id
      WHERE e.enrollment_status IN ('Officially Enrolled', 'Verified', 'For Payment')
      AND e.remaining_balance > 0
      ORDER BY student_name ASC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching student balances:', error);
    res.status(500).json({ 
      error: 'Failed to fetch student balances',
      details: error.message 
    });
  }
};