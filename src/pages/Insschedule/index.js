import { useState, useEffect } from "react";
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Snackbar, 
  Alert, 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";
import { 
  Schedule as ScheduleIcon, 
  FilterList as FilterIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import axios from 'axios';

const InstructorSchedule = () => {
  // Check localStorage cache synchronously on mount for instant display
  const cachedData = localStorage.getItem('instructorScheduleData');
  const cacheTimestamp = localStorage.getItem('instructorScheduleTimestamp');
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
    console.warn('⚠️ [INSTRUCTOR SCHEDULE] Invalid cache, will fetch fresh:', e);
  }

  const [schedules, setSchedules] = useState(initialData);
  const [loading, setLoading] = useState(initialLoading);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch logged-in instructor details
  useEffect(() => {
    const fetchInstructorSchedule = async (forceRefresh = false) => {
      let wasLoadingSet = false;
      try {
        // Check if we have valid cache and don't need to show loading
        const cachedData = localStorage.getItem('instructorScheduleData');
        const cacheTimestamp = localStorage.getItem('instructorScheduleTimestamp');
        const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
        const hasValidCache = !forceRefresh && cachedData && cacheAge && cacheAge < 300000;

        // Use cache if it's less than 5 minutes old
        if (hasValidCache) {
          const parsed = JSON.parse(cachedData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSchedules(parsed);
            setLoading(false);
            
            // Always do background refresh to check for updates
            fetchInstructorSchedule(true).catch(err => {
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
        
        // Get staff_id from localStorage with safe parsing
        const userStr = localStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : null;
        const staff_id = user?.staff_id;
        
        if (!staff_id) {
          setSnackbar({
            open: true,
            message: "No instructor ID found. Please login again.",
            severity: 'error'
          });
          if (wasLoadingSet) {
            setLoading(false);
          }
          return;
        }

        const token = localStorage.getItem("token");
        const response = await axios.get(`/api/instructor-subjects?staff_id=${staff_id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        const data = response.data || [];
        setSchedules(data);
        
        // Cache the fetched data
        try {
          if (Array.isArray(data) && data.length > 0) {
            localStorage.setItem('instructorScheduleData', JSON.stringify(data));
            localStorage.setItem('instructorScheduleTimestamp', Date.now().toString());
          } else {
            localStorage.removeItem('instructorScheduleData');
            localStorage.removeItem('instructorScheduleTimestamp');
          }
        } catch (storageError) {
          console.warn('⚠️ [INSTRUCTOR SCHEDULE] Could not cache data:', storageError.message);
        }
      } catch (error) {
        console.error("Error:", error);
        setSnackbar({
          open: true,
          message: error.response?.data?.error || "Failed to fetch schedule",
          severity: 'error'
        });
      } finally {
        if (wasLoadingSet) {
          setLoading(false);
        }
      }
    };

    fetchInstructorSchedule();
  }, []);

  const handleSemesterChange = (event) => {
    setSelectedSemester(event.target.value);
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

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

  const filteredSchedules = schedules.filter(schedule => 
    selectedSemester ? schedule.semester === selectedSemester : true
  );

  // Sort schedules by day and time
  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayDiff = days.indexOf(a.day) - days.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.start_time.localeCompare(b.start_time);
  });

  // Group schedules by day
  const groupedSchedules = sortedSchedules.reduce((acc, schedule) => {
    if (!acc[schedule.day]) {
      acc[schedule.day] = [];
    }
    acc[schedule.day].push(schedule);
    return acc;
  }, {});

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="hd mt-2 pb-0" data-testid="page-title">My Teaching Schedule</h3>
      </div>

      {/* Filter Section */}
      <Card className="mb-4 p-3" sx={{ 
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        border: '1px solid #dee2e6'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <FilterIcon sx={{ color: '#c70202', fontSize: 24 }} />
          <Typography variant="h6" sx={{ color: '#495057', fontWeight: 'bold' }}>
            Filter Schedule
          </Typography>
        </Box>
        
        <div className="d-flex justify-content-between align-items-center">
          <FormControl sx={{ minWidth: 250 }}>
            <InputLabel id="semester-filter-label">Filter by Semester</InputLabel>
            <Select
              data-testid="semester-filter"
              labelId="semester-filter-label"
              value={selectedSemester}
              onChange={handleSemesterChange}
              label="Filter by Semester"
              sx={{ 
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#c70202'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#a00101'
                }
              }}
            >
              <MenuItem value="" data-testid="all-semesters">All Semesters</MenuItem>
              <MenuItem value="1st" data-testid="first-semester">1st Semester</MenuItem>
              <MenuItem value="2nd" data-testid="second-semester">2nd Semester</MenuItem>
              <MenuItem value="Summer" data-testid="summer-semester">Summer</MenuItem>
            </Select>
          </FormControl>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label={`${sortedSchedules.length} Classes`} 
              color="primary" 
              variant="outlined"
              sx={{ borderColor: '#c70202', color: '#c70202' }}
            />
            {selectedSemester && (
              <Chip 
                label={selectedSemester} 
                variant="outlined"
                sx={{ borderColor: '#6c757d', color: '#6c757d' }}
              />
            )}
          </Box>
        </div>
      </Card>

      {/* Schedule Display */}
      <Card className="p-3" sx={{ 
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: 4
        }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <ScheduleIcon sx={{ color: '#c70202', fontSize: 24 }} />
          <Typography variant="h6" sx={{ color: '#495057', fontWeight: 'bold' }}>
            Teaching Schedule
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress sx={{ color: '#c70202' }} />
          </Box>
        ) : sortedSchedules.length > 0 ? (
          <div>
            {/* Day-by-Day Schedule */}
            {days.map(day => {
              const daySchedules = groupedSchedules[day];
              if (!daySchedules || daySchedules.length === 0) return null;
              
              return (
                <Card key={day} className="mb-3" sx={{ 
                  border: `2px solid ${getDayColor(day)}20`,
                  '&:hover': {
                    borderColor: getDayColor(day),
                    boxShadow: 2
                  }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Chip 
                        label={day} 
                        size="small" 
                        sx={{ 
                          backgroundColor: getDayColor(day) + '20',
                          color: getDayColor(day),
                          fontWeight: 'bold',
                          fontSize: '0.9rem'
                        }}
                      />
                      <Typography variant="h6" sx={{ color: getDayColor(day), fontWeight: 'bold' }}>
                        {daySchedules.length} Class{daySchedules.length > 1 ? 'es' : ''}
                      </Typography>
                    </Box>
                    
                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #dee2e6' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                            <TableCell sx={{ fontWeight: 'bold', color: '#495057' }}>Time</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#495057' }}>Course</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#495057' }}>Block</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#495057' }}>Units</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#495057' }}>Program</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#495057' }}>Year Level</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {daySchedules.map((schedule, index) => (
                            <TableRow 
                              key={index} 
                              data-testid={`schedule-row-${index}`}
                              sx={{ 
                                '&:nth-of-type(odd)': { backgroundColor: '#f8f9fa' },
                                '&:hover': { backgroundColor: '#e9ecef' }
                              }}
                            >
                              <TableCell sx={{ fontWeight: '500', color: getDayColor(day) }}>
                                {`${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`}
                              </TableCell>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                    {schedule.course_code}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {schedule.course_name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>{schedule.section}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={`${schedule.units} units`} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ 
                                    borderColor: '#6c757d', 
                                    color: '#6c757d',
                                    fontSize: '0.7rem'
                                  }}
                                />
                              </TableCell>
                              <TableCell>{schedule.program_name}</TableCell>
                              <TableCell>{schedule.year_level}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Paper elevation={1} sx={{ p: 6, textAlign: 'center' }}>
            <SchoolIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>
              No schedules available
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {selectedSemester ? `No schedules found for ${selectedSemester} semester.` : 'You have not been assigned to any classes yet.'}
            </Typography>
          </Paper>
        )}
      </Card>

      <Snackbar
        data-testid="snackbar"
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          data-testid="snackbar-alert"
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          <span>{snackbar.message}</span>
          <button 
            data-testid="close-snackbar"
            onClick={handleSnackbarClose}
            style={{ display: 'none' }}
          >
            close
          </button>
        </Alert>
      </Snackbar>
    </div>
  );
};

export default InstructorSchedule;