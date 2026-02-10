import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { 
  Card, 
  Typography, 
  CircularProgress, 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Chip,
  Alert,
  Snackbar,
  Grid,
  Divider
} from '@mui/material';
import { FaGraduationCap, FaBookOpen, FaChartLine, FaClock } from "react-icons/fa";
import { MyContext } from "../../App";

const StudentGrades = () => {
  const context = useContext(MyContext);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState([]);
  const [statistics, setStatistics] = useState({
    total_grades: 0,
    total_units: 0,
    gpa: 0,
    valid_grades: 0
  });
  const [enrollment, setEnrollment] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    context.setIsHideComponents(false);
    window.scrollTo(0, 0);
    fetchStudentGrades();
  }, [context]);

  const fetchStudentGrades = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setSnackbar({
          open: true,
          message: 'Please login to view your grades',
          severity: 'error'
        });
        return;
      }

      const response = await axios.get('/api/student-grades', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setGrades(response.data.grades || []);
      setStatistics(response.data.statistics || {
        total_grades: 0,
        total_units: 0,
        gpa: 0,
        valid_grades: 0
      });
      setEnrollment(response.data.enrollment || {});
    } catch (error) {
      console.error('Error fetching student grades:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to load grades',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade) => {
    if (grade >= 1.0 && grade < 1.5) return '#4caf50'; // Excellent
    if (grade >= 1.5 && grade < 2.0) return '#8bc34a'; // Very Good
    if (grade >= 2.0 && grade < 2.5) return '#ffc107'; // Good
    if (grade >= 2.5 && grade < 3.0) return '#ff9800'; // Satisfactory
    if (grade >= 3.0 && grade < 5.0) return '#f44336'; // Failed
    return '#757575'; // Default
  };

  const getGradeDescription = (grade) => {
    if (grade >= 1.0 && grade < 1.5) return 'Excellent';
    if (grade >= 1.5 && grade < 2.0) return 'Very Good';
    if (grade >= 2.0 && grade < 2.5) return 'Good';
    if (grade >= 2.5 && grade < 3.0) return 'Satisfactory';
    if (grade >= 3.0 && grade < 5.0) return 'Failed';
    return 'N/A';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="right-content w-100">
        <div className="card shadow border-0 p-3 mt-1">
          <h3 className="mb-4">My Grades</h3>
          <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
            <CircularProgress sx={{ color: '#c70202' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="mb-4">My Grades</h3>
        
        {/* Statistics Cards */}
        <div className="row mb-4">
          <div className="col-md-3 mb-3">
            <Card className="p-3 text-center" sx={{ backgroundColor: '#e3f2fd' }}>
              <FaBookOpen size={30} style={{ color: '#1976d2' }} />
              <Typography variant="h4" style={{ color: '#1976d2', fontWeight: 'bold' }}>
                {statistics.total_grades}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Courses
              </Typography>
            </Card>
          </div>
          <div className="col-md-3 mb-3">
            <Card className="p-3 text-center" sx={{ backgroundColor: '#e8f5e8' }}>
              <FaGraduationCap size={30} style={{ color: '#2e7d32' }} />
              <Typography variant="h4" style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                {statistics.total_units}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Units
              </Typography>
            </Card>
          </div>
          <div className="col-md-3 mb-3">
            <Card className="p-3 text-center" sx={{ backgroundColor: '#fff3e0' }}>
              <FaChartLine size={30} style={{ color: '#ed6c02' }} />
              <Typography variant="h4" style={{ color: '#ed6c02', fontWeight: 'bold' }}>
                {statistics.gpa}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                GPA
              </Typography>
            </Card>
          </div>
          <div className="col-md-3 mb-3">
            <Card className="p-3 text-center" sx={{ backgroundColor: '#f3e5f5' }}>
              <FaClock size={30} style={{ color: '#7b1fa2' }} />
              <Typography variant="h4" style={{ color: '#7b1fa2', fontWeight: 'bold' }}>
                {statistics.valid_grades}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Graded Courses
              </Typography>
            </Card>
          </div>
        </div>

        {/* Enrollment Info */}
        {enrollment.program_name && (
          <Card className="mb-4 p-3" sx={{ backgroundColor: '#f8f9fa' }}>
            <Typography variant="h6" className="mb-2">Current Enrollment</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="textSecondary">Program</Typography>
                <Typography variant="body1" style={{ fontWeight: 'bold' }}>
                  {enrollment.program_name}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="textSecondary">Year Level</Typography>
                <Typography variant="body1" style={{ fontWeight: 'bold' }}>
                  Year {enrollment.year_level}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="textSecondary">Semester</Typography>
                <Typography variant="body1" style={{ fontWeight: 'bold' }}>
                  {enrollment.semester}
                </Typography>
              </Grid>
            </Grid>
          </Card>
        )}

        {/* Grades Table */}
        <Card>
          <Box className="p-3">
            <Typography variant="h6" className="mb-3">
              Approved Grades
            </Typography>
            <Typography variant="body2" color="textSecondary" className="mb-3">
              Only grades that have been approved by both Registrar and Dean are displayed here.
            </Typography>
          </Box>
          
          <Divider />
          
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Course Code</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Course Name</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Units</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Semester</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Grade</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Description</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Instructor</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Approved Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {grades.length > 0 ? (
                  grades.map((grade) => (
                    <TableRow key={grade.grade_id} hover>
                      <TableCell>
                        <Typography variant="body2" style={{ fontWeight: 'bold' }}>
                          {grade.course_code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {grade.course_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {grade.units}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {grade.semester}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="h6" 
                          style={{ 
                            fontWeight: 'bold',
                            color: getGradeColor(grade.final_grade)
                          }}
                        >
                          {grade.final_grade}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getGradeDescription(grade.final_grade)}
                          style={{ 
                            backgroundColor: getGradeColor(grade.final_grade),
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {grade.instructor_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(grade.final_approved_at)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Box className="p-4">
                        <FaGraduationCap size={48} style={{ color: '#ccc', marginBottom: '16px' }} />
                        <Typography variant="h6" color="textSecondary">
                          No approved grades available
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Your grades will appear here once they are approved by the Registrar and Dean.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Information Alert */}
        <Alert severity="info" className="mt-4">
          <Typography variant="body2">
            <strong>Note:</strong> Only grades that have been approved by both the Registrar and Dean are displayed here. 
            If you don't see a grade for a course, it may still be pending approval.
          </Typography>
        </Alert>
      </div>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default StudentGrades;
