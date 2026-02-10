const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify token
    const decoded = authenticateToken(req);
    console.log('Token verified for user:', decoded);
    
    // Get program_id from query parameters
    const { program_id } = req.query;
    console.log('Received program_id:', program_id);
    
    if (!program_id) {
      return res.status(400).json({ error: 'Program ID is required' });
    }

    // Get program name
    const programQuery = 'SELECT program_name FROM program WHERE program_id = $1';
    console.log('Executing program query with program_id:', program_id);
    const programResult = await pool.query(programQuery, [program_id]);
    console.log('Program query result:', programResult.rows);
    
    if (programResult.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const programName = programResult.rows[0].program_name;
    console.log('Found program name:', programName);

    // Test query to see what enrollment statuses exist
    const testQuery = `
      SELECT 
        e.enrollment_status,
        COUNT(*) as count
      FROM enrollments e
      WHERE e.program_id = $1
      GROUP BY e.enrollment_status
    `;
    const testResult = await pool.query(testQuery, [program_id]);
    console.log('Test query - enrollment statuses for program:', testResult.rows);

    // Get students per year level for the specific program
    const studentsQuery = `
      SELECT 
        py.year_level,
        COUNT(*) as count
      FROM enrollments e
      JOIN program_year py ON e.year_id = py.year_id
      WHERE e.program_id = $1 
      AND e.enrollment_status = 'Officially Enrolled'
      GROUP BY py.year_level
      ORDER BY py.year_level
    `;
    
    console.log('Executing students query with program_id:', program_id);
    const studentsResult = await pool.query(studentsQuery, [program_id]);
    console.log('Students query result:', studentsResult.rows);
    
    // Format the response
    const response = {
      program_name: programName,
      total_students: 0,
      students_per_year: {
        first: 0,
        second: 0,
        third: 0,
        fourth: 0
      }
    };
    
    // Fill in the counts
    studentsResult.rows.forEach(row => {
      console.log('Processing row:', row);
      switch(row.year_level) {
        case 1: response.students_per_year.first = parseInt(row.count); break;
        case 2: response.students_per_year.second = parseInt(row.count); break;
        case 3: response.students_per_year.third = parseInt(row.count); break;
        case 4: response.students_per_year.fourth = parseInt(row.count); break;
      }
    });
    
    // Calculate total
    response.total_students = Object.values(response.students_per_year).reduce((a, b) => a + b, 0);
    
    console.log('Final response:', response);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching program head dashboard data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch program head dashboard data',
      details: error.message
    });
  }
}; 