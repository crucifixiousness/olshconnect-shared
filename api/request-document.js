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

    const result = await pool.query(`
      SELECT 
        req_id,
        doc_type,
        description,
        req_date,
        req_status,
        level_attended,
        grade_strand_course,
        year_graduated,
        academic_credentials,
        certification
      FROM 
        documentrequest
      WHERE 
        id = $1
      ORDER BY 
        req_date DESC
    `, [studentId]);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching document requests:", error);
    res.status(500).json({ message: "Server error while fetching requests." });
  }
};