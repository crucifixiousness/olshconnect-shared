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
      
      if (!program_id || program_id === 'null') {
        return res.status(400).json({ error: "Valid program ID is required" });
      }

      client = await pool.connect();
      const result = await client.query(
        `SELECT pc.pc_id, p.program_name, py.year_level, c.course_code, 
                c.course_name, c.units, pc.semester, pc.major_id, m.major_name,
                c.course_id,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'course_id', cp.prerequisite_course_id,
                      'course_code', prereq.course_code,
                      'course_name', prereq.course_name
                    )
                  ) FILTER (WHERE cp.prerequisite_course_id IS NOT NULL),
                  '[]'::json
                ) as prerequisites
         FROM program_course pc
         JOIN program p ON pc.program_id = p.program_id
         JOIN program_year py ON pc.year_id = py.year_id
         JOIN course c ON pc.course_id = c.course_id
         LEFT JOIN majors m ON pc.major_id = m.major_id
         LEFT JOIN course_prerequisites cp ON c.course_id = cp.course_id
         LEFT JOIN course prereq ON cp.prerequisite_course_id = prereq.course_id
         WHERE pc.program_id = $1
         GROUP BY pc.pc_id, p.program_name, py.year_level, c.course_code, 
                  c.course_name, c.units, pc.semester, pc.major_id, m.major_name, c.course_id
         ORDER BY py.year_level, pc.semester, c.course_name`,
        [program_id]
      );

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching program courses:", error);
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