import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Card, Typography, CircularProgress } from '@mui/material';
import { FaChalkboardTeacher, FaUserGraduate, FaClipboardList, FaClock } from 'react-icons/fa';
import { MyContext } from '../../App';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const InstructorDashboard = () => {
  const context = useContext(MyContext);

  useEffect(() => {
    context.setIsHideComponents(false);
    window.scrollTo(0,0);
  }, [context]);

  // Check localStorage cache synchronously on mount for instant display
  const cachedDashboardData = localStorage.getItem('instructorDashboardData');
  const cachedScheduleData = localStorage.getItem('instructorDashboardScheduleData');
  const cacheTimestamp = localStorage.getItem('instructorDashboardTimestamp');
  const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
  
  let initialDashboardData = {
    assignedClasses: 0,
    totalStudents: 0,
    pendingGrades: 0,
    todayClasses: 0
  };
  let initialSchedule = [];
  let initialLoading = true;
  
  try {
    if (cachedDashboardData && cachedScheduleData && cacheAge && cacheAge < 300000) {
      const parsedDashboard = JSON.parse(cachedDashboardData);
      const parsedSchedule = JSON.parse(cachedScheduleData);
      if (parsedDashboard && typeof parsedDashboard === 'object' && Array.isArray(parsedSchedule)) {
        initialDashboardData = parsedDashboard;
        initialSchedule = parsedSchedule;
        initialLoading = false;
      }
    }
  } catch (e) {
    console.warn('⚠️ [INSTRUCTOR DASHBOARD] Invalid cache, will fetch fresh:', e);
  }

  const [dashboardData, setDashboardData] = useState(initialDashboardData);
  const [loading, setLoading] = useState(initialLoading);
  const [todaySchedule, setTodaySchedule] = useState(initialSchedule);

  useEffect(() => {
    const fetchDashboardData = async (forceRefresh = false) => {
      let wasLoadingSet = false;
      try {
        // Check if we have valid cache and don't need to show loading
        const cachedDashboardData = localStorage.getItem('instructorDashboardData');
        const cachedScheduleData = localStorage.getItem('instructorDashboardScheduleData');
        const cacheTimestamp = localStorage.getItem('instructorDashboardTimestamp');
        const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
        const hasValidCache = !forceRefresh && cachedDashboardData && cachedScheduleData && cacheAge && cacheAge < 300000;

        // Use cache if it's less than 5 minutes old
        if (hasValidCache) {
          try {
            const parsedDashboard = JSON.parse(cachedDashboardData);
            const parsedSchedule = JSON.parse(cachedScheduleData);
            if (parsedDashboard && typeof parsedDashboard === 'object' && Array.isArray(parsedSchedule)) {
              setDashboardData(parsedDashboard);
              setTodaySchedule(parsedSchedule);
              setLoading(false);
              
              // Always do background refresh to check for updates
              fetchDashboardData(true).catch(err => {
                console.error("Background refresh error:", err);
              });
              return;
            }
          } catch (parseError) {
            console.warn('⚠️ [INSTRUCTOR DASHBOARD] Error parsing cached data:', parseError);
          }
        }

        // Only show loading if not forcing refresh
        if (!forceRefresh) {
          setLoading(true);
          wasLoadingSet = true;
        }

        const user = JSON.parse(localStorage.getItem('user'));
        const staff_id = user?.staff_id;
        const token = localStorage.getItem('token');
        
        if (!staff_id || !token) {
          console.error('No staff ID or token found');
          if (wasLoadingSet) {
            setLoading(false);
          }
          return;
        }

        // Fetch dashboard data from new API endpoint
        const dashboardResponse = await axios.get(`/api/instructor-dashboard?staff_id=${staff_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Fetch today's schedule from new API endpoint
        const scheduleResponse = await axios.get(`/api/instructor-subjects?staff_id=${staff_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const todayCourses = (scheduleResponse.data || []).filter(course => course.day === today);
        
        const sortedTodaySchedule = todayCourses.sort((a, b) => a.start_time.localeCompare(b.start_time));
        setTodaySchedule(sortedTodaySchedule);
        
        const dashboardInfo = {
          assignedClasses: Number(dashboardResponse.data.assignedClasses) || 0,
          totalStudents: Number(dashboardResponse.data.totalStudents) || 0,
          pendingGrades: Number(dashboardResponse.data.pendingGrades) || 0,
          todayClasses: Number(dashboardResponse.data.todayClasses) || 0
        };
        setDashboardData(dashboardInfo);
        
        // Cache the fetched data
        try {
          localStorage.setItem('instructorDashboardData', JSON.stringify(dashboardInfo));
          localStorage.setItem('instructorDashboardScheduleData', JSON.stringify(sortedTodaySchedule));
          localStorage.setItem('instructorDashboardTimestamp', Date.now().toString());
        } catch (storageError) {
          console.warn('⚠️ [INSTRUCTOR DASHBOARD] Could not cache data:', storageError.message);
        }
      } catch (error) {
        console.error('Error details:', error);
      } finally {
        if (wasLoadingSet) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: 'Assigned Classes',
      value: dashboardData.assignedClasses,
      icon: <FaChalkboardTeacher size={30} />,
      color: '#c70202'
    },
    {
      title: 'Total Students',
      value: dashboardData.totalStudents,
      icon: <FaUserGraduate size={30} />,
      color: '#c70202'
    },
    {
      title: 'Pending Grades',
      value: dashboardData.pendingGrades,
      icon: <FaClipboardList size={30} />,
      color: '#c70202'
    },
    {
      title: 'Classes Today',
      value: dashboardData.todayClasses,
      icon: <FaClock size={30} />,
      color: '#c70202'
    }
  ];

  if (loading) {
    return (
      <div className="right-content w-100">
        <div className="card shadow border-0 p-3 mt-1">
          <h3 className="mb-4">Instructor Dashboard</h3>
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
        <h3 className="mb-4">Instructor Dashboard</h3>
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
        {/* Recent Activities Section */}
        <div className="row mt-4">
          <div className="col-md-6 mb-4">
            <Card className="h-100 p-3">
              <Typography variant="h6" className="mb-3">Today's Schedule</Typography>
              {todaySchedule.length > 0 ? (
                <TableContainer component={Paper} elevation={0}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Course</TableCell>
                        <TableCell>Block</TableCell>
                        <TableCell>Program</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {todaySchedule.map((course, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {course.start_time} - {course.end_time}
                          </TableCell>
                          <TableCell>
                            <div>{course.course_code}</div>
                            <div style={{ fontSize: '0.8em', color: 'gray' }}>{course.course_name}</div>
                          </TableCell>
                          <TableCell>{course.section}</TableCell>
                          <TableCell>
                            {course.program_name} {course.year_level}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body1" color="text.secondary" textAlign="center">
                  No classes scheduled for today
                </Typography>
              )}
            </Card>
          </div>
          <div className="col-md-6 mb-4">
            <Card className="h-100 p-3">
              <Typography variant="h6" className="mb-3">Recent Activities</Typography>
              {/* Add activities list here */}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;