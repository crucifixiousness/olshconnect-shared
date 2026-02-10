import { useState, useEffect, useCallback } from 'react';
import { 
  FormControl, 
  Select, 
  MenuItem, 
  Button, 
  Pagination, 
  Typography, 
  Modal, 
  Box, 
  Snackbar, 
  Alert, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  CircularProgress,
  TextField,
  Grid
} from '@mui/material';
import { FaEye, FaEdit, FaPlus } from "react-icons/fa";
import Searchbar from '../../components/Searchbar';
import axios from 'axios';

const ProgramStudentList = () => {
  const [showBy, setshowBy] = useState('');
  const [block, setBlock] = useState('');
  const [yearLevel, setYearLevel] = useState('');

  // Check localStorage cache synchronously on mount for instant display
  const cachedData = localStorage.getItem('programStudentListData');
  const cacheTimestamp = localStorage.getItem('programStudentListTimestamp');
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
    console.warn('⚠️ [PROGRAM STUDENT LIST] Invalid cache, will fetch fresh:', e);
  }

  const [students, setStudents] = useState(initialData);
  const [loading, setLoading] = useState(initialLoading);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [programId, setProgramId] = useState(null);
  const [programName, setProgramName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [newBlockName, setNewBlockName] = useState('');
  const [showAddBlock, setShowAddBlock] = useState(false);
  
  // Existing blocks state
  const [existingBlocks, setExistingBlocks] = useState([]);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Add program mapping
  const programMapping = {
    1: 'BSIT',
    2: 'BSHM',        // Fixed: BSHM is program_id 2
    3: 'Education',   // Fixed: Education is program_id 3
    4: 'BSOAd',       // Fixed: BSOAd is program_id 4
    5: 'BSCrim'       // Fixed: BSCrim is program_id 5
    // Add more programs as needed
  };

  useEffect(() => {
    const storedProgramId = localStorage.getItem("program_id");
    const userString = localStorage.getItem("user");
    
    console.log('ProgramStudentList - Stored program_id from localStorage:', storedProgramId);
    console.log('ProgramStudentList - User string from localStorage:', userString);
    
    let programId = null;
    
    // Try to get program_id from localStorage first
    if (storedProgramId) {
      programId = parseInt(storedProgramId, 10);
      console.log('ProgramStudentList - Using program_id from localStorage:', programId);
    }
    
    // If not found, try to get it from user object
    if (!programId && userString) {
      try {
        const user = JSON.parse(userString);
        console.log('ProgramStudentList - Parsed user object:', user);
        if (user.program_id) {
          programId = parseInt(user.program_id, 10);
          console.log('ProgramStudentList - Using program_id from user object:', programId);
        }
      } catch (error) {
        console.error('ProgramStudentList - Error parsing user object:', error);
      }
    }
    
    if (!isNaN(programId)) {
      setProgramId(programId);
      setProgramName(programMapping[programId] || "Unknown Program");
      console.log('ProgramStudentList - Set program_id in state:', programId);
      console.log('ProgramStudentList - Set program_name in state:', programMapping[programId] || "Unknown Program");
    } else {
      console.error('ProgramStudentList - No valid program_id found');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStudents = useCallback(async (forceRefresh = false) => {
    if (!programId) {
      console.log('ProgramStudentList - No programId available yet');
      return;
    }
    
    console.log('ProgramStudentList - Fetching students for programId:', programId);
    
    let wasLoadingSet = false;
    try {
      // Check if we have valid cache and don't need to show loading
      const cachedData = localStorage.getItem('programStudentListData');
      const cacheTimestamp = localStorage.getItem('programStudentListTimestamp');
      const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
      const hasValidCache = !forceRefresh && cachedData && cacheAge && cacheAge < 300000;

      // Use cache if it's less than 5 minutes old
      if (hasValidCache) {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStudents(parsed);
          setLoading(false);
          
          // Always do background refresh to check for updates
          fetchStudents(true).catch(err => {
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

      // Only include non-empty filter values and ensure year_level is a number
      const params = {
        program_id: programId,
        ...(yearLevel && yearLevel !== '' && { year_level: parseInt(yearLevel) }),
        ...(block && block !== '' && { block_name: block })
      };

      console.log('ProgramStudentList - API call parameters:', params);
      const response = await axios.get('/api/get-program-students', { params });
      console.log('ProgramStudentList - API response:', response.data);
      
      const data = response.data || [];
      setStudents(data);
      
      // Cache the fetched data
      try {
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem('programStudentListData', JSON.stringify(data));
          localStorage.setItem('programStudentListTimestamp', Date.now().toString());
        } else {
          localStorage.removeItem('programStudentListData');
          localStorage.removeItem('programStudentListTimestamp');
        }
      } catch (storageError) {
        console.warn('⚠️ [PROGRAM STUDENT LIST] Could not cache data:', storageError.message);
      }
    } catch (error) {
      console.error('ProgramStudentList - Error fetching students:', error);
      console.error('ProgramStudentList - Error response:', error.response?.data);
      setStudents([]);
    } finally {
      if (wasLoadingSet) {
        setLoading(false);
      }
    }
  }, [programId, yearLevel, block]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Fetch existing blocks when programId changes
  useEffect(() => {
    const fetchExistingBlocks = async () => {
      if (!programId) return;
      
      try {
        const response = await axios.get(`/api/get-program-blocks?program_id=${programId}`);
        
        // Filter out null/undefined values and ensure we have valid block names
        let blocks = [];
        if (Array.isArray(response.data)) {
          blocks = response.data.filter(block => block && block !== null && block !== undefined && block !== '');
        }
        
        // If no valid blocks from API, use default blocks
        if (blocks.length === 0) {
          blocks = ['A', 'B', 'C'];
        }
        
        setExistingBlocks(blocks);
      } catch (error) {
        console.error('Error fetching existing blocks:', error);
        // Set default blocks if API fails
        setExistingBlocks(['A', 'B', 'C']);
      }
    };

    fetchExistingBlocks();
  }, [programId]);

  // Filter students based on search term
  const filteredStudents = students.filter(student => {
    const yearMatch = yearLevel ? student.year_level === parseInt(yearLevel) : true;
    const blockMatch = block ? student.block === block : true;
    const searchMatch = searchTerm.toLowerCase() === '' ? true : 
      student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.block !== 'Not Assigned' && student.block?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      student.year_level?.toString().includes(searchTerm);
    return yearMatch && blockMatch && searchMatch;
  });

  // Sort students based on showBy filter
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (showBy === 'asc') {
      return a.student_name.localeCompare(b.student_name);
    } else if (showBy === 'desc') {
      return b.student_name.localeCompare(a.student_name);
    }
    return 0;
  });

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedStudents = sortedStudents.slice(startIndex, endIndex);
  const pageCount = Math.ceil(sortedStudents.length / rowsPerPage);

  // Helper function to get year suffix
  const getYearSuffix = (year) => {
    if (year === 1) return 'st';
    if (year === 2) return 'nd';
    if (year === 3) return 'rd';
    return 'th';
  };

  // Handle opening assign modal
  const handleAssignBlock = (student) => {
    setSelectedStudent(student);
    setSelectedBlock('');
    setNewBlockName('');
    setShowAddBlock(false);
    setShowAssignModal(true);
  };

  // Handle closing assign modal
  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedStudent(null);
    setSelectedBlock('');
    setNewBlockName('');
    setShowAddBlock(false);
  };

  // Handle assigning block to student
  const handleAssignBlockSubmit = async () => {
    if (!selectedStudent || (!selectedBlock && !newBlockName)) {
      setSnackbar({
        open: true,
        message: 'Please select a block or add a new one',
        severity: 'error'
      });
      return;
    }

    // Check if the new block name already exists
    if (newBlockName && existingBlocks.includes(newBlockName)) {
      setSnackbar({
        open: true,
        message: `Block ${newBlockName} already exists. Please select it from the dropdown instead.`,
        severity: 'error'
      });
      return;
    }

    try {
      const blockToAssign = selectedBlock || newBlockName;
      
      console.log('Sending request with data:', {
        student_id: selectedStudent.id,
        block: blockToAssign,
        program_id: programId
      });
      
      const response = await axios.put(`/api/assign-student-block`, {
        student_id: selectedStudent.id,
        block: blockToAssign,
        program_id: programId
      });

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: `Student assigned to Block ${blockToAssign} successfully!`,
          severity: 'success'
        });
        handleCloseAssignModal();
        
        // Invalidate cache and force refresh
        try {
          localStorage.removeItem('programStudentListData');
          localStorage.removeItem('programStudentListTimestamp');
        } catch (e) {
          // Ignore storage errors
        }
        fetchStudents(true);
        
        // Refresh the existing blocks list if a new block was added
        if (newBlockName && !existingBlocks.includes(newBlockName)) {
          setExistingBlocks([...existingBlocks, newBlockName].sort());
        }
        
        // Refresh the existing blocks from the database
        try {
          const blocksResponse = await axios.get(`/api/get-program-blocks?program_id=${programId}`);
          setExistingBlocks(blocksResponse.data);
        } catch (error) {
          console.error('Error refreshing blocks:', error);
        }
      }
    } catch (error) {
      console.error('Error assigning block:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to assign block to student',
        severity: 'error'
      });
    }
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="hd mt-2 pb-0">Student List - {programName}</h3>      
      </div>

      <div className="card shadow border-0 p-3">
        <Searchbar
          value={searchTerm}
          onChange={setSearchTerm}
        />

        {/* Filters */}
        <Paper elevation={3} className="p-3 mb-4">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={3}>
              <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>SHOW BY</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={showBy}
                  onChange={(e) => setshowBy(e.target.value)}
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
              <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>YEAR LEVEL</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={yearLevel}
                  onChange={(e) => setYearLevel(e.target.value)}
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
                  <MenuItem value=""><em>All Years</em></MenuItem>
                  <MenuItem value={1}>1st Year</MenuItem>
                  <MenuItem value={2}>2nd Year</MenuItem>
                  <MenuItem value={3}>3rd Year</MenuItem>
                  <MenuItem value={4}>4th Year</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={3}>
              <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>BLOCK</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
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
                  <MenuItem value=""><em>All Blocks</em></MenuItem>
                  <MenuItem value="A">Block A</MenuItem>
                  <MenuItem value="B">Block B</MenuItem>
                  <MenuItem value="C">Block C</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={3}>
              <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>&nbsp;</Typography>
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
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Year Level</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Block</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Sex</TableCell>
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
              ) : paginatedStudents.length > 0 ? (
                paginatedStudents.map((student) => (
                  <TableRow
                    key={student.id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    hover
                  >
                    <TableCell>{student.student_name}</TableCell>
                    <TableCell>
                      {student.year_level === 0 ? 
                        <span style={{ color: '#6c757d' }}>N/A</span> : 
                        `${student.year_level}${getYearSuffix(student.year_level)} Year`
                      }
                    </TableCell>
                    <TableCell>
                      {student.block === 'Not Assigned' ? 
                        <span style={{ color: '#6c757d' }}>Not Assigned</span> : 
                        `Block ${student.block}`
                      }
                    </TableCell>
                    <TableCell>
                      {student.sex === 'N/A' ? 
                        <span style={{ color: '#6c757d' }}>N/A</span> : 
                        student.sex
                      }
                    </TableCell>
                    <TableCell>
                      <div className='actions d-flex align-items-center gap-1'>
                        <Button 
                          variant="contained"
                          color="secondary"
                          size="small"
                          title="View Student Details"
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
                        {student.block === 'Not Assigned' && (
                          <Button 
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handleAssignBlock(student)}
                            title="Assign Block"
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
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="5" style={{ textAlign: "center" }}>
                    No students found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {sortedStudents.length > 0 && (
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

      {/* Assign Block Modal */}
      <Modal
        open={showAssignModal}
        onClose={handleCloseAssignModal}
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: "90%",
          maxWidth: "500px",
          backgroundColor: "white",
          borderRadius: "10px",
          padding: "30px",
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }}>
          <Typography variant="h5" sx={{ mb: 3, color: '#c70202', fontWeight: 'bold' }}>
            Assign Block to Student
          </Typography>

          {selectedStudent && (
            <div>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                <strong>Student:</strong> {selectedStudent.student_name}
              </Typography>
              <Typography variant="subtitle1" sx={{ mb: 3 }}>
                <strong>Year Level:</strong> {selectedStudent.year_level}{getYearSuffix(selectedStudent.year_level)} Year
              </Typography>

              <div className="mb-3">
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Select Block:
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <Select
                    value={selectedBlock}
                    onChange={(e) => setSelectedBlock(e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>Choose a block</em>
                    </MenuItem>
                    
                    {/* Show blocks from existingBlocks state */}
                    {existingBlocks.length > 0 ? (
                      existingBlocks.map((block) => (
                        <MenuItem key={block} value={block}>
                          Block {block}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value="" disabled>
                        <em>No blocks available</em>
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>

                <div className="d-flex align-items-center mb-3">
                  <Typography variant="subtitle2" sx={{ mr: 2 }}>
                    Or add a new block:
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<FaPlus />}
                    onClick={() => setShowAddBlock(!showAddBlock)}
                    sx={{ borderColor: '#c70202', color: '#c70202' }}
                  >
                    {showAddBlock ? 'Cancel' : 'Add New Block'}
                  </Button>
                </div>

                {showAddBlock && (
                  <>
                    <TextField
                      fullWidth
                      label="New Block Name"
                      value={newBlockName}
                      onChange={(e) => setNewBlockName(e.target.value)}
                      placeholder="e.g., D, E, F"
                      sx={{ mb: 2 }}
                      error={existingBlocks.includes(newBlockName)}
                      helperText={existingBlocks.includes(newBlockName) ? `Block ${newBlockName} already exists` : ''}
                    />
                    {existingBlocks.length > 0 && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>
                        Existing blocks: {existingBlocks.map(block => `Block ${block}`).join(', ')}
                      </Typography>
                    )}
                  </>
                )}
              </div>

              <div className="d-flex gap-2">
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleAssignBlockSubmit}
                  sx={{
                    bgcolor: '#c70202',
                    '&:hover': { bgcolor: '#a00000' }
                  }}
                >
                  Assign Block
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={handleCloseAssignModal}
                  sx={{
                    borderColor: '#c70202',
                    color: '#c70202',
                    '&:hover': {
                      borderColor: '#a00000',
                      color: '#a00000'
                    }
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Box>
      </Modal>

      {/* Snackbar */}
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

export default ProgramStudentList;