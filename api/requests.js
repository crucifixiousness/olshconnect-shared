const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const authenticateJWT = (req) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    throw new Error("Access denied");
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    return user;
  } catch (err) {
    throw new Error("Invalid token");
  }
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      // Verify JWT token
      authenticateJWT(req);
      
      const client = await pool.connect();
      const result = await client.query(`
        SELECT 
          dr.req_id,
          dr.doc_type,
          dr.description,
          dr.req_date,
          dr.req_status,
          s.first_name,
          s.middle_name,
          s.last_name,
          s.suffix,
          s.id as student_id
        FROM 
          documentrequest dr
        JOIN 
          students s ON dr.id = s.id
        ORDER BY 
          dr.req_date DESC
      `);
      
      res.status(200).json(result.rows);
      client.release();
    } catch (error) {
      console.error("Error fetching all document requests:", error);
      if (error.message === "Access denied" || error.message === "Invalid token") {
        res.status(403).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Server error while fetching requests." });
      }
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};