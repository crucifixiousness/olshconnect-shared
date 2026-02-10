const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { pc_id } = req.query;
    let client;

    try {
      client = await pool.connect();
      
      const result = await client.query(
        `SELECT 
          pc.pc_id,
          pc.program_id,
          pc.year_level,
          pc.semester,
          c.course_code,
          c.course_name,
          c.units,
          p.program_name
         FROM program_course pc
         JOIN course c ON pc.course_id = c.course_id
         JOIN program p ON pc.program_id = p.program_id
         WHERE pc.pc_id = $1`,
        [pc_id]
      );

      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: "Course not found" });
      }
    } catch (error) {
      console.error("Error fetching course info:", error);
      res.status(500).json({ error: "Failed to fetch course info" });
    } finally {
      if (client) client.release();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};