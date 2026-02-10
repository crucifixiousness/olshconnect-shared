const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const authenticateToken = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('No token provided');
  }

  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    let client;
    try {
      // Verify token
      authenticateToken(req);
      
      const { program_id } = req.query;
      
      if (!program_id) {
        return res.status(400).json({ error: 'Program ID is required' });
      }

      client = await pool.connect();
      
      // Get program head by program_id
      const result = await client.query(
        `SELECT full_name 
         FROM admins 
         WHERE program_id = $1 
           AND LOWER(role) IN ('program head', 'program_head')
         ORDER BY staff_id ASC
         LIMIT 1`,
        [program_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Program head not found for this program' });
      }

      res.json({ full_name: result.rows[0].full_name });
    } catch (error) {
      console.error('Error fetching program head:', error);
      if (error.message === 'No token provided' || error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Authentication failed' });
      }
      res.status(500).json({ 
        error: 'Failed to fetch program head',
        details: error.message 
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};

