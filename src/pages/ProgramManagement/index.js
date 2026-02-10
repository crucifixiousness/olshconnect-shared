import React, { useState, useEffect } from 'react';
import {
  Paper,
  Button,
  Chip,
  CircularProgress,
  Tab,
  Tabs,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Snackbar,
  Alert,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  School as SchoolIcon,
  Book as BookIcon
} from '@mui/icons-material';
import axios from 'axios';

const ProgramManagement = () => {
  const [programs, setPrograms] = useState([]);
  const [majors, setMajors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  
  // Program dialog states
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [programForm, setProgramForm] = useState({ program_name: '' });
  
  // Major dialog states
  const [majorDialogOpen, setMajorDialogOpen] = useState(false);
  const [editingMajor, setEditingMajor] = useState(null);
  const [majorForm, setMajorForm] = useState({
    major_name: '',
    program_id: ''
  });
  
  // Notification states
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [programsRes, majorsRes] = await Promise.all([
        axios.get('/api/program-management'),
        axios.get('/api/major-management')
      ]);
      setPrograms(programsRes.data);
      setMajors(majorsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('Error fetching data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Program management functions
  const handleProgramSubmit = async () => {
    try {
      if (editingProgram) {
        await axios.put('/api/program-management', {
          program_id: editingProgram.program_id,
          program_name: programForm.program_name
        });
        showNotification('Program updated successfully');
      } else {
        await axios.post('/api/program-management', programForm);
        showNotification('Program created successfully');
      }
      setProgramDialogOpen(false);
      resetProgramForm();
      fetchData();
    } catch (error) {
      console.error('Error saving program:', error);
      showNotification(error.response?.data?.error || 'Error saving program', 'error');
    }
  };

  const handleProgramEdit = (program) => {
    setEditingProgram(program);
    setProgramForm({ program_name: program.program_name });
    setProgramDialogOpen(true);
  };

  const handleProgramDelete = async (programId) => {
    if (window.confirm('Are you sure you want to delete this program?')) {
      try {
        await axios.delete(`/api/program-management?program_id=${programId}`);
        showNotification('Program deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting program:', error);
        showNotification(error.response?.data?.error || 'Error deleting program', 'error');
      }
    }
  };

  const resetProgramForm = () => {
    setEditingProgram(null);
    setProgramForm({ program_name: '' });
  };

  // Major management functions
  const handleMajorSubmit = async () => {
    try {
      if (editingMajor) {
        await axios.put('/api/major-management', {
          major_id: editingMajor.major_id,
          major_name: majorForm.major_name,
          program_id: majorForm.program_id
        });
        showNotification('Major updated successfully');
      } else {
        await axios.post('/api/major-management', majorForm);
        showNotification('Major created successfully');
      }
      setMajorDialogOpen(false);
      resetMajorForm();
      fetchData();
    } catch (error) {
      console.error('Error saving major:', error);
      showNotification(error.response?.data?.error || 'Error saving major', 'error');
    }
  };

  const handleMajorEdit = (major) => {
    setEditingMajor(major);
    setMajorForm({
      major_name: major.major_name,
      program_id: major.program_id
    });
    setMajorDialogOpen(true);
  };

  const handleMajorDelete = async (majorId) => {
    if (window.confirm('Are you sure you want to delete this major?')) {
      try {
        await axios.delete(`/api/major-management?major_id=${majorId}`);
        showNotification('Major deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting major:', error);
        showNotification(error.response?.data?.error || 'Error deleting major', 'error');
      }
    }
  };

  const resetMajorForm = () => {
    setEditingMajor(null);
    setMajorForm({
      major_name: '',
      program_id: ''
    });
  };

  if (loading) {
    return (
      <div className="right-content w-100">
        <div className="card shadow border-0 p-3 mt-1">
          <h3 className="hd mt-2 pb-0">Program Management</h3>
        </div>
        <div className="card shadow border-0 p-3 mt-3">
          <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
            <CircularProgress style={{ color: '#c70202' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="hd mt-2 pb-0">
          Program Management
        </h3>
      </div>

      <div className="card shadow border-0 p-3 mt-3">
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                color: '#666',
                '&.Mui-selected': {
                  color: '#c70202',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#c70202',
              },
            }}
          >
            <Tab label="Programs" icon={<SchoolIcon />} iconPosition="start" />
            <Tab label="Majors" icon={<BookIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        {activeTab === 0 ? (
          <>
            {/* Programs Tab */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="hd mb-0">Programs</h4>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setProgramDialogOpen(true)}
                  sx={{
                    backgroundColor: '#c70202',
                    '&:hover': {
                      backgroundColor: '#a00000'
                    },
                    minWidth: '120px',
                    height: '36px',
                    fontSize: '14px'
                  }}
                >
                  Add Program
                </Button>
              </div>
            </div>

            <Paper elevation={3} sx={{ borderRadius: '8px', overflow: 'hidden' }}>
              <TableContainer>
                <Table aria-label="programs table" sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                      <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Program Name</TableCell>
                      <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Majors</TableCell>
                      <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {programs.length > 0 ? (
                      programs.map((program) => (
                        <TableRow 
                          key={program.program_id}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                          hover
                        >
                          <TableCell>{program.program_name}</TableCell>
                          <TableCell>
                            {program.majors && program.majors.length > 0 ? (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {program.majors.map((major) => (
                                  <Chip
                                    key={major.major_id}
                                    label={major.major_name}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{
                                      borderColor: '#17a2b8',
                                      color: '#17a2b8',
                                      '&:hover': {
                                        backgroundColor: '#17a2b8',
                                        color: 'white'
                                      }
                                    }}
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                No majors
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              color="primary"
                              onClick={() => handleProgramEdit(program)}
                              sx={{
                                color: '#c70202',
                                '&:hover': {
                                  backgroundColor: 'rgba(199, 2, 2, 0.1)'
                                }
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() => handleProgramDelete(program.program_id)}
                              sx={{
                                color: '#dc3545',
                                '&:hover': {
                                  backgroundColor: 'rgba(220, 53, 69, 0.1)'
                                }
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan="3" align="center">
                          <Typography variant="body2" color="textSecondary">
                            No programs found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        ) : (
          <>
            {/* Majors Tab */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="hd mb-0">Majors</h4>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setMajorDialogOpen(true)}
                  sx={{
                    backgroundColor: '#c70202',
                    '&:hover': {
                      backgroundColor: '#a00000'
                    },
                    minWidth: '120px',
                    height: '36px',
                    fontSize: '14px'
                  }}
                >
                  Add Major
                </Button>
              </div>
            </div>

            <Paper elevation={3} sx={{ borderRadius: '8px', overflow: 'hidden' }}>
              <TableContainer>
                <Table aria-label="majors table" sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                      <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Major Name</TableCell>
                      <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Program</TableCell>
                      <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {majors.length > 0 ? (
                      majors.map((major) => (
                        <TableRow 
                          key={major.major_id}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                          hover
                        >
                          <TableCell>{major.major_name}</TableCell>
                          <TableCell>{major.program_name}</TableCell>
                          <TableCell align="center">
                            <IconButton
                              color="primary"
                              onClick={() => handleMajorEdit(major)}
                              sx={{
                                color: '#c70202',
                                '&:hover': {
                                  backgroundColor: 'rgba(199, 2, 2, 0.1)'
                                }
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() => handleMajorDelete(major.major_id)}
                              sx={{
                                color: '#dc3545',
                                '&:hover': {
                                  backgroundColor: 'rgba(220, 53, 69, 0.1)'
                                }
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan="3" align="center">
                          <Typography variant="body2" color="textSecondary">
                            No majors found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}
      </div>

      {/* Program Dialog */}
      <Dialog open={programDialogOpen} onClose={() => setProgramDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingProgram ? 'Edit Program' : 'Add New Program'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Program Name"
            fullWidth
            variant="outlined"
            value={programForm.program_name}
            onChange={(e) => setProgramForm({ ...programForm, program_name: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setProgramDialogOpen(false)}
            sx={{
              color: '#666',
              '&:hover': {
                backgroundColor: 'rgba(102, 102, 102, 0.1)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleProgramSubmit} 
            variant="contained"
            sx={{
              bgcolor: '#c70202',
              color: 'white',
              '&:hover': { bgcolor: '#a00000' },
              minWidth: '100px',
              height: '36px'
            }}
          >
            {editingProgram ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Major Dialog */}
      <Dialog open={majorDialogOpen} onClose={() => setMajorDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingMajor ? 'Edit Major' : 'Add New Major'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Major Name"
            fullWidth
            variant="outlined"
            value={majorForm.major_name}
            onChange={(e) => setMajorForm({ ...majorForm, major_name: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            select
            margin="dense"
            label="Program"
            fullWidth
            variant="outlined"
            value={majorForm.program_id}
            onChange={(e) => setMajorForm({ ...majorForm, program_id: e.target.value })}
            sx={{ mt: 2 }}
          >
            {programs.map((program) => (
              <MenuItem key={program.program_id} value={program.program_id}>
                {program.program_name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setMajorDialogOpen(false)}
            sx={{
              color: '#666',
              '&:hover': {
                backgroundColor: 'rgba(102, 102, 102, 0.1)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleMajorSubmit} 
            variant="contained"
            sx={{
              bgcolor: '#c70202',
              color: 'white',
              '&:hover': { bgcolor: '#a00000' },
              minWidth: '100px',
              height: '36px'
            }}
          >
            {editingMajor ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
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

export default ProgramManagement; 