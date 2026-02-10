const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const authenticateToken = (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('No token provided');
  }

  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    let client;
    try {
      const decoded = authenticateToken(req, res);
      req.user = decoded;

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
          COUNT(CASE WHEN g.approval_status = 'reg_approved' THEN 1 END) AS registrar_approved_count,
          COUNT(CASE WHEN g.approval_status = 'dean_approved' THEN 1 END) AS dean_approved_count,
          COUNT(CASE WHEN g.approval_status = 'ph_approved' THEN 1 END) AS program_head_approved_count
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
        LEFT JOIN grades g ON g.pc_id = pc.pc_id AND g.student_id = e.student_id
        GROUP BY ca.assignment_id, ca.pc_id, ca.section, c.course_code, c.course_name, p.program_name, py.year_level, pc.semester, a.full_name
        HAVING COUNT(g.*) > 0
           AND COUNT(CASE WHEN g.approval_status = 'dean_approved' THEN 1 END) = COUNT(g.*)
           AND COUNT(CASE WHEN g.approval_status = 'reg_approved' THEN 1 END) = 0
           AND COUNT(CASE WHEN g.approval_status NOT IN ('dean_approved', 'reg_approved') AND g.approval_status IS NOT NULL THEN 1 END) = 0
        ORDER BY c.course_code, ca.section
      `;

      const result = await client.query(query);
      
      console.log('🔍 Registrar class approval query results:', {
        totalRows: result.rows.length,
        sampleData: result.rows.slice(0, 3).map(r => ({
          course: r.course_code,
          section: r.section,
          total_grades: r.total_grades,
          dean_approved_count: r.dean_approved_count,
          reg_approved_count: r.registrar_approved_count
        }))
      });
      
      return res.status(200).json({ success: true, classes: result.rows });

    } catch (error) {
      console.error("Registrar grade approval error:", {
        message: error.message,
        stack: error.stack,
        type: error.name
      });

      if (error.message === 'No token provided' || error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Authentication failed' });
      }

      res.status(500).json({ 
        error: "Failed to fetch registrar grade approval data",
        details: error.message 
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};