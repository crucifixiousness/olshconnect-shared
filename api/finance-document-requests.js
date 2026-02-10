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

    // Fetch document requests with student info and year level
    const result = await pool.query(`
      SELECT 
        dr.req_id,
        dr.doc_type,
        dr.description,
        dr.req_date,
        dr.req_status,
        dr.document_price,
        dr.academic_credentials,
        dr.certification,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.suffix,
        s.id as student_id,
        py.year_level,
        p.program_name
      FROM 
        documentrequest dr
      JOIN 
        students s ON dr.id = s.id
      LEFT JOIN
        enrollments e ON dr.enrollment_id = e.enrollment_id
      LEFT JOIN
        program_year py ON e.year_id = py.year_id
      LEFT JOIN
        program p ON e.program_id = p.program_id
      WHERE 
        dr.req_status = 'Pending for Payment'
      ORDER BY 
        dr.req_date DESC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching finance document requests:", error);
    res.status(500).json({ message: "Server error while fetching requests." });
  }
};

