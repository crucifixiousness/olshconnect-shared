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

      // Get grade approval statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_grades,
          COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending_approval,
          COUNT(CASE WHEN approval_status = 'registrar_approved' THEN 1 END) as registrar_approved,
          COUNT(CASE WHEN approval_status = 'dean_approved' THEN 1 END) as dean_approved,
          COUNT(CASE WHEN approval_status = 'final' THEN 1 END) as final_approved
        FROM grades
      `;

      const statsResult = await client.query(statsQuery);
      const stats = statsResult.rows[0];

      // Get detailed grade information for dashboard
      const gradesQuery = `
        SELECT DISTINCT ON (g.grade_id)
          g.grade_id,
          g.student_id,
          g.pc_id,
          g.final_grade,
          g.approval_status,
          g.created_at as grade_entered_at,
          g.updated_at as grade_updated_at,
          g.registrar_approved_at,
          g.dean_approved_at,
          g.final_approved_at,
          
          -- Student information
          CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
          s.email as student_email,
          
          -- Course information
          c.course_code,
          c.course_name,
          c.units,
          pc.semester,
          
          -- Program information
          p.program_name,
          py.year_level,
          
          -- Instructor information
          st.full_name as instructor_name,
          
          -- Assignment information
          ca.section,
          ca.day,
          TO_CHAR(ca.start_time, 'HH12:MI AM') as start_time,
          TO_CHAR(ca.end_time, 'HH12:MI AM') as end_time,
          
          -- Approval information (removed approval_by columns)
          NULL as registrar_name,
          NULL as dean_name
          
        FROM grades g
        JOIN students s ON g.student_id = s.id
        JOIN program_course pc ON g.pc_id = pc.pc_id
        JOIN course c ON pc.course_id = c.course_id
        JOIN program p ON pc.program_id = p.program_id
        JOIN program_year py ON pc.year_id = py.year_id
        LEFT JOIN course_assignments ca ON pc.pc_id = ca.pc_id
        LEFT JOIN admins st ON ca.staff_id = st.staff_id
        WHERE g.approval_status = 'ph_approved'
        ORDER BY g.grade_id, ca.day NULLS LAST, ca.start_time NULLS LAST
        LIMIT 100
      `;

      const gradesResult = await client.query(gradesQuery);

      res.json({
        success: true,
        stats: {
          totalGrades: parseInt(stats.total_grades),
          pendingApproval: parseInt(stats.pending_approval),
          registrarApproved: parseInt(stats.registrar_approved),
          deanApproved: parseInt(stats.dean_approved),
          finalApproved: parseInt(stats.final_approved)
        },
        grades: gradesResult.rows
      });

    } catch (error) {
      console.error("Dean dashboard error:", {
        message: error.message,
        stack: error.stack,
        type: error.name
      });
      
      if (error.message === 'No token provided' || error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Authentication failed' });
      }
      
      res.status(500).json({ 
        error: "Failed to fetch dean dashboard data",
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
