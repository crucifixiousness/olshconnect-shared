import Button from '@mui/material/Button';
import { RiDashboardHorizontalLine } from "react-icons/ri";
import { FaBookOpen } from "react-icons/fa6";
import { PiStudentBold } from "react-icons/pi";
import { IoDocuments } from "react-icons/io5";
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useContext, useEffect } from 'react';
import { HiOutlineLogout } from "react-icons/hi";
import { MyContext } from '../../App';
import { GiPapers } from "react-icons/gi";
import { FaMoneyBillWave } from "react-icons/fa";


const StudentSidebar = () => {
  const [isOfficiallyEnrolled, setIsOfficiallyEnrolled] = useState(false);
  const [canAccessPayment, setCanAccessPayment] = useState(false);
  const context = useContext(MyContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Function to get active tab based on current route
  const getActiveTab = () => {
    const path = location.pathname;
    switch (path) {
      case '/student-dashboard':
        return 0; // Dashboard
      case '/student-profile':
        return 1; // My Profile
      case '/student-courses':
        return 2; // My Courses
      case '/academic-records':
        return 3; // Academic Records
      case '/request-document':
        return 4; // Request Document
      case '/student-payment':
        return 5; // Payment
      default:
        return 1; // Default to My Profile
    }
  };

  const activeTab = getActiveTab();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    const isEnrolled = userData?.enrollment_status === 'Officially Enrolled';
    const isVerified = userData?.enrollment_status === 'Verified';
    const isForPayment = userData?.enrollment_status === 'For Payment';
    const canAccessFeatures = isEnrolled; // Only Officially Enrolled can access all features
    const canPay = isEnrolled || isVerified || isForPayment; // Payment available for verified, for payment, and enrolled

    setIsOfficiallyEnrolled(canAccessFeatures);
    setCanAccessPayment(canPay);
  }, []);

    // Logout function to remove user data and redirect
  const handleLogout = () => {
    // Clear all localStorage data
    localStorage.clear();

    // Reset context states
    context.setIsLogin(false);
    context.setUser(null);
    context.setToken(null);
    context.setRole(null);

    // Redirect to homepage
    navigate('/homepage');
  };

  const renderLink = (to, button, requiresEnrollment = true, requiresPayment = false) => {
    if (requiresPayment) {
      // For payment, check if user can access payment
      if (!canAccessPayment) {
        return button;
      }
      return <Link to={to}>{button}</Link>;
    }
    
    if (requiresEnrollment && !isOfficiallyEnrolled) {
      return button;
    }
    return <Link to={to}>{button}</Link>;
  };

  return (
    <div className="sidebar">
      <ul>
        <li>
          {renderLink("/student-dashboard",
            <Button 
              className={`w-100 ${activeTab === 0 ? 'active' : ''}`} 
              disabled={!isOfficiallyEnrolled}
              sx={{ 
                opacity: !isOfficiallyEnrolled ? 0.6 : 1,
                color: !isOfficiallyEnrolled ? '#666 !important' : 'inherit',
                backgroundColor: !isOfficiallyEnrolled ? '#f5f5f5' : 'inherit',
                cursor: !isOfficiallyEnrolled ? 'not-allowed' : 'pointer',
                '&:hover': {
                  backgroundColor: !isOfficiallyEnrolled ? '#f5f5f5' : 'inherit',
                }
              }}
            >
              <span className='icon'><RiDashboardHorizontalLine /></span>
              Dashboard
            </Button>
          )}
        </li>
        <li>
          {renderLink("/student-profile",
            <Button 
              className={`w-100 ${activeTab === 1 ? 'active' : ''}`} 
            >
              <span className='icon'><PiStudentBold /></span>
              My Profile
            </Button>
          , false)} {/* false means this doesn't require enrollment */}
        </li>
        <li>
          {renderLink("/student-courses",
            <Button 
              className={`w-100 ${activeTab === 2 ? 'active' : ''}`} 
              disabled={!isOfficiallyEnrolled}
              sx={{ 
                opacity: !isOfficiallyEnrolled ? 0.6 : 1,
                color: !isOfficiallyEnrolled ? '#666 !important' : 'inherit',
                backgroundColor: !isOfficiallyEnrolled ? '#f5f5f5' : 'inherit',
                cursor: !isOfficiallyEnrolled ? 'not-allowed' : 'pointer',
                '&:hover': {
                  backgroundColor: !isOfficiallyEnrolled ? '#f5f5f5' : 'inherit',
                }
              }}
            >
              <span className='icon'><FaBookOpen /></span>
              My Courses
            </Button>
          )}
        </li>
        {/* Apply the same sx prop to other disabled buttons */}
        {/* Apply the same pattern to other menu items */}
        <li>
          {renderLink("/academic-records",
            <Button 
              className={`w-100 ${activeTab === 3 ? 'active' : ''}`} 
              disabled={!isOfficiallyEnrolled}
              sx={{ 
                opacity: !isOfficiallyEnrolled ? 0.6 : 1,
                color: !isOfficiallyEnrolled ? '#666 !important' : 'inherit',
                backgroundColor: !isOfficiallyEnrolled ? '#f5f5f5' : 'inherit',
                cursor: !isOfficiallyEnrolled ? 'not-allowed' : 'pointer',
                '&:hover': {
                  backgroundColor: !isOfficiallyEnrolled ? '#f5f5f5' : 'inherit',
                }
              }}
            >
              <span className='icon'><IoDocuments /></span>
              Academic Records
            </Button>
          )}
        </li>
        <li>
          {renderLink("/request-document",
            <Button 
              className={`w-100 ${activeTab === 4 ? 'active' : ''}`} 
              disabled={!isOfficiallyEnrolled}
              sx={{ 
                opacity: !isOfficiallyEnrolled ? 0.6 : 1,
                color: !isOfficiallyEnrolled ? '#666 !important' : 'inherit',
                backgroundColor: !isOfficiallyEnrolled ? '#f5f5f5' : 'inherit',
                cursor: !isOfficiallyEnrolled ? 'not-allowed' : 'pointer',
                '&:hover': {
                  backgroundColor: !isOfficiallyEnrolled ? '#f5f5f5' : 'inherit',
                }
              }}
            >
              <span className='icon'><GiPapers /></span>
              Request Document
            </Button>
          )}
        </li>
        <li>
          {renderLink("/student-payment",
            <Button 
              className={`w-100 ${activeTab === 5 ? 'active' : ''}`} 
              disabled={!canAccessPayment}
              sx={{ 
                opacity: !canAccessPayment ? 0.6 : 1,
                color: !canAccessPayment ? '#666 !important' : 'inherit',
                backgroundColor: !canAccessPayment ? '#f5f5f5' : 'inherit',
                cursor: !canAccessPayment ? 'not-allowed' : 'pointer',
                '&:hover': {
                  backgroundColor: !canAccessPayment ? '#f5f5f5' : 'inherit',
                }
              }}
            >
              <span className='icon'><FaMoneyBillWave /></span>
              Payment
            </Button>
          , false, true)} {/* false for requiresEnrollment, true for requiresPayment */}
        </li>
      </ul>

      <div className='logoutWrap'>
        <div className='logoutBox'>
          <Button variant="contained" onClick={handleLogout}>
            <HiOutlineLogout /> Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StudentSidebar;