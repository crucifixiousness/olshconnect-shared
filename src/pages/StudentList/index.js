import { FormControl, Select, MenuItem, Button, Pagination, Typography, Paper, Grid, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import { FaEye } from "react-icons/fa";
import { FaPencilAlt } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import Searchbar from '../../components/Searchbar';
import axios from 'axios';

const StudentList = () => {
  const [showBy, setshowBy] = useState('');
  const [showCourseBy, setCourseBy] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);

  // Check localStorage cache synchronously on mount (like Academic Records)
  const cachedData = localStorage.getItem('studentListData');
  const cacheTimestamp = localStorage.getItem('studentListTimestamp');
  const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
  const hasValidCache = cachedData && cacheAge && cacheAge < 300000; // 5 minutes

  // Initialize state with cached data if available, otherwise empty
  const [students, setStudents] = useState(hasValidCache ? (JSON.parse(cachedData) || []) : []);
  const [loading, setLoading] = useState(!hasValidCache); // Only show loading if no valid cache

  const fetchStudents = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first (like Academic Records and Student Profile), unless forcing refresh
      if (!forceRefresh) {
        const cachedData = localStorage.getItem('studentListData');
        const cacheTimestamp = localStorage.getItem('studentListTimestamp');
        const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;

        // Use cache if it's less than 5 minutes old
        if (cachedData && cacheAge && cacheAge < 300000) {
          const parsedData = JSON.parse(cachedData);
          setStudents(parsedData);
          setLoading(false);
          
          // Always do background refresh to check for updates (new enrollments, student changes, etc.)
          fetchStudents(true).catch(err => {
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

      const response = await axios.get('/api/get-enrolled-students');
      
      // Cache the fetched data
      localStorage.setItem('studentListData', JSON.stringify(response.data));
      localStorage.setItem('studentListTimestamp', Date.now().toString());
      
      setStudents(response.data);
      
      // Only update loading if not forcing refresh
      if (!forceRefresh) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const formatStudentName = (firstName, middleName, lastName, suffix) => {
    const middleInitial = middleName ? ` ${middleName.charAt(0)}.` : '';
    const suffixText = suffix ? ` ${suffix}` : '';
    return `${lastName}, ${firstName}${middleInitial}${suffixText}`;
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  // Filter students based on search term
  const filteredStudents = students.filter(student => {
    const formattedName = formatStudentName(
      student.first_name,
      student.middle_name,
      student.last_name,
      student.suffix
    );
    
    return formattedName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.program?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.year_level?.toString().includes(searchTerm);
  });

  // Apply sorting to filtered results
  const sortedStudents = filteredStudents.sort((a, b) => {
    if (!showBy) return 0;
    
    const nameA = formatStudentName(
      a.first_name,
      a.middle_name,
      a.last_name,
      a.suffix
    ).toLowerCase();
    
    const nameB = formatStudentName(
      b.first_name,
      b.middle_name,
      b.last_name,
      b.suffix
    ).toLowerCase();

    return showBy === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
  });

  // Pagination
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedStudents = sortedStudents.slice(startIndex, endIndex);
  const pageCount = Math.ceil(sortedStudents.length / rowsPerPage);

  return (
    <div className="right-content w-100" data-testid="student-list">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="hd mt-2 pb-0" data-testid="page-title">Student List</h3>      
      </div>

      <div className="card shadow border-0 p-3">
        <Searchbar
          value={searchTerm}
          onChange={setSearchTerm}
          data-testid="student-searchbar"
        />

        {/* Filters */}
        <Paper elevation={3} className="p-3 mb-4">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={3}>
              <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>SHOW BY</Typography>
              <FormControl fullWidth size="small">
                <Select
                  data-testid="show-by-select"
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
                  <MenuItem value="" data-testid="sort-default">
                    <em>Default</em>
                  </MenuItem>
                  <MenuItem value="asc" data-testid="sort-asc">
                    A - Z
                  </MenuItem>
                  <MenuItem value="desc" data-testid="sort-desc">
                    Z - A
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={3}>
              <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>PROGRAM</Typography>
              <FormControl fullWidth size="small">
                <Select
                  data-testid="program-select"
                  value={showCourseBy}
                  onChange={(e)=>setCourseBy(e.target.value)}
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
                  <MenuItem value="" data-testid="program-default">
                    <em>All Programs</em>
                  </MenuItem>
                  <MenuItem value="BSeD" data-testid="program-bsed">BSeD</MenuItem>
                  <MenuItem value="BSIT" data-testid="program-bsit">BSIT</MenuItem>
                  <MenuItem value="BSHM" data-testid="program-bshm">BSHM</MenuItem>
                  <MenuItem value="BSOAd" data-testid="program-bsoad">BSOAd</MenuItem>
                  <MenuItem value="BSCRIM" data-testid="program-bscrim">BSCRIM</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={3}>
              <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>&nbsp;</Typography>
              <Button 
                variant="contained"
                onClick={fetchStudents}
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
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Year Level</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Program</TableCell>
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
                                 paginatedStudents.map((student, index) => (
                   <TableRow key={student.id} data-testid={`student-row-${index}`}>
                     <TableCell data-testid={`student-name-${index}`}>
                       {formatStudentName(
                         student.first_name,
                         student.middle_name,
                         student.last_name,
                         student.suffix
                       )}
                     </TableCell>
                    <TableCell data-testid={`year-level-${index}`}>
                      {student.year_level}
                    </TableCell>
                    <TableCell data-testid={`program-${index}`}>
                      {student.program}
                    </TableCell>
                    <TableCell data-testid={`sex-${index}`}>
                      {student.sex}
                    </TableCell>
                    <TableCell>
                      <div className='actions d-flex align-items-center'>
                        <Button 
                          data-testid={`view-button-${index}`}
                          className="secondary" 
                          color="secondary"
                          sx={{ mr: 1 }}
                        >
                          <FaEye/>
                        </Button>
                        <Button 
                          data-testid={`edit-button-${index}`}
                          className="success" 
                          color="success"
                          sx={{ mr: 1 }}
                        >
                          <FaPencilAlt/>
                        </Button>
                        <Button 
                          data-testid={`delete-button-${index}`}
                          className="error" 
                          color="error"
                        >
                          <MdDelete/>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="5" style={{ textAlign: "center" }}>
                    {searchTerm ? 'No students found matching your search' : 'No enrolled students found'}
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
              data-testid="pagination"
              count={pageCount}
              page={page}
              onChange={handlePageChange} 
              color="primary" 
              className='pagination' 
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
    </div>
  );
};

export default StudentList;