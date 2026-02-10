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

    const result = await pool.query(`
      SELECT 
        dr.req_id,
        dr.doc_type,
        dr.description,
        dr.req_date,
        dr.req_status,
        dr.level_attended,
        dr.grade_strand_course,
        dr.year_graduated,
        dr.academic_credentials,
        dr.certification,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.suffix,
        s.email,
        s.id as student_id
      FROM 
        documentrequest dr
      JOIN 
        students s ON dr.id = s.id
      ORDER BY 
        dr.req_date DESC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching all document requests:", error);
    res.status(500).json({ message: "Server error while fetching requests." });
  }
};