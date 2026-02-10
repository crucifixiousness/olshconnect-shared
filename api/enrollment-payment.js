const { Pool } = require('pg');
const formidable = require('formidable');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;

export const config = {
  api: {
    bodyParser: false,
  },
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const authenticateToken = (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('No token provided');
  }

  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = async (req, res) => {
  let client;
  try {
    const decoded = authenticateToken(req, res);
    req.user = decoded;
    client = await pool.connect();

    if (req.method === 'PUT') {
      const form = new formidable.IncomingForm({
        maxFileSize: 5 * 1024 * 1024,
        allowEmptyFiles: false,
        filter: ({ mimetype }) => mimetype && mimetype.includes('image/')
      });

      const [fields, files] = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          resolve([fields, files]);
        });
      });

      if (!files.receipt_image) {
        throw new Error('Receipt image is required');
      }

      const receiptImage = await fs.readFile(files.receipt_image[0].filepath);

      // Get enrollment ID from student's current enrollment
      const enrollmentResult = await client.query(
        `SELECT enrollment_id 
         FROM enrollments 
         WHERE student_id = $1 
         ORDER BY enrollment_id DESC 
         LIMIT 1`,
        [req.user.id]
      );

      if (enrollmentResult.rows.length === 0) {
        throw new Error('No enrollment found');
      }

      const enrollmentId = enrollmentResult.rows[0].enrollment_id;

      // Insert into enrollment_payment_receipts table
      const result = await client.query(
        `INSERT INTO enrollment_payment_receipts (enrollment_id, receipt_image)
         VALUES ($1, $2)
         RETURNING receipt_id`,
        [enrollmentId, receiptImage]
      );

      if (result.rows.length === 0) {
        throw new Error('Failed to insert receipt');
      }

      // Cleanup temp file
      await fs.unlink(files.receipt_image[0].filepath);

      res.json({ 
        message: "Receipt uploaded successfully",
        receipt_id: result.rows[0].receipt_id,
        enrollment_id: enrollmentId
      });
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ 
      error: "Failed to process request",
      details: error.message 
    });
  } finally {
    if (client) client.release();
  }
};