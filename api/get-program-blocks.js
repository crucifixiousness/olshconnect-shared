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
      
      console.log('get-program-blocks called with program_id:', program_id);
      
      if (!program_id) {
        return res.status(400).json({ 
          error: "Program ID is required" 
        });
      }

      client = await pool.connect();
      
      console.log('🔍 Database connected successfully');
      console.log('🔍 Querying with program_id:', program_id, 'Type:', typeof program_id);
      
      // Get all unique blocks for the specified program from student_blocks table
      const query = `SELECT DISTINCT block_name 
                     FROM student_blocks 
                     WHERE program_id = $1 
                     AND block_name IS NOT NULL 
                     AND block_name != 'N/A' 
                     AND block_name != ''
                     ORDER BY block_name`;
      
      console.log('🔍 SQL Query:', query);
      console.log('🔍 Query parameters:', [program_id]);
      
      const result = await client.query(query, [program_id]);
      
      console.log('🔍 Raw database result:', result);
      console.log('🔍 Result rows:', result.rows);
      console.log('🔍 Number of rows:', result.rows.length);
      console.log('🔍 First row structure:', result.rows[0]);
      
      const blocks = result.rows.map(row => {
        console.log('🔍 Processing row:', row);
        console.log('🔍 Row block_name:', row.block_name);
        return row.block_name;
      });
      
      console.log('🔍 Processed blocks array:', blocks);
      console.log('🔍 Response being sent:', blocks);

      res.json(blocks);
    } catch (error) {
      console.error("Error fetching program blocks:", error);
      res.status(500).json({ 
        error: "Database error", 
        details: error.message 
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  } else {
    res.status(405).json({ 
      message: 'Method not allowed' 
    });
  }
}; 