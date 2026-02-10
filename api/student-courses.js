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

    console.log('🔍 DEBUG: Student ID from token:', studentId);

    client = await pool.connect();
    console.log('🔍 DEBUG: Database connection established');

    // Detect if enrollments.major_id column exists
    const majorColumnCheck = await client.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_name = 'enrollments' AND column_name = 'major_id'
       LIMIT 1`
    );

    const hasMajorIdColumn = majorColumnCheck.rows.length > 0;
    console.log('🔍 DEBUG: enrollments.major_id column exists?', hasMajorIdColumn);

    // Get the student's latest enrollment details
    const enrollmentQuery = hasMajorIdColumn
      ? `SELECT e.program_id, e.year_id, e.semester, e.major_id, py.year_level
         FROM enrollments e
         JOIN program_year py ON e.year_id = py.year_id
         WHERE e.student_id = $1
         ORDER BY e.enrollment_date DESC
         LIMIT 1`
      : `SELECT e.program_id, e.year_id, e.semester, NULL AS major_id, py.year_level
         FROM enrollments e
         JOIN program_year py ON e.year_id = py.year_id
         WHERE e.student_id = $1
         ORDER BY e.enrollment_date DESC
         LIMIT 1`;

    console.log('🔍 DEBUG: Enrollment query:', enrollmentQuery);
    console.log('🔍 DEBUG: Query parameters:', [studentId]);

    const enrollmentResult = await client.query(enrollmentQuery, [studentId]);
    console.log('🔍 DEBUG: Enrollment query result rows:', enrollmentResult.rows.length);
    console.log('🔍 DEBUG: Enrollment query result:', JSON.stringify(enrollmentResult.rows, null, 2));

    if (enrollmentResult.rows.length === 0) {
      console.log('❌ DEBUG: No enrollment found for student');
      return res.status(404).json({ error: 'No enrollment found for this student' });
    }

    const { program_id, year_id, semester, major_id } = enrollmentResult.rows[0];
    console.log('🔍 DEBUG: Extracted enrollment data:', {
      program_id,
      year_id,
      semester,
      major_id,
      major_id_type: typeof major_id
    });

    // Check if program_course table has major_id column
    const programCourseMajorCheck = await client.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_name = 'program_course' AND column_name = 'major_id'
       LIMIT 1`
    );

    const hasProgramCourseMajorId = programCourseMajorCheck.rows.length > 0;
    console.log('🔍 DEBUG: program_course.major_id column exists?', hasProgramCourseMajorId);

    // Fetch the courses for the student's program/year/semester and (optional) major
    let coursesQuery;
    let queryParams;

    // Normalize semester from JSON format to plain text
    let normalizedSemester = semester;
    if (typeof semester === 'string' && semester.startsWith('{') && semester.endsWith('}')) {
      try {
        const parsed = JSON.parse(semester);
        normalizedSemester = Array.isArray(parsed) ? parsed[0] : parsed;
        console.log('🔍 DEBUG: Normalized semester from JSON:', { original: semester, normalized: normalizedSemester });
      } catch (parseErr) {
        console.log('🔍 DEBUG: Failed to parse semester JSON:', parseErr.message);
      }
    }

    // For transferees, get courses from student_required_courses
    // For regular students, get courses from program_course
    const studentTypeQuery = `SELECT student_type FROM enrollments WHERE student_id = $1 ORDER BY enrollment_date DESC LIMIT 1`;
    const studentTypeResult = await client.query(studentTypeQuery, [studentId]);
    const studentType = studentTypeResult.rows[0]?.student_type || 'new';

    console.log('🔍 DEBUG: Student type:', studentType);

    if (studentType === 'transferee') {
      // For transferees: show only courses assigned by Program Head
      coursesQuery = `SELECT c.course_code, c.course_name, c.units, pc.semester, py.year_level,
                             'Assigned' as course_status,
                             COALESCE(
                               json_agg(
                                 json_build_object(
                                   'course_id', cp.prerequisite_course_id,
                                   'course_code', prereq.course_code
                                 )
                               ) FILTER (WHERE cp.prerequisite_course_id IS NOT NULL),
                               '[]'::json
                             ) as prerequisites
                      FROM student_required_courses src
                      JOIN program_course pc ON src.pc_id = pc.pc_id
                      JOIN course c ON pc.course_id = c.course_id
                      JOIN program_year py ON pc.year_id = py.year_id
                      LEFT JOIN course_prerequisites cp ON c.course_id = cp.course_id
                      LEFT JOIN course prereq ON cp.prerequisite_course_id = prereq.course_id
                      WHERE src.student_id = $1
                      GROUP BY c.course_code, c.course_name, c.units, pc.semester, py.year_level
                      ORDER BY c.course_name`;
      queryParams = [studentId];
    } else {
      // For regular students: show all program courses (existing logic)
      if (hasProgramCourseMajorId) {
        coursesQuery = `SELECT c.course_code, c.course_name, c.units, pc.semester, py.year_level,
                               pc.major_id, m.major_name, 'Regular' as course_status,
                               COALESCE(
                                 json_agg(
                                   json_build_object(
                                     'course_id', cp.prerequisite_course_id,
                                     'course_code', prereq.course_code
                                   )
                                 ) FILTER (WHERE cp.prerequisite_course_id IS NOT NULL),
                                 '[]'::json
                               ) as prerequisites
                        FROM program_course pc
                        JOIN course c ON pc.course_id = c.course_id
                        JOIN program_year py ON pc.year_id = py.year_id
                        LEFT JOIN majors m ON pc.major_id = m.major_id
                        LEFT JOIN course_prerequisites cp ON c.course_id = cp.course_id
                        LEFT JOIN course prereq ON cp.prerequisite_course_id = prereq.course_id
                        WHERE pc.program_id = $1
                          AND pc.year_id = $2
                          AND pc.semester = $3
                          AND (
                            pc.major_id IS NULL
                            OR pc.major_id = $4
                          )
                        GROUP BY c.course_code, c.course_name, c.units, pc.semester, py.year_level, pc.major_id, m.major_name
                        ORDER BY c.course_name`;
        queryParams = [program_id, year_id, normalizedSemester, major_id];
      } else {
        coursesQuery = `SELECT c.course_code, c.course_name, c.units, pc.semester, py.year_level,
                               'Regular' as course_status,
                               COALESCE(
                                 json_agg(
                                   json_build_object(
                                     'course_id', cp.prerequisite_course_id,
                                     'course_code', prereq.course_code
                                   )
                                 ) FILTER (WHERE cp.prerequisite_course_id IS NOT NULL),
                                 '[]'::json
                               ) as prerequisites
                        FROM program_course pc
                        JOIN course c ON pc.course_id = c.course_id
                        JOIN program_year py ON pc.year_id = py.year_id
                        LEFT JOIN course_prerequisites cp ON c.course_id = cp.course_id
                        LEFT JOIN course prereq ON cp.prerequisite_course_id = prereq.course_id
                        WHERE pc.program_id = $1
                          AND pc.year_id = $2
                          AND pc.semester = $3
                        GROUP BY c.course_code, c.course_name, c.units, pc.semester, py.year_level
                        ORDER BY c.course_name`;
        queryParams = [program_id, year_id, normalizedSemester];
      }
    }

    console.log('🔍 DEBUG: Courses query:', coursesQuery);
    console.log('🔍 DEBUG: Courses query parameters:', queryParams);

    const coursesResult = await client.query(coursesQuery, queryParams);
    console.log('🔍 DEBUG: Courses query result rows:', coursesResult.rows.length);
    console.log('🔍 DEBUG: Courses query result:', JSON.stringify(coursesResult.rows, null, 2));

    // Let's also check what's actually in the program_course table for this program/year/semester
    const debugQuery = `SELECT pc_id, program_id, year_id, course_id, semester, 
                               CASE WHEN column_name = 'major_id' THEN 'EXISTS' ELSE 'MISSING' END as major_id_status
                        FROM program_course pc
                        CROSS JOIN (
                          SELECT column_name 
                          FROM information_schema.columns 
                          WHERE table_name = 'program_course' AND column_name = 'major_id'
                        ) col_check
                        WHERE pc.program_id = $1 AND pc.year_id = $2 AND pc.semester = $3
                        LIMIT 5`;

    try {
      const debugResult = await client.query(debugQuery, [program_id, year_id, semester]);
      console.log('🔍 DEBUG: Sample program_course data for this program/year/semester:', JSON.stringify(debugResult.rows, null, 2));
    } catch (debugErr) {
      console.log('🔍 DEBUG: Could not run debug query:', debugErr.message);
    }

    // NEW: Let's see what semester values actually exist in program_course for this program/year
    const semesterDebugQuery = `
      SELECT DISTINCT semester, COUNT(*) as course_count
      FROM program_course 
      WHERE program_id = $1 AND year_id = $2
      GROUP BY semester
      ORDER BY semester`;

    try {
      const semesterDebugResult = await client.query(semesterDebugQuery, [program_id, year_id]);
      console.log('🔍 DEBUG: Available semesters in program_course for this program/year:', JSON.stringify(semesterDebugResult.rows, null, 2));
    } catch (semesterDebugErr) {
      console.log('🔍 DEBUG: Could not run semester debug query:', semesterDebugErr.message);
    }

    const response = {
      program_id,
      year_id,
      semester,
      major_id,
      courses: coursesResult.rows,
      debug_info: {
        has_enrollments_major_id: hasMajorIdColumn,
        has_program_course_major_id: hasProgramCourseMajorId,
        total_courses_found: coursesResult.rows.length
      }
    };

    console.log('🔍 DEBUG: Final response:', JSON.stringify(response, null, 2));
    return res.status(200).json(response);
  } catch (error) {
    const status = error.status || 500;
    console.error('❌ ERROR: Error fetching student courses:', error);
    console.error('❌ ERROR: Error stack:', error.stack);
    return res.status(status).json({ error: error.message || 'Server error' });
  } finally {
    if (client) client.release();
    console.log('🔍 DEBUG: Database connection released');
  }
};
