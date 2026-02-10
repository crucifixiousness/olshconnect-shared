import { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  TextField,
  Button,
  CircularProgress,
  Box,
  Alert,
  Snackbar,
  Chip,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import { 
  School as SchoolIcon, 
  Save as SaveIcon,
  Assignment as AssignmentIcon,
  Upload as UploadIcon,
  FileUpload as FileUploadIcon
} from '@mui/icons-material';

const InstructorGrades = () => {
  // Check localStorage cache synchronously on mount for instant display
  const cachedData = localStorage.getItem('instructorGradesCoursesData');
  const cacheTimestamp = localStorage.getItem('instructorGradesCoursesTimestamp');
  const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
  let initialCourses = [];
  let initialLoading = true;
  
  try {
    if (cachedData && cacheAge && cacheAge < 300000) {
      const parsed = JSON.parse(cachedData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        initialCourses = parsed;
        initialLoading = false;
      }
    }
  } catch (e) {
    console.warn('⚠️ [INSTRUCTOR GRADES] Invalid cache, will fetch fresh:', e);
  }

  const [loading, setLoading] = useState(initialLoading);
  const [courses, setCourses] = useState(initialCourses);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Excel import states
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');

  useEffect(() => {
    const fetchCourses = async (forceRefresh = false) => {
      let wasLoadingSet = false;
      try {
        // Check if we have valid cache and don't need to show loading
        const cachedData = localStorage.getItem('instructorGradesCoursesData');
        const cacheTimestamp = localStorage.getItem('instructorGradesCoursesTimestamp');
        const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
        const hasValidCache = !forceRefresh && cachedData && cacheAge && cacheAge < 300000;

        // Use cache if it's less than 5 minutes old
        if (hasValidCache) {
          const parsed = JSON.parse(cachedData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCourses(parsed);
            setLoading(false);
            
            // Always do background refresh to check for updates
            fetchCourses(true).catch(err => {
              console.error("Background refresh error:", err);
            });
            return;
          }
        }

        // Only show loading if not forcing refresh
        if (!forceRefresh) {
          setLoading(true);
          wasLoadingSet = true;
        }

        const userStr = localStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : null;
        const staff_id = user?.staff_id;
        const token = localStorage.getItem('token');
        
        if (!staff_id || !token) {
          setSnackbar({
            open: true,
            message: "Please login again",
            severity: 'error'
          });
          if (wasLoadingSet) {
            setLoading(false);
          }
          return;
        }

        // Use the same source as Class Management to avoid mismatches
        const response = await axios.get(`/api/instructor-classes?staff_id=${staff_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = response.data || [];
        setCourses(data);
        
        // Cache the fetched data
        try {
          if (Array.isArray(data) && data.length > 0) {
            localStorage.setItem('instructorGradesCoursesData', JSON.stringify(data));
            localStorage.setItem('instructorGradesCoursesTimestamp', Date.now().toString());
          } else {
            localStorage.removeItem('instructorGradesCoursesData');
            localStorage.removeItem('instructorGradesCoursesTimestamp');
          }
        } catch (storageError) {
          console.warn('⚠️ [INSTRUCTOR GRADES] Could not cache data:', storageError.message);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        setSnackbar({
          open: true,
          message: "Failed to fetch courses",
          severity: 'error'
        });
      } finally {
        if (wasLoadingSet) {
          setLoading(false);
        }
      }
    };

    fetchCourses();
  }, []);

  const handleCourseChange = async (assignmentId) => {
    setSelectedCourse(assignmentId);
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `/api/course-students?courseId=${assignmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setStudents(response.data.students);
      
      // Initialize grades object
      const initialGrades = {};
      response.data.students.forEach(student => {
        initialGrades[student.student_id] = student.final_grade || '';
      });
      setGrades(initialGrades);
      
    } catch (error) {
      console.error('Error fetching students:', error);
      setSnackbar({
        open: true,
        message: "Failed to fetch students",
        severity: 'error'
      });
    }
    
    setLoading(false);
  };

  const handleGradeChange = (studentId, value) => {
    // Validate grade input (1.0 to 5.0)
    const grade = parseFloat(value);
    if ((grade >= 1.0 && grade <= 5.0) || value === '') {
      setGrades(prev => ({
        ...prev,
        [studentId]: value
      }));
    }
  };

  const handleSaveGrades = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const selectedCourseInfo = getSelectedCourseInfo();
      
      if (!selectedCourseInfo) {
        setSnackbar({
          open: true,
          message: "Please select a course first",
          severity: 'error'
        });
        setSaving(false);
        return;
      }
      
      await axios.post(
        '/api/save-grades',
        {
          courseId: selectedCourseInfo.pc_id, // Use pc_id for saving grades
          grades: grades
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Invalidate cache after saving grades
      try {
        localStorage.removeItem('instructorGradesCoursesData');
        localStorage.removeItem('instructorGradesCoursesTimestamp');
      } catch (e) {
        // Ignore storage errors
      }
      
      setSnackbar({
        open: true,
        message: "Grades saved successfully!",
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving grades:', error);
      setSnackbar({
        open: true,
        message: "Failed to save grades. Please try again.",
        severity: 'error'
      });
    }
    setSaving(false);
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getSelectedCourseInfo = () => {
    return courses.find(course => course.assignment_id === selectedCourse);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Final':
        return '#388e3c';
      case 'Dean Approved':
        return '#2e7d32';
      case 'Program Head Approved':
        return '#1976d2';
      case 'Pending':
        return '#ed6c02';
      case 'Graded':
        return '#d4edda';
      case 'Not Graded':
        return '#f8d7da';
      default:
        return '#6c757d';
    }
  };

  // Excel import functions
  const handleImportClick = () => {
    if (!selectedCourse) {
      setSnackbar({
        open: true,
        message: "Please select a course first",
        severity: 'error'
      });
      return;
    }
    setImportDialogOpen(true);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImportFile(file);
      parseExcelFile(file);
    }
  };

  const parseExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get all available sheets
        const sheets = workbook.SheetNames;
        setAvailableSheets(sheets);
        setSelectedSheet(sheets[0] || ''); // Default to first sheet
        
        // Parse the first sheet by default
        if (sheets.length > 0) {
          parseSheetData(workbook, sheets[0]);
        }
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        setSnackbar({
          open: true,
          message: "Error parsing Excel file. Please check the format.",
          severity: 'error'
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const parseSheetData = (workbook, sheetName) => {
    try {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Parse the data - expecting format: Student ID, Name, Final Grade
      const parsedData = [];
      for (let i = 1; i < jsonData.length; i++) { // Skip header row
        const row = jsonData[i];
        if (row && row.length >= 3 && row[0] && row[1] && row[2]) {
          parsedData.push({
            student_id: row[0].toString(),
            name: row[1].toString(),
            final_grade: parseFloat(row[2]) || ''
          });
        }
      }
      
      setImportPreview(parsedData);
    } catch (error) {
      console.error('Error parsing sheet data:', error);
      setSnackbar({
        open: true,
        message: "Error parsing sheet data. Please check the format.",
        severity: 'error'
      });
    }
  };

  const handleSheetChange = (event) => {
    const newSheet = event.target.value;
    setSelectedSheet(newSheet);
    
    // Re-parse the selected sheet
    if (importFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          parseSheetData(workbook, newSheet);
        } catch (error) {
          console.error('Error re-parsing sheet:', error);
        }
      };
      reader.readAsArrayBuffer(importFile);
    }
  };

  const handleImportGrades = () => {
    if (importPreview.length === 0) {
      setSnackbar({
        open: true,
        message: "No valid data found in Excel file",
        severity: 'error'
      });
      return;
    }

    setImporting(true);
    
    // Match Excel data with current students
    const updatedGrades = { ...grades };
    let matchedCount = 0;
    
    importPreview.forEach(excelRow => {
      const student = students.find(s => 
        s.student_id.toString() === excelRow.student_id.toString()
      );
      
      if (student && excelRow.final_grade !== '') {
        const grade = parseFloat(excelRow.final_grade);
        if (grade >= 1.0 && grade <= 5.0) {
          updatedGrades[student.student_id] = grade.toString();
          matchedCount++;
        }
      }
    });
    
    // If nothing matched, show error and keep dialog open
    if (matchedCount === 0) {
      // Close dialog and clear temp state, but show error
      setImportDialogOpen(false);
      setImportFile(null);
      setImportPreview([]);
      setAvailableSheets([]);
      setSelectedSheet('');
      setImporting(false);
      setSnackbar({
        open: true,
        message: "Import failed: No matching students or valid grades found.",
        severity: 'error'
      });
      return;
    }

    setGrades(updatedGrades);
    setImportDialogOpen(false);
    setImportFile(null);
    setImportPreview([]);
    
    setSnackbar({
      open: true,
      message: `Successfully imported ${matchedCount} grade${matchedCount > 1 ? 's' : ''} from Excel`,
      severity: 'success'
    });
    
    setImporting(false);
  };

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
    setImportFile(null);
    setImportPreview([]);
    setAvailableSheets([]);
    setSelectedSheet('');
  };

  if (loading && !selectedCourse) {
    return (
      <div className="right-content w-100">
        <div className="card shadow border-0 p-3 mt-1">
          <h3 className="mb-4">Grade Entry</h3>
          <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
            <CircularProgress sx={{ color: '#c70202' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="mb-4">Grade Entry</h3>
        
        {/* Course Selection Card */}
        <Card className="mb-4 p-3" sx={{ 
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          border: '1px solid #dee2e6'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <SchoolIcon sx={{ color: '#c70202', fontSize: 28 }} />
            <Typography variant="h6" sx={{ color: '#495057', fontWeight: 'bold' }}>
              Select Course for Grade Entry
            </Typography>
          </Box>
          
          <div className="row align-items-center">
            <div className="col-md-6">
              <FormControl fullWidth>
                <InputLabel>Course</InputLabel>
                <Select
                  value={selectedCourse}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  label="Course"
                  sx={{ 
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#c70202'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#a00101'
                    }
                  }}
                >
                  {courses.map((course) => (
                    <MenuItem key={course.assignment_id} value={course.assignment_id}>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {course.course_code} - {course.course_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Block: {course.section} • {course.day} {course.start_time}-{course.end_time}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
            
            {selectedCourse && (
              <div className="col-md-6">
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`${students.length} Students`} 
                    color="primary" 
                    variant="outlined"
                    sx={{ borderColor: '#c70202', color: '#c70202' }}
                  />
                  <Chip 
                    label={getSelectedCourseInfo()?.semester || ''} 
                    variant="outlined"
                    sx={{ borderColor: '#6c757d', color: '#6c757d' }}
                  />
                </Box>
              </div>
            )}
          </div>
        </Card>

        {/* Students and Grades Table */}
        {selectedCourse && students.length > 0 && (
          <Card className="p-3" sx={{ 
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: 4
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <AssignmentIcon sx={{ color: '#c70202', fontSize: 24 }} />
              <Typography variant="h6" sx={{ color: '#495057', fontWeight: 'bold' }}>
                Student Grades
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                <CircularProgress sx={{ color: '#c70202' }} />
              </Box>
            ) : (
              <>
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #dee2e6' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                        <TableCell sx={{ fontWeight: 'bold', color: '#495057' }}>Student ID</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: '#495057' }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: '#495057' }}>Final Grade</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: '#495057' }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {students.map((student, index) => (
                        <TableRow 
                          key={student.student_id}
                          sx={{ 
                            '&:nth-of-type(odd)': { backgroundColor: '#f8f9fa' },
                            '&:hover': { backgroundColor: '#e9ecef' }
                          }}
                        >
                          <TableCell sx={{ fontWeight: '500' }}>{student.student_id}</TableCell>
                          <TableCell sx={{ fontWeight: '500' }}>{student.name}</TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              inputProps={{ 
                                step: "0.1",
                                min: "1.0",
                                max: "5.0"
                              }}
                              value={grades[student.student_id]}
                              onChange={(e) => handleGradeChange(student.student_id, e.target.value)}
                              size="small"
                              sx={{ 
                                width: '120px',
                                '& .MuiOutlinedInput-root': {
                                  '& fieldset': {
                                    borderColor: grades[student.student_id] ? '#c70202' : '#dee2e6'
                                  },
                                  '&:hover fieldset': {
                                    borderColor: '#c70202'
                                  }
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={student.grade_status || (grades[student.student_id] ? 'Graded' : 'Pending')} 
                              size="small"
                              sx={{ 
                                backgroundColor: getStatusColor(student.grade_status || (grades[student.student_id] ? 'Graded' : 'Pending')),
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Students: {students.length} • 
                    Graded: {Object.values(grades).filter(grade => grade !== '').length} • 
                    Pending: {Object.values(grades).filter(grade => grade === '').length}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button 
                      variant="outlined" 
                      onClick={handleImportClick}
                      startIcon={<UploadIcon />}
                      sx={{
                        borderColor: '#c70202',
                        color: '#c70202',
                        '&:hover': {
                          borderColor: '#a00101',
                          backgroundColor: '#fff5f5'
                        }
                      }}
                    >
                      IMPORT FROM EXCEL
                    </Button>
                    
                    <Button 
                      variant="contained" 
                      onClick={handleSaveGrades}
                      disabled={saving}
                      startIcon={saving ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <SaveIcon />}
                      sx={{ 
                        backgroundColor: '#c70202',
                        '&:hover': {
                          backgroundColor: '#a00101'
                        },
                        '&:disabled': {
                          backgroundColor: '#6c757d'
                        }
                      }}
                    >
                      {saving ? 'Saving...' : 'Save Grades'}
                    </Button>
                  </Box>
                </Box>
              </>
            )}
          </Card>
        )}

        {/* Empty State */}
        {selectedCourse && students.length === 0 && !loading && (
          <Card className="p-5" sx={{ textAlign: 'center' }}>
            <SchoolIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>
              No students found
            </Typography>
            <Typography variant="body1" color="text.secondary">
              No students are enrolled in this course yet.
            </Typography>
          </Card>
        )}
      </div>

      {/* Excel Import Dialog */}
      <Dialog 
        open={importDialogOpen} 
        onClose={handleCloseImportDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          backgroundColor: '#c70202', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <FileUploadIcon />
          Import Grades from Excel
        </DialogTitle>
        
        <DialogContent sx={{ mt: 2 }}>
          <DialogContentText sx={{ mb: 3 }}>
            Upload an Excel file with student grades. The file should have columns: Student ID, Name, Final Grade
          </DialogContentText>
          
          <Box sx={{ mb: 3 }}>
            <input
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              id="excel-file-input"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="excel-file-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                sx={{
                  borderColor: '#c70202',
                  color: '#c70202',
                  '&:hover': {
                    borderColor: '#a00101',
                    backgroundColor: '#fff5f5'
                  }
                }}
              >
                Choose Excel File
              </Button>
            </label>
            {importFile && (
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                Selected: {importFile.name}
              </Typography>
            )}
          </Box>

          {availableSheets.length > 1 && (
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Select Sheet</InputLabel>
                <Select
                  value={selectedSheet}
                  onChange={handleSheetChange}
                  label="Select Sheet"
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#c70202'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#a00101'
                    }
                  }}
                >
                  {availableSheets.map((sheet) => (
                    <MenuItem key={sheet} value={sheet}>
                      {sheet}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {importPreview.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Preview from "{selectedSheet}" ({importPreview.length} records found):
              </Typography>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #dee2e6', maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Student ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Final Grade</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importPreview.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.student_id}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.final_grade}</TableCell>
                      </TableRow>
                    ))}
                    {importPreview.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={3} sx={{ textAlign: 'center', fontStyle: 'italic' }}>
                          ... and {importPreview.length - 10} more records
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={handleCloseImportDialog}
            variant="outlined"
            sx={{ borderColor: '#6c757d', color: '#6c757d' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleImportGrades}
            variant="contained"
            disabled={importPreview.length === 0 || importing}
            startIcon={importing ? <CircularProgress size={20} /> : <UploadIcon />}
            sx={{
              backgroundColor: '#c70202',
              '&:hover': {
                backgroundColor: '#a00101'
              },
              '&:disabled': {
                backgroundColor: '#6c757d'
              }
            }}
          >
            {importing ? 'Importing...' : 'Import Grades'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default InstructorGrades;