import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Alert,
  Snackbar,
  CircularProgress,
  Grid,
  Avatar,
  Switch,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Group as GroupIcon,
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import axios from 'axios';
import { MyContext } from '../../App';

const UserManagement = () => {
  const context = useContext(MyContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [roles, setRoles] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    limit: 20
  });
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: ''
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  
  // Dialog states
  const [addDialog, setAddDialog] = useState({ open: false });
  const [editDialog, setEditDialog] = useState({ open: false, user: null });
  const [viewDialog, setViewDialog] = useState({ open: false, user: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [bulkDialog, setBulkDialog] = useState({ open: false });
  const [passwordDialog, setPasswordDialog] = useState({ open: false, user: null });
  
  // Form states
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: '',
    department: '',
    position: '',
    phone_number: '',
    address: ''
  });
  
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    context.setIsHideComponents(false);
    window.scrollTo(0, 0);
    fetchUsers();
    fetchStats();
    fetchRoles();
  }, [context]);

  useEffect(() => {
    fetchUsers();
  }, [pagination.currentPage, filters, sortBy, sortOrder]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
        search: filters.search,
        role: filters.role,
        status: filters.status,
        sortBy,
        sortOrder
      };

      const response = await axios.get('/api/user-management/users', { params });
      
      if (response.data.success) {
        setUsers(response.data.data.users);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch users',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/user-management/users/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axios.get('/api/user-management/roles');
      if (response.data.success) {
        setRoles(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await axios.post('/api/user-management/users', newUser);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'User created successfully',
          severity: 'success'
        });
        setAddDialog({ open: false });
        setNewUser({
          username: '',
          email: '',
          password: '',
          full_name: '',
          role: '',
          department: '',
          position: '',
          phone_number: '',
          address: ''
        });
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to create user',
        severity: 'error'
      });
    }
  };

  const handleUpdateUser = async () => {
    try {
      const response = await axios.put(`/api/user-management/users/${editDialog.user.user_id}`, editDialog.user);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'User updated successfully',
          severity: 'success'
        });
        setEditDialog({ open: false, user: null });
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to update user',
        severity: 'error'
      });
    }
  };

  const handleDeleteUser = async () => {
    try {
      const response = await axios.delete(`/api/user-management/users/${deleteDialog.user.user_id}`);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'User deleted successfully',
          severity: 'success'
        });
        setDeleteDialog({ open: false, user: null });
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to delete user',
        severity: 'error'
      });
    }
  };

  const handleBulkOperation = async (action) => {
    try {
      const response = await axios.post('/api/user-management/users/bulk', {
        action,
        user_ids: selectedUsers,
        data: bulkDialog.data
      });
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: `Bulk ${action} completed successfully`,
          severity: 'success'
        });
        setBulkDialog({ open: false });
        setSelectedUsers([]);
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to perform bulk operation',
        severity: 'error'
      });
    }
  };

  const handlePasswordChange = async () => {
    try {
      const response = await axios.put(`/api/user-management/users/${passwordDialog.user.user_id}/password`, {
        new_password: passwordDialog.newPassword
      });
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Password changed successfully',
          severity: 'success'
        });
        setPasswordDialog({ open: false, user: null, newPassword: '' });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to change password',
        severity: 'error'
      });
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      student: 'primary',
      instructor: 'success',
      program_head: 'warning',
      registrar: 'info',
      finance: 'secondary',
      admin: 'error',
      super_admin: 'error'
    };
    return colors[role] || 'default';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      inactive: 'warning',
      suspended: 'error',
      deleted: 'default'
    };
    return colors[status] || 'default';
  };

  const getRoleIcon = (role) => {
    const icons = {
      student: <SchoolIcon />,
      instructor: <WorkIcon />,
      program_head: <WorkIcon />,
      registrar: <WorkIcon />,
      finance: <WorkIcon />,
      admin: <AdminIcon />,
      super_admin: <AdminIcon />
    };
    return icons[role] || <PersonIcon />;
  };

  if (loading && users.length === 0) {
    return (
      <div className="right-content w-100">
        <div className="card shadow border-0 p-3 mt-1">
          <h3 className="mb-4">User Management</h3>
          <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
            <CircularProgress sx={{ color: '#c70202' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            <GroupIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            User Management
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => { fetchUsers(); fetchStats(); }}
              sx={{ mr: 1 }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddDialog({ open: true })}
              color="primary"
            >
              Add User
            </Button>
          </Box>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Users
                </Typography>
                <Typography variant="h4">
                  {stats.totalStats?.total_users || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Users
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.totalStats?.total_active || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Recent Registrations
                </Typography>
                <Typography variant="h4" color="info.main">
                  {stats.recentRegistrations || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active This Week
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {stats.totalStats?.active_last_week || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters and Search */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Search Users"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={filters.role}
                    onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                    label="Role"
                  >
                    <MenuItem value="">All Roles</MenuItem>
                    {roles.map((role) => (
                      <MenuItem key={role.value} value={role.value}>
                        {role.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    label="Status"
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={() => setFilters({ search: '', role: '', status: '' })}
                >
                  Clear
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Users ({pagination.totalUsers})
              </Typography>
              <Box>
                {selectedUsers.length > 0 && (
                  <Button
                    variant="outlined"
                    onClick={() => setBulkDialog({ open: true })}
                    sx={{ mr: 1 }}
                  >
                    Bulk Actions ({selectedUsers.length})
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => {/* Export functionality */}}
                >
                  Export
                </Button>
              </Box>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedUsers.length === users.length && users.length > 0}
                        indeterminate={selectedUsers.length > 0 && selectedUsers.length < users.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(users.map(u => u.user_id));
                          } else {
                            setSelectedUsers([]);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Login</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedUsers.includes(user.user_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.user_id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.user_id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar sx={{ mr: 2, bgcolor: getRoleColor(user.role) }}>
                            {getRoleIcon(user.role)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">{user.full_name}</Typography>
                            <Typography variant="body2" color="textSecondary">
                              @{user.username}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {user.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={roles.find(r => r.value === user.role)?.label || user.role}
                          color={getRoleColor(user.role)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {user.department || 'N/A'}
                        </Typography>
                        {user.position && (
                          <Typography variant="caption" color="textSecondary">
                            {user.position}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.status}
                          color={getStatusColor(user.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {user.last_login 
                            ? new Date(user.last_login).toLocaleDateString()
                            : 'Never'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(user.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => setViewDialog({ open: true, user })}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit User">
                            <IconButton
                              size="small"
                              onClick={() => setEditDialog({ open: true, user: { ...user } })}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Change Password">
                            <IconButton
                              size="small"
                              onClick={() => setPasswordDialog({ open: true, user, newPassword: '' })}
                            >
                              <SecurityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete User">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteDialog({ open: true, user })}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <Box display="flex" justifyContent="center" mt={2}>
              <Pagination
                count={pagination.totalPages}
                page={pagination.currentPage}
                onChange={(e, page) => setPagination({ ...pagination, currentPage: page })}
                color="primary"
              />
            </Box>
          </CardContent>
        </Card>

        {/* Add User Dialog */}
        <Dialog open={addDialog.open} onClose={() => setAddDialog({ open: false })} maxWidth="md" fullWidth>
          <DialogTitle>Add New User</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    label="Role"
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.value} value={role.value}>
                        {role.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Position"
                  value={newUser.position}
                  onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={newUser.phone_number}
                  onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  multiline
                  rows={2}
                  value={newUser.address}
                  onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDialog({ open: false })}>Cancel</Button>
            <Button onClick={handleCreateUser} variant="contained">
              Create User
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, user: null })} maxWidth="md" fullWidth>
          <DialogTitle>Edit User</DialogTitle>
          <DialogContent>
            {editDialog.user && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={editDialog.user.username}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={editDialog.user.email}
                    onChange={(e) => setEditDialog({ ...editDialog, user: { ...editDialog.user, email: e.target.value } })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    value={editDialog.user.full_name}
                    onChange={(e) => setEditDialog({ ...editDialog, user: { ...editDialog.user, full_name: e.target.value } })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={editDialog.user.role}
                      onChange={(e) => setEditDialog({ ...editDialog, user: { ...editDialog.user, role: e.target.value } })}
                      label="Role"
                    >
                      {roles.map((role) => (
                        <MenuItem key={role.value} value={role.value}>
                          {role.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={editDialog.user.status}
                      onChange={(e) => setEditDialog({ ...editDialog, user: { ...editDialog.user, status: e.target.value } })}
                      label="Status"
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                      <MenuItem value="suspended">Suspended</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Department"
                    value={editDialog.user.department || ''}
                    onChange={(e) => setEditDialog({ ...editDialog, user: { ...editDialog.user, department: e.target.value } })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Position"
                    value={editDialog.user.position || ''}
                    onChange={(e) => setEditDialog({ ...editDialog, user: { ...editDialog.user, position: e.target.value } })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={editDialog.user.phone_number || ''}
                    onChange={(e) => setEditDialog({ ...editDialog, user: { ...editDialog.user, phone_number: e.target.value } })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    multiline
                    rows={2}
                    value={editDialog.user.address || ''}
                    onChange={(e) => setEditDialog({ ...editDialog, user: { ...editDialog.user, address: e.target.value } })}
                  />
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialog({ open: false, user: null })}>Cancel</Button>
            <Button onClick={handleUpdateUser} variant="contained">
              Update User
            </Button>
          </DialogActions>
        </Dialog>

        {/* View User Dialog */}
        <Dialog open={viewDialog.open} onClose={() => setViewDialog({ open: false, user: null })} maxWidth="md" fullWidth>
          <DialogTitle>User Details</DialogTitle>
          <DialogContent>
            {viewDialog.user && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ mr: 2, width: 64, height: 64, bgcolor: getRoleColor(viewDialog.user.role) }}>
                      {getRoleIcon(viewDialog.user.role)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{viewDialog.user.full_name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        @{viewDialog.user.username}
                      </Typography>
                      <Chip
                        label={roles.find(r => r.value === viewDialog.user.role)?.label || viewDialog.user.role}
                        color={getRoleColor(viewDialog.user.role)}
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Email</Typography>
                  <Typography variant="body1">{viewDialog.user.email}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                  <Chip
                    label={viewDialog.user.status}
                    color={getStatusColor(viewDialog.user.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Department</Typography>
                  <Typography variant="body1">{viewDialog.user.department || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Position</Typography>
                  <Typography variant="body1">{viewDialog.user.position || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Phone Number</Typography>
                  <Typography variant="body1">{viewDialog.user.phone_number || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Last Login</Typography>
                  <Typography variant="body1">
                    {viewDialog.user.last_login 
                      ? new Date(viewDialog.user.last_login).toLocaleString()
                      : 'Never'
                    }
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Address</Typography>
                  <Typography variant="body1">{viewDialog.user.address || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Created</Typography>
                  <Typography variant="body1">
                    {new Date(viewDialog.user.created_at).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Last Updated</Typography>
                  <Typography variant="body1">
                    {viewDialog.user.updated_at 
                      ? new Date(viewDialog.user.updated_at).toLocaleString()
                      : 'Never'
                    }
                  </Typography>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialog({ open: false, user: null })}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, user: null })}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete user "{deleteDialog.user?.full_name}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, user: null })}>Cancel</Button>
            <Button onClick={handleDeleteUser} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Actions Dialog */}
        <Dialog open={bulkDialog.open} onClose={() => setBulkDialog({ open: false })}>
          <DialogTitle>Bulk Actions</DialogTitle>
          <DialogContent>
            <Typography gutterBottom>
              Select an action to perform on {selectedUsers.length} selected users:
            </Typography>
            <Box mt={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => handleBulkOperation('activate')}
                sx={{ mb: 1 }}
              >
                Activate All
              </Button>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => handleBulkOperation('deactivate')}
                sx={{ mb: 1 }}
              >
                Deactivate All
              </Button>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setBulkDialog({ open: true, data: { role: '' } })}
              >
                Change Role
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBulkDialog({ open: false })}>Cancel</Button>
          </DialogActions>
        </Dialog>

        {/* Password Change Dialog */}
        <Dialog open={passwordDialog.open} onClose={() => setPasswordDialog({ open: false, user: null, newPassword: '' })}>
          <DialogTitle>Change Password</DialogTitle>
          <DialogContent>
            <Typography gutterBottom>
              Enter new password for user "{passwordDialog.user?.full_name}":
            </Typography>
            <TextField
              fullWidth
              type="password"
              label="New Password"
              value={passwordDialog.newPassword}
              onChange={(e) => setPasswordDialog({ ...passwordDialog, newPassword: e.target.value })}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordDialog({ open: false, user: null, newPassword: '' })}>Cancel</Button>
            <Button onClick={handlePasswordChange} variant="contained">
              Change Password
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </div>
    </div>
  );
};

export default UserManagement;

