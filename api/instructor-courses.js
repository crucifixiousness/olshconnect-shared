const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    let client;
    try {
      const { program_id } = req.query;
      
      client = await pool.connect();
      
      // If program_id is provided, filter by it; otherwise, get all instructors
      let result;
      if (program_id) {
        result = await client.query(
          `SELECT 
            staff_id,
            full_name,
            role
           FROM admins
           WHERE role = 'instructor' 
           AND program_id = $1
           ORDER BY full_name ASC`,
          [program_id]
        );
      } else {
        result = await client.query(
          `SELECT 
            staff_id,
            full_name,
            role
           FROM admins
           WHERE role = 'instructor'
           ORDER BY full_name ASC`
        );
      }
      
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching instructors:", error);
      res.status(500).json({ 
        error: "Failed to fetch instructors",
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