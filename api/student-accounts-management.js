// api/student-accounts-management.js

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Function to verify admin token
const verifyAdminToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ message: "No token provided" });
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const admin = await pool.query(
      'SELECT * FROM admins WHERE staff_id = $1 AND role = $2',
      [decoded.id, 'admin']
    );

    if (admin.rows.length === 0) {
      res.status(403).json({ message: "Admin access required" });
      return null;
    }

    return admin.rows[0];
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: "Invalid token" });
    return null;
  }
};

module.exports = async (req, res) => {
  // Get all student accounts
  if (req.method === 'GET') {
    try {
      // Verify admin token
      const admin = await verifyAdminToken(req, res);
      if (!admin) return; // Error response already sent

      const { search = '', page = 1, limit = 20, sortBy = 'id', sortOrder = 'DESC' } = req.query;
      const offset = (page - 1) * limit;

      const client = await pool.connect();

      // Build WHERE clause for search
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        whereClause += ` AND (
          first_name ILIKE $${paramCount} OR 
          last_name ILIKE $${paramCount} OR 
          middle_name ILIKE $${paramCount} OR
          username ILIKE $${paramCount} OR
          email ILIKE $${paramCount} OR
          CONCAT(first_name, ' ', COALESCE(middle_name, ''), ' ', last_name) ILIKE $${paramCount}
        )`;
        params.push(`%${search}%`);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM students ${whereClause}`;
      const countResult = await client.query(countQuery, params);
      const totalStudents = parseInt(countResult.rows[0].count);

      // Validate sortBy to prevent SQL injection
      const allowedSortColumns = ['id', 'username', 'first_name', 'last_name', 'email'];
      const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'id';
      const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Get students with pagination
      const studentsQuery = `
        SELECT 
          id,
          username,
          email,
          first_name,
          middle_name,
          last_name,
          suffix,
          sex,
          birthdate,
          age,
          contact_number,
          role
        FROM students 
        ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      params.push(limit, offset);
      const studentsResult = await client.query(studentsQuery, params);

      res.status(200).json({ 
        success: true,
        students: studentsResult.rows,
        pagination: {
          total: totalStudents,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalStudents / limit)
        }
      });
      
      client.release();
    } catch (error) {
      console.error("Error fetching student accounts:", error);
      res.status(500).json({ error: "Failed to fetch student accounts" });
    }
  }
  else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};

