const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function authenticateToken(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    const err = new Error('No token provided');
    err.status = 401;
    throw err;
  }
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    const err = new Error('Invalid token');
    err.status = 401;
    throw err;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let client;
  try {
    const decoded = authenticateToken(req);
    const { courseId, grades } = req.body;
    
    console.log('🔍 DEBUG: Course ID:', courseId);
    console.log('🔍 DEBUG: Grades to save:', grades);
    console.log('🔍 DEBUG: Authenticated user:', decoded);

    if (!courseId || !grades || typeof grades !== 'object') {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    client = await pool.connect();
    console.log('🔍 DEBUG: Database connection established');

    // Start transaction
    await client.query('BEGIN');

    // Check if grades table exists, if not create it
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'grades'
      );
    `;
    
    const tableExists = await client.query(tableCheckQuery);
    console.log('🔍 DEBUG: Grades table exists:', tableExists.rows[0].exists);

    if (!tableExists.rows[0].exists) {
      console.log('🔍 DEBUG: Creating grades table...');
      const createTableQuery = `
        CREATE TABLE grades (
          grade_id SERIAL PRIMARY KEY,
          student_id INTEGER NOT NULL,
          pc_id BIGINT NOT NULL,
          final_grade DECIMAL(3,1) CHECK (final_grade >= 1.0 AND final_grade <= 5.0),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(student_id, pc_id)
        );
      `;
      await client.query(createTableQuery);
      console.log('🔍 DEBUG: Grades table created successfully');
    }

    // Process each grade
    const results = [];
    for (const [studentId, grade] of Object.entries(grades)) {
      if (grade === '' || grade === null) {
        console.log(`🔍 DEBUG: Skipping empty grade for student ${studentId}`);
        continue;
      }

      const gradeValue = parseFloat(grade);
      if (isNaN(gradeValue) || gradeValue < 1.0 || gradeValue > 5.0) {
        console.log(`🔍 DEBUG: Invalid grade value for student ${studentId}: ${grade}`);
        continue;
      }

      try {
        // Try to insert new grade, if conflict then update
        const upsertQuery = `
          INSERT INTO grades (student_id, pc_id, final_grade, approval_status, updated_at)
          VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP)
          ON CONFLICT (student_id, pc_id)
          DO UPDATE SET 
            final_grade = EXCLUDED.final_grade,
            approval_status = 'pending',
            updated_at = CURRENT_TIMESTAMP
          RETURNING grade_id, final_grade;
        `;

        const result = await client.query(upsertQuery, [studentId, courseId, gradeValue]);
        console.log(`🔍 DEBUG: Grade saved for student ${studentId}:`, result.rows[0]);
        
        results.push({
          student_id: studentId,
          grade: gradeValue,
          status: 'saved'
        });

      } catch (gradeError) {
        console.error(`❌ ERROR: Failed to save grade for student ${studentId}:`, gradeError);
        results.push({
          student_id: studentId,
          grade: gradeValue,
          status: 'failed',
          error: gradeError.message
        });
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('🔍 DEBUG: Transaction committed successfully');

    const response = {
      message: 'Grades processed successfully',
      course_id: courseId,
      total_processed: results.length,
      results: results
    };

    console.log('🔍 DEBUG: Final response:', response);
    return res.status(200).json(response);

  } catch (error) {
    // Rollback transaction on error
    if (client) {
      try {
        await client.query('ROLLBACK');
        console.log('🔍 DEBUG: Transaction rolled back due to error');
      } catch (rollbackError) {
        console.error('❌ ERROR: Failed to rollback transaction:', rollbackError);
      }
    }

    const status = error.status || 500;
    console.error('❌ ERROR: Error saving grades:', error);
    console.error('❌ ERROR: Error stack:', error.stack);
    return res.status(status).json({ error: error.message || 'Server error' });
  } finally {
    if (client) client.release();
    console.log('🔍 DEBUG: Database connection released');
  }
}; 