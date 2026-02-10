import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Button, 
  Pagination, 
  Snackbar, 
  Alert, 
  Paper, 
  Grid, 
  Typography, 
  TextField, 
  FormControl, 
  Select, 
  MenuItem, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Box,
  CircularProgress,
  Dialog,
  IconButton
} from '@mui/material';
import { FaEye } from "react-icons/fa";
import { sendDocumentApprovalEmail, sendDocumentRejectionEmail } from '../../utils/documentEmailService';
import olshcoLogo from '../../asset/images/olshco-logo1.png';

const DocumentRequests = () => {
  const [filterBy, setFilterBy] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // Check localStorage cache synchronously on mount (like Academic Records)
  const cachedData = localStorage.getItem('documentRequestsData');
  const cacheTimestamp = localStorage.getItem('documentRequestsTimestamp');
  const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
  const hasValidCache = cachedData && cacheAge && cacheAge < 300000; // 5 minutes

  // Initialize state with cached data if available, otherwise empty
  const [requests, setRequests] = useState(hasValidCache ? (JSON.parse(cachedData) || []) : []);
  const [loading, setLoading] = useState(!hasValidCache); // Only show loading if no valid cache

  // Add new state for snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Modal state for viewing request form template
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Update fetchRequests function
  const fetchRequests = async (forceRefresh = false) => {
    try {
      // Check cache first (like Academic Records and Student Profile), unless forcing refresh
      if (!forceRefresh) {
        const cachedData = localStorage.getItem('documentRequestsData');
        const cacheTimestamp = localStorage.getItem('documentRequestsTimestamp');
        const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;

        // Use cache if it's less than 5 minutes old
        if (cachedData && cacheAge && cacheAge < 300000) {
          const parsedData = JSON.parse(cachedData);
          setRequests(parsedData);
          setLoading(false);
          
          // Always do background refresh to check for updates (new requests, status changes, etc.)
          fetchRequests(true).catch(err => {
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

      const token = localStorage.getItem('token');
      const response = await axios.get('/api/requests-all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Cache the fetched data
      localStorage.setItem('documentRequestsData', JSON.stringify(response.data));
      localStorage.setItem('documentRequestsTimestamp', Date.now().toString());
      
      setRequests(response.data);
      
      // Only update loading if not forcing refresh
      if (!forceRefresh) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch document requests',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  // Update handleStatusUpdate function
  const handleStatusUpdate = async (reqId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      
      // First, get the request details before updating
      const request = requests.find(req => req.req_id === reqId);
      if (!request) {
        throw new Error('Request not found');
      }

      // Update the status in the database
      await axios.put(`/api/update-request-status?req_id=${reqId}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Send email notification based on status
      if (newStatus === 'Ready for Pickup') {
        console.log('📧 Sending ready for pickup email to:', request.email);
        console.log('📧 Request data:', {
          email: request.email,
          name: `${request.first_name} ${request.last_name}`,
          docType: request.doc_type,
          reqDate: request.req_date
        });
        
        if (!request.email) {
          console.error('❌ No email found for student:', request);
          setSnackbar({
            open: true,
            message: 'Request marked as ready for pickup but no email found for student',
            severity: 'warning'
          });
        } else {
          const emailResult = await sendDocumentApprovalEmail(
            request.email,
            `${request.first_name} ${request.last_name}`,
            request.doc_type,
            request.req_date
          );
          
          if (emailResult.success) {
            // Email sent successfully
          } else {
            console.error('Failed to send ready for pickup email:', emailResult.message);
          }
        }
      } else if (newStatus === 'Rejected') {
        const emailResult = await sendDocumentRejectionEmail(
          request.email,
          `${request.first_name} ${request.last_name}`,
          request.doc_type,
          request.req_date,
          'Please contact the registrar office for more information.'
        );
        
        if (emailResult.success) {
          // Email sent successfully
        } else {
          console.error('Failed to send rejection email:', emailResult.message);
        }
      }
      
      setSnackbar({
        open: true,
        message: `Request ${newStatus.toLowerCase()} successfully and email notification sent`,
        severity: 'success'
      });
      
      // Invalidate cache and force refresh to show updated status
      localStorage.removeItem('documentRequestsData');
      localStorage.removeItem('documentRequestsTimestamp');
      fetchRequests(true);
    } catch (error) {
      console.error('Error updating status:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update request status',
        severity: 'error'
      });
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter requests based on document type and search term
  const filteredRequests = requests.filter(request => {
    const matchesSearch = !searchTerm || 
      request.doc_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${request.first_name} ${request.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = !filterBy || request.doc_type === filterBy;
    
    return matchesSearch && matchesFilter;
  });

  // Pagination calculations
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);
  const pageCount = Math.ceil(filteredRequests.length / rowsPerPage);

  const formatStudentName = (firstName, middleName, lastName, suffix) => {
    const middleInitial = middleName ? ` ${middleName.charAt(0)}.` : '';
    const suffixText = suffix ? ` ${suffix}` : '';
    return `${lastName}, ${firstName}${middleInitial}${suffixText}`;
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <div className="right-content w-100" data-testid="document-requests-page">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="hd mt-2 pb-0" data-testid="page-title">Document Requests Management</h3>
      </div>

      <div className="card shadow border-0 p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="hd" data-testid="section-title">Requested Documents</h3>
        </div>

        {/* Filters */}
        <Paper elevation={3} className="p-3 mb-4">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={3}>
              <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>SEARCH</Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by document type, student name, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
            </Grid>
            <Grid item xs={3}>
              <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>DOCUMENT TYPE</Typography>
              <FormControl fullWidth size="small">
                <Select
                  data-testid="document-filter"
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
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
                  <MenuItem value="">
                    <em>All Documents</em>
                  </MenuItem>
                  <MenuItem value="Certificate of Grades">Certificate of Grades</MenuItem>
                  <MenuItem value="Good Moral Certificate">Good Moral Certificate</MenuItem>
                  <MenuItem value="Diploma">Diploma</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>&nbsp;</Typography>
              <Button 
                variant="contained"
                onClick={fetchRequests}
                fullWidth
                sx={{
                  bgcolor: '#c70202',
                  '&:hover': {
                    bgcolor: '#a00000',
                  },
                }}
              >
                Apply Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Student Name</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Request Date</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Status</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan="4" style={{ textAlign: "center" }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                      <CircularProgress style={{ color: '#c70202' }} />
                      <Typography variant="body2" sx={{ ml: 2, color: '#666' }}>
                        Loading document requests...
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : paginatedRequests.length > 0 ? (
                paginatedRequests.map((request, index) => (
                  <TableRow key={request.req_id} data-testid={`request-row-${index}`}>
                    <TableCell data-testid={`student-name-${index}`}>
                      {formatStudentName(
                        request.first_name,
                        request.middle_name,
                        request.last_name,
                        request.suffix
                      )}
                    </TableCell>
                    <TableCell data-testid={`date-${index}`}>
                      {new Date(request.req_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell data-testid={`status-${index}`}>
                      {(request.req_status || '').toLowerCase() === 'processing' ? (
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <Select
                            value={request.req_status}
                            onChange={(e) => {
                              if (e.target.value === 'Ready for Pickup') {
                                handleStatusUpdate(request.req_id, 'Ready for Pickup');
                              }
                            }}
                            sx={{
                              fontSize: '0.875rem',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#1976d2',
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#1565c0',
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#1565c0',
                              },
                            }}
                          >
                            <MenuItem value="Processing">Processing</MenuItem>
                            <MenuItem value="Ready for Pickup">Ready for Pickup</MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {request.req_status}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        aria-label={`View request form for ${request.first_name} ${request.last_name}`}
                        onClick={() => { setSelectedRequest(request); setShowFormModal(true); }}
                        sx={{
                          border: '1px solid #c70202',
                          color: '#c70202',
                          '&:hover': { backgroundColor: 'rgba(199,2,2,0.06)' }
                        }}
                      >
                        <FaEye size={14} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="4" style={{ textAlign: "center" }} data-testid="no-data-message">
                    {searchTerm || filterBy ? 'No requests found matching your filters' : 'No document requests available'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {filteredRequests.length > 0 && (
          <div className="d-flex justify-content-center mt-4">
            <Pagination 
              data-testid="pagination"
              count={pageCount}
              page={page}
              onChange={handlePageChange}
              color="primary"
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
      
      {/* Request Form Template Modal */}
      <Dialog open={showFormModal} onClose={() => setShowFormModal(false)} maxWidth="md" fullWidth>
        <Box sx={{ p: 3 }}>
          <Paper variant="outlined" sx={{ p: 2, borderWidth: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 56, height: 56, border: '1px solid #999', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fff' }}>
                    <img src={olshcoLogo} alt="School logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>REQUEST FORM</Typography>
                    <Typography variant="body2">PAASCU ACCREDITED</Typography>
                    <Typography variant="body2">ISO ACCREDITED</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Grid container>
                  <Grid item xs={12}>
                    <Box sx={{ border: '1px solid #000', height: '100%', p: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Page</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>1 of 1</Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            <Box sx={{ mt: 2, border: '1px solid #000' }}>
              <Grid container>
                <Grid item xs={9} sx={{ borderRight: '1px solid #000' }}>
                  <Box sx={{ p: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>NAME:</Typography>
                    <Typography variant="caption">{selectedRequest ? formatStudentName(selectedRequest.first_name, selectedRequest.middle_name, selectedRequest.last_name, selectedRequest.suffix) : ''}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box sx={{ p: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Date:</Typography>
                    <Typography variant="caption">{selectedRequest ? new Date(selectedRequest.req_date).toLocaleDateString() : ''}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ borderTop: '1px solid #000', p: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>LEVEL ATTENDED:</Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 14, height: 14, border: '1px solid #000', bgcolor: (selectedRequest?.level_attended || '').includes('COLLEGE') ? '#c70202' : 'transparent' }} />
                    <Typography variant="body2">COLLEGE</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ borderTop: '1px solid #000', p: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>GRADE / STRAND / COURSE:</Typography>
              <Typography variant="caption">{selectedRequest?.grade_strand_course || ''}</Typography>
            </Box>

            <Box sx={{ borderTop: '1px solid #000', p: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>YEAR GRADUATED / SCHOOL YEAR:</Typography>
              <Typography variant="caption">{selectedRequest?.year_graduated || ''}</Typography>
            </Box>

            <Box sx={{ borderTop: '1px solid #000', p: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>ACADEMIC CREDENTIALS: 15 Days Processing</Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {['DIPLOMA','TRANSCRIPT OF RECORDS - College'].map((label) => (
                  <Grid item xs={12} md={6} key={label}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 14, height: 14, border: '1px solid #000', bgcolor: (selectedRequest?.academic_credentials || '').includes(label) ? '#c70202' : 'transparent' }} />
                      <Typography variant="body2">{label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Box sx={{ borderTop: '1px solid #000', p: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>CERTIFICATION: 5 days Processing</Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {['ENGLISH AS MEDIUM OF INSTRUCTION','ENROLLMENT','GRADES (FOR COLLEGE ONLY)','GRADUATION','GWA / HONORS / AWARDS','HONORABLE DISMISSAL'].map((label) => (
                  <Grid item xs={12} md={6} key={label}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 14, height: 14, border: '1px solid #000', bgcolor: (selectedRequest?.certification || '').includes(label) ? '#c70202' : 'transparent' }} />
                      <Typography variant="body2">{label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Box sx={{ borderTop: '1px solid #000', p: 1, minHeight: 64 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>PURPOSE:</Typography>
              <Typography variant="caption">{selectedRequest?.description || ''}</Typography>
            </Box>

            <Grid container sx={{ borderTop: '1px solid #000' }}>
              <Grid item xs={12}>
                <Box sx={{ p: 1, minHeight: 64 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>ACCOUNTING OFFICE:</Typography>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button onClick={() => setShowFormModal(false)} variant="contained" sx={{ bgcolor: '#c70202', '&:hover': { bgcolor: '#a00000' } }}>
                Close
              </Button>
            </Box>
          </Paper>
        </Box>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
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

export default DocumentRequests;
