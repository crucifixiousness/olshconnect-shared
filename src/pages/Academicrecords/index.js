import { useContext, useEffect, useState } from 'react';
import { MyContext } from "../../App";
import { 
  Button, 
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box
} from '@mui/material';
import axios from 'axios';

const AcademicRecords = () => {
  const { user } = useContext(MyContext);
  const context = useContext(MyContext);

  // Check localStorage cache synchronously on mount (like Student Profile)
  const cachedData = localStorage.getItem('academicRecordsData');
  const cacheTimestamp = localStorage.getItem('academicRecordsTimestamp');
  const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
  const hasValidCache = cachedData && cacheAge && cacheAge < 300000; // 5 minutes

  // Initialize state with cached data if available, otherwise empty
  const [courses, setCourses] = useState(hasValidCache ? (JSON.parse(cachedData).courses || []) : []);
  const [enrollment, setEnrollment] = useState(hasValidCache ? (JSON.parse(cachedData).enrollment || null) : null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!hasValidCache); // Only show loading if no valid cache

  useEffect(() => {
    context.setIsHideComponents(false);
    window.scrollTo(0, 0);
    fetchAcademicRecord();
  }, [context]);

  const fetchAcademicRecord = async () => {
    try {
      // Check cache first (like Student Profile)
      const cachedData = localStorage.getItem('academicRecordsData');
      const cacheTimestamp = localStorage.getItem('academicRecordsTimestamp');
      const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
      
      // Use cache if it's less than 5 minutes old
      if (cachedData && cacheAge && cacheAge < 300000) {
        const parsedData = JSON.parse(cachedData);
        setCourses(parsedData.courses || []);
        setEnrollment(parsedData.enrollment || null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to view your academic records.');
        setLoading(false);
        return;
      }

      const res = await axios.get('/api/student-academic-record', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Cache the new data (like Student Profile)
      localStorage.setItem('academicRecordsData', JSON.stringify({
        courses: res.data.courses || [],
        enrollment: res.data.enrollment || null
      }));
      localStorage.setItem('academicRecordsTimestamp', Date.now().toString());

      setCourses(res.data.courses || []);
      setEnrollment(res.data.enrollment || null);
      setError('');
      setLoading(false);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load academic records');
      setLoading(false);
    }
  };

  return (
    <div className="right-content w-100">
      {/* Header Section */}
      {user && user.firstName && (
        <div className="card shadow border-0 p-3">
          <h3 className="hd mt-2 pb-0" data-testid="page-title">Academic Records</h3>
        </div>
      )}

      <div className="card shadow border-0 p-3 mt-3">
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
            <CircularProgress style={{ color: '#c70202' }} />
          </div>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <>
            {/* Personal Information */}
            <div className="mt-3">
              <h4>Personal Information</h4>
              <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                <p><strong>Name:</strong> {user?.lastName}, {user?.firstName} {user?.middleName?.charAt(0)}. </p>
                <p><strong>Student No:</strong> {user?.id}</p>
                {enrollment && (
                  <>
                    <p><strong>Program:</strong> {enrollment.program_name || '—'}</p>
                    <p><strong>Year Level:</strong> {enrollment.year_level || '—'}</p>
                    <p><strong>Semester:</strong> {enrollment.semester || '—'}</p>
                  </>
                )}
              </Box>
            </div>

            {/* Grades Overview (Live) */}
            <div className="mt-3">
              <h4>Grades Overview</h4>
              <Paper elevation={3} sx={{ borderRadius: '8px', overflow: 'hidden' }}>
                <TableContainer>
                  <Table aria-label="grades table">
                    <TableHead>
                      <TableRow>
                        <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Subject Code</TableCell>
                        <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Subject Title</TableCell>
                        <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center">Units</TableCell>
                        <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center">Grade</TableCell>
                        <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center">Remarks</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {courses.length > 0 ? (
                        courses.map((row, idx) => {
                          const isApproved = ['final', 'reg_approved', 'registrar_approved'].includes(row.approval_status);
                          const grade = isApproved && row.final_grade ? parseFloat(row.final_grade) : null;
                          const remarks = grade ? (grade < 3.0 ? 'Passed' : 'Failed') : '';
                          return (
                            <TableRow hover key={idx}>
                              <TableCell>{row.course_code}</TableCell>
                              <TableCell>{row.course_name}</TableCell>
                              <TableCell align="center">{row.units}</TableCell>
                              <TableCell align="center">{grade ? grade.toFixed(2) : ''}</TableCell>
                              <TableCell align="center">
                                {remarks && (
                                  <span className={`badge ${grade < 3.0 ? 'bg-success' : 'bg-danger'}`}>{remarks}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center">No courses found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </div>

            {/* GPA Overview (placeholder) */}
            <div className="mt-3">
              <h4>GPA Overview</h4>
              <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                <p><strong>Semester GPA:</strong> —</p>
                <p><strong>Cumulative GPA:</strong> —</p>
              </Box>
            </div>

            {/* Transcript Request Button */}
            <div className="mt-3 text-center">
              <Button 
                variant="contained" 
                sx={{ 
                  bgcolor: '#c70202',
                  '&:hover': { bgcolor: '#a00000' }
                }}
              >
                Request Transcript
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AcademicRecords;
