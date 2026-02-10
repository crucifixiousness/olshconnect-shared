// api/loginstudent.js

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { username, password } = req.body;

    try {
      const client = await pool.connect();
      
      const studentQuery = `
        SELECT s.*, e.idpic, e.enrollment_status, e.enrollment_date
        FROM students s
        LEFT JOIN enrollments e ON s.id = e.student_id
        WHERE s.username = $1
        ORDER BY e.enrollment_date DESC
        LIMIT 1
      `;

      const result = await client.query(studentQuery, [username]);

      if (result.rows.length === 0) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const idpicBase64 = user.idpic ? Buffer.from(user.idpic).toString('base64') : null;

      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          enrollment_status: user.enrollment_status 
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(200).json({
        token,
        user: {
          id: user.id,
          username: user.username,
          firstName: user.first_name,
          fullName: `${user.first_name} ${user.last_name}`,
          role: user.role,
          idpic: idpicBase64,
          enrollment_status: user.enrollment_status || 'Not Enrolled',
          enrollment_date: user.enrollment_date
        },
      });

      client.release();
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};
