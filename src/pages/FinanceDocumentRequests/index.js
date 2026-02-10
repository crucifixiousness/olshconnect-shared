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
  TextField,
  Grid,
  Chip,
  Pagination
} from '@mui/material';
import { MyContext } from '../../App';
import { FaFileAlt } from 'react-icons/fa';

const FinanceDocumentRequests = () => {
  const context = useContext(MyContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);

  useEffect(() => {
    context.setIsHideComponents(false);
    window.scrollTo(0, 0);
    fetchDocumentRequests();
  }, [context]);

  const fetchDocumentRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No token found');
        setLoading(false);
        return;
      }

      const response = await axios.get('/api/finance-document-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching document requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatStudentName = (firstName, middleName, lastName, suffix) => {
    const middleInitial = middleName ? ` ${middleName.charAt(0)}.` : '';
    const suffixText = suffix ? ` ${suffix}` : '';
    return `${lastName}, ${firstName}${middleInitial}${suffixText}`;
  };

  const getDocumentType = (request) => {
    if (request.academic_credentials && request.certification) {
      return `${request.academic_credentials}, ${request.certification}`;
    } else if (request.academic_credentials) {
      return request.academic_credentials;
    } else if (request.certification) {
      return request.certification;
    }
    return request.doc_type || 'N/A';
  };

  // Filter requests based on search term
  const filteredRequests = requests.filter(request => {
    const studentName = formatStudentName(
      request.first_name,
      request.middle_name,
      request.last_name,
      request.suffix
    ).toLowerCase();
    const docType = getDocumentType(request).toLowerCase();
    const search = searchTerm.toLowerCase();
    
    return studentName.includes(search) || 
           docType.includes(search) ||
           request.program_name?.toLowerCase().includes(search);
  });

  // Pagination calculations
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);
  const pageCount = Math.ceil(filteredRequests.length / rowsPerPage);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  if (loading) {
    return (
      <div className="right-content w-100">
        <div className="card shadow border-0 p-3 mt-1">
          <h3 className="mb-4">Document Requests</h3>
          <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
            <CircularProgress style={{ color: '#c70202' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="mb-4">Document Requests - Pending for Payment</h3>
      </div>

      <div className="card shadow border-0 p-3">
        {/* Search and Filters */}
        <Paper elevation={3} className="p-3 mb-4">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by student name, document type, or program..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1); // Reset to first page on search
                }}
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
          </Grid>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Student Name</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Year Level</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Program</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Document Requested</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Price</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Request Date</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRequests.length > 0 ? (
                paginatedRequests.map((request) => (
                  <TableRow key={request.req_id}>
                    <TableCell>
                      {formatStudentName(
                        request.first_name,
                        request.middle_name,
                        request.last_name,
                        request.suffix
                      )}
                    </TableCell>
                    <TableCell>
                      {request.year_level || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {request.program_name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                          {getDocumentType(request)}
                        </Typography>
                        {request.description && (
                          <Typography variant="caption" sx={{ color: '#666', fontStyle: 'italic' }}>
                            {request.description.length > 50 
                              ? `${request.description.substring(0, 50)}...`
                              : request.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#c70202' }}>
                        ₱{parseFloat(request.document_price || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(request.req_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={request.req_status}
                        color="warning"
                        size="small"
                        sx={{
                          fontWeight: 'bold',
                          backgroundColor: '#ed6c02',
                          color: 'white'
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="7" style={{ textAlign: "center", padding: '40px' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <FaFileAlt size={48} style={{ color: '#ccc' }} />
                      <Typography variant="body2" color="textSecondary">
                        {searchTerm ? 'No document requests found matching your search' : 'No document requests pending for payment'}
                      </Typography>
                    </Box>
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

        {/* Summary */}
        {requests.length > 0 && (
          <Box mt={3} p={2} sx={{ backgroundColor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="h6" sx={{ color: '#c70202', mb: 1 }}>
              Summary
            </Typography>
            <Typography variant="body2">
              Total Pending Requests: <strong>{requests.length}</strong>
            </Typography>
            <Typography variant="body2">
              Total Amount Pending: <strong style={{ color: '#c70202' }}>
                ₱{requests.reduce((sum, req) => sum + parseFloat(req.document_price || 0), 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </strong>
            </Typography>
          </Box>
        )}
      </div>
    </div>
  );
};

export default FinanceDocumentRequests;

