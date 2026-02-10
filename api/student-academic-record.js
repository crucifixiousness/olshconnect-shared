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
    const studentId = decoded.id;

    client = await pool.connect();

    // Get the student's latest enrollment (program/year/semester)
    const enrollmentQuery = `
      SELECT e.program_id, e.year_id, e.semester, py.year_level, p.program_name
      FROM enrollments e
      JOIN program_year py ON e.year_id = py.year_id
      JOIN program p ON e.program_id = p.program_id
      WHERE e.student_id = $1
      ORDER BY e.enrollment_date DESC
      LIMIT 1
    `;
    const enrollmentResult = await client.query(enrollmentQuery, [studentId]);
    if (enrollmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'No enrollment found for this student' });
    }

    const { program_id, year_id, semester, year_level, program_name } = enrollmentResult.rows[0];

    // Check if student is transferee
    const studentTypeQuery = `SELECT student_type FROM enrollments WHERE student_id = $1 ORDER BY enrollment_date DESC LIMIT 1`;
    const studentTypeResult = await client.query(studentTypeQuery, [studentId]);
    const studentType = studentTypeResult.rows[0]?.student_type || 'new';

    console.log('🔍 DEBUG Academic Records: Student type:', studentType);

    let coursesQuery;
    let queryParams;

    if (studentType === 'transferee') {
      // For transferees: show only assigned courses + transfer credits
      coursesQuery = `
        SELECT 
          c.course_code,
          c.course_name,
          c.units,
          pc.semester,
          COALESCE(g.final_grade::text, '') AS final_grade,
          g.approval_status,
          g.dean_approved_at,
          CASE 
            WHEN g.is_transfer_credit = true THEN 'Transfer Credit'
            ELSE 'Assigned Course'
          END AS course_type,
          CASE 
            WHEN g.is_transfer_credit = true THEN sct.external_course_code
            ELSE NULL
          END AS external_course_code,
          CASE 
            WHEN g.is_transfer_credit = true THEN sct.source_school
            ELSE NULL
          END AS source_school,
          CASE 
            WHEN g.is_transfer_credit = true THEN sct.source_academic_year
            ELSE NULL
          END AS source_academic_year,
          CASE 
            WHEN g.is_transfer_credit = true THEN sct.external_grade
            ELSE NULL
          END AS external_grade
        FROM student_required_courses src
        JOIN program_course pc ON src.pc_id = pc.pc_id
        JOIN course c ON pc.course_id = c.course_id
        LEFT JOIN grades g 
          ON g.student_id = $1 
         AND g.pc_id = pc.pc_id 
         AND ((g.approval_status IN ('reg_approved','registrar_approved','final')) OR g.is_transfer_credit = true)
        LEFT JOIN student_credit_transfers sct 
          ON g.transfer_source_id = sct.sct_id
        WHERE src.student_id = $1
        ORDER BY c.course_code
      `;
      queryParams = [studentId];
    } else {
      // For regular students: show all program courses + transfer credits
      coursesQuery = `
      SELECT 
        c.course_code,
        c.course_name,
        c.units,
        pc.semester,
        COALESCE(g.final_grade::text, '') AS final_grade,
          g.approval_status,
        g.dean_approved_at,
        CASE 
          WHEN g.is_transfer_credit = true THEN 'Transfer Credit'
          ELSE 'Regular Course'
        END AS course_type,
        CASE 
          WHEN g.is_transfer_credit = true THEN sct.external_course_code
          ELSE NULL
        END AS external_course_code,
        CASE 
          WHEN g.is_transfer_credit = true THEN sct.source_school
          ELSE NULL
        END AS source_school,
        CASE 
          WHEN g.is_transfer_credit = true THEN sct.source_academic_year
          ELSE NULL
        END AS source_academic_year,
        CASE 
          WHEN g.is_transfer_credit = true THEN sct.external_grade
          ELSE NULL
        END AS external_grade
      FROM program_course pc
      JOIN course c ON pc.course_id = c.course_id
      LEFT JOIN grades g 
        ON g.student_id = $1 
       AND g.pc_id = pc.pc_id 
         AND ((g.approval_status IN ('reg_approved','registrar_approved','final')) OR g.is_transfer_credit = true)
      LEFT JOIN student_credit_transfers sct 
        ON g.transfer_source_id = sct.sct_id
      WHERE pc.program_id = $2
        AND pc.year_id = $3
        AND pc.semester = $4
      ORDER BY c.course_code
    `;
      queryParams = [studentId, program_id, year_id, semester];
    }

    const coursesResult = await client.query(coursesQuery, queryParams);

    return res.status(200).json({
      success: true,
      enrollment: { program_id, year_id, semester, year_level, program_name },
      courses: coursesResult.rows,
      count: coursesResult.rows.length
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Server error' });
  } finally {
    if (client) client.release();
  }
};
