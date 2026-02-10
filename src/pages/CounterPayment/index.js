import { useState } from 'react';
import { 
  TextField, 
  Button, 
  Grid, 
  Paper, 
  Typography, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Modal,
  Box
} from '@mui/material';
import { FaSearch, FaPrint, FaHistory } from 'react-icons/fa';
import axios from 'axios';
import { Snackbar, Alert } from '@mui/material';
import officialolshcologo from '../../asset/images/officialolshcologo.png';

const CounterPayment = () => {
  // Add this state with other states
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [studentInfo, setStudentInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [showHistory, setShowHistory] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const token = localStorage.getItem('token');

  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 800,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
  };

  // Update handleSearch function
  const handleSearch = async () => {
    try {
      if (!searchQuery) {
        setSnackbar({
          open: true,
          message: 'Please enter a search term',
          severity: 'warning'
        });
        return;
      }

      const response = await axios.get(`/api/search-student?q=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.data.enrollmentId) {
        setSnackbar({
          open: true,
          message: 'No active enrollment found for this student',
          severity: 'error'
        });
        return;
      }

      setStudentInfo({
        ...response.data,
        enrollment_id: response.data.enrollmentId
      });
    } catch (error) {
      console.error('Search Error:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Error searching student',
        severity: 'error'
      });
    }
  };

  const handlePayment = async () => {
    try {
      if (!studentInfo) {
        setSnackbar({
          open: true,
          message: 'Please search for a student first',
          severity: 'warning'
        });
        return;
      }

      if (!paymentAmount || paymentAmount <= 0) {
        setSnackbar({
          open: true,
          message: 'Please enter a valid payment amount',
          severity: 'warning'
        });
        return;
      }

      if (!paymentMethod) {
        setSnackbar({
          open: true,
          message: 'Please select a payment method',
          severity: 'warning'
        });
        return;
      }

      // Check if student is fully paid
      if (studentInfo.balance <= 0) {
        setSnackbar({
          open: true,
          message: 'Student is already fully paid',
          severity: 'warning'
        });
        return;
      }

      const response = await axios.post('/api/counter-payment', {
        enrollment_id: studentInfo.enrollment_id,
        amount_paid: paymentAmount,
        payment_method: paymentMethod,
        reference_number: null
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Payment processed successfully',
          severity: 'success'
        });
        setPaymentAmount('');
        setPaymentMethod('Cash');
        handleSearch();
      }
    } catch (error) {
      console.error('Payment Error Details:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Error processing payment',
        severity: 'error'
      });
    }
  };

  const isPaymentDisabled = () => {
    return !studentInfo || !paymentAmount || !paymentMethod || studentInfo.balance <= 0;
  };

  const handleViewHistory = async () => {
    try {
      if (!studentInfo) {
        setSnackbar({
          open: true,
          message: 'Please search for a student first',
          severity: 'warning'
        });
        return;
      }

      const response = await axios.get(`/api/payment-history?studentId=${studentInfo.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPaymentHistory(response.data);
      setShowHistory(true);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching payment history',
        severity: 'error'
      });
    }
  };

  const handlePrintReceipt = () => {
    if (!studentInfo) {
      setSnackbar({
        open: true,
        message: 'Please search for a student first',
        severity: 'warning'
      });
      return;
    }

    const receiptContent = `
      <div style="font-family: Arial; padding: 20px; max-width: 500px; margin: 0 auto; border: 2px solid #ccc; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${officialolshcologo}" alt="OLSHCO Logo" style="width: 100px; height: 100px; margin-bottom: 10px; object-fit: contain;"/>
          <h2 style="color: #c70202; margin: 5px 0;">Our Lady of the Sacred Heart College of Guimba Inc.</h2>
          <p style="color: #666; margin: 5px 0;">Guimba, Nueva Ecija</p>
          <h3 style="color: #c70202; margin: 15px 0;">Student Payment Receipt</h3>
        </div>
        <div style="border-top: 2px solid #c70202; border-bottom: 2px solid #c70202; padding: 15px 0; margin: 15px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0;"><strong>Student Name:</strong></td>
              <td>${studentInfo.fullName}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Student ID:</strong></td>
              <td>${studentInfo.studentId}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Program:</strong></td>
              <td>${studentInfo.program}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Enrollment Status:</strong></td>
              <td>${studentInfo.enrollmentStatus}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Total Fee:</strong></td>
              <td>₱${studentInfo.totalFee?.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Amount Paid:</strong></td>
              <td>₱${studentInfo.amountPaid?.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Remaining Balance:</strong></td>
              <td>₱${studentInfo.balance?.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Date:</strong></td>
              <td>${new Date().toLocaleDateString()}</td>
            </tr>
          </table>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 5px 0;">This is a payment summary. Please keep this for your records.</p>
          <p style="color: #666; font-size: 12px; margin: 5px 0;">Thank you for your payment!</p>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Student Payment Receipt</title>
        </head>
        <body style="margin: 0; padding: 20px;">
          ${receiptContent}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintIndividualReceipt = (payment) => {
    const receiptContent = `
      <div style="font-family: Arial; padding: 20px; max-width: 500px; margin: 0 auto; border: 2px solid #ccc; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${officialolshcologo}" alt="OLSHCO Logo" style="width: 100px; height: 100px; margin-bottom: 10px; object-fit: contain;"/>
          <h2 style="color: #c70202; margin: 5px 0;">Our Lady of the Sacred Heart College of Guimba Inc.</h2>
          <p style="color: #666; margin: 5px 0;">Guimba, Nueva Ecija</p>
          <h3 style="color: #c70202; margin: 15px 0;">Payment Receipt</h3>
        </div>
        <div style="border-top: 2px solid #c70202; border-bottom: 2px solid #c70202; padding: 15px 0; margin: 15px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0;"><strong>Receipt No:</strong></td>
              <td>${payment.reference_number}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Student Name:</strong></td>
              <td>${studentInfo.fullName}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Student ID:</strong></td>
              <td>${studentInfo.studentId}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Program:</strong></td>
              <td>${studentInfo.program}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Payment Date:</strong></td>
              <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Amount Paid:</strong></td>
              <td>₱${parseFloat(payment.amount_paid).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Payment Method:</strong></td>
              <td>${payment.payment_method}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Payment Status:</strong></td>
              <td>${payment.payment_status}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Remarks:</strong></td>
              <td>${payment.remarks}</td>
            </tr>
          </table>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 5px 0;">This is your official payment receipt. Please keep this for your records.</p>
          <p style="color: #666; font-size: 12px; margin: 5px 0;">Thank you for your payment!</p>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt</title>
        </head>
        <body style="margin: 0; padding: 20px;">
          ${receiptContent}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="hd mt-2 pb-0">Counter Payment</h3>
      </div>

      <div className="card shadow border-0 p-3">
        {/* Search Student Section */}
        <Paper elevation={3} className="p-3 mb-4" sx={{ border: '1px solid #e0e0e0' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={8}>
              <TextField
                fullWidth
                label="Search Student (ID or Name)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
            <Grid item xs={4}>
              <Button 
                variant="contained" 
                startIcon={<FaSearch />}
                onClick={handleSearch}
                fullWidth
                sx={{
                  bgcolor: '#c70202',
                  '&:hover': {
                    bgcolor: '#a00000',
                  },
                }}
              >
                Search
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Student Information */}
        {studentInfo && (
          <>
            <Paper elevation={3} className="p-3 mb-4" sx={{ border: '1px solid #e0e0e0' }}>
              <Typography variant="h6" className="mb-3" style={{ color: '#c70202' }}>Student Information</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography><strong>Name:</strong> {studentInfo.fullName}</Typography>
                  <Typography><strong>Student ID:</strong> {studentInfo.studentId}</Typography>
                  <Typography><strong>Program:</strong> {studentInfo.program}</Typography>
                  <span className={`badge ${studentInfo.enrollmentStatus === 'Officially Enrolled' ? 'bg-success' : studentInfo.enrollmentStatus === 'Verified' ? 'bg-info' : 'bg-warning'} mt-1`}>
                    {studentInfo.enrollmentStatus}
                  </span>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Total Fee:</strong> ₱{studentInfo.totalFee?.toLocaleString()}</Typography>
                  <Typography><strong>Amount Paid:</strong> ₱{studentInfo.amountPaid?.toLocaleString()}</Typography>
                  <Typography><strong>Balance:</strong> ₱{studentInfo.balance?.toLocaleString()}</Typography>
                  {studentInfo.balance <= 0 && (
                    <span className="badge bg-success mt-1">
                      Fully Paid
                    </span>
                  )}
                </Grid>
              </Grid>
            </Paper>

            {/* Document Requests Pending for Payment */}
            {studentInfo.documentRequests && studentInfo.documentRequests.length > 0 && (
              <Paper elevation={3} className="p-3 mb-4" sx={{ border: '1px solid #e0e0e0', backgroundColor: '#fff3cd' }}>
                <Typography variant="h6" className="mb-3" style={{ color: '#c70202' }}>
                  Document Requests Pending for Payment
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell style={{ fontWeight: 'bold' }}>Document Type</TableCell>
                        <TableCell style={{ fontWeight: 'bold' }}>Description</TableCell>
                        <TableCell style={{ fontWeight: 'bold' }} align="right">Price</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {studentInfo.documentRequests.map((doc, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {doc.academic_credentials && doc.certification 
                              ? `${doc.academic_credentials}, ${doc.certification}`
                              : doc.academic_credentials || doc.certification || doc.doc_type}
                          </TableCell>
                          <TableCell>
                            {doc.description || 'N/A'}
                          </TableCell>
                          <TableCell align="right" style={{ fontWeight: 'bold', color: '#c70202' }}>
                            ₱{doc.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={2} style={{ fontWeight: 'bold' }}>Total Document Price:</TableCell>
                        <TableCell align="right" style={{ fontWeight: 'bold', color: '#c70202', fontSize: '1.1rem' }}>
                          ₱{studentInfo.totalDocumentPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="body2" sx={{ mt: 2, color: '#856404', fontStyle: 'italic' }}>
                  * Document requests will be processed after payment is received
                </Typography>
              </Paper>
            )}
          </>
        )}

        {/* Payment Form */}
        {studentInfo && (
          <Paper elevation={3} className="p-3 mb-4" sx={{ border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" className="mb-3" style={{ color: '#c70202' }}>Payment Details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  disabled={studentInfo.balance <= 0}
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
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={studentInfo.balance <= 0}
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
                    <MenuItem value="Cash">Cash</MenuItem>
                    <MenuItem value="Check">Check</MenuItem>
                    <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} className="mt-3">
                <Button 
                  variant="contained" 
                  onClick={handlePayment}
                  disabled={isPaymentDisabled()}
                  className="me-2"
                  sx={{
                    bgcolor: '#c70202',
                    '&:hover': {
                      bgcolor: '#a00000',
                    },
                    '&:disabled': {
                      bgcolor: '#cccccc',
                    },
                  }}
                >
                  Process Payment
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<FaPrint />}
                  onClick={handlePrintReceipt}
                  sx={{
                    borderColor: '#c70202',
                    color: '#c70202',
                    '&:hover': {
                      borderColor: '#a00000',
                      bgcolor: 'rgba(199, 2, 2, 0.04)',
                    },
                  }}
                >
                  Print Receipt
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<FaHistory />}
                  onClick={handleViewHistory}
                  className="ms-2"
                  sx={{
                    borderColor: '#c70202',
                    color: '#c70202',
                    '&:hover': {
                      borderColor: '#a00000',
                      bgcolor: 'rgba(199, 2, 2, 0.04)',
                    },
                  }}
                >
                  View History
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Payment History Modal */}
        <Modal
          open={showHistory}
          onClose={() => setShowHistory(false)}
        >
          <Box sx={modalStyle}>
            <Typography variant="h6" className="mb-3" style={{ color: '#c70202' }}>Payment History</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paymentHistory.map((payment, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell>₱{parseFloat(payment.amount_paid).toLocaleString()}</TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell>
                        <span className={`badge ${payment.payment_status === 'Fully Paid' ? 'bg-success' : 'bg-warning'}`}>
                          {payment.payment_status}
                        </span>
                      </TableCell>
                      <TableCell>{payment.reference_number}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outlined" 
                          size="small"
                          startIcon={<FaPrint />}
                          onClick={() => handlePrintIndividualReceipt(payment)}
                          sx={{
                            borderColor: '#c70202',
                            color: '#c70202',
                            '&:hover': {
                              borderColor: '#a00000',
                              bgcolor: 'rgba(199, 2, 2, 0.04)',
                            },
                          }}
                        >
                          Print
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {paymentHistory.length === 0 && (
              <Typography variant="body2" color="textSecondary" style={{ textAlign: 'center', padding: '20px' }}>
                No payment history found for this student
              </Typography>
            )}
          </Box>
        </Modal>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </div>
    </div>
  );
};

export default CounterPayment;