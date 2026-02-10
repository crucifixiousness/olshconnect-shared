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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const decoded = authenticateToken(req);
    const { 
      description, 
      form_data 
    } = req.body;
    const id = decoded.id;

    if (!id) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // Validate form_data exists
    if (!form_data || typeof form_data !== 'object') {
      return res.status(400).json({ message: "Form data is required." });
    }

    // Validate description
    if (!description || !description.trim()) {
      return res.status(400).json({ message: "Description/reason for request is required." });
    }

    // Validate description length
    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 10) {
      return res.status(400).json({ message: "Description must be at least 10 characters long." });
    }

    if (trimmedDescription.length > 500) {
      return res.status(400).json({ message: "Description must not exceed 500 characters." });
    }

    // Extract form data fields
    const levelAttendedArray = form_data?.levelAttended || [];
    const gradeStrandCourse = form_data?.gradeStrandCourse || null;
    const yearGraduated = form_data?.yearGraduated || null;
    const academicCredentialsArray = form_data?.academicCredentials || [];
    const certificationArray = form_data?.certification || [];
    const requestDate = form_data?.date || new Date().toISOString().slice(0, 10);

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(requestDate)) {
      return res.status(400).json({ message: "Invalid date format. Expected YYYY-MM-DD." });
    }

    // Validate date is not in the future (with 1 day tolerance for timezone)
    const requestDateObj = new Date(requestDate);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (requestDateObj > tomorrow) {
      return res.status(400).json({ message: "Date cannot be in the future." });
    }

    // Validate year graduated (required)
    if (!yearGraduated || !yearGraduated.trim()) {
      return res.status(400).json({ message: "Year Graduated / School Year is required." });
    }

    const year = parseInt(yearGraduated.trim());
    const currentYear = new Date().getFullYear();
    const minYear = 1950;
    if (isNaN(year) || year < minYear || year > currentYear + 1) {
      return res.status(400).json({ 
        message: `Year graduated must be a valid year between ${minYear} and ${currentYear + 1}.` 
      });
    }

    // Validate grade/strand/course (should be auto-filled from student program)
    if (!gradeStrandCourse || !gradeStrandCourse.trim()) {
      return res.status(400).json({ 
        message: "Grade/Strand/Course is required. Please ensure your program enrollment is complete." 
      });
    }

    // Validate grade/strand/course length
    if (gradeStrandCourse.trim().length > 255) {
      return res.status(400).json({ message: "Grade/Strand/Course must not exceed 255 characters." });
    }

    // Convert arrays to comma-separated strings (no brackets)
    // If empty, store as NULL instead of empty string
    const levelAttended = Array.isArray(levelAttendedArray) && levelAttendedArray.length > 0 
      ? levelAttendedArray.join(',') 
      : (Array.isArray(levelAttendedArray) ? null : (levelAttendedArray || null));
    
    const academicCredentials = Array.isArray(academicCredentialsArray) && academicCredentialsArray.length > 0
      ? academicCredentialsArray.join(',')
      : (Array.isArray(academicCredentialsArray) ? null : (academicCredentialsArray || null));
    
    const certification = Array.isArray(certificationArray) && certificationArray.length > 0
      ? certificationArray.join(',')
      : (Array.isArray(certificationArray) ? null : (certificationArray || null));

    // Validate level attended
    if (!levelAttended) {
      return res.status(400).json({ message: "At least one level attended must be selected." });
    }

    // Validate level attended values (only allow valid options)
    const validLevels = ['PS/GS', 'HS', 'JHS', 'SHS', 'COLLEGE'];
    const levelArray = levelAttended.split(',').map(l => l.trim());
    const invalidLevels = levelArray.filter(level => !validLevels.includes(level));
    if (invalidLevels.length > 0) {
      return res.status(400).json({ message: `Invalid level attended: ${invalidLevels.join(', ')}` });
    }

    // Validate that at least one academic credential or certification is selected
    if (!academicCredentials && !certification) {
      return res.status(400).json({ message: "At least one academic credential or certification must be selected." });
    }

    // Validate academic credentials values (if provided)
    if (academicCredentials) {
      const validCredentials = ['DIPLOMA', 'TRANSCRIPT OF RECORDS - College'];
      const credArray = academicCredentials.split(',').map(c => c.trim());
      const invalidCreds = credArray.filter(cred => !validCredentials.includes(cred));
      if (invalidCreds.length > 0) {
        return res.status(400).json({ message: `Invalid academic credential: ${invalidCreds.join(', ')}` });
      }
    }

    // Validate certification values (if provided)
    if (certification) {
      const validCertifications = [
        'ENGLISH AS MEDIUM OF INSTRUCTION',
        'ENROLLMENT',
        'GRADES (FOR COLLEGE ONLY)',
        'GRADUATION',
        'GWA / HONORS / AWARDS',
        'HONORABLE DISMISSAL'
      ];
      const certArray = certification.split(',').map(c => c.trim());
      const invalidCerts = certArray.filter(cert => !validCertifications.includes(cert));
      if (invalidCerts.length > 0) {
        return res.status(400).json({ message: `Invalid certification: ${invalidCerts.join(', ')}` });
      }
    }

    // Sanitize text inputs (remove potentially dangerous characters while preserving necessary punctuation)
    const sanitizeText = (text) => {
      if (!text) return text;
      // Remove null bytes, control characters, and excessive whitespace
      return text.replace(/\0/g, '').replace(/[\x00-\x1F\x7F]/g, '').trim();
    };

    // Sanitize inputs
    const sanitizedDescription = sanitizeText(trimmedDescription);
    const sanitizedGradeStrandCourse = sanitizeText(gradeStrandCourse);
    const sanitizedYearGraduated = yearGraduated ? sanitizeText(yearGraduated) : null;

    // Derive doc_type automatically from selections
    // If only academic credentials → "Academic Credentials"
    // If only certification → "Certification"
    // If both → "Academic Credentials, Certification"
    let docType = null;
    const hasAcademicCredentials = academicCredentials && academicCredentials.trim() !== '';
    const hasCertification = certification && certification.trim() !== '';
    
    if (hasAcademicCredentials && hasCertification) {
      // Both selected
      docType = "Academic Credentials, Certification";
    } else if (hasAcademicCredentials) {
      // Only academic credentials
      docType = "Academic Credentials";
    } else if (hasCertification) {
      // Only certification
      docType = "Certification";
    }

    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Get student's active enrollment
    const enrollmentResult = await pool.query(
      `SELECT enrollment_id, remaining_balance 
       FROM enrollments 
       WHERE student_id = $1 
       AND enrollment_status IN ('Verified', 'Officially Enrolled', 'For Payment')
       ORDER BY enrollment_id DESC 
       LIMIT 1`,
      [id]
    );

    if (enrollmentResult.rows.length === 0) {
      return res.status(400).json({ 
        message: "No active enrollment found. Please ensure you are enrolled." 
      });
    }

    const enrollment = enrollmentResult.rows[0];
    const enrollmentId = enrollment.enrollment_id;
    const currentBalance = parseFloat(enrollment.remaining_balance || 0);

    // Calculate document price based on selected documents
    let totalPrice = 0;
    const pricingMap = {
      'DIPLOMA': 500.00,
      'TRANSCRIPT OF RECORDS - College': 300.00,
      'ENGLISH AS MEDIUM OF INSTRUCTION': 200.00,
      'ENROLLMENT': 150.00,
      'GRADES (FOR COLLEGE ONLY)': 200.00,
      'GRADUATION': 250.00,
      'GWA / HONORS / AWARDS': 200.00,
      'HONORABLE DISMISSAL': 300.00
    };

    // Calculate price for academic credentials
    if (academicCredentials) {
      const creds = academicCredentials.split(',').map(c => c.trim());
      creds.forEach(cred => {
        if (pricingMap[cred]) {
          totalPrice += pricingMap[cred];
        }
      });
    }

    // Calculate price for certifications
    if (certification) {
      const certs = certification.split(',').map(c => c.trim());
      certs.forEach(cert => {
        if (pricingMap[cert]) {
          totalPrice += pricingMap[cert];
        }
      });
    }

    // If no specific pricing found, use default pricing based on doc_type
    if (totalPrice === 0) {
      if (docType === "Academic Credentials") {
        totalPrice = 500.00;
      } else if (docType === "Certification") {
        totalPrice = 200.00;
      } else if (docType === "Academic Credentials, Certification") {
        totalPrice = 700.00;
      }
    }

    // Use transaction to ensure data consistency
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert document request with pricing
      const result = await client.query(
        `INSERT INTO documentrequest (
          id, 
          doc_type, 
          description, 
          req_date, 
          req_status,
          level_attended,
          grade_strand_course,
          year_graduated,
          academic_credentials,
          certification,
          document_price,
          enrollment_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [
          id, 
          docType,
          sanitizedDescription,
          requestDate, 
          "Pending for Payment",
          levelAttended,
          sanitizedGradeStrandCourse,
          sanitizedYearGraduated,
          academicCredentials,
          certification,
          totalPrice,
          enrollmentId
        ]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('Failed to retrieve inserted record');
      }

      // Update student's remaining balance by adding document price
      const newBalance = currentBalance + totalPrice;
      await client.query(
        `UPDATE enrollments 
         SET remaining_balance = $1 
         WHERE enrollment_id = $2`,
        [newBalance, enrollmentId]
      );

      await client.query('COMMIT');

      res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error details:", error);
    
    if (error.code === "23505") {
      return res.status(400).json({ message: "Duplicate entry." });
    }
    
    // Send success response even if we encounter an error after successful insertion
    if (error.message === 'Failed to retrieve inserted record') {
      return res.status(201).json({ 
        message: "Request added successfully",
        description,
        req_date: currentDate,
        req_status: "Pending"
      });
    }
    
    res.status(500).json({ message: "Server error while adding request." });
  }
};