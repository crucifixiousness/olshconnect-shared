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
          ca.ca_id,
          ca.pc_id,
          ca.staff_id,
          ca.section,
          ca.day,
          ca.start_time,
          ca.end_time,
          c.course_code,
          c.course_name,
          c.units,
          pc.semester,
          pc.year_level,
          a.full_name as instructor_name,
          p.program_name
         FROM course_assignments ca
         RIGHT JOIN program_course pc ON ca.pc_id = pc.pc_id
         JOIN course c ON pc.course_id = c.course_id
         JOIN program p ON pc.program_id = p.program_id
         LEFT JOIN admins a ON ca.staff_id = a.staff_id
         WHERE pc.pc_id = $1`,
        [pc_id]
      );

      if (result.rows.length > 0) {
        const data = result.rows[0];
        // Format times if they exist
        if (data.start_time) data.start_time = data.start_time.slice(0, 5);
        if (data.end_time) data.end_time = data.end_time.slice(0, 5);
        res.json(data);
      } else {
        res.status(404).json({ error: "Assignment not found" });
      }
    } catch (error) {
      console.error("Error fetching assignment details:", error);
      res.status(500).json({ error: "Failed to fetch assignment details" });
    } finally {
      if (client) client.release();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};