const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function authenticateToken(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    const err = new Error('No token provided');
    err.status = 401;
    throw err;
  }
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    const err = new Error('Invalid token');
    err.status = 401;
    throw err;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let client;
  try {
    authenticateToken(req);
    client = await pool.connect();

    const query = `
      SELECT 
        ca.assignment_id,
        ca.pc_id,
        ca.section,
        c.course_code,
        c.course_name,
        p.program_name,
        py.year_level,
        pc.semester,
        COALESCE(a.full_name, 'Not assigned') AS instructor_name,
        COUNT(g.*) AS total_grades,
        COUNT(CASE WHEN g.approval_status = 'pending' THEN 1 END) AS pending_count,
        COUNT(CASE WHEN g.approval_status = 'ph_approved' THEN 1 END) AS program_head_approved_count,
        COUNT(CASE WHEN g.approval_status = 'dean_approved' THEN 1 END) AS dean_approved_count,
        COUNT(CASE WHEN g.approval_status = 'reg_approved' THEN 1 END) AS registrar_approved_count
      FROM course_assignments ca
      JOIN program_course pc ON pc.pc_id = ca.pc_id
      JOIN course c ON c.course_id = pc.course_id
      JOIN program p ON p.program_id = pc.program_id
      JOIN program_year py ON py.year_id = pc.year_id
      LEFT JOIN admins a ON a.staff_id = ca.staff_id
      JOIN enrollments e 
        ON e.program_id = pc.program_id 
       AND e.year_id = pc.year_id 
       AND e.semester = pc.semester
       AND e.enrollment_status = 'Officially Enrolled'
      JOIN student_blocks sb 
        ON sb.block_id = e.block_id 
       AND sb.block_name = ca.section
      LEFT JOIN grades g 
        ON g.pc_id = pc.pc_id 
       AND g.student_id = e.student_id
      GROUP BY ca.assignment_id, ca.pc_id, ca.section, c.course_code, c.course_name, p.program_name, py.year_level, pc.semester, a.full_name
      HAVING COUNT(CASE WHEN g.approval_status = 'ph_approved' THEN 1 END) > 0
         AND COUNT(CASE WHEN g.approval_status = 'dean_approved' THEN 1 END) = 0
      ORDER BY c.course_code, ca.section
    `;

    const result = await client.query(query);
    return res.status(200).json({ success: true, classes: result.rows });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Server error' });
  } finally {
    if (client) client.release();
  }
};
