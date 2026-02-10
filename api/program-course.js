const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = async (req, res) => {
  console.log('program-course API called with method:', req.method);
  console.log('Request body:', req.body);
  
  if (req.method === 'POST') {
    const { program_id, major_id, course_code, course_name, units, semester, year_level, prerequisite_ids } = req.body;
    let client;

    try {
      console.log('Processing course assignment for:', { program_id, major_id, course_code, course_name, units, semester, year_level });
      
      // Input validation
      if (!program_id || !course_code || !course_name || !units || !semester || !year_level) {
        console.log('Validation failed - missing required fields');
        return res.status(400).json({ error: "All fields are required" });
      }

      // Validate major_id if provided
      if (major_id && major_id !== '') {
        // Check if major exists and belongs to the program
        client = await pool.connect();
        const majorCheck = await client.query(
          "SELECT major_id FROM majors WHERE major_id = $1 AND program_id = $2",
          [major_id, program_id]
        );
        
        if (majorCheck.rows.length === 0) {
          return res.status(400).json({ error: "Invalid major ID or major does not belong to the specified program" });
        }
      }

      if (!client) {
        client = await pool.connect();
      }
      await client.query('BEGIN');

      // 1. Create or get course
      let course_id;
      console.log('Checking for existing course with code:', course_code);
      const existingCourse = await client.query(
        "SELECT course_id FROM course WHERE course_code = $1",
        [course_code]
      );

      if (existingCourse.rows.length === 0) {
        console.log('Creating new course');
        const newCourse = await client.query(
          "INSERT INTO course (course_code, course_name, units) VALUES ($1, $2, $3) RETURNING course_id",
          [course_code, course_name, units]
        );
        course_id = newCourse.rows[0].course_id;
        console.log('New course created with ID:', course_id);
      } else {
        course_id = existingCourse.rows[0].course_id;
        console.log('Using existing course with ID:', course_id);
      }

      // 2. Create or get program year
      let year_id;
      console.log('Checking for existing program year');
      const existingYear = await client.query(
        "SELECT year_id FROM program_year WHERE program_id = $1 AND year_level = $2",
        [program_id, year_level]
      );

      if (existingYear.rows.length === 0) {
        console.log('Creating new program year');
        const paddedYearLevel = String(year_level).padStart(2, '0');
        year_id = parseInt(program_id + paddedYearLevel);
        
        await client.query(
          "INSERT INTO program_year (year_id, program_id, year_level) VALUES ($1, $2, $3)",
          [year_id, program_id, year_level]
        );
        console.log('New program year created with ID:', year_id);
      } else {
        year_id = existingYear.rows[0].year_id;
        console.log('Using existing program year with ID:', year_id);
      }

      // Check if course assignment already exists
      console.log('Checking for existing course assignment');
      
      // First, let's see what courses are already assigned to this program
      const existingProgramCourses = await client.query(
        "SELECT pc.major_id, c.course_code, c.course_name, py.year_level, pc.semester FROM program_course pc JOIN course c ON pc.course_id = c.course_id JOIN program_year py ON pc.year_id = py.year_id WHERE pc.program_id = $1",
        [program_id]
      );
      console.log('Existing courses in this program:', existingProgramCourses.rows);
      
      const existingAssignment = await client.query(
        "SELECT pc_id, major_id FROM program_course WHERE program_id = $1 AND year_id = $2 AND course_id = $3 AND semester = $4",
        [program_id, year_id, course_id, semester]
      );

      if (existingAssignment.rows.length > 0) {
        const existing = existingAssignment.rows[0];
        console.log('Course assignment already exists:', existing);
        
        // Check if this exact combination already exists
        if (existing.major_id === (major_id || null)) {
          return res.status(409).json({ 
            error: "Course assignment already exists",
            details: `Course ${course_code} (${course_name}) is already assigned to Program ${program_id}, Year ${year_level}, Semester ${semester}${major_id ? ` with Major ${major_id}` : ' without a major'}.`,
            existing_assignment_id: existing.pc_id,
            suggestion: "If you need to assign this course to a different major, please use a different major ID."
          });
        } else {
          console.log('Course assignment exists but with different major, proceeding...');
          console.log(`Existing: major_id=${existing.major_id}, New: major_id=${major_id || null}`);
        }
      }

      // 3. Create program course assignment
      console.log('Creating program course assignment');
      const programCourseResult = await client.query(
        "INSERT INTO program_course (program_id, major_id, year_id, course_id, semester) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [program_id, major_id || null, year_id, course_id, semester]
      );

      // 4. Handle multiple prerequisites if provided
      if (prerequisite_ids && Array.isArray(prerequisite_ids) && prerequisite_ids.length > 0) {
        console.log('Adding prerequisites:', prerequisite_ids);
        
        // Delete existing prerequisites for this course
        await client.query(
          "DELETE FROM course_prerequisites WHERE course_id = $1",
          [course_id]
        );

        // Insert new prerequisites
        for (const prereqId of prerequisite_ids) {
          await client.query(
            "INSERT INTO course_prerequisites (course_id, prerequisite_course_id) VALUES ($1, $2)",
            [course_id, prereqId]
          );
        }
        console.log('Prerequisites added successfully');
      }

      await client.query('COMMIT');
      console.log('Course assignment successful');
      res.status(201).json({ 
        message: "Course assigned successfully",
        data: {
          pc_id: programCourseResult.rows[0].pc_id,
          program_id,
          major_id: major_id || null,
          course_code,
          course_name,
          units,
          semester,
          year_level,
          prerequisite_ids: prerequisite_ids || []
        }
      });
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      console.error("Error in program-course:", error);
      
      // Check for duplicate constraint violation
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        console.log('Duplicate constraint violation detected');
        return res.status(409).json({ 
          error: "Course assignment already exists",
          details: "This course is already assigned to this program, year level, and semester. If you need to assign it to a different major, please check the existing assignment first.",
          code: error.code,
          constraint: error.constraint
        });
      }
      
      res.status(500).json({ 
        error: "Database error", 
        details: error.message,
        sqlMessage: error.sqlMessage,
        code: error.code
      });
    } finally {
      if (client) client.release();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};