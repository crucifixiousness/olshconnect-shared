import { useState, useEffect, useContext, useCallback } from 'react';
import { Card, Typography, CircularProgress } from '@mui/material';
import { GiBookshelf } from "react-icons/gi";
import { RiPoliceBadgeFill } from "react-icons/ri";
import { MdTour } from "react-icons/md";
import { FaComputer } from "react-icons/fa6";
import { PiComputerTowerFill } from "react-icons/pi";
import { IoIosPeople } from "react-icons/io";
import { TbCircleNumber1Filled, TbCircleNumber2Filled, TbCircleNumber3Filled, TbCircleNumber4Filled } from "react-icons/tb";
import { MyContext } from "../../App";

const Dashboard = () => {
  const context = useContext(MyContext);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    programStats: {
      education: 0,
      bscrim: 0,
      bshm: 0,
      bsit: 0,
      bsoad: 0
    },
    totalStudents: 0,
    yearLevelStats: {
      firstYear: 0,
      secondYear: 0,
      thirdYear: 0,
      fourthYear: 0
    }
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        console.error('No token found');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin-dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setDashboardData({
            programStats: data.data.programStats || {
              education: 0,
              bscrim: 0,
              bshm: 0,
              bsit: 0,
              bsoad: 0
            },
            totalStudents: data.data.totalStudents || 0,
            yearLevelStats: data.data.yearLevelStats || {
              firstYear: 0,
              secondYear: 0,
              thirdYear: 0,
              fourthYear: 0
            }
          });
        }
      } else {
        console.error('Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    context.setIsHideComponents(false);
    window.scrollTo(0, 0);
    fetchDashboardData();
  }, [context, fetchDashboardData]);

  const programCards = [
    {
      title: 'Total Education',
      value: dashboardData.programStats.education,
      icon: <GiBookshelf size={30} />,
      color: '#1976d2',
      gradient: 'linear-gradient(135deg, #1976d2, #42a5f5)'
    },
    {
      title: 'Total BSCrim',
      value: dashboardData.programStats.bscrim,
      icon: <RiPoliceBadgeFill size={30} />,
      color: '#c70202',
      gradient: 'linear-gradient(135deg, #c70202, #f44336)'
    },
    {
      title: 'Total BSHM',
      value: dashboardData.programStats.bshm,
      icon: <MdTour size={30} />,
      color: '#ff9800',
      gradient: 'linear-gradient(135deg, #ff9800, #ffb74d)'
    },
    {
      title: 'Total BSIT',
      value: dashboardData.programStats.bsit,
      icon: <FaComputer size={30} />,
      color: '#4caf50',
      gradient: 'linear-gradient(135deg, #4caf50, #81c784)'
    },
    {
      title: 'Total BSOAd',
      value: dashboardData.programStats.bsoad,
      icon: <PiComputerTowerFill size={30} />,
      color: '#9c27b0',
      gradient: 'linear-gradient(135deg, #9c27b0, #ba68c8)'
    }
  ];

  const yearLevelData = [
    { year: 'First Year', count: dashboardData.yearLevelStats.firstYear, icon: <TbCircleNumber1Filled />, color: '#1976d2' },
    { year: 'Second Year', count: dashboardData.yearLevelStats.secondYear, icon: <TbCircleNumber2Filled />, color: '#388e3c' },
    { year: 'Third Year', count: dashboardData.yearLevelStats.thirdYear, icon: <TbCircleNumber3Filled />, color: '#f57c00' },
    { year: 'Fourth Year', count: dashboardData.yearLevelStats.fourthYear, icon: <TbCircleNumber4Filled />, color: '#d32f2f' }
  ];

  if (loading) {
    return (
      <div className="right-content w-100">
        <div className="card shadow border-0 p-3 mt-1">
          <h3 className="mb-4">Admin Dashboard</h3>
          <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
            <CircularProgress sx={{ color: '#c70202' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-4 mt-1">
        <div className="mb-4">
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#333', mb: 1 }}>
            Admin Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Overview of student enrollment statistics
          </Typography>
        </div>
        
        {/* Program Statistics */}
        <div className="mb-4">
          <Typography variant="h6" sx={{ fontWeight: '600', color: '#333', mb: 3 }}>
            Program Statistics
          </Typography>
          <div className="row">
            {programCards.map((card, index) => (
              <div key={index} className="col-12 col-sm-6 col-md-4 col-lg-4 col-xl" style={{ marginBottom: '12px' }}>
                <Card 
                  className="h-100" 
                  sx={{ 
                    background: card.gradient,
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': { 
                      transform: 'translateY(-8px) scale(1.02)',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.2)'
                    },
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    borderRadius: '12px',
                    overflow: 'hidden'
                  }}
                >
                  <div className="p-3">
                    <div className="d-flex align-items-center mb-2">
                      <div style={{ 
                        color: 'white', 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255,255,255,0.2)'
                      }}>
                        {card.icon}
                      </div>
                      <Typography 
                        variant="body2" 
                        className="ms-2 text-white" 
                        sx={{ 
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          opacity: 0.95
                        }}
                      >
                        {card.title}
                      </Typography>
                    </div>
                    <Typography 
                      variant="h3" 
                      sx={{ 
                        color: 'white', 
                        fontWeight: 'bold',
                        fontSize: { xs: '2rem', md: '2.5rem' },
                        lineHeight: 1.2
                      }}
                    >
                      {card.value.toLocaleString()}
                    </Typography>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Total Students Overview */}
        <div className="mt-4">
          <Typography variant="h6" sx={{ fontWeight: '600', color: '#333', mb: 3 }}>
            Enrollment Overview
          </Typography>
          <Card 
            className="h-100" 
            sx={{ 
              background: 'linear-gradient(135deg, #c70202 0%, #f44336 100%)',
              color: 'white',
              borderRadius: '16px',
              boxShadow: '0 8px 24px rgba(199, 2, 2, 0.3)',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <div className="p-4">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      color: 'white', 
                      fontWeight: 'bold',
                      mb: 0.5
                    }}
                  >
                    Total Enrolled Students
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: '0.875rem'
                    }}
                  >
                    All programs combined
                  </Typography>
                </div>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IoIosPeople size={32} style={{ color: 'white' }} />
                </div>
              </div>
              
              <Typography 
                variant="h2" 
                sx={{ 
                  color: 'white', 
                  fontWeight: 'bold', 
                  mb: 4,
                  fontSize: { xs: '2.5rem', md: '3.5rem' }
                }}
              >
                {dashboardData.totalStudents.toLocaleString()}
              </Typography>

              <div className="row">
                {yearLevelData.map((level, index) => (
                  <div key={index} className="col-12 col-sm-6 col-md-6 col-lg-3" style={{ marginBottom: '12px' }}>
                    <div 
                      className="d-flex align-items-center justify-content-between p-3" 
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.15)', 
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.25)',
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)';
                        e.currentTarget.style.transform = 'translateX(5px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div className="d-flex align-items-center">
                        <span 
                          style={{ 
                            color: level.color, 
                            marginRight: '12px',
                            fontSize: '24px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          {level.icon}
                        </span>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            color: 'white',
                            fontWeight: '500',
                            fontSize: '0.9rem'
                          }}
                        >
                          {level.year}
                        </Typography>
                      </div>
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          color: 'white', 
                          fontWeight: 'bold',
                          fontSize: '1.5rem'
                        }}
                      >
                        {level.count.toLocaleString()}
                      </Typography>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;