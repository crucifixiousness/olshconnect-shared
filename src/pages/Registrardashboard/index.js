import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { 
  Card, 
  Typography, 
  CircularProgress, 
  Box, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Tooltip
} from '@mui/material';
import { IoIosPeople } from "react-icons/io";
import { FaFileAlt, FaCheckCircle, FaTimesCircle, FaEye } from "react-icons/fa";
import { MyContext } from "../../App";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const RegistrarDashboard = () => {
  const context = useContext(MyContext);

  // Check localStorage cache synchronously on mount (like Academic Records)
  const cachedDashboardData = localStorage.getItem('registrarDashboardData');
  const cachedDashboardTimestamp = localStorage.getItem('registrarDashboardTimestamp');
  const cachedDashboardAge = cachedDashboardTimestamp ? Date.now() - parseInt(cachedDashboardTimestamp) : null;
  const hasValidCache = cachedDashboardData && cachedDashboardAge && cachedDashboardAge < 300000; // 5 minutes

  // Initialize state with cached data if available, otherwise empty
  const cachedData = hasValidCache ? JSON.parse(cachedDashboardData) : null;
  const [dashboardData, setDashboardData] = useState(cachedData?.dashboardData || {
    totalEnrollments: 0,
    totalVerified: 0,
    totalPending: 0,
    totalRejected: 0
  });
  const [enrollmentStats, setEnrollmentStats] = useState(cachedData?.enrollmentStats || {
    programStats: [],
    yearLevelStats: [],
    monthlyData: [],
    statusDistribution: [],
    documentStats: {}
  });
  const [loading, setLoading] = useState(!hasValidCache); // Only show loading if no valid cache

  useEffect(() => {
    context.setIsHideComponents(false);
    window.scrollTo(0,0);
  }, [context]);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Class-level approval states
  const [classes, setClasses] = useState([]);
  const [classLoading, setClassLoading] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState('All');
  const [viewOpen, setViewOpen] = useState(false);
  const [viewStudents, setViewStudents] = useState([]);
  const [viewClassInfo, setViewClassInfo] = useState(null);

  const fetchRegistrarData = async (forceRefresh = false) => {
    try {
      // Check cache first (like Academic Records and Student Profile), unless forcing refresh
      if (!forceRefresh) {
        const cachedData = localStorage.getItem('registrarDashboardData');
        const cacheTimestamp = localStorage.getItem('registrarDashboardTimestamp');
        const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;

        // Use cache if it's less than 5 minutes old
        if (cachedData && cacheAge && cacheAge < 300000) {
          const parsedData = JSON.parse(cachedData);
          setDashboardData(parsedData.dashboardData);
          setEnrollmentStats(parsedData.enrollmentStats);
          setLoading(false);
          
          // Always do background refresh to check for updates (new enrollments, status changes, etc.)
          fetchRegistrarData(true).catch(err => {
            console.error("Background refresh error:", err);
            // Keep showing cached data if background refresh fails
          });
          
      // Still fetch class approval data (it's separate and dynamic)
      await fetchClassApprovalData();
          return;
        }
      }

      // Only show loading if not forcing refresh (we already have data in background refresh)
      if (!forceRefresh) {
        setLoading(true);
      }

      const token = localStorage.getItem('token');

      if (!token) {
        console.error('No token found');
        setLoading(false);
        return;
      }

      // Fetch dashboard data from new API
      const response = await axios.get('/api/registrar-dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const formattedDashboardData = {
        totalEnrollments: response.data.totalEnrollments || 0,
        totalVerified: response.data.totalVerified || 0,
        totalPending: response.data.totalPending || 0,
        totalRejected: response.data.totalRejected || 0
      };

      const formattedEnrollmentStats = {
        programStats: response.data.enrollmentStats?.programStats || [],
        yearLevelStats: response.data.enrollmentStats?.yearLevelStats || [],
        monthlyData: response.data.enrollmentStats?.monthlyData || [],
        statusDistribution: response.data.enrollmentStats?.statusDistribution || [],
        documentStats: response.data.enrollmentStats?.documentStats || {}
      };

      // Cache the new data (like Academic Records and Student Profile)
      localStorage.setItem('registrarDashboardData', JSON.stringify({
        dashboardData: formattedDashboardData,
        enrollmentStats: formattedEnrollmentStats
      }));
      localStorage.setItem('registrarDashboardTimestamp', Date.now().toString());

      setDashboardData(formattedDashboardData);
      setEnrollmentStats(formattedEnrollmentStats);

      // Fetch class approval data
      await fetchClassApprovalData();

      // Only update loading if not forcing refresh
      if (!forceRefresh) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching registrar data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchClassApprovalData = async () => {
    try {
      setClassLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await axios.get('/api/registrar-class-approval', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = (response.data.classes || []).filter(c => (parseInt(c.total_grades, 10) || 0) > 0);
      setClasses(list);
      setSelectedProgram('All');
    } catch (e) {
      console.error('Error fetching class approvals:', e);
    } finally {
      setClassLoading(false);
    }
  };

  const handleApproveClass = async (pcId, action, assignmentId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const payload = { pcId, assignmentId };
      let endpoint = '';
      if (action === 'registrar_approve') {
        endpoint = '/api/registrar-approve-class';
      } else if (action === 'reject') {
        endpoint = '/api/reject-class';
      } else {
        throw new Error('Unsupported action for registrar');
      }

      await axios.post(endpoint, payload, { headers: { Authorization: `Bearer ${token}` } });
      await fetchClassApprovalData();
      setSnackbar({ open: true, message: 'Class approval updated', severity: 'success' });
    } catch (e) {
      console.error('Error approving class:', e);
      setSnackbar({ open: true, message: 'Failed to approve class', severity: 'error' });
    }
  };

  const handleViewClass = async (cls) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      // use assignment_id to fetch students for the class
      const response = await axios.get(`/api/course-students?courseId=${cls.assignment_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViewStudents(response.data.students || []);
      setViewClassInfo({
        course_code: cls.course_code,
        course_name: cls.course_name,
        section: cls.section,
        program_name: cls.program_name,
        year_level: cls.year_level,
        semester: cls.semester
      });
      setViewOpen(true);
    } catch (e) {
      console.error('Error fetching class students:', e);
      setSnackbar({ open: true, message: 'Failed to load class students', severity: 'error' });
    }
  };

  const statCards = [
    {
      title: 'Total Enrollments',
      value: dashboardData.totalEnrollments,
      icon: <IoIosPeople size={30} />,
      color: '#1976d2'
    },
    {
      title: 'Verified Enrollments',
      value: dashboardData.totalVerified,
      icon: <FaCheckCircle size={30} />,
      color: '#2e7d32'
    },
    {
      title: 'Pending Enrollments',
      value: dashboardData.totalPending,
      icon: <FaFileAlt size={30} />,
      color: '#ed6c02'
    },
    {
      title: 'Rejected Enrollments',
      value: dashboardData.totalRejected,
      icon: <FaTimesCircle size={30} />,
      color: '#d32f2f'
    }
  ];

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
      case 'Verified':
        return '#2e7d32';
      case 'Rejected':
        return '#d32f2f';
      case 'For Payment':
        return '#1976d2';
      case 'Officially Enrolled':
        return '#388e3c';
      default:
        return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="right-content w-100">
        <div className="card shadow border-0 p-3 mt-1">
          <h3 className="mb-4">Registrar Dashboard</h3>

          {/* Stat Cards - Show skeleton loading */}
          <div className="row">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="col-md-3 mb-4">
                <Card 
                  className="h-100 p-3" 
                  sx={{ 
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-5px)' },
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  <div className="d-flex align-items-center mb-3">
                    <CircularProgress size={30} style={{ color: '#c70202' }} />
                    <Typography variant="h6" className="ms-2">Loading...</Typography>
                  </div>
                  <Typography variant="h3" style={{ color: '#c70202' }}>
                    --
                  </Typography>
                </Card>
              </div>
            ))}
          </div>

          <div className="row mt-4">
            {/* Enrollment Statistics - Loading State */}
            <div className="col-md-12 mb-4">
              <Card className="h-100 p-3">
                <Typography variant="h6" className="mb-3">Enrollment Statistics</Typography>
                <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                  <CircularProgress style={{ color: '#c70202' }} />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="mb-4">Registrar Dashboard</h3>

        {/* Stat Cards */}
        <div className="row">
          {statCards.map((card, index) => (
            <div key={index} className="col-md-3 mb-4">
              <Card 
                className="h-100 p-3" 
                sx={{ 
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-5px)' },
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              >
                <div className="d-flex align-items-center mb-3">
                  <div style={{ color: card.color }}>{card.icon}</div>
                  <Typography variant="h6" className="ms-2">{card.title}</Typography>
                </div>
                <Typography variant="h3" style={{ color: card.color }}>
                  {card.value}
                </Typography>
              </Card>
            </div>
          ))}
        </div>

        <div className="row mt-4">
          {/* Enrollment Statistics */}
          <div className="col-md-12 mb-4">
            <Card className="h-100 p-3">
              <Typography variant="h6" className="mb-3">Enrollment Statistics</Typography>

              {/* Program-wise Statistics */}
              {enrollmentStats.programStats.length > 0 ? (
                <Box mb={3}>
                  <Typography variant="subtitle2" className="mb-2">Enrollments by Program</Typography>
                  <TableContainer component={Paper} elevation={0}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Program</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="right">For Payment</TableCell>
                          <TableCell align="right">Verified</TableCell>
                          <TableCell align="right">Pending</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {enrollmentStats.programStats.map((program, index) => (
                          <TableRow key={index}>
                            <TableCell>{program.program_name}</TableCell>
                            <TableCell align="right">{program.total_enrollments}</TableCell>
                            <TableCell align="right" style={{ color: '#ed6c02', fontWeight: 'bold' }}>
                              {program.for_payment_enrollments}
                            </TableCell>
                            <TableCell align="right" style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                              {program.verified_enrollments}
                            </TableCell>
                            <TableCell align="right" style={{ color: '#ed6c02', fontWeight: 'bold' }}>
                              {program.pending_enrollments}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ) : (
                <Box mb={3}>
                  <Typography variant="subtitle2" className="mb-2">Enrollments by Program</Typography>
                  <Typography variant="body2" color="textSecondary" style={{ textAlign: 'center', padding: '20px' }}>
                    No program enrollment data available
                  </Typography>
                </Box>
              )}
            </Card>
          </div>
        </div>

        {/* Grade Approval Section */}
        <div className="row mt-4">
          <div className="col-md-12 mb-4">
            <Card className="h-100 p-3">
              <Typography variant="h6" className="mb-3">Grade Approval Management</Typography>

              {/* Program Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs
                  value={selectedProgram}
                  onChange={(e, val) => setSelectedProgram(val)}
                  variant="scrollable"
                  scrollButtons
                  allowScrollButtonsMobile
                >
                  <Tab key="All" value="All" label="All Programs" />
                  {[...new Set((classes || []).map(c => c.program_name))]
                    .filter(Boolean)
                    .map(name => (
                      <Tab key={name} value={name} label={name} />
                    ))}
                </Tabs>
              </Box>

              {classLoading ? (
                <div className="d-flex justify-content-center align-items-center" style={{ height: '160px' }}>
                  <CircularProgress style={{ color: '#c70202' }} />
                </div>
              ) : (
                <TableContainer component={Paper} elevation={0}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Course</TableCell>
                        <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Section / Block</TableCell>
                        <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Instructor</TableCell>
                        <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
              {(classes || [])
                .filter(c => selectedProgram === 'All' || c.program_name === selectedProgram)
                .filter(c => (parseInt(c.total_grades, 10) || 0) > 0)
                .filter(c => (parseInt(c.dean_approved_count, 10) || 0) > 0)
                .filter(c => (parseInt(c.registrar_approved_count, 10) || 0) === 0)
                .map((cls) => (
                        <TableRow key={`${cls.pc_id}-${cls.section}`}>
                          <TableCell>{cls.course_code} - {cls.course_name}</TableCell>
                          <TableCell>{cls.section}</TableCell>
                          <TableCell>{cls.instructor_name || 'Not assigned'}</TableCell>
                          <TableCell>
                            <div className="d-flex gap-2">
                              <Tooltip title="Approve">
                                <Button 
                                  size="small" 
                                  variant="contained" 
                                  onClick={() => handleApproveClass(cls.pc_id, 'registrar_approve', cls.assignment_id)}
                                  sx={{ minWidth: 36, height: 32, p: 0, borderRadius: 1, backgroundColor: '#2e7d32', '&:hover': { backgroundColor: '#256628' } }}
                                >
                                  <FaCheckCircle size={16} color="#fff" />
                                </Button>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <Button 
                                  size="small" 
                                  variant="contained" 
                                  onClick={() => handleApproveClass(cls.pc_id, 'reject', cls.assignment_id)}
                                  sx={{ minWidth: 36, height: 32, p: 0, borderRadius: 1, backgroundColor: '#d32f2f', '&:hover': { backgroundColor: '#a72828' } }}
                                >
                                  <FaTimesCircle size={16} color="#fff" />
                                </Button>
                              </Tooltip>
                              <Tooltip title="View Class">
                                <Button 
                                  size="small" 
                                  variant="contained" 
                                  onClick={() => handleViewClass(cls)}
                                  sx={{ minWidth: 36, height: 32, p: 0, borderRadius: 1, backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#155fa8' } }}
                                >
                                  <FaEye size={16} color="#fff" />
                                </Button>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          </div>
        </div>
        </div>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* View Class Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {viewClassInfo?.course_code} {viewClassInfo?.course_name}
        </DialogTitle>
        <DialogContent>
          {viewClassInfo && (
            <div className="mb-3">
              <Typography variant="subtitle1" className="mb-2">
                <strong>Program-Year-Section:</strong> {viewClassInfo.program_name}-{viewClassInfo.year_level}{viewClassInfo.section}
              </Typography>
              <Typography variant="subtitle1" className="mb-2">
                <strong>Semester:</strong> {viewClassInfo.semester}
              </Typography>
            </div>
          )}

          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Student Name</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Final Grade</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {viewStudents.length > 0 ? viewStudents.map((s) => (
                  <TableRow key={s.student_id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.final_grade || '-'}</TableCell>
                    <TableCell>
                      <span 
                        style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '12px',
                          backgroundColor: getStatusColor(s.grade_status),
                          color: '#fff'
                        }}
                      >
                        {s.grade_status}
                      </span>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center">No students found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)} color="primary">Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default RegistrarDashboard;