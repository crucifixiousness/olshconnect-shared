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
        // Get all majors with program information
        const result = await client.query(`
          SELECT 
            m.major_id,
            m.major_name,
            p.program_id,
            p.program_name
          FROM majors m
          JOIN program p ON m.program_id = p.program_id
          ORDER BY p.program_name, m.major_name
        `);
        res.json(result.rows);
        break;
        
      case 'POST':
        // Create new major
        const { major_name, program_id } = req.body;
        if (!major_name || !program_id) {
          return res.status(400).json({ error: "Major name and program ID are required" });
        }
        
        // Check if program exists
        const programCheck = await client.query(
          "SELECT program_id FROM program WHERE program_id = $1",
          [program_id]
        );
        
        if (programCheck.rows.length === 0) {
          return res.status(400).json({ error: "Program not found" });
        }
        
        const newMajor = await client.query(
          "INSERT INTO majors (major_name, program_id) VALUES ($1, $2) RETURNING *",
          [major_name, program_id]
        );
        res.status(201).json(newMajor.rows[0]);
        break;
        
      case 'PUT':
        // Update major
        const { major_id, major_name: updatedName, program_id: updatedProgramId } = req.body;
        if (!major_id || !updatedName || !updatedProgramId) {
          return res.status(400).json({ error: "All fields are required" });
        }
        
        // Check if program exists
        const programCheckUpdate = await client.query(
          "SELECT program_id FROM program WHERE program_id = $1",
          [updatedProgramId]
        );
        
        if (programCheckUpdate.rows.length === 0) {
          return res.status(400).json({ error: "Program not found" });
        }
        
        const updatedMajor = await client.query(
          "UPDATE majors SET major_name = $1, program_id = $2 WHERE major_id = $3 RETURNING *",
          [updatedName, updatedProgramId, major_id]
        );
        
        if (updatedMajor.rows.length === 0) {
          return res.status(404).json({ error: "Major not found" });
        }
        
        res.json(updatedMajor.rows[0]);
        break;
        
      case 'DELETE':
        // Delete major (only if no enrollments exist)
        const { major_id: deleteId } = req.query;
        if (!deleteId) {
          return res.status(400).json({ error: "Major ID is required" });
        }
        
        // Check if major has enrollments
        const enrollmentCheck = await client.query(
          "SELECT COUNT(*) FROM enrollments WHERE major_id = $1",
          [deleteId]
        );
        
        if (parseInt(enrollmentCheck.rows[0].count) > 0) {
          return res.status(400).json({ 
            error: "Cannot delete major. Remove all enrollments first." 
          });
        }
        
        await client.query("DELETE FROM majors WHERE major_id = $1", [deleteId]);
        res.json({ message: "Major deleted successfully" });
        break;
        
      default:
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error("Error in major management:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  } finally {
    if (client) {
      client.release();
    }
  }
}; 