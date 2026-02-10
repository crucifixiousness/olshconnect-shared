const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = async (req, res) => {
  if (req.method === 'PUT') {
    const { course_id, instructor_id, section, day, start_time, end_time } = req.body;
    let client;

    try {
      client = await pool.connect();
      
      // First check if this schedule already exists
      const scheduleCheck = await client.query(
        `SELECT ca.*, c.course_name
         FROM course_assignments ca
         JOIN program_course pc ON ca.pc_id = pc.pc_id
         JOIN course c ON pc.course_id = c.course_id
         WHERE ca.pc_id = $1 
         AND ca.section = $2
         AND ca.day = $3
         AND ca.start_time = $4
         AND ca.end_time = $5`,
        [course_id, section, day, start_time, end_time]
      );

      if (scheduleCheck.rows.length > 0) {
        return res.status(400).json({
          error: `This schedule already exists for ${scheduleCheck.rows[0].course_name} in Block ${section}`
        });
      }

      // Then check for time conflicts with other courses
      // Update conflict check to ignore section/block
      const conflictCheck = await client.query(
        `SELECT ca.*, c.course_name, a.full_name as instructor_name
         FROM course_assignments ca
         JOIN program_course pc ON ca.pc_id = pc.pc_id
         JOIN course c ON pc.course_id = c.course_id
         JOIN admins a ON ca.staff_id = a.staff_id
         WHERE ca.staff_id = $1 
         AND ca.day = $2
         AND (
           (ca.start_time <= $3 AND ca.end_time > $3)
           OR (ca.start_time < $4 AND ca.end_time >= $4)
           OR (ca.start_time >= $3 AND ca.end_time <= $4)
         )`,
        [instructor_id, day, start_time, end_time]
      );

      if (conflictCheck.rows.length > 0) {
        const conflict = conflictCheck.rows[0];
        return res.status(400).json({
          error: `Schedule conflict: ${conflict.instructor_name} is already teaching ${conflict.course_name} from ${conflict.start_time.slice(0, 5)} to ${conflict.end_time.slice(0, 5)} on ${conflict.day} in Block ${conflict.section}`
        });
      }

      // Add check for same course, day, and block with different time
      const sameScheduleCheck = await client.query(
        `SELECT ca.*, c.course_name
         FROM course_assignments ca
         JOIN program_course pc ON ca.pc_id = pc.pc_id
         JOIN course c ON pc.course_id = c.course_id
         WHERE ca.pc_id = $1 
         AND ca.section = $2
         AND ca.day = $3`,
        [course_id, section, day]
      );

      if (sameScheduleCheck.rows.length > 0) {
        const existing = sameScheduleCheck.rows[0];
        return res.status(400).json({
          error: `This course is already scheduled in Block ${section} on ${day} from ${existing.start_time.slice(0, 5)} to ${existing.end_time.slice(0, 5)}`
        });
      }

      // Continue with existing conflict check and insert...
      if (conflictCheck.rows.length > 0) {
        const conflict = conflictCheck.rows[0];
        return res.status(400).json({
          error: `Schedule conflict: ${conflict.instructor_name} is already assigned to ${conflict.course_name} from ${conflict.start_time.slice(0, 5)} to ${conflict.end_time.slice(0, 5)} on ${conflict.day} in Block ${conflict.section}`
        });
      }

      // If no conflicts, create new assignment
      const result = await client.query(
        `INSERT INTO course_assignments 
         (pc_id, staff_id, section, day, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [course_id, instructor_id, section, day, start_time, end_time]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error assigning instructor:", error);
      res.status(500).json({ error: "Failed to assign instructor" });
    } finally {
      if (client) client.release();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};