// api/staff.js

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { full_name, staff_username, staff_password, role, program_id } = req.body;

    if (!full_name || !staff_username || !staff_password || !role) {
      return res.status(400).json({ error: "Please fill in all fields." });
    }

    // Update validation to include both program head and instructor
    if ((role === "program head" || role === "instructor") && !program_id) {
      return res.status(400).json({ error: `Program ID is required for ${role} role.` });
    }

    try {
      const client = await pool.connect();

      // Check if username exists
      const checkResult = await client.query(
        "SELECT COUNT(*) as count FROM admins WHERE staff_username = $1",
        [staff_username]
      );

      if (checkResult.rows[0].count > 0) {
        return res.status(400).json({ error: "Username already taken." });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(staff_password, 10);

      // Update the condition in the query to include both roles
      const insertQuery = `
        INSERT INTO admins (full_name, staff_username, staff_password, role, program_id) 
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      await client.query(insertQuery, [
        full_name, 
        staff_username, 
        hashedPassword, 
        role,
        (role === "program head" || role === "instructor") ? program_id : null
      ]);

      res.status(201).json({ message: "Staff added successfully!" });
      client.release();
    } catch (error) {
      console.error("Error inserting staff:", error);
      res.status(500).json({ error: "Failed to add staff" });
    }
  } else if (req.method === 'GET') {
    try {
      const client = await pool.connect();
      
      const result = await client.query(
        "SELECT staff_id, full_name, role FROM admins WHERE role != 'admin' ORDER BY full_name ASC"
      );
      
      res.json(result.rows);
      client.release();
    } catch (error) {
      console.error("Error fetching staff data:", error);
      res.status(500).json({ error: "Failed to fetch staff data" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};