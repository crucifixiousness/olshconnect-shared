import React, { useState, useEffect, useContext } from 'react';
import { 
  Card, 
  Button, 
  TextField, 
  Modal, 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  CircularProgress, 
  Snackbar, 
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid,
  Chip
} from '@mui/material';
import { FaUserPlus, FaUserMinus, FaExclamationTriangle } from 'react-icons/fa';
import { MyContext } from '../../App';
import { useNavigate } from 'react-router-dom';

const AdminAccountManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [newAdmin, setNewAdmin] = useState({
    full_name: '',
    staff_username: '',
    staff_password: ''

  });
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const context = useContext(MyContext);
  const navigate = useNavigate();

  useEffect(() => {
    context.setIsHideComponents(false);
    fetchAdmins();
  }, [context]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/admin-account-management', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch admin accounts');
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch admin accounts: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin-account-management', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAdmin)
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: 'Admin account created successfully!',
          severity: 'success'
        });
        setShowCreateModal(false);
        setNewAdmin({ full_name: '', staff_username: '', staff_password: '' });
        fetchAdmins();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create admin account');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin-account-management', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: 'Your account has been deleted. You will be logged out.',
          severity: 'success'
        });

        // Auto logout after account deletion
        setTimeout(() => {
          handleLogout();
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleLogout = () => {
    // Clear all localStorage
    localStorage.clear();

    // Reset context states
    context.setUser(null);
    context.setRole(null);
    context.setIsLogin(false);

    // Navigate to homepage
    navigate('/homepage', { replace: true });
  };

  const handleInputChange = (e) => {
    setNewAdmin({
      ...newAdmin,
      [e.target.name]: e.target.value
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="mb-2">Admin Account Managements</h3>
            <Typography variant="body2" color="text.secondary">
              Manage admin accounts and delete your own account
            </Typography>
          </div>
          <Button
            variant="contained"
            startIcon={<FaUserPlus />}
            onClick={() => setShowCreateModal(true)}
            sx={{
              bgcolor: '#c70202',
              '&:hover': {
                bgcolor: '#a00000',
              },
            }}
          >
            Create Admin Account
          </Button>
        </div>

        {/* Admin Accounts List */}
        <Card sx={{ mb: 3 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Full Name</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Username</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Role</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Account ID</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan="5" style={{ textAlign: "center", padding: "40px 0" }}>
                      <CircularProgress style={{ color: '#c70202' }} />
                    </TableCell>
                  </TableRow>
                ) : admins.length > 0 ? (
                  admins.map((admin, index) => (
                    <TableRow key={admin.staff_id}>
                      <TableCell>{admin.full_name}</TableCell>
                      <TableCell>{admin.staff_username}</TableCell>
                      <TableCell>
                        <Chip 
                          label={admin.role} 
                          color="primary" 
                          size="small"
                          sx={{ bgcolor: '#c70202', color: 'white' }}
                        />
                      </TableCell>
                      <TableCell>{admin.staff_id}</TableCell>
                      <TableCell>
                        {admin.staff_id === JSON.parse(localStorage.getItem('user'))?.id && (
                          <Button
                            variant="outlined"
                            color="error"
                            startIcon={<FaUserMinus />}
                            onClick={() => setShowDeleteDialog(true)}
                            size="small"
                          >
                            Delete My Account
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan="5" style={{ textAlign: "center" }}>
                      No admin accounts found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Danger Zone */}
        <Card sx={{ border: '2px solid #f44336', bgcolor: '#ffebee' }}>
          <Box sx={{ p: 3 }}>
            <div className="d-flex align-items-center mb-3">
              <FaExclamationTriangle style={{ color: '#f44336', marginRight: '8px' }} />
              <Typography variant="h6" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                Danger Zone
              </Typography>
            </div>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Once you delete your account, there is no going back. Please be certain.
            </Typography>
            <Button
              variant="contained"
              color="error"
              startIcon={<FaUserMinus />}
              onClick={() => setShowDeleteDialog(true)}
              sx={{
                bgcolor: '#f44336',
                '&:hover': {
                  bgcolor: '#d32f2f',
                },
              }}
            >
              Delete My Account
            </Button>
          </Box>
        </Card>
      </div>

      {/* Create Admin Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
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
            Create New Admin Account
          </Typography>

          <form onSubmit={handleCreateAdmin}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField 
                  label="Full Name" 
                  name="full_name" 
                  value={newAdmin.full_name} 
                  onChange={handleInputChange} 
                  fullWidth 
                  required
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
              <Grid item xs={12}>
                <TextField 
                  label="Username" 
                  name="staff_username" 
                  value={newAdmin.staff_username} 
                  onChange={handleInputChange} 
                  fullWidth 
                  required
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
              <Grid item xs={12}>
                <TextField 
                  label="Password" 
                  name="staff_password" 
                  type="password" 
                  value={newAdmin.staff_password} 
                  onChange={handleInputChange} 
                  fullWidth 
                  required
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

            <div className="d-flex justify-content-end mt-4" style={{ gap: '12px' }}>
              <Button 
                onClick={() => setShowCreateModal(false)}
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
                disabled={isCreating}
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
                {isCreating ? "Creating..." : "Create Admin"}
              </Button>
            </div>
          </form>
        </Box>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title" sx={{ color: '#f44336' }}>
          <div className="d-flex align-items-center">
            <FaExclamationTriangle style={{ marginRight: '8px' }} />
            Delete Account Confirmation
          </div>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete your admin account? This action cannot be undone.
            You will be automatically logged out after deletion.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowDeleteDialog(false)}
            color="primary"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={isDeleting}
            sx={{
              bgcolor: '#f44336',
              '&:hover': {
                bgcolor: '#d32f2f',
              },
            }}
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </Button>
        </DialogActions>
      </Dialog>

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

export default AdminAccountManagement;