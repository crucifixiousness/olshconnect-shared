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
        s.id,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.suffix,
        p.program_name as program,
        py.year_level,
        s.sex,
        e.enrollment_status
      FROM students s
      JOIN enrollments e ON s.id = e.student_id
      JOIN program p ON e.program_id = p.program_id
      JOIN program_year py ON e.year_id = py.year_id
      WHERE e.enrollment_status = 'Officially Enrolled'
      ORDER BY s.last_name ASC, s.first_name ASC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching enrolled students:', error);
    res.status(500).json({ 
      error: 'Failed to fetch enrolled students',
      details: error.message 
    });
  }
};