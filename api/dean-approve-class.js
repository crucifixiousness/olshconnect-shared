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
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let client;
  try {
    const decoded = authenticateToken(req);
    const { pcId, assignmentId } = req.body;

    if (!pcId && !assignmentId) {
      return res.status(400).json({ error: 'pcId or assignmentId is required' });
    }

    client = await pool.connect();

    let params = [];
    let paramIndex = 1;

    const setClause = `approval_status = 'dean_approved', dean_approved_at = CURRENT_TIMESTAMP`;

    let updateQuery = '';

    if (assignmentId) {
      const assignRes = await client.query(
        `SELECT ca.pc_id, ca.section, pc.program_id, pc.year_id, pc.semester
         FROM course_assignments ca
         JOIN program_course pc ON pc.pc_id = ca.pc_id
         WHERE ca.assignment_id = $1`,
        [assignmentId]
      );
      if (assignRes.rows.length === 0) {
        return res.status(404).json({ error: 'Assignment not found' });
      }
      const ca = assignRes.rows[0];
      params.push(ca.pc_id, ca.program_id, ca.year_id, ca.semester, ca.section);

      updateQuery = `
        UPDATE grades g
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE g.pc_id = $${paramIndex}
          AND g.student_id IN (
            SELECT e.student_id
            FROM enrollments e
            JOIN student_blocks sb ON e.block_id = sb.block_id
            WHERE e.program_id = $${paramIndex + 1}
              AND e.year_id = $${paramIndex + 2}
              AND e.semester = $${paramIndex + 3}
              AND sb.block_name = $${paramIndex + 4}
          )
          AND g.approval_status = 'ph_approved'
      `;
    } else {
      params.push(pcId);
      updateQuery = `
        UPDATE grades
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE pc_id = $${paramIndex}
          AND approval_status = 'ph_approved'
      `;
    }

    const result = await client.query(updateQuery, params);

    return res.status(200).json({ success: true, updated: result.rowCount });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Server error' });
  } finally {
    if (client) client.release();
  }
};
