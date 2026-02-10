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

  const { program_id, year_level, block_name} = req.query;

  try {
    let query = `
      SELECT 
        s.id,
        CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
        COALESCE(py.year_level, 0) as year_level,
        COALESCE(sb.block_name, 'Not Assigned') as block,
        COALESCE(s.sex, 'Not Specified') as sex
      FROM students s
      LEFT JOIN enrollments e ON s.id = e.student_id
      LEFT JOIN program_year py ON e.year_id = py.year_id
      LEFT JOIN student_blocks sb ON e.block_id = sb.block_id
      LEFT JOIN program p ON e.program_id = p.program_id
      WHERE e.program_id = $1 
      AND e.enrollment_status = 'Officially Enrolled'
    `;

    const params = [program_id];
    let paramCount = 1;

    if (year_level) {
      paramCount++;
      query += ` AND py.year_level = $${paramCount}`;
      params.push(year_level);
    }

    if (block_name) {
      paramCount++;
      query += ` AND (sb.block_name = $${paramCount} OR sb.block_name IS NULL)`;
      params.push(block_name);
    }

    query += ` ORDER BY student_name ASC`;

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching program students:', error);
    res.status(500).json({ 
      error: 'Failed to fetch program students',
      details: error.message 
    });
  }
};