const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = async (req, res) => {
  let client;
  
  try {
    client = await pool.connect();
    
    switch (req.method) {
      case 'GET':
        // Get all programs with their majors
        const result = await client.query(`
          SELECT 
            p.program_id,
            p.program_name,
            COALESCE(
              json_agg(
                json_build_object(
                  'major_id', m.major_id,
                  'major_name', m.major_name
                )
              ) FILTER (WHERE m.major_id IS NOT NULL), '[]'
            ) AS majors
          FROM program p
          LEFT JOIN majors m ON p.program_id = m.program_id
          GROUP BY p.program_id, p.program_name
          ORDER BY p.program_name
        `);
        res.json(result.rows);
        break;
        
      case 'POST':
        // Create new program
        const { program_name } = req.body;
        if (!program_name) {
          return res.status(400).json({ error: "Program name is required" });
        }
        
        const newProgram = await client.query(
          "INSERT INTO program (program_name) VALUES ($1) RETURNING program_id, program_name",
          [program_name]
        );
        res.status(201).json(newProgram.rows[0]);
        break;
        
      case 'PUT':
        // Update program
        const { program_id, program_name: updatedName } = req.body;
        if (!program_id || !updatedName) {
          return res.status(400).json({ error: "Program ID and name are required" });
        }
        
        const updatedProgram = await client.query(
          "UPDATE program SET program_name = $1 WHERE program_id = $2 RETURNING program_id, program_name",
          [updatedName, program_id]
        );
        
        if (updatedProgram.rows.length === 0) {
          return res.status(404).json({ error: "Program not found" });
        }
        
        res.json(updatedProgram.rows[0]);
        break;
        
      case 'DELETE':
        // Delete program (only if no majors or enrollments exist)
        const { program_id: deleteId } = req.query;
        if (!deleteId) {
          return res.status(400).json({ error: "Program ID is required" });
        }
        
        // Check if program has majors
        const majorCheck = await client.query(
          "SELECT COUNT(*) FROM majors WHERE program_id = $1",
          [deleteId]
        );
        
        if (parseInt(majorCheck.rows[0].count) > 0) {
          return res.status(400).json({ 
            error: "Cannot delete program. Remove all majors first." 
          });
        }
        
        // Check if program has enrollments
        const enrollmentCheck = await client.query(
          "SELECT COUNT(*) FROM enrollments WHERE program_id = $1",
          [deleteId]
        );
        
        if (parseInt(enrollmentCheck.rows[0].count) > 0) {
          return res.status(400).json({ 
            error: "Cannot delete program. Remove all enrollments first." 
          });
        }
        
        await client.query("DELETE FROM program WHERE program_id = $1", [deleteId]);
        res.json({ message: "Program deleted successfully" });
        break;
        
      default:
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error("Error in program management:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  } finally {
    if (client) {
      client.release();
    }
  }
}; 