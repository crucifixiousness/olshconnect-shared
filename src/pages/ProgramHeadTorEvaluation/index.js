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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Chip,
  Autocomplete
} from '@mui/material';
import { FaEye, FaDownload, FaClipboardList } from "react-icons/fa";
import { MyContext } from "../../App";

const ProgramHeadTorEvaluation = () => {
  const context = useContext(MyContext);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Check localStorage cache synchronously on mount for instant display
  const cachedData = localStorage.getItem('torEvaluationRequestsData');
  const cacheTimestamp = localStorage.getItem('torEvaluationRequestsTimestamp');
  const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
  let initialData = [];
  let initialLoading = true;
  
  try {
    if (cachedData && cacheAge && cacheAge < 300000) {
      const parsed = JSON.parse(cachedData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        initialData = parsed;
        initialLoading = false;
      }
    }
  } catch (e) {
    console.warn('⚠️ [TOR EVALUATION] Invalid cache, will fetch fresh:', e);
  }

  const [torRequests, setTorRequests] = useState(initialData);
  const [loading, setLoading] = useState(initialLoading);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [evaluationOpen, setEvaluationOpen] = useState(false);
  const [equivalencies, setEquivalencies] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [remainingCourses, setRemainingCourses] = useState([]);
  const [requiredCourses, setRequiredCourses] = useState([]);
  const [comments, setComments] = useState('');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [enrollmentSchool, setEnrollmentSchool] = useState('');
  const [enrollmentAcademicYear, setEnrollmentAcademicYear] = useState('');
  const [allowedPrevAcademicYears, setAllowedPrevAcademicYears] = useState([]);
  const [dialogLoading, setDialogLoading] = useState(false);

  // No prerequisite restrictions in selection per latest requirement

  useEffect(() => {
    context.setIsHideComponents(false);
    window.scrollTo(0, 0);
    fetchTorRequests();
  }, [context]);

  const fetchTorRequests = async (forceRefresh = false) => {
    let wasLoadingSet = false;
    try {
      // Check if we have valid cache and don't need to show loading
      const cachedData = localStorage.getItem('torEvaluationRequestsData');
      const cacheTimestamp = localStorage.getItem('torEvaluationRequestsTimestamp');
      const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
      const hasValidCache = !forceRefresh && cachedData && cacheAge && cacheAge < 300000;
      
      // Only show loading if we don't have valid cache (first load or cache expired)
      if (!hasValidCache) {
        setLoading(true);
        wasLoadingSet = true;
      }

      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      const program_id = user.program_id;

      if (!token || !program_id) {
        console.error('No token or program_id found');
        if (wasLoadingSet) {
          setLoading(false);
        }
        return;
      }

      const response = await axios.get(`/api/program-head-tor-evaluation?program_id=${program_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data.requests || [];
      setTorRequests(data);
      
      // Cache the fetched data
      try {
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem('torEvaluationRequestsData', JSON.stringify(data));
          localStorage.setItem('torEvaluationRequestsTimestamp', Date.now().toString());
        } else {
          localStorage.removeItem('torEvaluationRequestsData');
          localStorage.removeItem('torEvaluationRequestsTimestamp');
        }
      } catch (storageError) {
        console.warn('⚠️ [TOR EVALUATION] Could not cache data:', storageError.message);
      }
      
    } catch (error) {
      console.error('Error fetching TOR requests:', error);
      setSnackbar({ open: true, message: 'Failed to load TOR requests', severity: 'error' });
    } finally {
      if (wasLoadingSet) {
        setLoading(false);
      }
    }
  };

  const fetchAvailableCourses = async (program_id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/credit-courses?program_id=${program_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchExistingEquivalencies = async (tor_request_id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/program-head-tor-evaluation?tor_request_id=${tor_request_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.equivalencies) {
        // Convert the database format to form format
        const formattedEquivalencies = response.data.equivalencies.map(equiv => ({
          external_course_code: equiv.external_course_code || '',
          external_course_name: equiv.external_course_name || '',
          external_grade: equiv.external_grade || '',
          external_units: equiv.external_units || 3,
          equivalent_course_id: equiv.equivalent_course_id || '',
          equivalent_course_code: equiv.equivalent_course_code || '',
          equivalent_course_name: equiv.equivalent_course_name || '',
          source_school: equiv.source_school || '',
          source_academic_year: equiv.source_academic_year || ''
        }));
        setEquivalencies(formattedEquivalencies);
      } else {
        setEquivalencies([]);
      }
    } catch (error) {
      console.error('Error fetching existing equivalencies:', error);
      // If no equivalencies exist yet, start with empty array
      setEquivalencies([]);
    }
  };

  const fetchRemainingAndRequired = async (request) => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({
      student_id: String(request.student_id),
      program_id: String(request.program_id),
      year_id: String(request.year_id || request.year_id === 0 ? request.year_id : request.year_id),
      semester: String(request.semester),
      tor_request_id: String(request.id)
    }).toString();
    const res = await axios.get(`/api/student-remaining-courses?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setRemainingCourses(res.data.remainingCourses || []);
    setRequiredCourses(res.data.requiredCourses || []);
  };

  const fetchStudentEnrollment = async (student_id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/registrar-enrollments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const rows = res.data || [];
      // Get the most recent enrollment for this student
      const studentEnrollments = rows.filter(r => String(r.student_id) === String(student_id));
      const latest = studentEnrollments[0] || null; // rows are DESC by enrollment_date
      const school = latest?.previous_school || '';
      const prevAy = latest?.previous_academic_year || '';
      setEnrollmentSchool(school);
      setEnrollmentAcademicYear(prevAy);
      // Build covered AY options from range (e.g., 2023-2025 -> 2023-2024, 2024-2025)
      const options = (() => {
        const match = /^\s*(\d{4})\s*-\s*(\d{4})\s*$/.exec(prevAy || '');
        if (!match) return [];
        const start = parseInt(match[1], 10);
        const end = parseInt(match[2], 10);
        if (isNaN(start) || isNaN(end) || end <= start) return [];
        const years = [];
        for (let y = start; y < end; y++) {
          years.push(`${y}-${y + 1}`);
        }
        return years;
      })();
      setAllowedPrevAcademicYears(options);
      return { school, prevAy };
    } catch (e) {
      console.error('Error fetching student enrollment:', e);
      setEnrollmentSchool('');
      setEnrollmentAcademicYear('');
      setAllowedPrevAcademicYears([]);
      return { school: '', prevAy: '' };
    }
  };

  const handleViewRequest = async (request) => {
    setSelectedRequest(request);
    setComments('');
    
    // Open dialog immediately with loading state and fetch data in parallel to reduce wait time
    setEvaluationOpen(true);
    setDialogLoading(true);

    try {
      const [, enrollmentInfo] = await Promise.all([
        fetchAvailableCourses(request.program_id),
        fetchStudentEnrollment(request.student_id),
        fetchExistingEquivalencies(request.id),
        fetchRemainingAndRequired(request)
      ]);

      // Ensure equivalencies have enrollment-derived source fields using freshly fetched values
      const fetchedSchool = enrollmentInfo?.school || '';
      const fetchedPrevAy = enrollmentInfo?.prevAy || '';
      setEquivalencies(prev => prev.map(e => ({
        ...e,
        source_school: fetchedSchool || e.source_school,
        source_academic_year: fetchedPrevAy || e.source_academic_year
      })));
    } catch (e) {
      console.error('Error loading evaluation data:', e);
      setSnackbar({ open: true, message: 'Failed to load evaluation data', severity: 'error' });
    } finally {
      setDialogLoading(false);
    }
  };

  const handleViewTor = async (tor_request_id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/view-tor?tor_request_id=${tor_request_id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create blob URL for viewing
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      
      // Determine document type from response headers
      const contentType = response.headers['content-type'] || '';
      let docType = 'pdf';
      
      if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) {
        docType = 'image';
      } else if (contentType.includes('image/png')) {
        docType = 'image';
      } else if (contentType.includes('application/pdf')) {
        docType = 'pdf';
      }
      
      setDocumentUrl(url);
      setDocumentType(docType);
      setViewModalOpen(true);

    } catch (error) {
      console.error('❌ ERROR viewing TOR:', error);
      
      let errorMessage = 'Failed to view TOR document';
      
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        if (status === 404) {
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          } else {
            errorMessage = 'TOR document not found. Please check if the document was uploaded.';
          }
        } else if (status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (status === 400) {
          errorMessage = 'Invalid request. Please try again.';
        } else {
          errorMessage = `Server error (${status}). Please try again later.`;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage = 'Failed to prepare view request.';
      }
      
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  const handleDownloadTor = async (tor_request_id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/download-tor?tor_request_id=${tor_request_id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob' // Important for file downloads
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'TOR_Document.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSnackbar({ open: true, message: 'TOR document downloaded successfully', severity: 'success' });
    } catch (error) {
      console.error('❌ ERROR downloading TOR:', error);
      
      let errorMessage = 'Failed to download TOR document';
      
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const errorData = error.response.data;
        
        if (status === 404) {
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          } else {
            errorMessage = 'TOR document not found. Please check if the document was uploaded.';
          }
        } else if (status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (status === 400) {
          errorMessage = 'Invalid request. Please try again.';
        } else {
          errorMessage = `Server error (${status}). Please try again later.`;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        // Something else happened
        errorMessage = 'Failed to prepare download request.';
      }
      
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  const handleCloseViewModal = () => {
    setViewModalOpen(false);
    // Clean up blob URL to prevent memory leaks
    if (documentUrl) {
      window.URL.revokeObjectURL(documentUrl);
      setDocumentUrl('');
    }
    setDocumentType('');
  };

  const handleAddEquivalency = () => {
    setEquivalencies([...equivalencies, {
      external_course_code: '',
      external_course_name: '',
      external_grade: '',
      external_units: 3,
      equivalent_course_id: '',
      equivalent_course_code: '',
      equivalent_course_name: '',
      source_school: enrollmentSchool || '',
      source_academic_year: (allowedPrevAcademicYears[0] || enrollmentAcademicYear || '')
    }]);
  };

  const handleRemoveEquivalency = (index) => {
    const updated = equivalencies.filter((_, i) => i !== index);
    setEquivalencies(updated);
  };

  const handleEquivalencyChange = (index, field, value) => {
    const updated = [...equivalencies];
    // Prevent manual edit of source fields (derived from enrollment)
    if (field === 'source_school') {
      return;
    }
    // If a course is already selected, lock the academic year selection for that equivalency
    if (field === 'source_academic_year' && updated[index]?.equivalent_course_id) {
      return;
    }
    updated[index][field] = value;
    
    // Auto-populate course info when course is selected
    if (field === 'equivalent_course_id') {
      const course = availableCourses.find(c => c.course_id === value);
      if (course) {
        updated[index].equivalent_course_code = course.course_code;
        updated[index].equivalent_course_name = course.course_name;
      }
    }
    
    setEquivalencies(updated);
  };

  const handleSubmitEvaluation = async () => {
    // Validate that at least one equivalency is added
    if (equivalencies.length === 0) {
      setSnackbar({ open: true, message: 'Please add at least one course equivalency before submitting.', severity: 'error' });
      return;
    }

    // Validate that all equivalencies have required fields
    const hasEmptyFields = equivalencies.some(equiv => 
      !equiv.external_course_code || 
      !equiv.external_course_name || 
      !equiv.external_grade || 
      !equiv.equivalent_course_id ||
      !equiv.source_school ||
      !equiv.source_academic_year
    );

    if (hasEmptyFields) {
      setSnackbar({ open: true, message: 'Please fill in all required fields for all course equivalencies.', severity: 'error' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      await axios.post('/api/program-head-tor-evaluation', {
        tor_request_id: selectedRequest.id,
        equivalencies: equivalencies,
        comments: comments
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSnackbar({ open: true, message: 'Course equivalencies submitted successfully', severity: 'success' });
      setEvaluationOpen(false);
      // Invalidate cache and force refresh to show updated status
      try {
        localStorage.removeItem('torEvaluationRequestsData');
        localStorage.removeItem('torEvaluationRequestsTimestamp');
      } catch (e) {
        // Ignore storage errors
      }
      fetchTorRequests(true);
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      setSnackbar({ open: true, message: 'Failed to submit evaluation', severity: 'error' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'program_head_reviewed': return 'info';
      case 'registrar_approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="right-content w-100">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
          <CircularProgress style={{ color: '#c70202' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="mb-4" style={{ color: '#c70202', fontWeight: 'bold' }}>TOR Evaluation Requests</h3>

        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Student</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Program</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Year Level</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Semester</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Status</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Submitted</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {torRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <strong>{request.first_name} {request.last_name}</strong>
                      <div style={{ fontSize: '0.8em', color: 'gray' }}>{request.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{request.program_name}</TableCell>
                  <TableCell>{request.year_level}</TableCell>
                  <TableCell>{request.semester}</TableCell>
                  <TableCell>
                    <Chip 
                      label={request.status.replace('_', ' ').toUpperCase()} 
                      color={getStatusColor(request.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(request.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleViewRequest(request)}
                        sx={{ 
                          minWidth: 36, 
                          height: 32, 
                          p: 0, 
                          borderRadius: 1, 
                          backgroundColor: '#1976d2',
                          '&:hover': { backgroundColor: '#155fa8' }
                        }}
                        title="Evaluate TOR"
                      >
                        <FaClipboardList size={16} color="#fff" />
                      </Button>
                      {request.tor_document_path && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleViewTor(request.id)}
                            sx={{ 
                              minWidth: 36, 
                              height: 32, 
                              p: 0, 
                              borderRadius: 1, 
                              backgroundColor: '#28a745',
                              '&:hover': { backgroundColor: '#218838' }
                            }}
                            title="View Document"
                          >
                            <FaEye size={16} color="#fff" />
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleDownloadTor(request.id)}
                            sx={{ 
                              minWidth: 36, 
                              height: 32, 
                              p: 0, 
                              borderRadius: 1, 
                              backgroundColor: '#c70202',
                              '&:hover': { backgroundColor: '#a00000' }
                            }}
                            title="Download Document"
                          >
                            <FaDownload size={16} color="#fff" />
                          </Button>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* TOR Evaluation Dialog */}
        <Dialog open={evaluationOpen} onClose={() => setEvaluationOpen(false)} maxWidth="lg" fullWidth>
          <DialogTitle style={{ color: '#c70202', fontWeight: 'bold', fontSize: '1.5rem' }}>
            TOR Evaluation - {selectedRequest?.first_name} {selectedRequest?.last_name}
          </DialogTitle>
          <DialogContent>
            {dialogLoading && (
              <Box className="mb-3" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} style={{ color: '#c70202' }} />
                <Typography variant="body2">Loading evaluation data...</Typography>
              </Box>
            )}
            {selectedRequest && (
              <Box>
                <Typography variant="h6" className="mb-3" style={{ color: '#c70202', fontWeight: 'bold' }}>Student Information</Typography>
                <Box className="mb-4">
                  <strong>Program:</strong> {selectedRequest.program_name}<br/>
                  <strong>Year Level:</strong> {selectedRequest.year_level}<br/>
                  <strong>Semester:</strong> {selectedRequest.semester}
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center" className="mb-3">
                  <Typography variant="h6" style={{ color: '#c70202', fontWeight: 'bold' }}>
                    Course Equivalencies ({equivalencies.length})
                  </Typography>
                  <Button 
                    variant="contained" 
                    onClick={handleAddEquivalency}
                    style={{ 
                      backgroundColor: '#c70202', 
                      color: 'white',
                      fontWeight: 'bold',
                      '&:hover': { backgroundColor: '#a00000' }
                    }}
                  >
                    Add Course Equivalency
                  </Button>
                </Box>

                {equivalencies.length === 0 ? (
                  <Card className="p-4 text-center" style={{ border: '2px dashed #e0e0e0', borderRadius: '8px' }}>
                    <Typography variant="body1" style={{ color: '#666' }}>
                      No course equivalencies added yet. Click "Add Course Equivalency" to start.
                    </Typography>
                  </Card>
                ) : (
                  equivalencies.map((equiv, index) => (
                  <Card key={index} className="p-3 mb-3" style={{ border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" className="mb-2">
                      <Typography variant="subtitle1" style={{ color: '#c70202', fontWeight: 'bold' }}>
                        Equivalency {index + 1}
                      </Typography>
                      {equivalencies.length > 1 && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleRemoveEquivalency(index)}
                          style={{ minWidth: 'auto', padding: '4px 8px' }}
                        >
                          Remove
                        </Button>
                      )}
                    </Box>
                    <div className="row">
                      <div className="col-md-6">
                        <TextField
                          label="External Course Code"
                          fullWidth
                          size="small"
                          value={equiv.external_course_code}
                          onChange={(e) => handleEquivalencyChange(index, 'external_course_code', e.target.value)}
                          className="mb-2"
                        />
                        <TextField
                          label="External Course Name"
                          fullWidth
                          size="small"
                          value={equiv.external_course_name}
                          onChange={(e) => handleEquivalencyChange(index, 'external_course_name', e.target.value)}
                          className="mb-2"
                        />
                        <TextField
                          label="Grade (1.0-5.0)"
                          fullWidth
                          size="small"
                          type="number"
                          step="0.1"
                          min="1.0"
                          max="5.0"
                          value={equiv.external_grade}
                          onChange={(e) => handleEquivalencyChange(index, 'external_grade', parseFloat(e.target.value))}
                          className="mb-2"
                        />
                        <TextField
                          label="External Units"
                          fullWidth
                          size="small"
                          type="number"
                          value={equiv.external_units}
                          onChange={(e) => handleEquivalencyChange(index, 'external_units', parseFloat(e.target.value))}
                          className="mb-2"
                        />
                        <TextField
                          label="Source School"
                          fullWidth
                          size="small"
                          value={equiv.source_school}
                          onChange={(e) => handleEquivalencyChange(index, 'source_school', e.target.value)}
                          disabled
                          className="mb-2"
                        />
                        {allowedPrevAcademicYears.length > 0 ? (
                          <Autocomplete
                            options={allowedPrevAcademicYears}
                            value={equiv.source_academic_year || null}
                            onChange={(event, newValue) => {
                              handleEquivalencyChange(index, 'source_academic_year', newValue || '');
                            }}
                            disabled={Boolean(equiv.equivalent_course_id)}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Academic Year (e.g., 2022-2023)"
                                size="small"
                                className="mb-2"
                                placeholder="Select academic year"
                              />
                            )}
                            isOptionEqualToValue={(opt, val) => opt === val}
                            noOptionsText="No years available"
                            clearOnEscape
                            selectOnFocus
                            handleHomeEndKeys
                          />
                        ) : (
                          <TextField
                            label="Academic Year (e.g., 2022-2023)"
                            fullWidth
                            size="small"
                            value={equiv.source_academic_year}
                            onChange={(e) => handleEquivalencyChange(index, 'source_academic_year', e.target.value)}
                            disabled={Boolean(equiv.equivalent_course_id)}
                          />
                        )}
                      </div>
                      <div className="col-md-6">
                        <Autocomplete
                          options={availableCourses}
                          getOptionLabel={(option) => option.course_code ? `${option.course_code} - ${option.course_name} (${option.units} units)` : ''}
                          value={availableCourses.find(course => course.course_id === equiv.equivalent_course_id) || null}
                          onChange={(event, newValue) => {
                            handleEquivalencyChange(index, 'equivalent_course_id', newValue ? newValue.course_id : '');
                          }}
                          renderInput={(params) => (
                        <TextField
                              {...params}
                          label="Equivalent Course"
                          size="small"
                          className="mb-2"
                              placeholder="Type to search courses..."
                            />
                          )}
                          filterOptions={(options, { inputValue }) => {
                            if (!inputValue) return options;

                            const filterValue = inputValue.toLowerCase();
                            return options.filter(option => {
                              const courseCode = option.course_code?.toLowerCase() || '';
                              const courseName = option.course_name?.toLowerCase() || '';
                              const fullText = `${courseCode} - ${courseName}`.toLowerCase();
                              
                              // Check if input matches course code, course name, or full text
                              return courseCode.includes(filterValue) || 
                                     courseName.includes(filterValue) || 
                                     fullText.includes(filterValue);
                            });
                          }}
                          isOptionEqualToValue={(option, value) => option.course_id === value?.course_id}
                          noOptionsText="No courses found"
                          clearOnEscape
                          selectOnFocus
                          handleHomeEndKeys
                        />
                      </div>
                    </div>
                  </Card>
                  ))
                )}

                {/* Remaining Required Courses (current semester only) */}
                <Box className="mt-4">
                  <Typography variant="h6" className="mb-2" style={{ color: '#c70202', fontWeight: 'bold' }}>
                    Assign Additional Course (Current Semester)
                  </Typography>
                  <div className="row">
                    <div className="col-md-8">
                      <Autocomplete
                        options={remainingCourses}
                        getOptionLabel={(option) => option.course_code ? `${option.course_code} - ${option.course_name} (${option.units} units) - Year ${option.year_level}` : ''}
                        onChange={async (event, newValue) => {
                          if (!newValue) return;
                          const pcId = Number(newValue.pc_id);
                          try {
                            const token = localStorage.getItem('token');
                            await axios.post('/api/student-required-courses', {
                              student_id: selectedRequest.student_id,
                              pc_id: pcId,
                              reason: 'not_taken'
                            }, { headers: { Authorization: `Bearer ${token}` } });
                            // Move from remaining to required list locally
                            const picked = remainingCourses.find(rc => Number(rc.pc_id) === pcId);
                            if (picked) {
                              setRequiredCourses([...requiredCourses, picked]);
                              setRemainingCourses(remainingCourses.filter(rc => Number(rc.pc_id) !== pcId));
                              setSnackbar({ open: true, message: 'Course added to required list', severity: 'success' });
                            }
                          } catch (err) {
                            console.error('Error adding required course:', err);
                            setSnackbar({ open: true, message: 'Failed to add required course', severity: 'error' });
                          }
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Remaining Course"
                            size="small"
                            className="mb-2"
                            placeholder="Type to search courses..."
                          />
                        )}
                        filterOptions={(options, { inputValue }) => {
                          if (!inputValue) return options;
                          
                          const filterValue = inputValue.toLowerCase();
                          return options.filter(option => {
                            const courseCode = option.course_code?.toLowerCase() || '';
                            const courseName = option.course_name?.toLowerCase() || '';
                            const fullText = `${courseCode} - ${courseName}`.toLowerCase();
                            
                            // Check if input matches course code, course name, or full text
                            return courseCode.includes(filterValue) || 
                                   courseName.includes(filterValue) || 
                                   fullText.includes(filterValue);
                          });
                        }}
                        isOptionEqualToValue={(option, value) => option.pc_id === value?.pc_id}
                        noOptionsText="No courses found"
                        clearOnEscape
                        selectOnFocus
                        handleHomeEndKeys
                      />
                    </div>
                  </div>

                  {requiredCourses.length > 0 && (
                    <TableContainer component={Paper} elevation={0} className="mt-2">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Required Course</TableCell>
                            <TableCell align="right">Units</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {requiredCourses.map(rc => (
                            <TableRow key={rc.pc_id}>
                              <TableCell>{rc.course_code} - {rc.course_name}</TableCell>
                              <TableCell align="right">{rc.units}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>

              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setEvaluationOpen(false)}
              style={{ color: '#666' }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitEvaluation}
              variant="contained"
              style={{ 
                backgroundColor: '#c70202', 
                color: 'white',
                fontWeight: 'bold',
                '&:hover': { backgroundColor: '#a00000' }
              }}
            >
              Submit Evaluation
            </Button>
          </DialogActions>
        </Dialog>

        {/* Document View Modal */}
        <Dialog 
          open={viewModalOpen} 
          onClose={handleCloseViewModal} 
          maxWidth="lg" 
          fullWidth
          PaperProps={{
            sx: {
              height: '90vh',
              maxHeight: '90vh'
            }
          }}
        >
          <DialogTitle style={{ 
            color: '#c70202', 
            fontWeight: 'bold', 
            fontSize: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>TOR Document Viewer</span>
            <Button
              onClick={handleCloseViewModal}
              sx={{
                minWidth: '30px',
                minHeight: '30px',
                padding: '5px',
                fontSize: '1.2rem',
                color: '#c70202',
                '&:hover': {
                  backgroundColor: 'rgba(199, 2, 2, 0.1)',
                },
              }}
            >
              &times;
            </Button>
          </DialogTitle>
          <DialogContent sx={{ p: 0, height: '100%', overflow: 'hidden' }}>
            {documentUrl && (
              <Box sx={{ height: '100%', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {documentType === 'pdf' ? (
                  <iframe
                    src={documentUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      borderRadius: '8px'
                    }}
                    title="TOR Document"
                  />
                ) : (
                  <img
                    src={documentUrl}
                    alt="TOR Document"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleCloseViewModal}
              style={{ color: '#666' }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
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
      </div>
    </div>
  );
};

export default ProgramHeadTorEvaluation;
