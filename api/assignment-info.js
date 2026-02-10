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
          ca.section,
          ca.day,
          ca.start_time,
          ca.end_time,
          a.staff_id,
          a.full_name as instructor_name
         FROM course_assignments ca
         LEFT JOIN admins a ON ca.staff_id = a.staff_id
         WHERE ca.pc_id = $1`,
        [pc_id]
      );

      if (result.rows.length > 0) {
        const data = result.rows[0];
        if (data.start_time) data.start_time = data.start_time.slice(0, 5);
        if (data.end_time) data.end_time = data.end_time.slice(0, 5);
        res.json(data);
      } else {
        res.json({
          instructor_name: 'Not assigned',
          section: 'Not assigned',
          day: '',
          start_time: '',
          end_time: ''
        });
      }
    } catch (error) {
      console.error("Error fetching assignment info:", error);
      res.status(500).json({ error: "Failed to fetch assignment info" });
    } finally {
      if (client) client.release();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};