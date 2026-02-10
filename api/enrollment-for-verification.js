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
    // Verify token
    authenticateToken(req);

    // Debug queries to check what data exists
    const debugResult1 = await pool.query(`
      SELECT COUNT(*) as total_count
      FROM enrollments e
      WHERE e.enrollment_status = 'Verified'
    `);
    console.log('Debug - Total Verified enrollments:', debugResult1.rows[0].total_count);

    const debugResult2 = await pool.query(`
      SELECT COUNT(*) as total_count
      FROM enrollment_payment_receipts epr
    `);
    console.log('Debug - Total receipts in enrollment_payment_receipts:', debugResult2.rows[0].total_count);

    const debugResult3 = await pool.query(`
      SELECT COUNT(*) as total_count
      FROM payment_transactions pt
      WHERE pt.remarks = 'For Enrollment'
    `);
    console.log('Debug - Total payment transactions with For Enrollment remarks:', debugResult3.rows[0].total_count);

    // Show all enrollment statuses
    const debugResult4 = await pool.query(`
      SELECT enrollment_status, COUNT(*) as count
      FROM enrollments
      GROUP BY enrollment_status
    `);
    console.log('Debug - All enrollment statuses:', debugResult4.rows);

    // Show all payment transaction remarks
    const debugResult5 = await pool.query(`
      SELECT remarks, COUNT(*) as count
      FROM payment_transactions
      GROUP BY remarks
    `);
    console.log('Debug - All payment transaction remarks:', debugResult5.rows);

    // Check if there are any enrollments with receipts
    const debugResult6 = await pool.query(`
      SELECT COUNT(*) as total_count
      FROM enrollments e
      JOIN enrollment_payment_receipts epr ON e.enrollment_id = epr.enrollment_id
    `);
    console.log('Debug - Total enrollments with receipts:', debugResult6.rows[0].total_count);

    // Check enrollments with receipts and Verified status
    const debugResult7 = await pool.query(`
      SELECT COUNT(*) as total_count
      FROM enrollments e
      JOIN enrollment_payment_receipts epr ON e.enrollment_id = epr.enrollment_id
      WHERE e.enrollment_status = 'Verified'
    `);
    console.log('Debug - Total Verified enrollments with receipts:', debugResult7.rows[0].total_count);

    // Main query - show only students who have uploaded payment receipts
    const result = await pool.query(`
      SELECT DISTINCT
        e.enrollment_id AS "_id",
        CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as "studentName",
        p.program_name as "program",
        py.year_level as "yearLevel",
        e.enrollment_status as "enrollmentStatus",
        encode(epr.receipt_image, 'base64') as "proofOfPayment"
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN program p ON e.program_id = p.program_id
      JOIN program_year py ON e.year_id = py.year_id
      JOIN enrollment_payment_receipts epr ON e.enrollment_id = epr.enrollment_id
      WHERE e.enrollment_status IN ('For Payment', 'Verified')
      ORDER BY "studentName" ASC
    `);

    console.log('Debug - Query results:', {
      rowCount: result.rowCount,
      firstRow: result.rows[0] ? {
        _id: result.rows[0]._id,
        studentName: result.rows[0].studentName,
        program: result.rows[0].program,
        yearLevel: result.rows[0].yearLevel,
        enrollmentStatus: result.rows[0].enrollmentStatus
      } : null
    });

    // Send the results directly without transformation
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Failed to fetch enrollments',
      details: error.message
    });
  }
};