const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const authenticateToken = (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('No token provided');
  }

  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    let client;
    try {
      const decoded = authenticateToken(req, res);
      req.user = decoded;

      const { staff_id } = req.query;
      client = await pool.connect();

      // Get course assignments for Class Management - each assignment is separate
      const result = await client.query(
        `SELECT
          ca.pc_id,
          ca.assignment_id,
          ca.section,
          c.course_code,
          c.course_name,
          c.units,
          pc.semester,
          p.program_name,
          py.year_level,
          ca.day,
          TO_CHAR(ca.start_time, 'HH12:MI AM') as start_time,
          TO_CHAR(ca.end_time, 'HH12:MI AM') as end_time
         FROM course_assignments ca
         JOIN program_course pc ON ca.pc_id = pc.pc_id
         JOIN course c ON pc.course_id = c.course_id
         JOIN program p ON pc.program_id = p.program_id
         JOIN program_year py ON pc.year_id = py.year_id
         WHERE ca.staff_id = $1
         ORDER BY c.course_code, ca.section, ca.day, ca.start_time`,
        [staff_id]
      );

      if (result.rows.length === 0) {
        return res.json([]);
      }

      res.json(result.rows);
      client.release();
    } catch (error) {
      console.error("Detailed error:", {
        message: error.message,
        stack: error.stack,
        type: error.name
      });
      
      if (error.message === 'No token provided' || error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Authentication failed' });
      }
      
      res.status(500).json({ 
        error: "Failed to fetch instructor classes",
        details: error.message 
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}; 