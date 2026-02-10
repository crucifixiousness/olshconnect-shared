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
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: "Program ID is required" });
      }

      client = await pool.connect();
      const result = await client.query(
        "SELECT program_name FROM program WHERE program_id = $1",
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Program not found" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching program:", error);
      res.status(500).json({ error: "Database error", details: error.message });
    } finally {
      if (client) {
        client.release();
      }
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};