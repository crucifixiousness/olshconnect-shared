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

// GET - List TOR evaluations ready for registrar approval
module.exports = async (req, res) => {
  // GET - Get course equivalencies for a specific TOR request (handle this FIRST)
  if (req.method === 'GET' && req.query.tor_request_id) {
    let client;
    try {
      const decoded = authenticateToken(req);
      const { tor_request_id } = req.query;
      client = await pool.connect();

      const query = `
        SELECT 
          ce.*,
          c.course_name as equivalent_course_name,
          c.units as equivalent_units
        FROM course_equivalencies ce
        LEFT JOIN course c ON ce.equivalent_course_id = c.course_id
        WHERE ce.tor_request_id = $1
        ORDER BY ce.external_course_code
      `;

      const result = await client.query(query, [tor_request_id]);
      return res.status(200).json({ success: true, equivalencies: result.rows });

    } catch (error) {
      const status = error.status || 500;
      return res.status(status).json({ error: error.message || 'Server error' });
    } finally {
      if (client) client.release();
    }
  }

  // GET - List TOR evaluations ready for registrar approval
  else if (req.method === 'GET') {
    let client;
    try {
      const decoded = authenticateToken(req);
      client = await pool.connect();

      const query = `
        SELECT 
          ter.id,
          ter.student_id,
          ter.status,
          ter.program_head_reviewed_at,
          s.first_name,
          s.last_name,
          p.program_name,
          py.year_level,
          ter.semester,
          ph.full_name as program_head_name
        FROM tor_evaluation_requests ter
        JOIN students s ON ter.student_id = s.id
        JOIN program p ON ter.program_id = p.program_id
        JOIN program_year py ON ter.year_id = py.year_id
        JOIN enrollments e ON e.student_id = ter.student_id
        LEFT JOIN admins ph ON ter.program_head_id = ph.staff_id
        WHERE ter.status = 'ph_reviewed'
          AND e.enrollment_status = 'Pending TOR'
        ORDER BY ter.program_head_reviewed_at ASC
      `;

      const result = await client.query(query);
      return res.status(200).json({ success: true, requests: result.rows });

    } catch (error) {
      const status = error.status || 500;
      return res.status(status).json({ error: error.message || 'Server error' });
    } finally {
      if (client) client.release();
    }
  }

  // POST - Registrar approves credit transfers
  else if (req.method === 'POST') {
    let client;
    try {
      const decoded = authenticateToken(req);
      const { tor_request_id, action, comments } = req.body; // action: 'approve' or 'reject'

      if (!tor_request_id || !action) {
        return res.status(400).json({ error: 'Invalid request data' });
      }

      client = await pool.connect();
      await client.query('BEGIN');

      if (action === 'approve') {
        // Update TOR request status
        const updateRequestQuery = `
          UPDATE tor_evaluation_requests 
          SET status = 'registrar_approved',
              registrar_id = $1,
              registrar_approved_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `;
        await client.query(updateRequestQuery, [decoded.staff_id, tor_request_id]);

        // Get the student and program info
        const studentQuery = `
          SELECT ter.student_id, ter.program_id, ter.year_id, ter.semester
          FROM tor_evaluation_requests ter
          WHERE ter.id = $1
        `;
        const studentResult = await client.query(studentQuery, [tor_request_id]);
        const { student_id, program_id, year_id, semester } = studentResult.rows[0];

        // Get approved equivalencies and create credit transfer records
        const equivalenciesQuery = `
          SELECT * FROM course_equivalencies 
          WHERE tor_request_id = $1
        `;
        const equivResult = await client.query(equivalenciesQuery, [tor_request_id]);

        for (const equiv of equivResult.rows) {
          // Insert into student_grade_conversions
          const insertTransferQuery = `
            INSERT INTO student_credit_transfers (
              student_id, course_id, tor_request_id,
              external_course_code, external_course_name,
              external_grade, credits_earned,
              source_school, source_academic_year
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `;
          await client.query(insertTransferQuery, [
            student_id,
            equiv.equivalent_course_id,
            tor_request_id,
            equiv.external_course_code,
            equiv.external_course_name,
            equiv.external_grade,
            equiv.credits_granted,
            equiv.source_school,
            equiv.source_academic_year
          ]);

          // Insert into grades table with actual converted grade
          const insertGradeQuery = `
            INSERT INTO grades (
              student_id, pc_id, final_grade, approval_status,
              is_transfer_credit, transfer_source_id
            ) 
            SELECT 
              $1, pc.pc_id, $2, 'final',
              true, sct.sct_id
            FROM program_course pc
            JOIN student_credit_transfers sct ON sct.course_id = pc.course_id
            WHERE pc.program_id = $3 
              AND pc.year_id = $4 
              AND pc.semester = $5
              AND sct.student_id = $1
              AND sct.tor_request_id = $6
          `;
          await client.query(insertGradeQuery, [
            student_id, 
            equiv.external_grade, 
            program_id, 
            year_id, 
            semester, 
            tor_request_id
          ]);
        }

        // Update enrollment status from 'Pending TOR' to 'Verified' when credit transfer is approved
        const updateEnrollmentQuery = `
          UPDATE enrollments 
          SET enrollment_status = 'Verified'
          WHERE student_id = $1 
            AND enrollment_status = 'Pending TOR'
        `;
        await client.query(updateEnrollmentQuery, [student_id]);
      } else if (action === 'reject') {
        // Update TOR request status to rejected
        const updateRequestQuery = `
          UPDATE tor_evaluation_requests 
          SET status = 'rejected',
              registrar_id = $1,
              registrar_approved_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `;
        await client.query(updateRequestQuery, [decoded.staff_id, tor_request_id]);
      }

      await client.query('COMMIT');
      return res.status(200).json({ 
        success: true, 
        message: `Credit transfer ${action}d successfully` 
      });

    } catch (error) {
      await client.query('ROLLBACK');
      const status = error.status || 500;
      return res.status(status).json({ error: error.message || 'Server error' });
    } finally {
      if (client) client.release();
    }
  }

  else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
};
