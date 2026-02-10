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
    const { student_id, enrollment_id } = req.query;

    if (!student_id || !enrollment_id) {
      return res.status(400).json({ error: 'student_id and enrollment_id are required' });
    }

    client = await pool.connect();

    // Get enrollment details
    const enrollmentResult = await client.query(
      `SELECT e.*, p.program_name, py.year_level
       FROM enrollments e
       JOIN program p ON e.program_id = p.program_id
       JOIN program_year py ON e.year_id = py.year_id
       WHERE e.enrollment_id = $1 AND e.student_id = $2`,
      [enrollment_id, student_id]
    );

    if (enrollmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const enrollment = enrollmentResult.rows[0];

    // Check if student is transferee
    if (enrollment.student_type !== 'transferee') {
      return res.status(400).json({ error: 'Student is not a transferee' });
    }

    // Get assigned courses for this student (from student_required_courses)
    const assignedCoursesResult = await client.query(
      `SELECT src.pc_id, pc.course_id, c.course_code, c.course_name, c.units
       FROM student_required_courses src
       JOIN program_course pc ON pc.pc_id = src.pc_id
       JOIN course c ON c.course_id = pc.course_id
       WHERE src.student_id = $1`,
      [student_id]
    );

    const assignedCourses = assignedCoursesResult.rows;

    // Calculate total units
    const totalUnits = assignedCourses.reduce((sum, course) => sum + parseFloat(course.units), 0);

    // Calculate tuition based on units (₱440 per unit)
    const tuitionAmount = totalUnits * 440;

    // Get miscellaneous fees from tuition_fees table for the enrolled year/semester
    const feesResult = await client.query(
      `SELECT misc_fees, lab_fees, other_fees
       FROM tuition_fees
       WHERE program_id = $1 AND year_level = $2 AND semester = $3 AND academic_year = $4`,
      [enrollment.program_id, enrollment.year_level, enrollment.semester, enrollment.academic_year]
    );

    const fees = feesResult.rows[0] || { misc_fees: 0, lab_fees: 0, other_fees: 0 };

    // Calculate total fee
    const miscFees = parseFloat(fees.misc_fees || 0);
    const labFees = parseFloat(fees.lab_fees || 0);
    const otherFees = parseFloat(fees.other_fees || 0);
    const totalFee = tuitionAmount + miscFees + labFees + otherFees;

    return res.status(200).json({
      success: true,
      student_id: parseInt(student_id),
      enrollment_id: parseInt(enrollment_id),
      student_type: 'transferee',
      assigned_courses: assignedCourses,
      total_units: totalUnits,
      fee_breakdown: {
        tuition_amount: tuitionAmount,
        misc_fees: miscFees,
        lab_fees: labFees,
        other_fees: otherFees,
        total_fee: totalFee
      },
      calculation_details: {
        units_per_unit_rate: 440,
        total_units: totalUnits,
        tuition_calculation: `${totalUnits} units × ₱440 = ₱${tuitionAmount.toLocaleString()}`
      }
    });

  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Server error' });
  } finally {
    if (client) client.release();
  }
};
