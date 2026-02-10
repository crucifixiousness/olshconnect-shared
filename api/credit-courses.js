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
      
      if (!program_id) {
        return res.status(400).json({ error: 'Program ID is required' });
      }
      
      client = await pool.connect();
      
      // Get all courses for the specific program for credit transfer evaluation
      // Include prerequisites so frontend can hide courses whose prereqs aren't yet credited
      const query = `
        SELECT 
          c.course_id, 
          c.course_code, 
          c.course_name, 
          c.units,
          COALESCE(
            json_agg(
              json_build_object(
                'course_id', cp.prerequisite_course_id,
                'course_code', prereq.course_code,
                'course_name', prereq.course_name
              )
            ) FILTER (WHERE cp.prerequisite_course_id IS NOT NULL),
            '[]'::json
          ) AS prerequisites
        FROM program_course pc
        JOIN course c ON c.course_id = pc.course_id
        LEFT JOIN course_prerequisites cp ON c.course_id = cp.course_id
        LEFT JOIN course prereq ON cp.prerequisite_course_id = prereq.course_id
        WHERE pc.program_id = $1
        GROUP BY c.course_id, c.course_code, c.course_name, c.units
        ORDER BY c.course_code`;

      const result = await client.query(query, [program_id]);
      res.json({ courses: result.rows });
    } catch (error) {
      console.error("Error fetching credit courses:", error);
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
