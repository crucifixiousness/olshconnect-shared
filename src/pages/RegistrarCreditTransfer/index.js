import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { 
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
  Alert,
  Snackbar
} from '@mui/material';
import { FaEye, FaCheck, FaTimes } from "react-icons/fa";
import { MyContext } from "../../App";

const RegistrarCreditTransfer = () => {
  const context = useContext(MyContext);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [equivalencies, setEquivalencies] = useState([]);
  const [comments, setComments] = useState('');

  // Check localStorage cache synchronously on mount (like Academic Records)
  const cachedData = localStorage.getItem('creditTransferRequestsData');
  const cacheTimestamp = localStorage.getItem('creditTransferRequestsTimestamp');
  const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
  const hasValidCache = cachedData && cacheAge && cacheAge < 300000; // 5 minutes

  // Initialize state with cached data if available, otherwise empty
  const [torRequests, setTorRequests] = useState(hasValidCache ? (JSON.parse(cachedData) || []) : []);
  const [loading, setLoading] = useState(!hasValidCache); // Only show loading if no valid cache

  useEffect(() => {
    context.setIsHideComponents(false);
    window.scrollTo(0, 0);
    fetchTorRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  const fetchTorRequests = async (forceRefresh = false) => {
    try {
      // Check cache first (like Academic Records and Student Profile), unless forcing refresh
      if (!forceRefresh) {
        const cachedData = localStorage.getItem('creditTransferRequestsData');
        const cacheTimestamp = localStorage.getItem('creditTransferRequestsTimestamp');
        const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;

        // Use cache if it's less than 5 minutes old
        if (cachedData && cacheAge && cacheAge < 300000) {
          const parsedData = JSON.parse(cachedData);
          setTorRequests(parsedData);
          setLoading(false);
          
          // Always do background refresh to check for updates (new requests, status changes, etc.)
          fetchTorRequests(true).catch(err => {
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

      if (!token) {
        console.error('No token found');
        setLoading(false);
        return;
      }

      const response = await axios.get('/api/registrar-credit-transfer', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Cache the fetched data
      localStorage.setItem('creditTransferRequestsData', JSON.stringify(response.data.requests || []));
      localStorage.setItem('creditTransferRequestsTimestamp', Date.now().toString());

      setTorRequests(response.data.requests || []);
      
      // Only update loading if not forcing refresh
      if (!forceRefresh) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching TOR requests:', error);
      setSnackbar({ open: true, message: 'Failed to load TOR requests', severity: 'error' });
      setLoading(false);
    }
  };

  const handleViewRequest = async (request) => {
    setSelectedRequest(request);
    setComments('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/registrar-credit-transfer?tor_request_id=${request.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setEquivalencies(response.data.equivalencies || []);
      setApprovalOpen(true);
    } catch (error) {
      console.error('Error fetching equivalencies:', error);
      setSnackbar({ open: true, message: 'Failed to load course equivalencies', severity: 'error' });
    }
  };

  const handleApproveReject = async (action) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.post('/api/registrar-credit-transfer', {
        tor_request_id: selectedRequest.id,
        action: action,
        comments: comments
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSnackbar({ 
        open: true, 
        message: `Credit transfer ${action}d successfully`, 
        severity: 'success' 
      });
      setApprovalOpen(false);
      // Invalidate cache and force refresh to show updated status
      localStorage.removeItem('creditTransferRequestsData');
      localStorage.removeItem('creditTransferRequestsTimestamp');
      fetchTorRequests(true);
    } catch (error) {
      console.error(`Error ${action}ing credit transfer:`, error);
      setSnackbar({ 
        open: true, 
        message: `Failed to ${action} credit transfer`, 
        severity: 'error' 
      });
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
        <h3 className="mb-4">Credit Transfer Approvals</h3>

        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Student</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Program</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Year Level</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Semester</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Program Head</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Reviewed</TableCell>
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
                  <TableCell>{request.program_head_name || 'N/A'}</TableCell>
                  <TableCell>
                    {request.program_head_reviewed_at 
                      ? new Date(request.program_head_reviewed_at).toLocaleDateString()
                      : 'N/A'
                    }
                  </TableCell>
                  <TableCell>
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
                    >
                      <FaEye size={16} color="#fff" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Credit Transfer Approval Dialog */}
        <Dialog open={approvalOpen} onClose={() => setApprovalOpen(false)} maxWidth="lg" fullWidth>
          <DialogTitle>
            Credit Transfer Approval - {selectedRequest?.first_name} {selectedRequest?.last_name}
          </DialogTitle>
          <DialogContent>
            {selectedRequest && (
              <Box>
                <Typography variant="h6" className="mb-3">Student Information</Typography>
                <Box className="mb-4">
                  <strong>Program:</strong> {selectedRequest.program_name}<br/>
                  <strong>Year Level:</strong> {selectedRequest.year_level}<br/>
                  <strong>Semester:</strong> {selectedRequest.semester}
                </Box>

                <Typography variant="h6" className="mb-3">Course Equivalencies</Typography>
                <TableContainer component={Paper} elevation={0}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>External Course</TableCell>
                        <TableCell>Grade</TableCell>
                        <TableCell>External Units</TableCell>
                        <TableCell>Source School</TableCell>
                        <TableCell>Academic Year</TableCell>
                        <TableCell>Equivalent Course</TableCell>
                        <TableCell>Credits Granted</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {equivalencies.map((equiv, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <strong>{equiv.external_course_code}</strong>
                              <div style={{ fontSize: '0.8em', color: 'gray' }}>
                                {equiv.external_course_name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{equiv.external_grade}</TableCell>
                          <TableCell>{equiv.external_units}</TableCell>
                          <TableCell>{equiv.source_school || 'N/A'}</TableCell>
                          <TableCell>{equiv.source_academic_year || 'N/A'}</TableCell>
                          <TableCell>
                            <div>
                              <strong>{equiv.equivalent_course_code}</strong>
                              <div style={{ fontSize: '0.8em', color: 'gray' }}>
                                {equiv.equivalent_course_name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><strong style={{ color: '#1976d2' }}>{equiv.external_grade}</strong></TableCell>
                          <TableCell>{equiv.credits_granted ?? equiv.equivalent_units ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApprovalOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => handleApproveReject('reject')}
              variant="contained"
              color="error"
              startIcon={<FaTimes />}
            >
              Reject
            </Button>
            <Button 
              onClick={() => handleApproveReject('approve')}
              variant="contained"
              color="success"
              startIcon={<FaCheck />}
            >
              Approve
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

export default RegistrarCreditTransfer;
