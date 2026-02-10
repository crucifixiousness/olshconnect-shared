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

// GET - List pending TOR evaluations for program head OR get existing equivalencies
module.exports = async (req, res) => {
  if (req.method === 'GET') {
    // Check if requesting specific equivalencies
    if (req.query.tor_request_id) {
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
    } else {
      // Original GET logic for listing requests
      let client;
    try {
      const decoded = authenticateToken(req);
      const { program_id } = req.query;

      if (!program_id) {
        return res.status(400).json({ error: 'Program ID is required' });
      }

      client = await pool.connect();

      const query = `
        SELECT 
          ter.id,
          ter.student_id,
          ter.program_id,
          ter.year_id,
          ter.status,
          ter.program_head_reviewed_at,
          ter.tor_document_path,
          s.first_name,
          s.last_name,
          p.program_name,
          py.year_level,
          ter.semester
        FROM tor_evaluation_requests ter
        JOIN students s ON ter.student_id = s.id
        JOIN program p ON ter.program_id = p.program_id
        JOIN program_year py ON ter.year_id = py.year_id
        JOIN enrollments e ON e.student_id = ter.student_id
        WHERE ter.program_id = $1 
          AND ter.status IN ('pending', 'ph_reviewed')
          AND e.enrollment_status = 'Pending TOR'
        ORDER BY ter.id DESC
      `;

      const result = await client.query(query, [program_id]);
      return res.status(200).json({ success: true, requests: result.rows });

    } catch (error) {
      const status = error.status || 500;
      return res.status(status).json({ error: error.message || 'Server error' });
    } finally {
      if (client) client.release();
    }
    }
  }

  // POST - Program head submits course equivalencies
  else if (req.method === 'POST') {
    let client;
    try {
      const decoded = authenticateToken(req);
      const { tor_request_id, equivalencies, comments } = req.body;

      if (!tor_request_id || !equivalencies || !Array.isArray(equivalencies)) {
        return res.status(400).json({ error: 'Invalid request data' });
      }

      client = await pool.connect();

      await client.query('BEGIN');

      // Update TOR request status
      const updateRequestQuery = `
        UPDATE tor_evaluation_requests 
        SET status = 'ph_reviewed',
            program_head_id = $1,
            program_head_reviewed_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      await client.query(updateRequestQuery, [decoded.staff_id, tor_request_id]);

      // Insert only NEW course equivalencies (avoid duplicates)
      for (const equiv of equivalencies) {
        // Check if this equivalency already exists
        const checkQuery = `
          SELECT ce_id FROM course_equivalencies 
          WHERE tor_request_id = $1 
            AND external_course_code = $2 
            AND equivalent_course_id = $3
        `;
        const existingResult = await client.query(checkQuery, [
          tor_request_id,
          equiv.external_course_code,
          equiv.equivalent_course_id
        ]);

        // Only insert if it doesn't already exist
        if (existingResult.rows.length === 0) {
          const insertEquivQuery = `
            INSERT INTO course_equivalencies (
              tor_request_id, external_course_code, external_course_name,
              external_grade, external_units, equivalent_course_id,
              equivalent_course_code, equivalent_course_name,
              source_school, source_academic_year
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `;
          await client.query(insertEquivQuery, [
            tor_request_id,
            equiv.external_course_code,
            equiv.external_course_name,
            equiv.external_grade,
            equiv.external_units,
            equiv.equivalent_course_id,
            equiv.equivalent_course_code,
            equiv.equivalent_course_name,
            equiv.source_school,
            equiv.source_academic_year
          ]);
        }
      }

      await client.query('COMMIT');
      return res.status(200).json({ 
        success: true, 
        message: 'Course equivalencies submitted successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      const status = error.status || 500;
      return res.status(status).json({ 
        error: error.message || 'Server error'
      });
    } finally {
      if (client) client.release();
    }
  }

  else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
};
