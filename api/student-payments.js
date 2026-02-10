const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const authenticateToken = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    throw new Error('No token provided');
  }

  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const decoded = authenticateToken(req);
    const studentId = decoded.id;
    
    console.log('Student ID from token:', studentId);

    console.log('Fetching enrollment data for student:', studentId);

    // Get the initial enrollment data
    const result = await pool.query(`
      SELECT 
        e.enrollment_id,
        e.semester,
        e.total_fee,
        e.payment_status,
        e.next_payment_date,
        e.remaining_balance,
        p.program_name,
        tf.tuition_amount,
        tf.misc_fees,
        tf.lab_fees,
        tf.other_fees
      FROM enrollments e
      JOIN program p ON e.program_id = p.program_id
      LEFT JOIN tuition_fees tf ON e.program_id = tf.program_id 
        AND e.year_id = tf.year_level
        AND e.semester = tf.semester
        AND e.academic_year = tf.academic_year
      WHERE e.student_id = $1 
        AND e.enrollment_status IN ('Verified', 'For Payment', 'Officially Enrolled')
      ORDER BY e.enrollment_date DESC
      LIMIT 1
    `, [studentId]);

    if (!result.rows.length) {
      return res.json([]); // Return empty if no verified enrollment
    }

    // Use the enrollment_id from the first query
    const enrollmentQuery = await pool.query(`
      SELECT e.*, py.year_level, p.program_name
      FROM enrollments e
      JOIN program_year py ON e.year_id = py.year_id
      JOIN program p ON e.program_id = p.program_id
      WHERE e.enrollment_id = $1`, 
      [result.rows[0].enrollment_id]  // Use dynamic enrollment_id instead of hardcoded 3
    );
    console.log('Enrollment details:', enrollmentQuery.rows[0]);

    // Then query tuition fees
    const feesQuery = await pool.query(`
      SELECT * FROM tuition_fees 
      WHERE program_id = $1 
      AND year_level = $2 
      AND semester = $3`,
      [
        enrollmentQuery.rows[0].program_id,
        enrollmentQuery.rows[0].year_level,
        enrollmentQuery.rows[0].semester.replace(/[{"}]/g, '')
      ]
    );
    console.log('Tuition fees found:', feesQuery.rows[0]);

    // Then construct the response
    const enrollment = enrollmentQuery.rows[0];
    const fees = feesQuery.rows[0];
    
    let breakdown;
    
    if (enrollment.student_type === 'transferee') {
      // For transferees, get assigned courses to calculate tuition breakdown
      const assignedCoursesResult = await pool.query(
        `SELECT src.pc_id, pc.course_id, c.course_code, c.course_name, c.units
         FROM student_required_courses src
         JOIN program_course pc ON pc.pc_id = src.pc_id
         JOIN course c ON c.course_id = pc.course_id
         WHERE src.student_id = $1`,
        [enrollment.student_id]
      );

      const assignedCourses = assignedCoursesResult.rows;
      const totalUnits = assignedCourses.reduce((sum, course) => sum + parseFloat(course.units), 0);
      const tuitionAmount = totalUnits * 440;
      
      breakdown = {
        total: parseFloat(enrollment.total_fee || 0),
        tuition: tuitionAmount,
        misc: parseFloat(fees?.misc_fees || 0),
        lab: parseFloat(fees?.lab_fees || 0),
        other: parseFloat(fees?.other_fees || 0),
        units: totalUnits,
        unit_rate: 440,
        assigned_courses: assignedCourses.length
      };
    } else {
      // For regular students, use standard breakdown
      breakdown = {
        total: parseFloat(enrollment.total_fee || 0),
        tuition: parseFloat(fees?.tuition_amount || 0),
        misc: parseFloat(fees?.misc_fees || 0),
        lab: parseFloat(fees?.lab_fees || 0),
        other: parseFloat(fees?.other_fees || 0)
      };
    }
    
    const paymentData = [{
      id: enrollment.enrollment_id,
      semester: enrollment.semester,
      program_name: enrollment.program_name,
      student_type: enrollment.student_type,
      description: `Tuition Fee - ${enrollment.program_name} Year ${enrollment.year_level} (${enrollment.semester.replace(/[{"}]/g, '')} Semester)`,
      dueDate: 'End of Semester',
      amount: parseFloat(enrollment.total_fee || 0),
      remaining_balance: parseFloat(enrollment.remaining_balance || 0),
      status: enrollment.payment_status || 'Unpaid',
      breakdown: breakdown
    }];

    console.log('Final payment data:', paymentData[0]);
    res.json(paymentData);
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({ error: "Failed to fetch payment details" });
  }
};