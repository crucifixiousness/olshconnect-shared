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

    // Get total revenue (sum of all payments)
    const totalRevenueResult = await pool.query(`
      SELECT CAST(COALESCE(SUM(amount_paid), 0) AS DECIMAL(10,2)) as total_revenue
      FROM payment_transactions
      WHERE payment_status IN ('Fully Paid', 'Partial')
    `);
    console.log('Debug - Total Revenue Query Result:', totalRevenueResult.rows[0]);

    // Get total students who have paid (distinct students with payments)
    const totalStudentsPaidResult = await pool.query(`
      SELECT COUNT(DISTINCT student_id) as total_students_paid
      FROM payment_transactions
      WHERE payment_status IN ('Fully Paid', 'Partial')
    `);
    console.log('Debug - Total Students Paid Query Result:', totalStudentsPaidResult.rows[0]);

    // Get pending payments (students with verified, for payment, or officially enrolled status who haven't paid or aren't fully paid)
    const pendingPaymentsResult = await pool.query(`
      SELECT COUNT(DISTINCT e.student_id) as pending_payments
      FROM enrollments e
      WHERE e.enrollment_status IN ('Verified', 'For Payment', 'Officially Enrolled')
      AND (
        e.payment_status = 'Unpaid' 
        OR e.payment_status = 'Partial'
        OR e.payment_status IS NULL
      )
    `);
    console.log('Debug - Pending Payments Query Result:', pendingPaymentsResult.rows[0]);

    // Get total balance (sum of all remaining balances)
    const totalBalanceResult = await pool.query(`
      SELECT CAST(COALESCE(SUM(remaining_balance), 0) AS DECIMAL(10,2)) as total_balance
      FROM enrollments
      WHERE enrollment_status IN ('Verified', 'For Payment', 'Officially Enrolled')
      AND remaining_balance > 0
    `);
    console.log('Debug - Total Balance Query Result:', totalBalanceResult.rows[0]);

    // Get recent transactions (last 10 payments with detailed info)
    const recentTransactionsResult = await pool.query(`
      SELECT 
        pt.transaction_id,
        CAST(pt.amount_paid AS DECIMAL(10,2)) as amount_paid,
        pt.payment_date,
        pt.payment_method,
        pt.reference_number,
        pt.remarks,
        pt.payment_status,
        CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
        s.id as student_id,
        p.program_name,
        py.year_level
      FROM payment_transactions pt
      JOIN students s ON pt.student_id = s.id
      JOIN enrollments e ON pt.enrollment_id = e.enrollment_id
      JOIN program p ON e.program_id = p.program_id
      JOIN program_year py ON e.year_id = py.year_id
      WHERE pt.payment_status IN ('Fully Paid', 'Partial')
      ORDER BY pt.payment_date DESC
      LIMIT 10
    `);
    console.log('Debug - Recent Transactions Count:', recentTransactionsResult.rows.length);
    console.log('Debug - Recent Transactions Sample:', recentTransactionsResult.rows[0]);

    // Debug: Check what payment statuses exist
    const paymentStatusDebug = await pool.query(`
      SELECT payment_status, COUNT(*) as count
      FROM payment_transactions
      GROUP BY payment_status
    `);
    console.log('Debug - Payment Statuses in Database:', paymentStatusDebug.rows);

    // Debug: Check what enrollment statuses exist
    const enrollmentStatusDebug = await pool.query(`
      SELECT enrollment_status, COUNT(*) as count
      FROM enrollments
      GROUP BY enrollment_status
    `);
    console.log('Debug - Enrollment Statuses in Database:', enrollmentStatusDebug.rows);

    // Get payment statistics for charts
    const paymentStatsResult = await pool.query(`
      SELECT 
        DATE_TRUNC('month', payment_date) as month,
        COUNT(*) as transaction_count,
        CAST(SUM(amount_paid) AS DECIMAL(10,2)) as monthly_revenue
      FROM payment_transactions
      WHERE payment_status IN ('Fully Paid', 'Partial')
      AND payment_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', payment_date)
      ORDER BY month DESC
    `);

    // Get payment method distribution
    const paymentMethodStatsResult = await pool.query(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        CAST(SUM(amount_paid) AS DECIMAL(10,2)) as total_amount
      FROM payment_transactions
      WHERE payment_status IN ('Fully Paid', 'Partial')
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `);
    console.log('Debug - Payment Methods Distribution:', paymentMethodStatsResult.rows);

    // Debug: Check all payment methods in database
    const allPaymentMethodsDebug = await pool.query(`
      SELECT payment_method, COUNT(*) as count
      FROM payment_transactions
      GROUP BY payment_method
    `);
    console.log('Debug - All Payment Methods in Database:', allPaymentMethodsDebug.rows);

    // Get program-wise payment statistics
    const programStatsResult = await pool.query(`
      SELECT 
        p.program_name,
        COUNT(DISTINCT e.student_id) as student_count,
        CAST(COALESCE(SUM(pt.amount_paid), 0) AS DECIMAL(10,2)) as total_revenue
      FROM enrollments e
      JOIN program p ON e.program_id = p.program_id
      LEFT JOIN payment_transactions pt ON e.enrollment_id = pt.enrollment_id AND pt.payment_status IN ('Fully Paid', 'Partial')
      WHERE e.enrollment_status IN ('Verified', 'For Payment', 'Officially Enrolled')
      GROUP BY p.program_name
      ORDER BY total_revenue DESC
    `);

    res.status(200).json({
      totalRevenue: parseFloat(totalRevenueResult.rows[0].total_revenue) || 0,
      totalStudentsPaid: parseInt(totalStudentsPaidResult.rows[0].total_students_paid) || 0,
      pendingPayments: parseInt(pendingPaymentsResult.rows[0].pending_payments) || 0,
      totalBalance: parseFloat(totalBalanceResult.rows[0].total_balance) || 0,
      recentTransactions: recentTransactionsResult.rows,
      paymentStats: {
        monthlyData: paymentStatsResult.rows,
        paymentMethods: paymentMethodStatsResult.rows,
        programStats: programStatsResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching finance dashboard data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch finance dashboard data',
      details: error.message
    });
  }
}; 