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

      const { courseId } = req.query;
      client = await pool.connect();

      // Get course details first
      const courseQuery = `
        SELECT ca.pc_id, pc.program_id, pc.year_id, pc.semester, 
               c.course_code, c.course_name, c.units,
               ca.section, ca.day, ca.start_time, ca.end_time
        FROM course_assignments ca
        JOIN program_course pc ON ca.pc_id = pc.pc_id
        JOIN course c ON pc.course_id = c.course_id
        WHERE ca.pc_id = $1
      `;

      const courseResult = await client.query(courseQuery, [courseId]);
      if (courseResult.rows.length === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const course = courseResult.rows[0];

      // Get students with their grades for this specific course and block
      const studentsQuery = `
        SELECT 
          s.id as student_id,
          CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as name,
          s.email,
          e.enrollment_date,
          e.enrollment_status,
          COALESCE(g.final_grade::text, '') as final_grade,
          g.approval_status,
          CASE 
            WHEN g.approval_status = 'final' THEN 'Final'
            WHEN g.approval_status = 'dean_approved' THEN 'Dean Approved'
            WHEN g.approval_status = 'registrar_approved' THEN 'Registrar Approved'
            WHEN g.approval_status = 'pending' THEN 'Pending'
            ELSE 'Not Graded'
          END as grade_status
        FROM students s
        JOIN enrollments e ON s.id = e.student_id
        JOIN program_year py ON e.year_id = py.year_id
        JOIN student_blocks sb ON e.block_id = sb.block_id
        LEFT JOIN grades g ON s.id = g.student_id AND g.pc_id = $1
        WHERE e.program_id = $2
          AND e.year_id = $3
          AND e.semester = $4
          AND sb.block_name = $5
          AND e.enrollment_status = 'Officially Enrolled'
        ORDER BY s.last_name, s.first_name
      `;

      const queryParams = [
        courseId,
        course.program_id,
        course.year_id,
        course.semester,
        course.section
      ];

      const studentsResult = await client.query(studentsQuery, queryParams);

      const response = {
        course: {
          pc_id: course.pc_id,
          course_code: course.course_code,
          course_name: course.course_name,
          units: course.units,
          semester: course.semester,
          section: course.section,
          day: course.day,
          start_time: course.start_time,
          end_time: course.end_time
        },
        students: studentsResult.rows,
        total_students: studentsResult.rows.length,
        graded_count: studentsResult.rows.filter(s => s.final_grade).length,
        pending_count: studentsResult.rows.filter(s => !s.final_grade).length
      };

      res.json(response);
      client.release();
    } catch (error) {
      console.error("Detailed error:", {
        message: error.message,
        stack: error.stack,
        type: error.name
      });
      
      if (error.message === 'No token provided' || error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Authentication failed' });
      }
      
      res.status(500).json({ 
        error: "Failed to fetch student grades",
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