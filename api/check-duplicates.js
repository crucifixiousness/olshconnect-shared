// api/check-duplicates.js

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { field, value } = req.body;

    if (!field || !value) {
      return res.status(400).json({ message: 'Field and value are required' });
    }

    try {
      const client = await pool.connect();
      
      let query;
      let columnName;

      // Map field names to database column names
      switch (field) {
        case 'username':
          columnName = 'username';
          query = `SELECT id FROM students WHERE ${columnName} = $1`;
          break;
        case 'email':
          columnName = 'email';
          query = `SELECT id FROM students WHERE ${columnName} = $1`;
          break;
        case 'contact_number':
        case 'number':
          columnName = 'contact_number';
          query = `SELECT id FROM students WHERE ${columnName} = $1`;
          break;
        case 'guardian_contact_no':
        case 'guardianContactNo':
          columnName = 'guardian_contact_no';
          query = `SELECT id FROM students WHERE ${columnName} = $1`;
          break;
        case 'name_birthdate':
          // Check for duplicate name + birthdate combination
          const { firstName, lastName, middleName, suffix, birthdate } = value;
          query = `SELECT id FROM students 
                   WHERE LOWER(TRIM(first_name)) = LOWER(TRIM($1)) 
                   AND LOWER(TRIM(last_name)) = LOWER(TRIM($2))
                   AND birthdate = $3
                   AND (middle_name IS NULL OR LOWER(TRIM(middle_name)) = LOWER(TRIM(COALESCE($4, ''))))
                   AND (suffix IS NULL OR LOWER(TRIM(suffix)) = LOWER(TRIM(COALESCE($5, ''))))`;
          break;
        default:
          client.release();
          return res.status(400).json({ message: 'Invalid field name' });
      }

      let result;
      if (field === 'name_birthdate') {
        const { firstName, lastName, middleName, suffix, birthdate } = value;
        result = await client.query(query, [
          firstName,
          lastName,
          birthdate,
          middleName || '',
          suffix || ''
        ]);
      } else {
        result = await client.query(query, [value]);
      }
      
      client.release();
      
      return res.status(200).json({ 
        exists: result.rows.length > 0,
        message: result.rows.length > 0 ? `${field} already exists` : `${field} is available`
      });
    } catch (error) {
      console.error('Check duplicates error:', error);
      return res.status(500).json({ 
        message: 'Error checking duplicates', 
        error: error.message 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};

