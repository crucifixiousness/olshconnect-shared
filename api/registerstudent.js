// api/register.js

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Fetch the DB URL from environment variables
});

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const {
      userName,
      password,
      firstName,
      middleName,
      lastName,
      suffix,
      sex,
      birthdate,
      age,
      placeOfBirth,
      religion,
      email,
      number,
      street_text,
      guardianName,
      guardianContactNo,
    } = req.body;

    try {
      const client = await pool.connect();
      
      // Check if username exists
      const usernameCheck = await client.query(
        'SELECT id FROM students WHERE username = $1',
        [userName]
      );
      
      if (usernameCheck.rows.length > 0) {
        client.release();
        return res.status(400).json({ message: 'Username already exists' });
      }

      // Check if email exists
      if (email) {
        const emailCheck = await client.query(
          'SELECT id FROM students WHERE email = $1',
          [email]
        );
        
        if (emailCheck.rows.length > 0) {
          client.release();
          return res.status(400).json({ message: 'Email already exists' });
        }
      }

      // Check if contact number exists
      if (number) {
        const contactCheck = await client.query(
          'SELECT id FROM students WHERE contact_number = $1',
          [number]
        );
        
        if (contactCheck.rows.length > 0) {
          client.release();
          return res.status(400).json({ message: 'Contact number already exists' });
        }
      }

      // Check if guardian contact number exists
      if (guardianContactNo) {
        const guardianContactCheck = await client.query(
          'SELECT id FROM students WHERE guardian_contact_no = $1',
          [guardianContactNo]
        );
        
        if (guardianContactCheck.rows.length > 0) {
          client.release();
          return res.status(400).json({ message: 'Guardian contact number already exists' });
        }
      }

      // Check for duplicate name + birthdate combination (to prevent same person registering twice)
      // This is more reliable than just checking the name alone
      const nameBirthdateCheck = await client.query(
        `SELECT id FROM students 
         WHERE LOWER(TRIM(first_name)) = LOWER(TRIM($1)) 
         AND LOWER(TRIM(last_name)) = LOWER(TRIM($2))
         AND birthdate = $3
         AND (middle_name IS NULL OR LOWER(TRIM(middle_name)) = LOWER(TRIM(COALESCE($4, ''))))
         AND (suffix IS NULL OR LOWER(TRIM(suffix)) = LOWER(TRIM(COALESCE($5, ''))))`,
        [
          firstName,
          lastName,
          birthdate,
          middleName || '',
          suffix || ''
        ]
      );
      
      if (nameBirthdateCheck.rows.length > 0) {
        client.release();
        return res.status(400).json({ 
          message: 'A student with the same name and birthdate already exists. Please contact the registrar if you believe this is an error.' 
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insert complete student data with verification status
      const insertResult = await client.query(
        `INSERT INTO students (
          username, password, first_name, middle_name, last_name,
          suffix, sex, birthdate, age, place_of_birth,
          religion, email, contact_number, full_address,
          guardian_name, guardian_contact_no, role, email_verified, phone_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING id`,
        [
          userName,
          hashedPassword,
          firstName,
          middleName,
          lastName,
          suffix,
          sex,
          birthdate,
          age,
          placeOfBirth,
          religion,
          email,
          number,
          street_text,
          guardianName,
          guardianContactNo,
          'student',
          false, // email_verified
          false  // phone_verified
        ]
      );
      
      res.status(201).json({ 
        message: 'Account Added!',
        studentId: insertResult.rows[0].id 
      });
      
      client.release();
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        message: 'Registration failed', 
        error: error.message 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};
