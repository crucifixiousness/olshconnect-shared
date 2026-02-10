import { useState, useEffect, useCallback } from "react";
import { Button, Modal, TextField, FormControl, InputLabel, Select, MenuItem, Pagination, Snackbar, Alert, Box, Typography, Grid, CircularProgress, Autocomplete } from "@mui/material";
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { FaCirclePlus } from "react-icons/fa6";
import { FaEdit, FaTrash, FaEye } from "react-icons/fa"; 
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const programMapping = {
  1: "BSIT",
  2: "BSHM",
  3: "Education",
  4: "BSOAd",
  5: "BSCrim"
};

const AssignCourses = () => {
  // Add these state declarations at the top with your other states
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);

  // Add these functions with your other function declarations
  const handleOpen = () => {
    setShowAddCourseModal(true);
  };

  const handleClose = () => {
    setShowAddCourseModal(false);
    setNewAssignment({
      year_level: "",
      course_id: "",
      course_code: "",
      course_name: "",
      units: "",
      semester: "",
      major_id: "",
      prerequisite_ids: []
    });
    setSelectedPrerequisites([]);
  };
  // Check localStorage cache synchronously on mount for instant display
  const cachedData = localStorage.getItem('assignedCoursesData');
  const cacheTimestamp = localStorage.getItem('assignedCoursesTimestamp');
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
    console.warn('⚠️ [PH COURSES] Invalid cache, will fetch fresh:', e);
  }

  const [loading, setLoading] = useState(initialLoading);
  const [assignedCourses, setAssignedCourses] = useState(initialData);
  //eslint-disable-next-line
  const [courses, setCourses] = useState([]); // Store available courses
  const [program_id, setProgramId] = useState(null);
  //eslint-disable-next-line
  const [staff_id, setStaffId] = useState(null);
  const [program_name, setProgramName] = useState("");
  const [searchParams] = useSearchParams();
  const yearLevel = searchParams.get('year');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);

  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Add these new states near your other states
  const [selectedSemester, setSelectedSemester] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [instructors, setInstructors] = useState([]);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  // Blocks that already have assigned students for this program
  const [existingBlocks, setExistingBlocks] = useState([]);

  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedViewCourse, setSelectedViewCourse] = useState(null);
  const [majors, setMajors] = useState([]); // Add majors state

  const formatTime = (time) => {
    if (!time || time === 'Not assigned') return time;
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes.slice(0, 2)} ${ampm}`;
  };

  const handleViewOpen = async (course) => {
    try {
      const assignmentResponse = await axios.get('/api/course-assignment', {
        params: {
          pc_id: course.pc_id
        }
      });
      const assignmentData = assignmentResponse.data;

      setSelectedViewCourse({ 
        ...course,
        schedules: assignmentData.schedules || []
      });
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching course details:', error);
      setSnackbar({
        open: true,
        message: "Failed to fetch course details",
        severity: 'error'
      });
    }
  };

  const handleViewClose = () => {
    setShowViewModal(false);
    setSelectedViewCourse(null);
  };

  // Update the handleEditOpen function
  const handleEditOpen = async (course) => {
    setSelectedCourse(course);
    setShowEditModal(true);

    try {
      // Fetch instructors and get the data directly
      const instructorsResponse = await axios.get(`/api/instructor-courses`);
      const instructorsData = instructorsResponse.data;
      setInstructors(instructorsData);

      // Fetch existing assignment data
      const response = await axios.get(`/api/course-assignment/${course.pc_id}`);
      const assignmentData = response.data;

      if (assignmentData) {
        setSelectedSection(assignmentData.section || '');
        setSelectedDay(assignmentData.day || '');
        setStartTime(assignmentData.start_time || '');
        setEndTime(assignmentData.end_time || '');
        // Find the instructor object from the fetched instructors list
        const instructor = instructorsData.find(inst => inst.staff_id === assignmentData.staff_id);
        setSelectedInstructor(instructor || null);
      }
    } catch (error) {
      console.error('Error fetching assignment details:', error);
      setSnackbar({
        open: true,
        message: "Failed to fetch assignment details",
        severity: 'error'
      });
    }
  };

  // Update handleEditClose to reset all fields
  const handleEditClose = () => {
    setShowEditModal(false);
    setSelectedCourse(null);
    setSelectedInstructor(null);
    setSelectedSection('');
    setSelectedDay('');
    setStartTime('');
    setEndTime('');
  };

  // Add this function to fetch instructors
  // Wrap fetchInstructors in useCallback
  const fetchInstructors = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all instructors regardless of program
      const response = await axios.get(`/api/instructor-courses`);
      setInstructors(response.data);
    } catch (error) {
      console.error('Error fetching instructors:', error);
      setSnackbar({
        open: true,
        message: "Failed to fetch instructors",
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, []); // Removed program_id dependency since we're fetching all instructors

  // Update the useEffect for fetchInstructors
  useEffect(() => {
    // Fetch all instructors when component mounts or when fetchInstructors changes
    fetchInstructors();
  }, [fetchInstructors]);

  // Modify your filteredCourses logic to include semester filtering
  const filteredCourses = assignedCourses.filter(course => {
    const yearMatch = yearLevel ? course.year_level === parseInt(yearLevel) : true;
    const semesterMatch = selectedSemester ? course.semester === selectedSemester : true;
    return yearMatch && semesterMatch;
  });

  // Add this handler function
  const handleSemesterChange = (event) => {
    setSelectedSemester(event.target.value);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedCourses = filteredCourses.slice(startIndex, endIndex);
  const pageCount = Math.ceil(filteredCourses.length / rowsPerPage);

  const [newAssignment, setNewAssignment] = useState({
    year_level: "",
    course_id: "",
    course_code: "",
    course_name: "",
    units: "",
    semester: "",
    major_id: "",
    prerequisite_ids: []
  });
  const [selectedPrerequisites, setSelectedPrerequisites] = useState([]);

  // Fetch logged-in user details (assuming it's stored in localStorage)
  useEffect(() => {
    const storedProgramId = localStorage.getItem("program_id");
    const storedStaffId = localStorage.getItem("staff_id");

    // Try to get program_id from localStorage first
    if (storedProgramId) {
      const programId = parseInt(storedProgramId, 10);
      if (!isNaN(programId)) {
        setProgramId(programId);
        setProgramName(programMapping[programId] || "Unknown");
      }
    } else {
      // Fallback: try to get program_id from user object in localStorage
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData.program_id) {
            const programId = parseInt(userData.program_id, 10);
            if (!isNaN(programId)) {
              setProgramId(programId);
              setProgramName(programMapping[programId] || "Unknown");
              // Also store it in localStorage for future use
              localStorage.setItem("program_id", programId.toString());
            }
          }
        } catch (error) {
          console.error("Error parsing user data:", error);
        }
      }
    }

    if (storedStaffId) {
      setStaffId(storedStaffId);
    } else {
      // Fallback: try to get staff_id from user object
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData.staff_id) {
            setStaffId(userData.staff_id.toString());
            localStorage.setItem("staff_id", userData.staff_id.toString());
          }
        } catch (error) {
          console.error("Error parsing user data:", error);
        }
      }
    }
  }, []);

  // Fetch program_name based on program_id
  /*useEffect(() => {
    if (program_id) {
      const fetchProgramName = async () => {
        try {
          const response = await axios.get(`/api/program/${program_id}`);
          setProgramName(response.data.program_name);
        } catch (error) {
          console.error("Error fetching program name:", error);
        }
      };
      fetchProgramName();
    }
  }, [program_id]);*/

  // First, wrap fetchAssignedCourses in useCallback
  const fetchAssignedCourses = useCallback(async (forceRefresh = false) => {
    if (!program_id) return;
    let wasLoadingSet = false;
    try {
      // Check if we have valid cache and don't need to show loading
      const cachedData = localStorage.getItem('assignedCoursesData');
      const cacheTimestamp = localStorage.getItem('assignedCoursesTimestamp');
      const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
      const hasValidCache = !forceRefresh && cachedData && cacheAge && cacheAge < 300000;

      // Use cache if it's less than 5 minutes old
      if (hasValidCache) {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAssignedCourses(parsed);
          setLoading(false);
          
          // Always do background refresh to check for updates
          fetchAssignedCourses(true).catch(err => {
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

      const response = await axios.get(`/api/program-courses?program_id=${program_id}`);

      // Cache the data
      try {
        const data = response.data || [];
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem('assignedCoursesData', JSON.stringify(data));
          localStorage.setItem('assignedCoursesTimestamp', Date.now().toString());
        } else {
          localStorage.removeItem('assignedCoursesData');
          localStorage.removeItem('assignedCoursesTimestamp');
        }
        setAssignedCourses(data);
      } catch (storageError) {
        console.warn('⚠️ [PH COURSES] Could not cache data:', storageError.message);
        setAssignedCourses(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching assigned courses:", error);
    } finally {
      if (wasLoadingSet) {
        setLoading(false);
      }
    }
  }, [program_id]);

  // Removed cleanup effect - cache should persist across navigation

  // Then update the useEffects that use fetchAssignedCourses
  useEffect(() => {
    if (program_id) {
      fetchAssignedCourses();
      fetchCourses();
      fetchMajors(); // Add fetchMajors call
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program_id, fetchAssignedCourses]);

  useEffect(() => {
    fetchAssignedCourses();
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program_id, fetchAssignedCourses]);

  // Fetch all available courses for the current program
  const fetchCourses = async () => {
    if (!program_id) return;
    try {
      const response = await axios.get(`/api/courses?program_id=${program_id}`);
      setCourses(response.data);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  // Fetch existing blocks (those that already have assigned students) for this program
  useEffect(() => {
    const fetchExistingBlocks = async () => {
      if (!program_id) return;
      try {
        const response = await axios.get(`/api/get-program-blocks?program_id=${program_id}`);
        let blocks = Array.isArray(response.data) ? response.data : [];
        // sanitize values
        blocks = blocks.filter(b => !!b && b !== '');
        setExistingBlocks(blocks);
      } catch (error) {
        console.error('Error fetching existing blocks:', error);
        setExistingBlocks([]);
      }
    };
    fetchExistingBlocks();
  }, [program_id]);

  // Fetch majors for the current program
  const fetchMajors = async () => {
    if (!program_id) return;
    try {
      const response = await axios.get(`/api/major-management`);
      // Filter majors for the current program
      const programMajors = response.data.filter(major => major.program_id === program_id);
      setMajors(programMajors);
    } catch (error) {
      console.error("Error fetching majors:", error);
    }
  };

  useEffect(() => {
    fetchAssignedCourses();
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program_id, fetchAssignedCourses]); // Runs when program_id is available

  // Handle input changes
  const handleInputChange = (e) => {
    setNewAssignment({ ...newAssignment, [e.target.name]: e.target.value });
  };

  // Assign Course
  const handleAssignCourse = async (event) => {
    event.preventDefault();

    // Check if major is required (when program has majors)
    const isMajorRequired = majors.length > 0;
    const requiredFields = ['program_id', 'year_level', 'course_code', 'course_name', 'units', 'semester'];

    if (isMajorRequired) {
      requiredFields.push('major_id');
    }

    const missingFields = requiredFields.filter(field => {
      if (field === 'program_id') return !program_id;
      if (field === 'major_id') return isMajorRequired && (!newAssignment.major_id || newAssignment.major_id === '');
      return !newAssignment[field];
    });

    if (missingFields.length > 0) {
      setSnackbar({
        open: true,
        message: `Please fill in all required fields: ${missingFields.join(', ')}`,
        severity: 'error'
      });
      return;
    }

    try {
      const requestBody = {
        program_id: program_id,
        course_code: newAssignment.course_code,
        course_name: newAssignment.course_name,
        units: newAssignment.units,
        semester: newAssignment.semester,
        year_level: newAssignment.year_level,
        prerequisite_ids: newAssignment.prerequisite_ids || []
      };

      // Add major_id if majors are available
      if (majors.length > 0 && newAssignment.major_id) {
        requestBody.major_id = newAssignment.major_id;
      }

      await axios.post("/api/program-course", requestBody);

      setSnackbar({
        open: true,
        message: "Course assigned successfully!",
        severity: 'success'
      });
      handleClose();
      // Invalidate cache and force refresh
      try {
        localStorage.removeItem('assignedCoursesData');
        localStorage.removeItem('assignedCoursesTimestamp');
      } catch (e) {
        // Ignore storage errors
      }
      fetchAssignedCourses(true);
    } catch (error) {
      console.error("Error assigning course:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message;
      setSnackbar({
        open: true,
        message: "Failed to assign course: " + errorMessage,
        severity: 'error'
      });
    }
  };

  // Add this function after your existing functions
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Update the handleEditSubmit function
  const handleEditSubmit = async (event) => {
    event.preventDefault();

    if (!selectedCourse || !selectedInstructor || !selectedSection || !selectedDay || !startTime || !endTime) {
      setSnackbar({
        open: true,
        message: "Please fill in all required fields",
        severity: 'error'
      });
      return;
    }

    // Validate time format and range
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);

    if (end <= start) {
      setSnackbar({
        open: true,
        message: "End time must be after start time",
        severity: 'error'
      });
      return;
    }

    try {
      const response = await axios.put(`/api/assign-instructor`, {
        course_id: selectedCourse.pc_id,
        instructor_id: selectedInstructor.staff_id,
        section: selectedSection,
        day: selectedDay,
        start_time: startTime,
        end_time: endTime
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setSnackbar({
        open: true,
        message: "Instructor assigned successfully!",
        severity: 'success'
      });

      handleEditClose();
      // Invalidate cache and force refresh
      try {
        localStorage.removeItem('assignedCoursesData');
        localStorage.removeItem('assignedCoursesTimestamp');
      } catch (e) {
        // Ignore storage errors
      }
      await fetchAssignedCourses(true); // Added await to ensure data is refreshed
    } catch (error) {
      console.error("Error assigning instructor:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || error.message || "Failed to assign instructor",
        severity: 'error'
      });
    }
  };

  // Update the loading check in the return statement
  // if (loading) {
  //   return (
  //     <div className="right-content w-100">
  //       <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
  //         <CircularProgress style={{ color: '#c70202' }} />
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="hd mt-2 pb-0">Assigning Courses to Year Level</h3>      
      </div>

      <div className="card shadow border-0 p-3">
        {/* Filters */}
        <Paper elevation={3} className="p-3 mb-4">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <Select
                  value={selectedSemester}
                  onChange={handleSemesterChange}
                  displayEmpty
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#c70202',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#c70202',
                      },
                    },
                  }}
                >
                  <MenuItem value="">All Semesters</MenuItem>
                  <MenuItem value="1st">1st Semester</MenuItem>
                  <MenuItem value="2nd">2nd Semester</MenuItem>
                  <MenuItem value="Summer">Summer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <div></div>
            </Grid>
            <Grid item xs={4}>
              <Button 
                variant="contained"
                onClick={handleOpen}
                fullWidth
                sx={{
                  bgcolor: '#c70202',
                  '&:hover': {
                    bgcolor: '#a00000',
                  },
                }}
              >
                <FaCirclePlus/> Assign Course
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Program</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Year Level</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Course Code</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Course Name</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Units</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Semester</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Major</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan="8" style={{ textAlign: "center", padding: "40px 0" }}>
                    <CircularProgress style={{ color: '#c70202' }} />
                  </TableCell>
                </TableRow>
              ) : paginatedCourses.length > 0 ? (
                paginatedCourses.map((assignment, index) => (
                  <TableRow 
                    key={index}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    hover
                  >
                    <TableCell>{assignment.program_name}</TableCell>
                    <TableCell>{assignment.year_level}</TableCell>
                    <TableCell>{assignment.course_code}</TableCell>
                    <TableCell>{assignment.course_name}</TableCell>
                    <TableCell>{assignment.units}</TableCell>
                    <TableCell>{assignment.semester}</TableCell>
                    <TableCell>{assignment.major_name || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="actions d-flex align-items-center gap-1">
                        <Button 
                          variant="contained"
                          color="success"
                          size="small"
                          onClick={() => handleEditOpen(assignment)}
                          title="Edit Assignment"
                          sx={{
                            minWidth: '36px',
                            width: '36px',
                            height: '36px',
                            padding: 0,
                            borderRadius: '8px',
                            bgcolor: '#e8f5e8',
                            color: '#2e7d32',
                            '&:hover': {
                              bgcolor: '#c8e6c9',
                            },
                            '& .MuiButton-startIcon': {
                              margin: 0
                            }
                          }}
                        >
                          <FaEdit/>
                        </Button>
                        <Button 
                          variant="contained"
                          color="secondary"
                          size="small"
                          onClick={() => handleViewOpen(assignment)}
                          title="View Details"
                          sx={{
                            minWidth: '36px',
                            width: '36px',
                            height: '36px',
                            padding: 0,
                            borderRadius: '8px',
                            bgcolor: '#f3e5f5',
                            color: '#7b1fa2',
                            '&:hover': {
                              bgcolor: '#e1bee7',
                            },
                            '& .MuiButton-startIcon': {
                              margin: 0
                            }
                          }}
                        >
                          <FaEye/>
                        </Button>
                        <Button 
                          variant="contained"
                          color="error"
                          size="small"
                          title="Delete Assignment"
                          sx={{
                            minWidth: '36px',
                            width: '36px',
                            height: '36px',
                            padding: 0,
                            borderRadius: '8px',
                            bgcolor: '#ffebee',
                            color: '#c62828',
                            '&:hover': {
                              bgcolor: '#ffcdd2',
                            },
                            '& .MuiButton-startIcon': {
                              margin: 0
                            }
                          }}
                        >
                          <FaTrash/>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="8" style={{ textAlign: "center" }}>
                    No course assignments available{yearLevel ? ` for Year ${yearLevel}` : ''}.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {paginatedCourses.length > 0 && (
          <div className="d-flex justify-content-center mt-4">
            <Pagination 
              count={pageCount}
              page={page}
              onChange={handlePageChange}
              color="primary" 
              className="pagination"
              showFirstButton 
              showLastButton 
              sx={{
                '& .MuiPaginationItem-root': {
                  '&.Mui-selected': {
                    bgcolor: '#c70202',
                    '&:hover': {
                      bgcolor: '#a00000',
                    },
                  },
                },
              }}
            />
          </div>
        )}
      </div>

      <Modal open={showViewModal} onClose={handleViewClose}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: "90%",
          maxWidth: "600px",
          backgroundColor: "white",
          borderRadius: "10px",
          padding: "30px",
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          border: '3px solid #c70202',
        }}>
          <Typography variant="h5" sx={{ mb: 3, color: '#c70202', fontWeight: 'bold' }}>
            Course Details
          </Typography>

          {selectedViewCourse && (
            <div>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold">Course Information</Typography>
                  <Typography>Code: {selectedViewCourse.course_code}</Typography>
                  <Typography>Name: {selectedViewCourse.course_name}</Typography>
                  <Typography>Units: {selectedViewCourse.units}</Typography>
                  <Typography>Semester: {selectedViewCourse.semester}</Typography>
                </Grid>

                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>Assigned Details</Typography>
                  <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Instructor</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Block/Section</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Day</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedViewCourse.schedules && selectedViewCourse.schedules.map((schedule, index) => (
                          <TableRow key={index}>
                            <TableCell>{schedule.instructor_name}</TableCell>
                            <TableCell>{schedule.section}</TableCell>
                            <TableCell>{schedule.day}</TableCell>
                            <TableCell>{`${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>

              <Button 
                onClick={handleViewClose}
                variant="contained"
                fullWidth
                sx={{ 
                  mt: 3,
                  bgcolor: '#c70202',
                  '&:hover': { bgcolor: '#a00000' }
                }}
              >
                Close
              </Button>
            </div>
          )}
        </Box>
      </Modal>

      {/* Modal for Assigning a Course */}
      <Modal
        open={showAddCourseModal}
        onClose={handleClose}
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: "90%",
          maxWidth: "600px",
          margin: "50px auto",
          backgroundColor: "white",
          borderRadius: "10px",
          padding: "30px",
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          maxHeight: "90vh",
          overflowY: "auto",
          border: '3px solid #c70202',
        }}>
          <Button
            onClick={handleClose}
            sx={{
              position: "absolute",
              top: "10px",
              right: "10px",
              minWidth: "30px",
              minHeight: "30px",
              padding: "5px",
              fontSize: "1.2rem",
              color: "#c70202",
              '&:hover': {
                backgroundColor: 'rgba(199, 2, 2, 0.1)',
              },
            }}
          >
            &times;
          </Button>

          <Typography variant="h5" sx={{ 
            textAlign: "center", 
            marginBottom: "20px",
            color: '#c70202',
            fontWeight: 'bold'
          }}>
            Assign Course
          </Typography>

          <form onSubmit={handleAssignCourse}>
            <div className="registration-section">
              <Typography variant="h6" className="section-title">
                Program Details
              </Typography>
              <TextField 
                label="Program" 
                value={program_name || "Not Found"} 
                fullWidth 
                margin="normal" 
                disabled 
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Year Level</InputLabel>
                <Select
                  name="year_level"
                  value={newAssignment.year_level}
                  onChange={handleInputChange}
                  data-testid="input-year-level"
                >
                  <MenuItem value={1}>1st Year</MenuItem>
                  <MenuItem value={2}>2nd Year</MenuItem>
                  <MenuItem value={3}>3rd Year</MenuItem>
                  <MenuItem value={4}>4th Year</MenuItem>
                </Select>
              </FormControl>
            </div>

            {/* Major Selection - Only show if program has majors */}
            {majors.length > 0 && (
              <div className="registration-section">
                <Typography variant="h6" className="section-title">
                  Major Selection
                </Typography>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Select Major</InputLabel>
                  <Select
                    name="major_id"
                    value={newAssignment.major_id}
                    onChange={handleInputChange}
                    data-testid="input-major"
                  >
                    <MenuItem value="">Select a major</MenuItem>
                    {majors.map((major) => (
                      <MenuItem key={major.major_id} value={major.major_id}>
                        {major.major_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            )}

            <div className="registration-section">
              <Typography variant="h6" className="section-title">
                Course Information
              </Typography>
              <TextField 
                label="Course Code" 
                name="course_code" 
                value={newAssignment.course_code} 
                onChange={handleInputChange} 
                fullWidth 
                margin="normal"
                data-testid="input-course-code" 
              />
              <TextField 
                label="Course Name" 
                name="course_name" 
                value={newAssignment.course_name} 
                onChange={handleInputChange} 
                fullWidth 
                margin="normal"
                data-testid="input-course-name" 
              />
              <TextField 
                label="Units" 
                name="units" 
                type="number"
                value={newAssignment.units} 
                onChange={handleInputChange} 
                fullWidth 
                margin="normal"
                data-testid="input-units" 
              />
              <Autocomplete
                multiple
                options={courses}
                getOptionLabel={(option) => option.course_code ? `${option.course_code} - ${option.course_name} (${option.units} units)` : ''}
                value={selectedPrerequisites}
                onChange={(event, newValue) => {
                  setSelectedPrerequisites(newValue);
                  setNewAssignment({
                    ...newAssignment,
                    prerequisite_ids: newValue.map(prereq => prereq.course_id)
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Prerequisite Courses (Optional)"
                    margin="normal"
                    placeholder="Select multiple prerequisite courses..."
                    data-testid="input-prerequisite"
                  />
                )}
                filterOptions={(options, { inputValue }) => {
                  const filterValue = inputValue.toLowerCase();
                  return options.filter(option => {
                    const courseCode = option.course_code?.toLowerCase() || '';
                    const courseName = option.course_name?.toLowerCase() || '';
                    const fullText = `${courseCode} - ${courseName}`.toLowerCase();
                    
                    // Check if input matches course code, course name, or full text
                    const matchesSearch = !inputValue || 
                                        courseCode.includes(filterValue) || 
                                        courseName.includes(filterValue) || 
                                        fullText.includes(filterValue);
                    
                    // Exclude courses that shouldn't be prerequisites
                    const isExcluded = 
                      // Exclude if it's the same course being created (only if course_code matches)
                      (newAssignment.course_code && option.course_code === newAssignment.course_code) ||
                      // Exclude courses with higher year levels (prerequisites should be equal or lower level)
                      (option.year_level && newAssignment.year_level && 
                       parseInt(option.year_level) > parseInt(newAssignment.year_level));
                    
                    return matchesSearch && !isExcluded;
                  });
                }}
                isOptionEqualToValue={(option, value) => option.course_id === value?.course_id}
                noOptionsText="No courses found"
                clearOnEscape
                selectOnFocus
                handleHomeEndKeys
              />
            </div>

            <div className="registration-section">
              <Typography variant="h6" className="section-title">
                Semester
              </Typography>
              <FormControl fullWidth margin="normal">
                <InputLabel>Select Semester</InputLabel>
                <Select
                  name="semester"
                  value={newAssignment.semester}
                  onChange={handleInputChange}
                  data-testid="input-semester"
                >
                  <MenuItem value="1st">1st Semester</MenuItem>
                  <MenuItem value="2nd">2nd Semester</MenuItem>
                  <MenuItem value="Summer">Summer</MenuItem>
                </Select>
              </FormControl>
            </div>

            <Button 
              type="submit" 
              variant="contained" 
              fullWidth
              sx={{ 
                mt: 3,
                bgcolor: '#c70202',
                '&:hover': {
                  bgcolor: '#a00000',
                },
                height: '45px',
                fontWeight: 'bold'
              }}
              data-testid="submit-button"
            >
              Save Course Assignment
            </Button>
          </form>
        </Box>
      </Modal>

      <Modal
        open={showEditModal}
        onClose={handleEditClose}
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: "90%",
          maxWidth: "600px",
          margin: "50px auto",
          backgroundColor: "white",
          borderRadius: "10px",
          padding: "30px",
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          maxHeight: "90vh",
          overflowY: "auto",
          border: '3px solid #c70202',
        }}>
          <Button
            onClick={handleEditClose}
            sx={{
              position: "absolute",
              top: "10px",
              right: "10px",
              minWidth: "30px",
              minHeight: "30px",
              padding: "5px",
              fontSize: "1.2rem",
              color: "#c70202",
              '&:hover': {
                backgroundColor: 'rgba(199, 2, 2, 0.1)',
              },
            }}
          >
            &times;
          </Button>

          <Typography variant="h5" sx={{ 
            textAlign: "center", 
            marginBottom: "20px",
            color: '#c70202',
            fontWeight: 'bold'
          }}>
            Edit Course Assignment
          </Typography>

          <form onSubmit={handleEditSubmit}>
            <div className="registration-section">
              <Typography variant="h6" className="section-title">
                Course Details
              </Typography>
              <TextField 
                label="Course Name" 
                value={selectedCourse?.course_name || ''} 
                fullWidth 
                margin="normal" 
                disabled 
              />
            </div>

            <div className="registration-section">
              <Typography variant="h6" className="section-title">
                Section Assignment
              </Typography>
              <FormControl fullWidth margin="normal">
                <InputLabel>Block/Section</InputLabel>
                <Select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  displayEmpty
                >
                  {existingBlocks.length > 0 ? (
                    existingBlocks.map(block => (
                      <MenuItem key={block} value={block}>Block {block}</MenuItem>
                    ))
                  ) : (
                    <MenuItem value="" disabled>
                      <em>No blocks with assigned students</em>
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </div>

            <div className="registration-section">
              <Typography variant="h6" className="section-title">
                Schedule
              </Typography>
              <FormControl fullWidth margin="normal">
                <InputLabel>Day</InputLabel>
                <Select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                >
                  <MenuItem value="Monday">Monday</MenuItem>
                  <MenuItem value="Tuesday">Tuesday</MenuItem>
                  <MenuItem value="Wednesday">Wednesday</MenuItem>
                  <MenuItem value="Thursday">Thursday</MenuItem>
                  <MenuItem value="Friday">Friday</MenuItem>
                  <MenuItem value="Saturday">Saturday</MenuItem>
                </Select>
              </FormControl>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <TextField
                    label="Start Time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="End Time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </div>

            <div className="registration-section">
              <Typography variant="h6" className="section-title">
                Instructor Assignment
              </Typography>
              <Autocomplete
                options={instructors}
                getOptionLabel={(option) => option.full_name || ''}
                value={selectedInstructor}
                onChange={(event, newValue) => {
                  setSelectedInstructor(newValue);
                }}
                disabled={loading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Instructor"
                    margin="normal"
                    placeholder="Type to search instructor..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': {
                          borderColor: '#c70202',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#c70202',
                        },
                      },
                    }}
                  />
                )}
                isOptionEqualToValue={(option, value) => option.staff_id === value?.staff_id}
                noOptionsText="No instructors found"
                clearOnEscape
                selectOnFocus
                handleHomeEndKeys
              />
            </div>

            <Button 
              type="submit" 
              variant="contained" 
              fullWidth
              sx={{ 
                mt: 3,
                bgcolor: '#c70202',
                '&:hover': {
                  bgcolor: '#a00000',
                },
                height: '45px',
                fontWeight: 'bold'
              }}
            >
              Save Changes
            </Button>
          </form>
        </Box>
      </Modal>

      {/* Add this before the closing div */}
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

export default AssignCourses;