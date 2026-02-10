import { useState, useEffect, useCallback } from "react";
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Pagination,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from "@mui/material";
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import Searchbar from '../Searchbar';

const StudentBalance = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [searchParams] = useSearchParams();
  const yearLevel = searchParams.get('year');

  // Check localStorage cache synchronously on mount (like Academic Records)
  const cachedData = localStorage.getItem('studentBalancesData');
  const cacheTimestamp = localStorage.getItem('studentBalancesTimestamp');
  const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
  const hasValidCache = cachedData && cacheAge && cacheAge < 300000; // 5 minutes

  // Initialize state with cached data if available, otherwise empty
  const [students, setStudents] = useState(hasValidCache ? (JSON.parse(cachedData) || []) : []);
  const [loading, setLoading] = useState(!hasValidCache); // Only show loading if no valid cache

  // Add CSS to override Searchbar margin
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .searchbar-container .searchBar {
        margin-bottom: 0 !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const fetchStudents = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first (like Academic Records and Student Profile), unless forcing refresh
      if (!forceRefresh) {
        const cachedData = localStorage.getItem('studentBalancesData');
        const cacheTimestamp = localStorage.getItem('studentBalancesTimestamp');
        const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;

        // Use cache if it's less than 5 minutes old
        if (cachedData && cacheAge && cacheAge < 300000) {
          const parsedData = JSON.parse(cachedData);
          setStudents(parsedData);
          setLoading(false);
          
          // Always do background refresh to check for updates (balance changes, new payments, etc.)
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

      const response = await axios.get('/api/student-balances');
      
      // Cache the new data (like Academic Records and Student Profile)
      localStorage.setItem('studentBalancesData', JSON.stringify(response.data));
      localStorage.setItem('studentBalancesTimestamp', Date.now().toString());

      setStudents(response.data);
      
      // Only update loading if not forcing refresh
      if (!forceRefresh) {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const filteredStudents = students.filter(student => {
    const semesterMatch = selectedSemester ? student.semester === selectedSemester : true;
    const searchMatch = searchTerm.toLowerCase() === '' ? true : 
      student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.program_name.toLowerCase().includes(searchTerm.toLowerCase());
    return semesterMatch && searchMatch;
  });

  const handleSemesterChange = (event) => {
    setSelectedSemester(event.target.value);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);
  const pageCount = Math.ceil(filteredStudents.length / rowsPerPage);

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="hd mt-2 pb-0">
          Students Balance {yearLevel ? `- Year ${yearLevel}` : ''}
        </h3>
      </div>

      <div className="card shadow border-0 p-3 mt-1">
        <div className="card shadow border-0 p-3 mt-1">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2" style={{ width: '100%' }}>
              <div style={{ width: '850px' }}>
                <div className="searchbar-container" style={{ marginBottom: '0' }}>
                  <Searchbar value={searchTerm} onChange={setSearchTerm} />
                </div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <FormControl sx={{ minWidth: 180, height: '40px' }}>
                  <InputLabel id="semester-filter-label" sx={{ fontSize: '0.875rem' }}>Filter by Semester</InputLabel>
                  <Select
                    labelId="semester-filter-label"
                    value={selectedSemester}
                    onChange={handleSemesterChange}
                    label="Filter by Semester"
                    size="small"
                    sx={{
                      height: '40px',
                      fontSize: '0.875rem',
                      '& .MuiOutlinedInput-root': {
                        height: '40px',
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#c70202',
                      },
                      '&:hover fieldset': {
                        borderColor: '#c70202',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#c70202',
                      },
                      '& .MuiSelect-select': {
                        fontSize: '0.875rem',
                        paddingTop: '8px',
                        paddingBottom: '8px',
                      },
                    }}
                  >
                    <MenuItem value="" sx={{ fontSize: '0.875rem' }}>All Semesters</MenuItem>
                    <MenuItem value="1st" sx={{ fontSize: '0.875rem' }}>1st Semester</MenuItem>
                    <MenuItem value="2nd" sx={{ fontSize: '0.875rem' }}>2nd Semester</MenuItem>
                    <MenuItem value="Summer" sx={{ fontSize: '0.875rem' }}>Summer</MenuItem>
                  </Select>
                </FormControl>
              </div>
            </div>
          </div>
        </div>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Student ID</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Name</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Year Level</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Program</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Total Balance</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Last Payment Date</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan="7" style={{ textAlign: "center", padding: "40px 0" }}>
                    <CircularProgress style={{ color: '#c70202' }} />
                  </TableCell>
                </TableRow>
              ) : paginatedStudents.length > 0 ? (
                paginatedStudents.map((student) => (
                  <TableRow key={student.student_id}>
                    <TableCell>{student.student_id}</TableCell>
                    <TableCell>{student.student_name}</TableCell>
                    <TableCell>{student.year_level}</TableCell>
                    <TableCell>{student.program_name}</TableCell>
                    <TableCell style={{ fontWeight: 'bold' }}>
                      ₱{parseFloat(student.balance).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {student.last_payment_date ? new Date(student.last_payment_date).toLocaleDateString() : 'No payments yet'}
                    </TableCell>
                    <TableCell>
                      <span className={`badge ${student.balance > 0 ? 'bg-danger' : 'bg-success'}`}>
                        {student.balance > 0 ? 'With Balance' : 'Cleared'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="7" style={{ textAlign: "center" }}>
                    No students with balance found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {filteredStudents.length > 0 && (
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
    </div>
  );
};

export default StudentBalance;