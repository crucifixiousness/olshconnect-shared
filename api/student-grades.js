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

      // Check if user is a student
      if (decoded.role !== 'student') {
        return res.status(403).json({ error: 'Access denied. Student role required.' });
      }

      const studentId = decoded.id;
      client = await pool.connect();

      // Get student's grades - only show grades with 'reg_approved' (final) status
      // Use DISTINCT ON to prevent duplicates from multiple course_assignments
      const gradesQuery = `
        SELECT DISTINCT ON (g.grade_id)
          g.grade_id,
          g.final_grade,
          g.approval_status,
          g.dean_approved_at,
          
          -- Course information
          c.course_code,
          c.course_name,
          c.units,
          pc.semester,
          
          -- Program information
          p.program_name,
          py.year_level,
          
          -- Instructor information
          a.full_name as instructor_name,
          
          -- Assignment information
          ca.section,
          ca.day,
          TO_CHAR(ca.start_time, 'HH12:MI AM') as start_time,
          TO_CHAR(ca.end_time, 'HH12:MI AM') as end_time
          
        FROM grades g
        JOIN program_course pc ON g.pc_id = pc.pc_id
        JOIN course c ON pc.course_id = c.course_id
        JOIN program p ON pc.program_id = p.program_id
        JOIN program_year py ON pc.year_id = py.year_id
        LEFT JOIN course_assignments ca ON pc.pc_id = ca.pc_id
        LEFT JOIN admins a ON ca.staff_id = a.staff_id
        WHERE g.student_id = $1
          AND g.approval_status = 'reg_approved'
        ORDER BY g.grade_id, pc.semester, c.course_code, ca.day NULLS LAST, ca.start_time NULLS LAST
      `;

      const gradesResult = await client.query(gradesQuery, [studentId]);

      // Get student's enrollment info for context
      const enrollmentQuery = `
        SELECT e.program_id, e.year_id, e.semester, py.year_level
        FROM enrollments e
        JOIN program_year py ON e.year_id = py.year_id
        WHERE e.student_id = $1
        ORDER BY e.enrollment_date DESC
        LIMIT 1
      `;

      const enrollmentResult = await client.query(enrollmentQuery, [studentId]);
      const enrollment = enrollmentResult.rows[0] || {};

      // Calculate GPA
      const validGrades = gradesResult.rows.filter(grade => 
        grade.final_grade && grade.final_grade >= 1.0 && grade.final_grade <= 5.0
      );
      
      const totalUnits = validGrades.reduce((sum, grade) => sum + (grade.units || 0), 0);
      const weightedSum = validGrades.reduce((sum, grade) => 
        sum + (grade.final_grade * (grade.units || 0)), 0
      );
      
      const gpa = totalUnits > 0 ? (weightedSum / totalUnits).toFixed(2) : 0;

      res.json({
        success: true,
        student_id: studentId,
        enrollment: enrollment,
        grades: gradesResult.rows,
        statistics: {
          total_grades: gradesResult.rows.length,
          total_units: totalUnits,
          gpa: parseFloat(gpa),
          valid_grades: validGrades.length
        }
      });

    } catch (error) {
      console.error("Student grades error:", {
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
