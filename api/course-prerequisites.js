const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { course_id, prerequisite_ids } = req.body;
    let client;

    try {
      if (!course_id || !prerequisite_ids || !Array.isArray(prerequisite_ids)) {
        return res.status(400).json({ error: "Course ID and prerequisite IDs array are required" });
      }

      client = await pool.connect();
      await client.query('BEGIN');

      // Delete existing prerequisites for this course
      await client.query(
        "DELETE FROM course_prerequisites WHERE course_id = $1",
        [course_id]
      );

      // Insert new prerequisites
      if (prerequisite_ids.length > 0) {
        const values = prerequisite_ids.map((_, index) => 
          `($1, $${index + 2})`
        ).join(', ');
        
        const query = `
          INSERT INTO course_prerequisites (course_id, prerequisite_course_id)
          VALUES ${values}
        `;
        
        await client.query(query, [course_id, ...prerequisite_ids]);
      }

      await client.query('COMMIT');
      res.status(201).json({ 
        message: "Prerequisites updated successfully",
        course_id,
        prerequisite_ids
      });
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      console.error("Error updating prerequisites:", error);
      res.status(500).json({ error: "Database error", details: error.message });
    } finally {
      if (client) client.release();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};

