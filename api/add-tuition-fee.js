const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    let client;
    try {
      const {
        program_id,
        yearLevel,
        semester,
        tuitionAmount,
        miscFees,
        labFees,
        otherFees
      } = req.body;

      const academic_year = new Date().getFullYear() + "-" + (new Date().getFullYear() + 1);

      client = await pool.connect();

      // Check if fee already exists
      const existingFee = await client.query(
        `SELECT fee_id FROM tuition_fees 
         WHERE program_id = $1 AND year_level = $2 AND semester = $3 AND academic_year = $4`,
        [program_id, yearLevel, semester, academic_year]
      );

      if (existingFee.rows.length > 0) {
        return res.status(400).json({ 
          error: "Tuition fee already exists for this program, year level, and semester" 
        });
      }

      await client.query(
        `INSERT INTO tuition_fees (
          program_id, year_level, semester, tuition_amount, 
          misc_fees, lab_fees, other_fees, academic_year
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [program_id, yearLevel, semester, tuitionAmount, miscFees, labFees, otherFees, academic_year]
      );

      res.status(201).json({ message: "Tuition fee added successfully" });
    } catch (error) {
      console.error("Error adding tuition fee:", error);
      res.status(500).json({ error: "Failed to add tuition fee", details: error.message });
    } finally {
      if (client) {
        client.release();
      }
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};