const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client;
  try {
    const decoded = authenticateToken(req);
    const { id: staff_id } = decoded; // Changed from staff_id to id

    const { enrollment_id, amount_paid, payment_method, reference_number, remarks } = req.body;

    if (!enrollment_id || !amount_paid || !payment_method) {
      return res.status(400).json({ error: 'Missing required payment details' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Get enrollment details with student info
    const enrollmentResult = await client.query(
      `SELECT e.*, s.first_name, s.last_name, s.id as student_id
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       WHERE e.enrollment_id = $1 
       AND e.enrollment_status IN ('Verified', 'Officially Enrolled', 'For Payment')`,
      [enrollment_id]
    );

    if (enrollmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: "No eligible enrollment found. Enrollment must be Verified, Officially Enrolled, or For Payment."
      });
    }

    const enrollment = enrollmentResult.rows[0];
    
    const currentAmountPaid = parseFloat(enrollment.amount_paid || 0);
    const newPaymentAmount = parseFloat(amount_paid);
    const totalAmountPaid = currentAmountPaid + newPaymentAmount;
    const totalFee = parseFloat(enrollment.total_fee);
    
    // Get current balance (which includes document prices if any were added)
    const currentBalance = parseFloat(enrollment.remaining_balance || 0);
    
    // Calculate new balance by subtracting payment from current balance
    // This correctly handles document prices that were already added to the balance
    const newRemainingBalance = currentBalance - newPaymentAmount;

    // Calculate payment status based on remaining balance
    let paymentStatus;
    if (newRemainingBalance <= 0) {
      paymentStatus = 'Fully Paid';
    } else if (newRemainingBalance < currentBalance) {
      paymentStatus = 'Partial';
    } else {
      paymentStatus = 'Unpaid';
    }

    // Check if this is the first payment
    const isFirstPayment = parseFloat(enrollment.amount_paid || 0) === 0;
    // If status is Verified, this payment is for enrollment
    const paymentRemarks = (isFirstPayment || enrollment.enrollment_status === 'Verified') 
      ? "For Enrollment" 
      : `Counter payment for ${enrollment.first_name} ${enrollment.last_name}`;

    // Determine enrollment status update
    // If status is Verified, update to Officially Enrolled when payment is made
    let newEnrollmentStatus = enrollment.enrollment_status;
    if (enrollment.enrollment_status === 'Verified') {
      newEnrollmentStatus = 'Officially Enrolled';
    }

    // Update enrollment status and payment details
    await client.query(`
      UPDATE enrollments 
      SET amount_paid = $1,
          remaining_balance = $2,
          payment_status = $3,
          enrollment_status = $4
      WHERE enrollment_id = $5`,
      [
        totalAmountPaid,
        newRemainingBalance,
        paymentStatus,
        newEnrollmentStatus,
        enrollment_id
      ]
    );

    // Get current date in Philippines timezone...
    const paymentDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const dateStr = paymentDate.toLocaleDateString('en-US', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Manila'
    }).split('/').reverse()[0] + // year
        paymentDate.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          timeZone: 'Asia/Manila'
        }).split('/').join(''); // month and day
    
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const generatedRefNumber = `PAY${dateStr}${randomNum}`;

    // Insert payment transaction
    const result = await client.query(`
      INSERT INTO payment_transactions (
        enrollment_id,
        student_id,
        amount_paid,
        payment_date,
        payment_method,
        reference_number,
        remarks,
        payment_status,
        processed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING transaction_id`,
      [
        enrollment_id,
        enrollment.student_id,
        parseFloat(amount_paid),
        paymentDate,
        payment_method,
        generatedRefNumber,
        paymentRemarks,
        paymentStatus,
        staff_id
      ]
    );

    // Note: Enrollment was already updated above with all necessary fields

    // Check if there are document requests pending for payment for this enrollment
    // Update document request status to "Processing" if payment covers document costs
    const documentRequestsResult = await client.query(
      `SELECT req_id, document_price, req_status
       FROM documentrequest
       WHERE enrollment_id = $1
       AND req_status = 'Pending for Payment'`,
      [enrollment_id]
    );

    if (documentRequestsResult.rows.length > 0) {
      // Check if payment amount covers document requests
      const totalDocumentPrice = documentRequestsResult.rows.reduce(
        (sum, doc) => sum + parseFloat(doc.document_price || 0), 
        0
      );

      // If payment is sufficient to cover document requests, update their status
      // Note: We'll update all pending document requests if payment covers them
      // In a real scenario, you might want more granular logic
      if (newPaymentAmount >= totalDocumentPrice || totalAmountPaid >= totalDocumentPrice) {
        await client.query(
          `UPDATE documentrequest
           SET req_status = 'Processing'
           WHERE enrollment_id = $1
           AND req_status = 'Pending for Payment'`,
          [enrollment_id]
        );
      }
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      transaction_id: result.rows[0].transaction_id,
      payment_status: paymentStatus,
      remaining_balance: newRemainingBalance
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Error processing payment:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error processing payment: ' + error.message 
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};