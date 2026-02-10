import { useContext, useEffect, useState } from 'react';
import { 
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { MyContext } from "../../App";
import axios from 'axios';

const StuDashboard = () => {
  /* eslint-disable no-unused-vars */
  const [showBy, setshowBy] = useState('');
  const [showCourseBy, setCourseBy] = useState('');
  const { user } = useContext(MyContext);
  /* eslint-disable no-unused-vars */
  const context = useContext(MyContext);

  // Check localStorage cache synchronously on mount (like Academic Records)
  const cachedData = localStorage.getItem('studentScheduleData');
  const cacheTimestamp = localStorage.getItem('studentScheduleTimestamp');
  const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
  const hasValidCache = cachedData && cacheAge && cacheAge < 300000; // 5 minutes

  // Initialize state with cached data if available, otherwise empty
  const [schedule, setSchedule] = useState(hasValidCache ? (JSON.parse(cachedData) || []) : []);
  const [loading, setLoading] = useState(!hasValidCache); // Only show loading if no valid cache

  // Format time function for displaying schedule times
  const formatTime = (time) => {
    if (!time || time === 'Not assigned') return time;
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes.slice(0, 2)} ${ampm}`;
  };

  // Fetch student's schedule data
  const fetchStudentSchedule = async () => {
    try {
      // Check cache first (like Academic Records and Student Profile)
      const cachedData = localStorage.getItem('studentScheduleData');
      const cacheTimestamp = localStorage.getItem('studentScheduleTimestamp');
      const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;

      // Use cache if it's less than 5 minutes old
      if (cachedData && cacheAge && cacheAge < 300000) {
        const parsedData = JSON.parse(cachedData);
        setSchedule(parsedData);
        setLoading(false);
        return;
      }

      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get('/api/student-schedule', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Student schedule response:', response.data);
      const scheduleData = response.data.schedule || [];

      // Cache the new data (like Academic Records and Student Profile)
      localStorage.setItem('studentScheduleData', JSON.stringify(scheduleData));
      localStorage.setItem('studentScheduleTimestamp', Date.now().toString());

      setSchedule(scheduleData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching student schedule:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    context.setIsHideComponents(false);
    window.scrollTo(0, 0);
    fetchStudentSchedule();
  }, [context]);

  return (
    <div className="right-content w-100">
      {
        context.isLogin !== false ? (
          <div className="card shadow border-0 p-3 mt-1">      
            <h3 className="hd mt-2 pb-0">Hi, {user?.firstName}</h3>
          </div>
        ) : null
      }
        
      {/* Schedule Section */}
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="hd">Schedule</h3>

        {/* Schedule Table */}
        <div className="mt-3">
          <Paper elevation={3} sx={{ borderRadius: '8px', overflow: 'hidden' }}>
            <TableContainer>
              <Table aria-label="schedule table" sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Time</TableCell>
                    <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Day</TableCell>
                    <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Course Name</TableCell>
                    <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Units</TableCell>
                    <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Semester</TableCell>
                    <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Instructor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan="6" style={{ textAlign: "center", padding: "40px 0" }}>
                        <CircularProgress style={{ color: '#c70202' }} />
                      </TableCell>
                    </TableRow>
                  ) : schedule.length > 0 ? (
                    schedule.map((course, index) => (
                      <TableRow hover key={index}>
                        <TableCell>
                          {course.start_time && course.end_time 
                            ? `${formatTime(course.start_time)} - ${formatTime(course.end_time)}`
                            : 'TBA'
                          }
                        </TableCell>
                        <TableCell>{course.day || 'TBA'}</TableCell>
                        <TableCell><strong>{course.course_name}</strong></TableCell>
                        <TableCell>{course.units}</TableCell>
                        <TableCell>{course.semester}</TableCell>
                        <TableCell>
                          {course.full_name || 'TBA'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan="6" style={{ textAlign: "center", padding: "40px 0" }}>
                        <Typography variant="body1" color="textSecondary">
                          No schedule found. Please check your enrollment status or contact your program head.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </div>
      </div>
    </div>
  );
};

export default StuDashboard;
