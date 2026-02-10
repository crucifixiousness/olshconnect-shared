import { useContext, useEffect, useState, useCallback } from 'react';
import { 
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import axios from 'axios';
import { MyContext } from "../../App";

const StudentCourses = () => {
  /* eslint-disable no-unused-vars */
  const [showBy, setshowBy] = useState('');
  const [showCourseBy, setCourseBy] = useState('');
  /* eslint-disable no-unused-vars */
  const context = useContext(MyContext);

  // Check localStorage cache synchronously on mount (like Academic Records)
  const cachedData = localStorage.getItem('studentCoursesData');
  const cacheTimestamp = localStorage.getItem('studentCoursesTimestamp');
  const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
  const hasValidCache = cachedData && cacheAge && cacheAge < 300000; // 5 minutes

  // Initialize state with cached data if available, otherwise empty
  const [courses, setCourses] = useState(hasValidCache ? (JSON.parse(cachedData) || []) : []);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!hasValidCache); // Only show loading if no valid cache

  const fetchCourses = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first (like Academic Records and Student Profile), unless forcing refresh
      if (!forceRefresh) {
        const cachedData = localStorage.getItem('studentCoursesData');
        const cacheTimestamp = localStorage.getItem('studentCoursesTimestamp');
        const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;

        // Use cache if it's less than 5 minutes old
        if (cachedData && cacheAge && cacheAge < 300000) {
          const parsedData = JSON.parse(cachedData);
          setCourses(parsedData);
          setLoading(false);
          
          // Always do background refresh to check for updates (new courses, course changes, etc.)
          fetchCourses(true).catch(err => {
            console.error("Background refresh error:", err);
            // Keep showing cached data if background refresh fails
          });
          return;
        }
      }

      // Only show loading if not forcing refresh (we already have data in background refresh)
      if (!forceRefresh) {
        setLoading(true);
      }
      setError('');

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to view your courses.');
        setCourses([]);
        setLoading(false);
        return;
      }
      
      const { data } = await axios.get('/api/student-courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const coursesData = Array.isArray(data.courses) ? data.courses : [];

      // Cache the new data (like Academic Records and Student Profile)
      localStorage.setItem('studentCoursesData', JSON.stringify(coursesData));
      localStorage.setItem('studentCoursesTimestamp', Date.now().toString());

      setCourses(coursesData);
      
      // Only update loading if not forcing refresh
      if (!forceRefresh) {
        setLoading(false);
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to load courses.';
      setError(message);
      setCourses([]);
      setLoading(false);
    }
  }, []); // Empty dependency array - function doesn't depend on props or state

  useEffect(() => {
    context.setIsHideComponents(false);
    window.scrollTo(0, 0);
    fetchCourses();
  }, [context, fetchCourses]);

  // Debug logging for state changes
  useEffect(() => {
    // State changes logged
  }, [courses, loading, error]);

  return (
    <div className="right-content w-100" data-testid="student-courses">
      <div className="card shadow border-0 p-3">      
        <h3 className="hd mt-2 pb-0">My Courses</h3>
      </div>
 
      {/* Course List Section */}
      <div className="card shadow border-0 p-3 mt-3">
        {/* Course Table */}
        <div className="mt-3">
          <Paper elevation={3} sx={{ borderRadius: '8px', overflow: 'hidden' }}>
            <TableContainer>
              <Table aria-label="courses table" data-testid="courses-table">
                <TableHead>
                  <TableRow>
                    <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} data-testid="header-course-title">Course Title</TableCell>
                    <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center" data-testid="header-code">Code</TableCell>
                    <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center" data-testid="header-units">Unit/s</TableCell>
                    <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center" data-testid="header-prerequisite">Pre-requisite</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan="4" style={{ textAlign: "center", padding: "40px 0" }}>
                        <CircularProgress style={{ color: '#c70202' }} />
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan="4" style={{ textAlign: "center", padding: "24px 0", color: '#b00020' }}>
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : courses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan="4" style={{ textAlign: "center", padding: "24px 0", color: '#666' }}>
                        No courses found for your current enrollment.
                      </TableCell>
                    </TableRow>
                  ) : (
                    courses.map((course, idx) => {
                      // Handle prerequisites - can be array or object
                      let prerequisites = [];
                      if (course.prerequisites) {
                        if (Array.isArray(course.prerequisites)) {
                          prerequisites = course.prerequisites;
                        } else if (typeof course.prerequisites === 'string') {
                          try {
                            prerequisites = JSON.parse(course.prerequisites);
                          } catch (e) {
                            prerequisites = [];
                          }
                        }
                      }
                      
                      const prerequisiteCodes = prerequisites
                        .filter(p => p && p.course_code)
                        .map(p => p.course_code)
                        .join(', ');
                      
                      return (
                        <TableRow hover key={`${course.course_code}-${idx}`}>
                          <TableCell>{course.course_name}</TableCell>
                          <TableCell align="center">{course.course_code}</TableCell>
                          <TableCell align="center">{course.units}</TableCell>
                          <TableCell align="center">
                            {prerequisiteCodes || '--'}
                          </TableCell>
                        </TableRow>
                      );
                    })
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

export default StudentCourses;
