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
      const pc_id = req.query.pc_id || req.params.pc_id;
      
      client = await pool.connect();
      const query = `
        SELECT 
          pc.pc_id,
          pc.program_id,
          py.year_level,
          pc.semester,
          c.course_code,
          c.course_name,
          c.units,
          json_agg(json_build_object(
            'section', COALESCE(ca.section, 'Not assigned'),
            'instructor_name', COALESCE(a.full_name, 'Not assigned'),
            'staff_id', a.staff_id,
            'day', COALESCE(ca.day, 'Not assigned'),
            'start_time', COALESCE(ca.start_time::varchar, 'Not assigned'),
            'end_time', COALESCE(ca.end_time::varchar, 'Not assigned')
          )) as schedules
        FROM program_course pc
        JOIN course c ON pc.course_id = c.course_id
        JOIN program_year py ON pc.year_id = py.year_id
        LEFT JOIN course_assignments ca ON pc.pc_id = ca.pc_id
        LEFT JOIN admins a ON ca.staff_id = a.staff_id
        WHERE pc.pc_id = $1
        GROUP BY pc.pc_id, pc.program_id, py.year_level, pc.semester, 
                 c.course_code, c.course_name, c.units`;
      
      const result = await client.query(query, [pc_id]);
      
      if (result.rows.length > 0) {
        const data = result.rows[0];
        res.json({
          ...data,
          schedules: data.schedules || []
        });
      } else {
        res.status(404).json({ error: 'Course not found' });
      }
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      if (client) {
        client.release();
      }
    }
  }
};