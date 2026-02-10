import { useState, useEffect } from "react";
import { 
  Button, 
  Snackbar, 
  Alert, 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";
import { 
  School as SchoolIcon, 
  Schedule as ScheduleIcon,
  Grade as GradeIcon
} from '@mui/icons-material';
import axios from 'axios';
const ClassManagement = () => {
  
  // Check localStorage cache synchronously on mount for instant display
  const cachedData = localStorage.getItem('instructorClassesData');
  const cacheTimestamp = localStorage.getItem('instructorClassesTimestamp');
  const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
  let initialData = [];
  let initialLoading = false;
  
  try {
    if (cachedData && cacheAge && cacheAge < 300000) {
      const parsed = JSON.parse(cachedData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        initialData = parsed;
        initialLoading = false;
      }
    }
  } catch (e) {
    console.warn('⚠️ [INSTRUCTOR CLASSES] Invalid cache, will fetch fresh:', e);
  }

  const [courses, setCourses] = useState(initialData);
  const [loading, setLoading] = useState(initialLoading);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Grades modal state
  const [gradesModalOpen, setGradesModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [gradesLoading, setGradesLoading] = useState(false);

  const formatTime = (time) => {
    if (!time) return '';
    if (time.includes('AM') || time.includes('PM')) {
      return time;
    }
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const getDayColor = (day) => {
    const colors = {
      'Monday': '#1976d2',
      'Tuesday': '#388e3c',
      'Wednesday': '#f57c00',
      'Thursday': '#7b1fa2',
      'Friday': '#d32f2f',
      'Saturday': '#5d4037'
    };
    return colors[day] || '#757575';
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

  useEffect(() => {
    const fetchInstructorCourses = async (forceRefresh = false) => {
      let wasLoadingSet = false;
      try {
        // Check if we have valid cache and don't need to show loading
        const cachedData = localStorage.getItem('instructorClassesData');
        const cacheTimestamp = localStorage.getItem('instructorClassesTimestamp');
        const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
        const hasValidCache = !forceRefresh && cachedData && cacheAge && cacheAge < 300000;

        // Use cache if it's less than 5 minutes old
        if (hasValidCache) {
          const parsed = JSON.parse(cachedData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCourses(parsed);
            setLoading(false);
            
            // Always do background refresh to check for updates
            fetchInstructorCourses(true).catch(err => {
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

        const response = await axios.get(`/api/instructor-classes?staff_id=${staff_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = response.data || [];
        setCourses(data);
        
        // Cache the fetched data
        try {
          if (Array.isArray(data) && data.length > 0) {
            localStorage.setItem('instructorClassesData', JSON.stringify(data));
            localStorage.setItem('instructorClassesTimestamp', Date.now().toString());
          } else {
            localStorage.removeItem('instructorClassesData');
            localStorage.removeItem('instructorClassesTimestamp');
          }
        } catch (storageError) {
          console.warn('⚠️ [INSTRUCTOR CLASSES] Could not cache data:', storageError.message);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
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

    fetchInstructorCourses();
  }, []);

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCheckGrades = async (course) => {
    setSelectedCourse(course);
    setGradesModalOpen(true);
    setGradesLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `/api/course-students?courseId=${course.assignment_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Use the students data from the response
      setStudents(response.data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      setSnackbar({
        open: true,
        message: "Failed to fetch students",
        severity: 'error'
      });
    } finally {
      setGradesLoading(false);
    }
  };

  const handleCloseGradesModal = () => {
    setGradesModalOpen(false);
    setSelectedCourse(null);
    setStudents([]);
  };

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="hd mt-2 pb-0">Class Management</h3>
      </div>
      <div className="card shadow border-0 p-3 mt-1">
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress sx={{ color: '#c70202' }} />
          </Box>
        ) : courses.length > 0 ? (
          <Grid container spacing={3}>
            {courses.map((course, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card 
                  sx={{ 
                    height: '100%',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#495057' }}>
                          {course.course_code}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, mt: 0.5 }}>
                          {course.course_name}
                        </Typography>
                      </Box>
                      <Chip 
                        label={course.units + ' units'} 
                        size="small" 
                        sx={{ 
                          backgroundColor: '#f8f9fa',
                          color: '#6c757d',
                          border: '1px solid #dee2e6'
                        }}
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Block: <strong>{course.section}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Program: <strong>{course.program_name}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Year Level: <strong>{course.year_level}</strong>
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {course.day} • {formatTime(course.start_time)} - {formatTime(course.end_time)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip 
                        label={course.semester} 
                        size="small" 
                        sx={{ 
                          backgroundColor: '#f8f9fa',
                          color: '#6c757d',
                          border: '1px solid #dee2e6'
                        }}
                      />
                      <Chip 
                        label={course.day} 
                        size="small" 
                        sx={{ 
                          backgroundColor: getDayColor(course.day) + '20',
                          color: getDayColor(course.day),
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                    <Button 
                      data-testid={`manage-button-${index}`}
                      variant="contained" 
                      fullWidth
                      onClick={() => handleCheckGrades(course)}
                      sx={{ 
                        backgroundColor: '#c70202',
                        '&:hover': {
                          backgroundColor: '#a00101'
                        }
                      }}
                    >
                      Check Grades
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper elevation={1} sx={{ p: 6, textAlign: 'center' }}>
            <SchoolIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>
              No courses found
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You have not been assigned to any courses yet.
            </Typography>
          </Paper>
        )}
      </div>
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

      {/* Grades Modal */}
      <Dialog 
        open={gradesModalOpen} 
        onClose={handleCloseGradesModal}
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
          <GradeIcon />
          Check Grades - {selectedCourse?.course_code} - {selectedCourse?.course_name}
        </DialogTitle>
        
        <DialogContent sx={{ mt: 2 }}>
          {selectedCourse && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Block:</strong> {selectedCourse.section} • 
                <strong> Program:</strong> {selectedCourse.program_name} • 
                <strong> Year Level:</strong> {selectedCourse.year_level} • 
                <strong> Semester:</strong> {selectedCourse.semester}
              </Typography>
            </Box>
          )}
          
          {gradesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <CircularProgress sx={{ color: '#c70202' }} />
            </Box>
          ) : (students && students.length > 0) ? (
            <>
              {/* Summary Information */}
              <Box sx={{ mb: 3, p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Total Students:</strong> {students.length} • 
                  <strong> Graded:</strong> {students.filter(s => s.final_grade).length} • 
                  <strong> Pending:</strong> {students.filter(s => !s.final_grade).length}
                </Typography>
              </Box>
              
              <TableContainer component={Paper} elevation={1}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 'bold', color: '#495057' }}>Student ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#495057' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#495057' }}>Email</TableCell>
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
                        <TableCell>{student.email}</TableCell>
                        <TableCell>
                          {student.final_grade ? (
                            <Chip 
                              label={student.final_grade} 
                              size="small"
                              sx={{ 
                                backgroundColor: '#d4edda',
                                color: '#155724',
                                fontWeight: 'bold',
                                fontSize: '0.875rem'
                              }}
                            />
                          ) : (
                            <Chip 
                              label="Not Graded" 
                              size="small"
                              sx={{ 
                                backgroundColor: '#fff3cd',
                                color: '#856404',
                                fontWeight: 'bold'
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={student.grade_status} 
                            size="small"
                            sx={{ 
                              backgroundColor: getStatusColor(student.grade_status),
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
            </>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <SchoolIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No students found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No students are enrolled in this course yet.
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={handleCloseGradesModal}
            variant="outlined"
            sx={{ borderColor: '#c70202', color: '#c70202' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ClassManagement;