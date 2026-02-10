// Update imports
import { FormControl, Select, MenuItem, Button, Pagination, Typography, Modal, Box, Snackbar, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Grid } from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import { FaEye } from "react-icons/fa";
import { FaCheck } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import Searchbar from '../../components/Searchbar';
import axios from 'axios';

const PaymentVerification = () => {
  const [showBy, setshowBy] = useState('');
  const [showProgramBy, setProgramBy] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const token = localStorage.getItem('token');

  // Check localStorage cache synchronously on mount (like Academic Records)
  const cachedData = localStorage.getItem('paymentVerificationData');
  const cacheTimestamp = localStorage.getItem('paymentVerificationTimestamp');
  const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
  const hasValidCache = cachedData && cacheAge && cacheAge < 300000; // 5 minutes

  // Initialize state with cached data if available, otherwise empty
  const [payments, setPayments] = useState(hasValidCache ? (JSON.parse(cachedData) || []) : []);
  const [loading, setLoading] = useState(!hasValidCache); // Only show loading if no valid cache

  // Add snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleViewDetails = (payment) => {
  setSelectedPayment(payment);
  setOpen(true);
  };

  // Update fetchPayments to fetch enrollment payments with caching
  const fetchPayments = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first (like Academic Records and Student Profile), unless forcing refresh
      if (!forceRefresh) {
        const cachedData = localStorage.getItem('paymentVerificationData');
        const cacheTimestamp = localStorage.getItem('paymentVerificationTimestamp');
        const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
        
        // Use cache if it's less than 5 minutes old
        if (cachedData && cacheAge && cacheAge < 300000) {
          const parsedData = JSON.parse(cachedData);
          setPayments(parsedData);
          setLoading(false);
          
          // Always do background refresh to check for updates (new payments, status changes, etc.)
          fetchPayments(true).catch(err => {
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

      const response = await axios.get('/api/enrollment-for-verification', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Cache the data
      localStorage.setItem('paymentVerificationData', JSON.stringify(response.data || []));
      localStorage.setItem('paymentVerificationTimestamp', Date.now().toString());
      
      setPayments(response.data || []);
      
      // Only update loading if not forcing refresh
      if (!forceRefresh) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to fetch enrollment payments',
        severity: 'error'
      });
      setLoading(false);
    }
  }, [token]);

  // Update verification handler
  const handleVerify = async (paymentId) => {
    try {
      await axios.put('/api/verify-enrollment-receipt', 
        { enrollmentId: paymentId },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setSnackbar({
        open: true,
        message: 'Student officially enrolled successfully',
        severity: 'success'
      });
      
      // Invalidate cache and force refresh to show updated status
      localStorage.removeItem('paymentVerificationData');
      localStorage.removeItem('paymentVerificationTimestamp');
      
      // Force refresh to get updated data
      fetchPayments(true);
    } catch (error) {
      console.error('Error verifying enrollment:', error);
      setSnackbar({
        open: true,
        message: 'Failed to verify enrollment',
        severity: 'error'
      });
    }
  };

  // Update rejection handler
  const handleReject = async (paymentId) => {
    try {
      await axios.put('/api/reject-enrollment', 
        { enrollmentId: paymentId },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setSnackbar({
        open: true,
        message: 'Enrollment payment rejected',
        severity: 'warning'
      });
      
      // Invalidate cache and force refresh to show updated status
      localStorage.removeItem('paymentVerificationData');
      localStorage.removeItem('paymentVerificationTimestamp');
      
      // Force refresh to get updated data
      fetchPayments(true);
    } catch (error) {
      console.error('Error rejecting enrollment:', error);
      setSnackbar({
        open: true,
        message: 'Failed to reject enrollment',
        severity: 'error'
      });
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedPayments = payments.slice(startIndex, endIndex);
  const pageCount = Math.ceil(payments.length / rowsPerPage);

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="hd mt-2 pb-0">Enrollment Payment Verification</h3>      
      </div>

      <div className="card shadow border-0 p-3">
        <Searchbar/>
        
        {/* Filters */}
        <Paper elevation={3} className="p-3 mb-4">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={3}>
              <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>SHOW BY</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={showBy}
                  onChange={(e)=>setshowBy(e.target.value)}
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
                  <MenuItem value=""><em>Default</em></MenuItem>
                  <MenuItem value="asc">A - Z</MenuItem>
                  <MenuItem value="desc">Z - A</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={3}>
              <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>PROGRAM</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={showProgramBy}
                  onChange={(e)=>setProgramBy(e.target.value)}
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
                  <MenuItem value=""><em>Program</em></MenuItem>
                  <MenuItem value="BSED">BSeD</MenuItem>
                  <MenuItem value="BSIT">BSIT</MenuItem>
                  <MenuItem value="BSHM">BSHM</MenuItem>
                  <MenuItem value="BSOAD">BSOAd</MenuItem>
                  <MenuItem value="BSCRIM">BSCRIM</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <div></div>
            </Grid>
          </Grid>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Student Name</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Program</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Year Level</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Enrollment Status</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan="5" style={{ textAlign: "center", padding: "40px 0" }}>
                    <CircularProgress style={{ color: '#c70202' }} />
                  </TableCell>
                </TableRow>
              ) : paginatedPayments.length > 0 ? (
                paginatedPayments.map((payment) => (
                  <TableRow
                    key={payment._id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    hover
                  >
                    <TableCell>{payment.studentName}</TableCell>
                    <TableCell>{payment.program}</TableCell>
                    <TableCell>{payment.yearLevel}</TableCell>
                    <TableCell>{payment.enrollmentStatus}</TableCell>
                    <TableCell>
                      <div className='actions d-flex align-items-center gap-1'>
                        <Button 
                          variant="contained"
                          color="secondary"
                          size="small"
                          onClick={() => handleViewDetails(payment)}
                          title="View Enrollment Receipt"
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
                        {payment.proofOfPayment && (
                          <>
                            <Button 
                              variant="contained"
                              color="success"
                              size="small"
                              onClick={() => handleVerify(payment._id)}
                              title="Mark as Officially Enrolled"
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
                              <FaCheck/>
                            </Button>
                            <Button 
                              variant="contained"
                              color="error"
                              size="small"
                              onClick={() => handleReject(payment._id)}
                              title="Reject Enrollment"
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
                              <IoClose/>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="5" style={{ textAlign: "center" }}>
                    No payment records available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {payments.length > 0 && (
          <div className="d-flex justify-content-center mt-4">
            <Pagination 
              count={pageCount} 
              color="primary" 
              className='pagination' 
              showFirstButton 
              showLastButton 
              page={page}
              onChange={handlePageChange}
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

      <Modal open={open} onClose={() => setOpen(false)}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          bgcolor: 'background.paper',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          borderRadius: 4,
          p: 4,
          maxHeight: '90vh',
          overflow: 'auto',
          border: '3px solid #c70202'
        }}>
          {selectedPayment && (
            <div className="enrollment-details">
              <div className="enrollment-docs-section">
                <Typography variant="h6" sx={{ 
                  mb: 2,
                  color: '#c70202',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  Enrollment Payment Receipt
                </Typography>
                
                <div className="document-preview">
                  {selectedPayment.proofOfPayment ? (
                    <img 
                      src={`data:image/jpeg;base64,${selectedPayment.proofOfPayment}`} 
                      alt="Payment Receipt" 
                      style={{ 
                        width: '100%', 
                        borderRadius: '8px',
                        maxHeight: '70vh',
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <div className="no-doc-message">No payment receipt uploaded</div>
                  )}
                </div>
              </div>

              <Button 
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
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          )}
        </Box>
      </Modal>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          variant='filled'
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default PaymentVerification;