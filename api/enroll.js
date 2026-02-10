// api/enroll.js

const { Pool } = require('pg');
const formidable = require('formidable');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;

export const config = {
  api: {
    bodyParser: false, // Required for formidable to parse multipart form-data
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
  if (req.method === 'PUT') {
    let client;
    try {
      const decoded = authenticateToken(req, res);
      req.user = decoded;
      const { id } = req.user;

      const form = new formidable.IncomingForm({
        maxFileSize: 50 * 1024 * 1024, // 50MB limit
        allowEmptyFiles: false,
        filter: ({ mimetype }) => {
          return mimetype && (mimetype.includes('image/') || mimetype === 'application/pdf');
        }
      });

      const [fields, files] = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          resolve([fields, files]);
        });
      });

      // DEBUG: Log what formidable actually parsed
      console.log('🔍 DEBUG: Formidable parsed fields:', fields);
      console.log('🔍 DEBUG: Formidable parsed files:', files);
      console.log('🔍 DEBUG: Raw semester from formidable:', fields.semester);
      console.log('🔍 DEBUG: Semester type from formidable:', typeof fields.semester);
      console.log('🔍 DEBUG: Semester length from formidable:', fields.semester?.length);

      // FIX: Extract single values from formidable arrays
      const normalizedFields = {};
      Object.keys(fields).forEach(key => {
        if (Array.isArray(fields[key])) {
          normalizedFields[key] = fields[key][0]; // Take first element
        } else {
          normalizedFields[key] = fields[key];
        }
      });

      console.log('🔍 DEBUG: Normalized fields:', normalizedFields);
      console.log('🔍 DEBUG: Normalized semester:', normalizedFields.semester);

      // Convert string values to integers where needed
      const programs = parseInt(normalizedFields.programs);
      const yearLevel = parseInt(normalizedFields.yearLevel);

      if (isNaN(programs) || isNaN(yearLevel)) {
        return res.status(400).json({
          error: "Invalid program or year level format"
        });
      }

      // Validate student type (removed restriction - allowing any value)
      if (!normalizedFields.studentType) {
        return res.status(400).json({
          error: "Student type is required"
        });
      }

      // Validate required documents based on student type
      if (!files.idpic) {
        return res.status(400).json({
          error: "ID picture is required for all students"
        });
      }

      if (!files.birthCertificateDoc) {
        return res.status(400).json({
          error: "Birth certificate is required for all students"
        });
      }

      // Form 137 is only required for new students, not transferees
      if (normalizedFields.studentType !== 'transferee' && !files.form137Doc) {
        return res.status(400).json({
          error: "Form 137 is required for new students"
        });
      }

      // Validate transferee-specific requirements
      if (normalizedFields.studentType === 'transferee') {
        if (!files.transferCertificateDoc) {
          return res.status(400).json({
            error: "Transfer certificate is required for transferee students"
          });
        }
        if (!files.torDoc) {
          return res.status(400).json({
            error: "Transcript of Records (TOR) is required for transferee students"
          });
        }
        if (!normalizedFields.previousSchool || !normalizedFields.previousSchool.trim()) {
          return res.status(400).json({
            error: "Previous school information is required for transferee students"
          });
        }
        if (!normalizedFields.previousProgram || !normalizedFields.previousProgram.trim()) {
          return res.status(400).json({
            error: "Previous program information is required for transferee students"
          });
        }
        if (!normalizedFields.previousAcademicYear || !/^\d{4}-\d{4}$/.test(normalizedFields.previousAcademicYear)) {
          return res.status(400).json({
            error: "Previous academic year (YYYY-YYYY) is required for transferee students"
          });
        }
      }

      client = await pool.connect();
      await client.query('BEGIN');

      const programResult = await client.query(
        "SELECT program_id FROM program WHERE program_id = $1",
        [programs]
      );

      if (programResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: "Selected program does not exist"
        });
      }

      const yearResult = await client.query(
        "SELECT year_id FROM program_year WHERE program_id = $1 AND year_level = $2",
        [programs, yearLevel]
      );

      let year_id;
      if (yearResult.rows.length === 0) {
        const paddedYearLevel = String(yearLevel).padStart(2, '0');
        year_id = parseInt(programs + paddedYearLevel);
        
        await client.query(
          "INSERT INTO program_year (year_id, program_id, year_level) VALUES ($1, $2, $3)",
          [year_id, programs, yearLevel]
        );
      } else {
        year_id = yearResult.rows[0].year_id;
      }

      const idpic = files.idpic ? await fs.readFile(files.idpic[0].filepath) : null;
      
      // Handle documents based on student type
      let birthCertificateDoc = null;
      let transferCertificateDoc = null;
      let torDoc = null;
      let form137Doc = null;
      
      // Common documents for both student types
      birthCertificateDoc = files.birthCertificateDoc ? 
        await fs.readFile(files.birthCertificateDoc[0].filepath) : null;
      form137Doc = files.form137Doc ? 
        await fs.readFile(files.form137Doc[0].filepath) : null;
      
      // Additional documents for transferee students
      if (normalizedFields.studentType === 'transferee') {
        transferCertificateDoc = files.transferCertificateDoc ? 
          await fs.readFile(files.transferCertificateDoc[0].filepath) : null;
        torDoc = files.torDoc ? 
          await fs.readFile(files.torDoc[0].filepath) : null;
      }

      const existingEnrollment = await client.query(
        "SELECT enrollment_id FROM enrollments WHERE student_id = $1 AND academic_year = $2 AND semester = $3",
        [id, normalizedFields.academic_year, normalizedFields.semester]
      );

      if (existingEnrollment.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: "Student is already enrolled for this semester and academic year"
        });
      }

      // Detect if previous_academic_year column exists
      const prevAyColCheck = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'previous_academic_year' LIMIT 1`
      );

      let enrollmentResult;
      if (prevAyColCheck.rows.length > 0) {
        enrollmentResult = await client.query(
          `INSERT INTO enrollments 
           (student_id, program_id, year_id, semester, enrollment_status, 
            enrollment_date, idpic, birth_certificate_doc, form137_doc, 
            payment_status, academic_year, student_type, previous_school, previous_program, previous_academic_year, transfer_certificate_doc, tor_doc) 
           VALUES ($1, $2, $3, $4, 'Pending', NOW(), $5, $6, $7, 'Unpaid', $8, $9, $10, $11, $12, $13, $14)
           RETURNING enrollment_id`,
          [
            id, programs, year_id, normalizedFields.semester, idpic, birthCertificateDoc,
            form137Doc, normalizedFields.academic_year, normalizedFields.studentType, normalizedFields.previousSchool || null,
            normalizedFields.previousProgram || null, normalizedFields.previousAcademicYear || null, transferCertificateDoc, torDoc
          ]
        );
      } else {
        enrollmentResult = await client.query(
          `INSERT INTO enrollments 
           (student_id, program_id, year_id, semester, enrollment_status, 
            enrollment_date, idpic, birth_certificate_doc, form137_doc, 
            payment_status, academic_year, student_type, previous_school, previous_program, transfer_certificate_doc, tor_doc) 
           VALUES ($1, $2, $3, $4, 'Pending', NOW(), $5, $6, $7, 'Unpaid', $8, $9, $10, $11, $12, $13)
           RETURNING enrollment_id`,
          [
            id, programs, year_id, normalizedFields.semester, idpic, birthCertificateDoc,
            form137Doc, normalizedFields.academic_year, normalizedFields.studentType, normalizedFields.previousSchool || null,
            normalizedFields.previousProgram || null, transferCertificateDoc, torDoc
          ]
        );
      }

      // Create TOR evaluation request for transferees
      if (normalizedFields.studentType === 'transferee') {
        const torEvaluationResult = await client.query(
          `INSERT INTO tor_evaluation_requests 
           (student_id, program_id, year_id, semester, tor_document_path, status) 
           VALUES ($1, $2, $3, $4, $5, 'pending')`,
          [id, programs, year_id, normalizedFields.semester, 'tor_documents/' + id + '_' + Date.now() + '.pdf']
        );
      }

      await client.query('COMMIT');

      // Clean up temp files
      await Promise.all(Object.values(files).map(fileArray => 
        fileArray.map(file => fs.unlink(file.filepath))
      ).flat());
      
      const message = normalizedFields.studentType === 'transferee' 
        ? "Enrollment submitted successfully. Your TOR will be evaluated by the program head and then approved by the registrar for credit transfer."
        : "Enrollment submitted successfully";
        
      res.json({ 
        message: message,
        status: "Pending",
        enrollment_id: enrollmentResult.rows[0].enrollment_id,
        semester: normalizedFields.semester,
        academic_year: normalizedFields.academic_year,
        studentType: normalizedFields.studentType
      });
    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
      console.error("Error in enrollment:", error);
      res.status(500).json({ 
        error: "Failed to process enrollment",
        details: error.message 
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};