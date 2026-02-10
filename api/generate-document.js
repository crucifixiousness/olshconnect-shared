const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');

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

// Helper function to format year level
const formatYearLevel = (yearLevel) => {
  const yearMap = {
    '1': 'First Year',
    '2': 'Second Year',
    '3': 'Third Year',
    '4': 'Fourth Year',
    '5': 'Fifth Year'
  };
  return yearMap[yearLevel] || `${yearLevel} Year`;
};

// Helper function to format semester
const formatSemester = (semester) => {
  if (typeof semester === 'number') {
    return semester === 1 ? '1st' : semester === 2 ? '2nd' : `${semester}th`;
  }
  const semMap = {
    '1': '1st',
    '2': '2nd',
    'First': '1st',
    'Second': '2nd'
  };
  return semMap[semester] || semester;
};

// Helper function to calculate GPA
const calculateGPA = (grades) => {
  if (!grades || grades.length === 0) return null;
  const totalPoints = grades.reduce((sum, grade) => {
    const points = parseFloat(grade.final_grade) || 0;
    const units = parseInt(grade.units) || 0;
    return sum + (points * units);
  }, 0);
  const totalUnits = grades.reduce((sum, grade) => sum + (parseInt(grade.units) || 0), 0);
  return totalUnits > 0 ? (totalPoints / totalUnits).toFixed(2) : null;
};

// Helper function to determine remark
const getRemark = (grade) => {
  const gradeValue = parseFloat(grade);
  if (isNaN(gradeValue)) return '';
  if (gradeValue >= 1.0 && gradeValue <= 3.0) return 'Passed';
  if (gradeValue > 3.0 && gradeValue <= 5.0) return 'Failed';
  return '';
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const decoded = authenticateToken(req);
    const { req_id } = req.query;

    if (!req_id) {
      return res.status(400).json({ message: 'Request ID is required' });
    }

    // Fetch request and student details - Updated to accept "Ready for Pickup" status
    const result = await pool.query(`
      SELECT 
        dr.*,
        s.id as student_id,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.suffix,
        e.program_id,
        e.year_id,
        e.semester,
        e.academic_year,
        p.program_name,
        py.year_level
      FROM documentrequest dr
      JOIN students s ON dr.id = s.id
      JOIN enrollments e ON s.id = e.student_id
      JOIN program p ON e.program_id = p.program_id
      JOIN program_year py ON e.year_id = py.year_id
      WHERE dr.req_id = $1 
        AND (dr.req_status = 'Approved' OR dr.req_status = 'Ready for Pickup')
        AND (dr.doc_type = 'Certificate of Grades' OR dr.certification LIKE '%GRADES%')
      ORDER BY e.enrollment_date DESC
      LIMIT 1
    `, [req_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found or not approved' });
    }

    const student = result.rows[0];

    // Fetch student's grades for the current enrollment
    const gradesResult = await pool.query(`
      SELECT 
        c.course_code,
        c.course_name,
        c.units,
        g.final_grade,
        pc.semester,
        pc.year_id
      FROM grades g
      JOIN program_course pc ON g.pc_id = pc.pc_id
      JOIN course c ON pc.course_id = c.course_id
      WHERE g.student_id = $1
        AND pc.program_id = $2
        AND pc.year_id = $3
        AND pc.semester = $4
        AND g.approval_status = 'reg_approved'
      ORDER BY c.course_code
    `, [student.student_id, student.program_id, student.year_id, student.semester]);

    const courseData = gradesResult.rows.map(grade => ({
      code: grade.course_code,
      title: grade.course_name,
      rating: parseFloat(grade.final_grade).toFixed(2),
      credits: grade.units.toString(),
      remarks: getRemark(grade.final_grade)
    }));

    // If no grades found, return error
    if (courseData.length === 0) {
      return res.status(404).json({ message: 'No grades found for this student' });
    }

    // Calculate GPA
    const gpa = calculateGPA(gradesResult.rows);

    // Format student name
    const studentName = `${student.last_name}, ${student.first_name}${student.middle_name ? ` ${student.middle_name.charAt(0)}.` : ''}${student.suffix ? ` ${student.suffix}` : ''}`;

    // Format year level
    const yearLevelText = formatYearLevel(student.year_level.toString());

    // Format semester
    const semesterText = formatSemester(student.semester);

    // Format academic year
    const academicYear = student.academic_year || '2022-2023';

    // Format issuance date
    const issuanceDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Get program abbreviation for department (e.g., BSIT -> BSIT DEPARTMENT)
    const programAbbr = student.program_name.split(' ').map(word => word.charAt(0)).join('').toUpperCase();
    const departmentName = `${programAbbr} DEPARTMENT`;

    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 72,
        right: 72
      }
    });

    // Create buffer for PDF data
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    const pdfPromise = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // Header Section
    const startY = 50;
    let currentY = startY;

    // Student ID (top left)
    doc.fontSize(10).text(`Student ID#: ${student.student_id}`, 72, currentY);

    // Statement of Account (top right) - optional
    // doc.fontSize(10).text('Statement of Account', 450, currentY, { align: 'right' });

    currentY += 20;

    // Logo placeholder (circle) - We'll draw a circle for the logo
    const logoX = 72;
    const logoY = currentY;
    const logoRadius = 28;
    doc.circle(logoX + logoRadius, logoY + logoRadius, logoRadius).stroke();
    // Note: To add actual logo image, use: doc.image(logoPath, logoX, logoY, { width: logoRadius * 2, height: logoRadius * 2 });

    // College name and contact info (centered)
    doc.fontSize(14).font('Helvetica-Bold')
      .text('Our Lady of the Sacred Heart College of Guimba, Inc.', 200, currentY + 10, { align: 'center', width: 250 });
    
    currentY += 20;
    doc.fontSize(11).font('Helvetica')
      .text('Guimba, Nueva Ecija', 200, currentY, { align: 'center', width: 250 });
    
    currentY += 15;
    doc.fontSize(9)
      .text('Tel Nos.: (044)-943-0553 / Fax: (044)-61160026', 200, currentY, { align: 'center', width: 250 });

    currentY += 20;

    // Separator line
    doc.moveTo(72, currentY).lineTo(522, currentY).stroke();

    currentY += 10;

    // "Student's Copy only" (right side)
    doc.fontSize(9).font('Helvetica-Oblique')
      .text('Student\'s Copy only', 450, currentY, { align: 'right' });

    currentY += 25;

    // Department and Title
    doc.fontSize(12).font('Helvetica-Bold')
      .text(departmentName, 200, currentY, { align: 'center', width: 250 });
    
    currentY += 15;
    doc.fontSize(12).font('Helvetica-Bold')
      .text('CERTIFICATION OF GRADES', 200, currentY, { align: 'center', width: 250 });

    currentY += 20;

    // Salutation
    doc.fontSize(11).font('Helvetica-Bold')
      .text('TO WHOM IT MAY CONCERN:', 72, currentY);

    currentY += 20;

    // Certification paragraph
    const certificationText = `This is to certify that ${studentName} is presently enrolled as a ${yearLevelText} College, a ${student.program_name} student and this is an UNOFFICIAL COPY of his/her grades during the ${semesterText} Semester A.Y ${academicYear} as indicated with corresponding units earned:`;
    
    doc.fontSize(10).font('Helvetica')
      .text(certificationText, {
        x: 72,
        y: currentY,
        width: 450,
        align: 'justify'
      });

    // Calculate text height
    const textHeight = doc.heightOfString(certificationText, {
      width: 450,
      align: 'justify'
    });
    currentY += textHeight + 15;

    // Table Section
    const tableStartX = 72;
    const tableStartY = currentY;
    const tableWidth = 450;
    
    // Column widths
    const columnWidths = {
      code: 80,
      title: 200,
      rating: 60,
      credits: 60,
      remarks: 90
    };

    // Semester sub-header
    doc.fontSize(9).font('Helvetica')
      .text(`${semesterText} Semester ${academicYear}`, tableStartX + columnWidths.code, tableStartY - 15, {
        width: columnWidths.title + columnWidths.rating + columnWidths.credits + columnWidths.remarks,
        align: 'center'
      });

    // Table header row
    const headerHeight = 25;
    doc.rect(tableStartX, tableStartY, tableWidth, headerHeight).stroke();
    
    // Header text
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('COURSE', tableStartX + 5, tableStartY + 3);
    doc.text('CODE', tableStartX + 5, tableStartY + 12);
    doc.text('DESCRIPTIVE TITLE', tableStartX + columnWidths.code + 5, tableStartY + 8);
    doc.text('RATING', tableStartX + columnWidths.code + columnWidths.title + 5, tableStartY + 8);
    doc.text('CREDITS', tableStartX + columnWidths.code + columnWidths.title + columnWidths.rating + 5, tableStartY + 8);
    doc.text('REMARKS', tableStartX + columnWidths.code + columnWidths.title + columnWidths.rating + columnWidths.credits + 5, tableStartY + 8);

    // Course rows
    let rowY = tableStartY + headerHeight;
    courseData.forEach(course => {
      const titleWidth = columnWidths.title - 10;
      const titleHeight = doc.heightOfString(course.title, {
        width: titleWidth,
        align: 'left'
      });
      const rowHeight = Math.max(25, titleHeight + 10);

      // Draw row border
      doc.rect(tableStartX, rowY, tableWidth, rowHeight).stroke();
      
      // Vertical dividers
      doc.moveTo(tableStartX + columnWidths.code, rowY)
        .lineTo(tableStartX + columnWidths.code, rowY + rowHeight).stroke();
      doc.moveTo(tableStartX + columnWidths.code + columnWidths.title, rowY)
        .lineTo(tableStartX + columnWidths.code + columnWidths.title, rowY + rowHeight).stroke();
      doc.moveTo(tableStartX + columnWidths.code + columnWidths.title + columnWidths.rating, rowY)
        .lineTo(tableStartX + columnWidths.code + columnWidths.title + columnWidths.rating, rowY + rowHeight).stroke();
      doc.moveTo(tableStartX + columnWidths.code + columnWidths.title + columnWidths.rating + columnWidths.credits, rowY)
        .lineTo(tableStartX + columnWidths.code + columnWidths.title + columnWidths.rating + columnWidths.credits, rowY + rowHeight).stroke();

      // Course data
      doc.fontSize(9).font('Helvetica');
      const textY = rowY + (rowHeight / 2) - 5;
      doc.text(course.code, tableStartX + 5, textY);
      doc.text(course.title, tableStartX + columnWidths.code + 5, rowY + 5, {
        width: titleWidth,
        align: 'left'
      });
      doc.text(course.rating, tableStartX + columnWidths.code + columnWidths.title + 5, textY);
      doc.text(course.credits, tableStartX + columnWidths.code + columnWidths.title + columnWidths.rating + 5, textY);
      doc.text(course.remarks, tableStartX + columnWidths.code + columnWidths.title + columnWidths.rating + columnWidths.credits + 5, textY);

      rowY += rowHeight;
    });

    // GPA row
    doc.rect(tableStartX, rowY, tableWidth, 25).stroke();
    doc.fontSize(9).font('Helvetica-Bold')
      .text('GPA', tableStartX + 5, rowY + 8);
    if (gpa) {
      doc.fontSize(9).font('Helvetica')
        .text(gpa, tableStartX + columnWidths.code + columnWidths.title + 5, rowY + 8);
    }

    // Footer section
    rowY += 40;

    // Issuance statement
    doc.fontSize(9).font('Helvetica')
      .text(`Issued for the above named student for his/her references purposes only this ${issuanceDate} here at OLSHCO, Guimba, Nueva Ecija.`, {
        x: 72,
        y: rowY,
        width: 450,
        align: 'left'
      });

    rowY += 50;

    // Signatures section
    // Prepared by (left)
    doc.fontSize(10).font('Helvetica')
      .text('Prepared by:', 72, rowY);
    rowY += 40;
    // Signature line placeholder
    doc.moveTo(72, rowY).lineTo(200, rowY).stroke();
    rowY += 15;
    doc.fontSize(10).font('Helvetica-Bold')
      .text('JERICK C. BARNATIA', 72, rowY);
    rowY += 12;
    doc.fontSize(9).font('Helvetica')
      .text('Adviser ' + programAbbr, 72, rowY);

    // Checked by (right)
    rowY -= 67;
    doc.fontSize(10).font('Helvetica')
      .text('Checked by:', 450, rowY, { align: 'right' });
    rowY += 40;
    // Signature line placeholder
    doc.moveTo(350, rowY).lineTo(522, rowY).stroke();
    rowY += 15;
    doc.fontSize(10).font('Helvetica-Bold')
      .text('PRINCESS D. CALINA', 450, rowY, { align: 'right' });
    rowY += 12;
    doc.fontSize(9).font('Helvetica')
      .text('Program Head', 450, rowY, { align: 'right' });

    // Note at the bottom
    rowY += 30;
    doc.fontSize(8).font('Helvetica')
      .text('Note: This copy of grades is for student references only. Valid copy of grades will be issued by the Registrar\'s Office upon request.', {
        x: 72,
        y: rowY,
        width: 450,
        align: 'left'
      });

    // End the document
    doc.end();
    const pdfBuffer = await pdfPromise;

    // Send the PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename=certificate-of-grades-${req_id}.pdf`);
    res.end(pdfBuffer);

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Error generating document: ' + error.message });
  }
};
