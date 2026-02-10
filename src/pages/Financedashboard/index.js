import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Card, Typography, CircularProgress } from '@mui/material';
import { FaMoneyBillWave, FaUserGraduate, FaFileInvoiceDollar, FaCreditCard } from 'react-icons/fa';
import { MyContext } from '../../App';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const FinanceDashboard = () => {
  const context = useContext(MyContext);

  // Check localStorage cache synchronously on mount (like Academic Records)
  const cachedDashboardData = localStorage.getItem('financeDashboardData');
  const cachedDashboardTimestamp = localStorage.getItem('financeDashboardTimestamp');
  const cachedDashboardAge = cachedDashboardTimestamp ? Date.now() - parseInt(cachedDashboardTimestamp) : null;
  const hasValidCache = cachedDashboardData && cachedDashboardAge && cachedDashboardAge < 300000; // 5 minutes

  // Initialize state with cached data if available, otherwise empty
  const cachedData = hasValidCache ? JSON.parse(cachedDashboardData) : null;
  const [dashboardData, setDashboardData] = useState(cachedData?.dashboardData || {
    totalRevenue: 0,
    totalStudentsPaid: 0,
    pendingPayments: 0,
    totalBalance: 0,
    recentTransactions: []
  });
  const [loading, setLoading] = useState(!hasValidCache); // Only show loading if no valid cache

  useEffect(() => {
    context.setIsHideComponents(false);
    window.scrollTo(0,0);
  }, [context]);

  const fetchFinanceData = async (forceRefresh = false) => {
    try {
      // Check cache first (like Academic Records and Student Profile), unless forcing refresh
      if (!forceRefresh) {
        const cachedData = localStorage.getItem('financeDashboardData');
        const cacheTimestamp = localStorage.getItem('financeDashboardTimestamp');
        const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;

        // Use cache if it's less than 5 minutes old
        if (cachedData && cacheAge && cacheAge < 300000) {
          const parsedData = JSON.parse(cachedData);
          setDashboardData(parsedData.dashboardData);
          setLoading(false);
          
          // Always do background refresh to check for updates (new transactions, revenue changes, etc.)
          fetchFinanceData(true).catch(err => {
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

      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No token found');
        setLoading(false);
        return;
      }

      // Fetch dashboard data from new API
      const response = await axios.get('/api/finance-dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const formattedDashboardData = {
        totalRevenue: response.data.totalRevenue || 0,
        totalStudentsPaid: response.data.totalStudentsPaid || 0,
        pendingPayments: response.data.pendingPayments || 0,
        totalBalance: response.data.totalBalance || 0,
        recentTransactions: response.data.recentTransactions || []
      };

      const formattedPaymentStats = {
        monthlyData: (response.data.paymentStats?.monthlyData || []).map(item => ({
          ...item,
          monthly_revenue: parseFloat(item.monthly_revenue) || 0,
          transaction_count: parseInt(item.transaction_count) || 0
        })),
        paymentMethods: (response.data.paymentStats?.paymentMethods || []).map(item => ({
          ...item,
          total_amount: parseFloat(item.total_amount) || 0,
          count: parseInt(item.count) || 0
        })),
        programStats: (response.data.paymentStats?.programStats || []).map(item => ({
          ...item,
          total_revenue: parseFloat(item.total_revenue) || 0,
          student_count: parseInt(item.student_count) || 0
        }))
      };

      // Cache the new data (like Academic Records and Student Profile)
      localStorage.setItem('financeDashboardData', JSON.stringify({
        dashboardData: formattedDashboardData,
        paymentStats: formattedPaymentStats
      }));
      localStorage.setItem('financeDashboardTimestamp', Date.now().toString());

      setDashboardData(formattedDashboardData);
      
      // Only update loading if not forcing refresh
      if (!forceRefresh) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching finance data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statCards = [
    {
      title: 'Total Payment',
      value: `₱${dashboardData.totalRevenue.toLocaleString()}`,
      icon: <FaMoneyBillWave size={30} />,
      color: '#1976d2'
    },
    {
      title: 'Students Who Paid',
      value: dashboardData.totalStudentsPaid,
      icon: <FaUserGraduate size={30} />,
      color: '#2e7d32'
    },
    {
      title: 'Pending Payments',
      value: dashboardData.pendingPayments,
      icon: <FaFileInvoiceDollar size={30} />,
      color: '#ed6c02'
    },
    {
      title: 'Total Balance',
      value: `₱${(dashboardData.totalBalance || 0).toLocaleString()}`,
      icon: <FaCreditCard size={30} />,
      color: '#9c27b0'
    }
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="right-content w-100">
        <div className="card shadow border-0 p-3 mt-1">
          <h3 className="mb-4">Finance Dashboard</h3>
          
          {/* Stat Cards - Show skeleton loading */}
          <div className="row">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="col-md-3 mb-4">
                <Card 
                  className="h-100 p-3" 
                  sx={{ 
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-5px)' },
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  <div className="d-flex align-items-center mb-3">
                    <CircularProgress size={30} style={{ color: '#c70202' }} />
                    <Typography variant="h6" className="ms-2">Loading...</Typography>
                  </div>
                  <Typography variant="h3" style={{ color: '#c70202' }}>
                    --
                  </Typography>
                </Card>
              </div>
            ))}
          </div>

          <div className="row mt-4">
            {/* Recent Transactions - Loading State */}
            <div className="col-md-12 mb-4">
              <Card className="h-100 p-3">
                <Typography variant="h6" className="mb-3">Recent Transactions</Typography>
                <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                  <CircularProgress style={{ color: '#c70202' }} />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="mb-4">Finance Dashboard</h3>
        
        {/* Stat Cards */}
        <div className="row">
          {statCards.map((card, index) => (
            <div key={index} className="col-md-3 mb-4">
              <Card 
                className="h-100 p-3" 
                sx={{ 
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-5px)' },
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              >
                <div className="d-flex align-items-center mb-3">
                  <div style={{ color: card.color }}>{card.icon}</div>
                  <Typography variant="h6" className="ms-2">{card.title}</Typography>
                </div>
                <Typography variant="h3" style={{ color: card.color }}>
                  {card.value}
                </Typography>
              </Card>
            </div>
          ))}
        </div>

        <div className="row mt-4">
          {/* Recent Transactions */}
          <div className="col-md-12 mb-4">
            <Card className="h-100 p-3">
              <Typography variant="h6" className="mb-3">Recent Transactions</Typography>
              <TableContainer component={Paper} elevation={0}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Student</TableCell>
                      <TableCell>Program</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Method</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData.recentTransactions.map((transaction, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(transaction.payment_date)}</TableCell>
                        <TableCell>
                          <div style={{ fontWeight: 'bold' }}>{transaction.student_name}</div>
                          <div style={{ fontSize: '0.8em', color: 'gray' }}>ID: {transaction.student_id}</div>
                        </TableCell>
                        <TableCell>
                          <div>{transaction.program_name}</div>
                          <div style={{ fontSize: '0.8em', color: 'gray' }}>{transaction.year_level}</div>
                        </TableCell>
                        <TableCell style={{ fontWeight: 'bold', color: '#2e7d32' }}>
                          ₱{parseFloat(transaction.amount_paid).toLocaleString()}
                        </TableCell>
                        <TableCell>{transaction.payment_method}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;