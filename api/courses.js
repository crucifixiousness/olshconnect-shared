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
      client = await pool.connect();
      
      const { program_id } = req.query;
      
      // Get courses with their assigned year levels from program_course table
      // If program_id is provided, only return courses assigned to that program
      let query;
      let params;
      
      if (program_id) {
        query = `
          SELECT c.course_id, c.course_code, c.course_name, c.units, c.prerequisite_id,
                 MIN(py.year_level) as year_level
          FROM course c
          INNER JOIN program_course pc ON c.course_id = pc.course_id
          INNER JOIN program_year py ON pc.year_id = py.year_id
          WHERE pc.program_id = $1
          GROUP BY c.course_id, c.course_code, c.course_name, c.units, c.prerequisite_id
          ORDER BY c.course_code
        `;
        params = [program_id];
      } else {
        query = `
          SELECT DISTINCT c.course_id, c.course_code, c.course_name, c.units, c.prerequisite_id,
                 py.year_level
          FROM course c
          LEFT JOIN program_course pc ON c.course_id = pc.course_id
          LEFT JOIN program_year py ON pc.year_id = py.year_id
          ORDER BY c.course_code
        `;
        params = [];
      }
      
      const result = await client.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching courses:", error);
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