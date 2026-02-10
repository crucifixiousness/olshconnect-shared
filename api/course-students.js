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
    const decoded = authenticateToken(req);
    const { courseId } = req.query;

    console.log('🔍 DEBUG: Course ID from query:', courseId);
    console.log('🔍 DEBUG: Authenticated user:', decoded);

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    client = await pool.connect();
    console.log('🔍 DEBUG: Database connection established');

    // Get course details first - courseId is actually assignment_id from the frontend
    const courseQuery = `
      SELECT ca.pc_id, pc.program_id, pc.year_id, pc.semester, 
             c.course_code, c.course_name, c.units,
             ca.section, ca.day, ca.start_time, ca.end_time
      FROM course_assignments ca
      JOIN program_course pc ON ca.pc_id = pc.pc_id
      JOIN course c ON pc.course_id = c.course_id
      WHERE ca.assignment_id = $1
    `;

    const courseResult = await client.query(courseQuery, [courseId]);
    console.log('🔍 DEBUG: Course query result:', courseResult.rows);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseResult.rows[0];
    console.log('🔍 DEBUG: Course details:', course);

    // Get students enrolled in this course based on the instructor's assignment
    const studentsQuery = `
      SELECT DISTINCT
        s.id as student_id,
        CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as name,
        s.email,
        e.enrollment_date,
        e.enrollment_status,
        py.year_level,
        sb.block_name as section,
        p.program_name,
        COALESCE(g.final_grade::text, '') as final_grade,
        g.approval_status,
        CASE 
          WHEN g.approval_status = 'reg_approved' THEN 'Final'
          WHEN g.approval_status = 'dean_approved' THEN 'Dean Approved'
          WHEN g.approval_status = 'ph_approved' THEN 'Program Head Approved'
          WHEN g.approval_status = 'pending' THEN 'Pending'
          ELSE 'Not Graded'
        END as grade_status
      FROM students s
      JOIN enrollments e ON s.id = e.student_id
      JOIN program_year py ON e.year_id = py.year_id
      JOIN student_blocks sb ON e.block_id = sb.block_id
      JOIN program p ON e.program_id = p.program_id
      LEFT JOIN grades g ON s.id = g.student_id AND g.pc_id = $1
      WHERE e.program_id = $2
        AND e.year_id = $3
        AND e.semester = $4
        AND e.enrollment_status = 'Officially Enrolled'
        AND sb.block_name = $5
      ORDER BY 2
    `;

    const queryParams = [
      course.pc_id,  // Use the actual pc_id from course_assignments, not assignment_id
      course.program_id,
      course.year_id,
      course.semester,
      course.section  // This is the block name (A, B, etc.)
    ];

    console.log('🔍 DEBUG: Students query:', studentsQuery);
    console.log('🔍 DEBUG: Query parameters:', queryParams);

    // Let's debug what's in the database
    const debugQuery1 = `
      SELECT COUNT(*) as total_enrollments
      FROM enrollments e
      WHERE e.program_id = $1 AND e.year_id = $2 AND e.semester = $3
    `;
    const debugResult1 = await client.query(debugQuery1, [course.program_id, course.year_id, course.semester]);
    console.log('🔍 DEBUG: Total enrollments for this program/year/semester:', debugResult1.rows[0]);

    const debugQuery2 = `
      SELECT e.block_id, e.enrollment_status, COUNT(*) as count
      FROM enrollments e
      WHERE e.program_id = $1 AND e.year_id = $2 AND e.semester = $3
      GROUP BY e.block_id, e.enrollment_status
    `;
    const debugResult2 = await client.query(debugQuery2, [course.program_id, course.year_id, course.semester]);
    console.log('🔍 DEBUG: Enrollment breakdown by block and status:', debugResult2.rows);

    const debugQuery3 = `
      SELECT * FROM student_blocks 
      WHERE program_id = $1 AND semester = $2
    `;
    const debugResult3 = await client.query(debugQuery3, [course.program_id, course.semester]);
    console.log('🔍 DEBUG: Available student blocks:', debugResult3.rows);

    const studentsResult = await client.query(studentsQuery, queryParams);
    console.log('🔍 DEBUG: Students found:', studentsResult.rows.length);



    const response = {
      course: {
        pc_id: course.pc_id,  // This is the actual pc_id that should be used for saving grades
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
      total_students: studentsResult.rows.length
    };

    console.log('🔍 DEBUG: Final response:', response);
    return res.status(200).json(response);

  } catch (error) {
    const status = error.status || 500;
    console.error('❌ ERROR: Error fetching course students:', error);
    console.error('❌ ERROR: Error stack:', error.stack);
    return res.status(status).json({ error: error.message || 'Server error' });
  } finally {
    if (client) client.release();
    console.log('🔍 DEBUG: Database connection released');
  }
}; 