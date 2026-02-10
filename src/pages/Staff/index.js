import { Modal, Button, TextField, Select, MenuItem, FormControl, InputLabel, Typography, Paper, Grid, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Snackbar, Alert } from '@mui/material';
import Pagination from '@mui/material/Pagination';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FaEye } from "react-icons/fa";
import { FaPencilAlt } from "react-icons/fa";
import { MdDelete } from "react-icons/md";

const Staff = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  const handleOpen = () => {
    setShowAddStaffModal(true);
    setPasswordStrength({ score: 0, feedback: '' });
  };
  const handleClose = () => {
    setShowAddStaffModal(false);
    setPasswordStrength({ score: 0, feedback: '' });
  };
  const [newStaff, setNewStaff] = useState({
    full_name: "",
    staff_username: "",
    staff_password: "",
    role: "",
    program_id: "", // Add this to track selected program
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '' });

  // Fetch staff data on component mount
  const fetchStaffData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/stafflist");
      setStaffList(response.data);
    } catch (error) {
      console.error("Error fetching staff data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  // Validate password strength
  const validatePasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength({ score: 0, feedback: '' });
      return;
    }

    let score = 0;
    const feedback = [];

    // Common weak passwords to block
    const weakPasswords = [
      'password', '123456', '12345678', '123456789', '1234567890',
      'qwerty', 'abc123', 'password123', 'admin', 'letmein',
      'welcome', 'monkey', '1234567', 'sunshine', 'princess',
      'azerty', 'trustno1', 'dragon', 'baseball', 'iloveyou',
      'master', 'hello', 'freedom', 'whatever', 'qazwsx',
      'login', 'starwars', 'shadow', 'superman', 'qwerty123',
      'eli123', 'test', 'guest', 'demo', 'user'
    ];

    // Check against weak passwords (case-insensitive)
    if (weakPasswords.some(weak => password.toLowerCase() === weak.toLowerCase())) {
      setPasswordStrength({ 
        score: 0, 
        feedback: 'This password is too common and has been found in data breaches. Please choose a stronger password.' 
      });
      return;
    }

    // Length check
    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters long');
    } else {
      score += 1;
    }

    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      feedback.push('Add an uppercase letter');
    } else {
      score += 1;
    }

    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
      feedback.push('Add a lowercase letter');
    } else {
      score += 1;
    }

    // Check for number
    if (!/[0-9]/.test(password)) {
      feedback.push('Add a number');
    } else {
      score += 1;
    }

    // Check for special character
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      feedback.push('Add a special character (!@#$%^&*)');
    } else {
      score += 1;
    }

    // Bonus for longer passwords
    if (password.length >= 12) {
      score += 1;
    }

    // Determine strength level
    let strengthLevel = '';
    if (score <= 2) {
      strengthLevel = 'Weak';
    } else if (score <= 4) {
      strengthLevel = 'Fair';
    } else if (score <= 5) {
      strengthLevel = 'Good';
    } else {
      strengthLevel = 'Strong';
    }

    setPasswordStrength({ 
      score, 
      feedback: feedback.length > 0 ? feedback.join(', ') : `Password strength: ${strengthLevel}`,
      strengthLevel
    });
  };

  // Handle new staff input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Validate password strength when password changes
    if (name === 'staff_password') {
      setNewStaff({ ...newStaff, [name]: value });
      validatePasswordStrength(value);
      return;
    }
    
    setNewStaff({ ...newStaff, [name]: value });
  };

  // Filter and sort staff
  const filteredStaff = staffList.filter(staff => {
    const matchesSearch = !searchTerm || 
      staff.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.role?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !roleFilter || staff.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Pagination
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedStaff = filteredStaff.slice(startIndex, endIndex);
  const pageCount = Math.ceil(filteredStaff.length / rowsPerPage);

  // Add new staff
  const handleAddStaff = async (e) => {
    e.preventDefault();
    setIsLoading(true);
  
    const { full_name, staff_username, staff_password, role, program_id } = newStaff;
  
    // Password strength validation
    if (staff_password.length < 8) {
      setSnackbar({
        open: true,
        message: "Password must be at least 8 characters long",
        severity: "error"
      });
      setIsLoading(false);
      return;
    }

    // Check for weak passwords
    const weakPasswords = [
      'password', '123456', '12345678', '123456789', '1234567890',
      'qwerty', 'abc123', 'password123', 'admin', 'letmein',
      'welcome', 'monkey', '1234567', 'sunshine', 'princess',
      'azerty', 'trustno1', 'dragon', 'baseball', 'iloveyou',
      'master', 'hello', 'freedom', 'whatever', 'qazwsx',
      'login', 'starwars', 'shadow', 'superman', 'qwerty123',
      'eli123', 'test', 'guest', 'demo', 'user'
    ];

    if (weakPasswords.includes(staff_password.toLowerCase())) {
      setSnackbar({
        open: true,
        message: "This password is too common and has been found in data breaches. Please choose a stronger password.",
        severity: "error"
      });
      setIsLoading(false);
      return;
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(staff_password);
    const hasLowerCase = /[a-z]/.test(staff_password);
    const hasNumber = /[0-9]/.test(staff_password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(staff_password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      setSnackbar({
        open: true,
        message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        severity: "error"
      });
      setIsLoading(false);
      return;
    }
  
    // Ensure program is selected when role is Program Head or Instructor
    if ((role === "program head" || role === "instructor") && !program_id) {
      setSnackbar({
        open: true,
        message: `Please select a program for the ${role === "program head" ? "Program Head" : "Instructor"}.`,
        severity: "error"
      });
      setIsLoading(false);
      return;
    }
  
    // Prepare the request data
    const requestData = {
      full_name,
      staff_username,
      staff_password,
      role,
      // Set program_id for both program head and instructor, null for others
      program_id: (role === "program head" || role === "instructor") ? program_id : null
    };
  
    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });
  
      if (response.ok) {
        setSnackbar({
          open: true,
          message: "Staff account created successfully!",
          severity: "success"
        });
        setShowAddStaffModal(false);
        fetchStaffData(); // Reload the staff list
        // Reset form
        setNewStaff({
          full_name: "",
          staff_username: "",
          staff_password: "",
          role: "",
          program_id: "",
        });
      } else {
        setSnackbar({
          open: true,
          message: "Registration failed. Please try again.",
          severity: "error"
        });
      }
    } catch (error) {
      console.error("Error during the request:", error);
      setSnackbar({
        open: true,
        message: "Server error. Please try again later.",
        severity: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Update the form JSX part
  return (
    <div className="right-content w-100" data-testid="staff-page">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="hd mt-2 pb-0" data-testid="page-title">Staff Management</h3>
      </div>

      <div className="card shadow border-0 p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="hd">Staff List</h3>
          <Button
            variant="contained"
            onClick={handleOpen}
            sx={{
              bgcolor: '#c70202',
              '&:hover': {
                bgcolor: '#a00000',
              },
            }}
          >
            + Add Staff
          </Button>
        </div>

        {/* Filters */}
        <Paper elevation={3} className="p-3 mb-4">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={4}>
              <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>SEARCH</Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name or role..."
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
            <Grid item xs={4}>
              <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>ROLE</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
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
                    <em>All Roles</em>
                  </MenuItem>
                  <MenuItem value="instructor">Instructor</MenuItem>
                  <MenuItem value="registrar">Registrar</MenuItem>
                  <MenuItem value="finance">Finance</MenuItem>
                  <MenuItem value="program head">Program Head</MenuItem>
                  <MenuItem value="dean">Dean</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>&nbsp;</Typography>
              <Button 
                variant="contained"
                onClick={fetchStaffData}
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

        {/* Staff Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Name</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Role</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan="3" style={{ textAlign: "center", padding: "40px 0" }}>
                    <CircularProgress style={{ color: '#c70202' }} />
                  </TableCell>
                </TableRow>
              ) : paginatedStaff.length > 0 ? (
                paginatedStaff.map((staff, index) => (
                  <TableRow key={staff.staff_id} data-testid={`staff-row-${index}`}>
                    <TableCell data-testid={`staff-name-${index}`}>
                      {staff.full_name}
                    </TableCell>
                    <TableCell data-testid={`staff-role-${index}`}>
                      {staff.role}
                    </TableCell>
                    <TableCell>
                      <div className="actions d-flex align-items-center">
                        <Button 
                          data-testid={`view-button-${index}`}
                          className="secondary" 
                          color="secondary"
                          sx={{ mr: 1 }}
                        >
                          <FaEye />
                        </Button>
                        <Button 
                          data-testid={`edit-button-${index}`}
                          className="success" 
                          color="success"
                          sx={{ mr: 1 }}
                        >
                          <FaPencilAlt />
                        </Button>
                        <Button 
                          data-testid={`delete-button-${index}`}
                          className="error" 
                          color="error"
                        >
                          <MdDelete />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="3" style={{ textAlign: "center" }}>
                    {searchTerm || roleFilter ? 'No staff found matching your filters' : 'No staff data available.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {filteredStaff.length > 0 && (
          <div className="d-flex justify-content-center mt-4">
            <Pagination 
              data-testid="pagination"
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

      {/* Add Staff Modal */}
      <Modal
        open={showAddStaffModal}
        onClose={handleClose}
        data-testid="add-staff-modal"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          bgcolor: 'background.paper',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          borderRadius: 4,
          p: 4,
          maxHeight: '90vh',
          overflow: 'auto'
        }}>
          <Typography variant="h5" sx={{ 
            fontWeight: 'bold',
            color: '#c70202',
            mb: 3
          }}>
            Create Staff Account
          </Typography>
          
          <form onSubmit={handleAddStaff}>
              <TextField 
                label="Full Name" 
                name="full_name" 
                value={newStaff.full_name} 
                onChange={handleInputChange} 
                fullWidth 
                margin="normal" 
                data-testid="input-full_name"
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
              <TextField 
                label="Username" 
                name="staff_username" 
                value={newStaff.staff_username} 
                onChange={handleInputChange} 
                fullWidth 
                margin="normal" 
                data-testid="input-staff_username"
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
              <TextField 
                label="Password" 
                name="staff_password" 
                type="password" 
                value={newStaff.staff_password} 
                onChange={handleInputChange} 
                fullWidth 
                margin="normal" 
                data-testid="input-staff_password"
                error={(passwordStrength.score > 0 && passwordStrength.score <= 2) || (passwordStrength.feedback && passwordStrength.feedback.includes('data breaches'))}
                helperText={
                  newStaff.staff_password && passwordStrength.feedback 
                    ? passwordStrength.feedback 
                    : 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
                }
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
              <FormControl fullWidth margin="normal">
                <InputLabel id="role-label">Role</InputLabel>
                <Select 
                  labelId="role-label" 
                  name="role" 
                  value={newStaff.role} 
                  onChange={handleInputChange} 
                  label="Role" 
                  data-testid="input-role"
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
                  <MenuItem value="instructor">Instructor</MenuItem>
                  <MenuItem value="registrar">Registrar</MenuItem>
                  <MenuItem value="finance">Finance</MenuItem>
                  <MenuItem value="program head">Program Head</MenuItem>
                  <MenuItem value="dean">Dean</MenuItem>
                </Select>
              </FormControl>
              
              {/* Show program selection for both program head and instructor */}
              {(newStaff.role === "program head" || newStaff.role === "instructor") && (
                <FormControl fullWidth margin="normal">
                  <InputLabel id="program-label">Program</InputLabel>
                  <Select
                    labelId="program-label"
                    name="program_id"
                    value={newStaff.program_id}
                    onChange={handleInputChange}
                    label="Program"
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
                    <MenuItem value="1">BSIT</MenuItem>
                    <MenuItem value="2">BSHM</MenuItem>
                    <MenuItem value="3">Education</MenuItem>
                    <MenuItem value="4">BSOAd</MenuItem>
                    <MenuItem value="5">BSCrim</MenuItem>
                  </Select>
                </FormControl>
              )}

              <div className="d-flex justify-content-end mt-4" style={{ gap: '12px' }}>
                <Button 
                  onClick={() => setShowAddStaffModal(false)}
                  variant="outlined"
                  sx={{
                    borderColor: '#c70202',
                    color: '#c70202',
                    '&:hover': {
                      borderColor: '#a00000',
                      color: '#a00000',
                    },
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={isLoading} 
                  data-testid="submit-button"
                  sx={{
                    bgcolor: '#c70202',
                    '&:hover': {
                      bgcolor: '#a00000',
                    },
                    '&:disabled': {
                      bgcolor: '#ccc',
                    },
                  }}
                >
                  {isLoading ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
        </Box>
      </Modal>

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

export default Staff;
