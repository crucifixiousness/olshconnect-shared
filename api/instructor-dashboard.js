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

      // Get assigned classes count
      const assignedClassesResult = await client.query(
        `SELECT COUNT(DISTINCT assignment_id) as total
         FROM course_assignments
         WHERE staff_id = $1`,
        [staff_id]
      );

      // Get total students count
      const totalStudentsResult = await client.query(
        `SELECT COUNT(DISTINCT e.student_id) as total
         FROM enrollments e
         JOIN program_course pc ON e.program_id = pc.program_id
         JOIN course_assignments ca ON pc.pc_id = ca.pc_id
         WHERE ca.staff_id = $1
         AND e.enrollment_status = 'Approved'`,
        [staff_id]
      );

      // Get today's classes count
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const todayClassesResult = await client.query(
        `SELECT COUNT(DISTINCT assignment_id) as total
         FROM course_assignments
         WHERE staff_id = $1 AND day = $2`,
        [staff_id, today]
      );

      // Get pending grades count
      const pendingGradesResult = await client.query(
        `SELECT COUNT(DISTINCT e.student_id) as total
         FROM enrollments e
         JOIN program_course pc ON e.program_id = pc.program_id
         JOIN course_assignments ca ON pc.pc_id = ca.pc_id
         WHERE ca.staff_id = $1 
         AND e.enrollment_status = 'Approved'
         AND (e.payment_status = 'Paid' OR e.payment_status IS NULL)`,
        [staff_id]
      );

      const dashboardData = {
        assignedClasses: parseInt(assignedClassesResult.rows[0].total) || 0,
        totalStudents: parseInt(totalStudentsResult.rows[0].total) || 0,
        todayClasses: parseInt(todayClassesResult.rows[0].total) || 0,
        pendingGrades: parseInt(pendingGradesResult.rows[0].total) || 0
      };

      res.json(dashboardData);
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
        error: "Failed to fetch dashboard data",
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