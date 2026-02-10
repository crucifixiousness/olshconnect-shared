// api/stafflist.js

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const client = await pool.connect();
      
      const result = await client.query(
        "SELECT staff_id, full_name, role FROM admins WHERE role != 'admin' ORDER BY full_name ASC"
      );
      
      res.json(result.rows);
      client.release();
    } catch (error) {
      console.error("Error fetching staff data:", error);
      res.status(500).json({ error: "Failed to fetch staff data" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};