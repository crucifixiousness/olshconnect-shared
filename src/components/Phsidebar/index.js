import Button from '@mui/material/Button';
import { RiDashboardHorizontalLine } from "react-icons/ri";
import { FaAnglesRight } from "react-icons/fa6";
import { PiStudentBold } from "react-icons/pi";
import { HiOutlineDesktopComputer } from "react-icons/hi";
import { FaFileAlt } from "react-icons/fa";
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { HiOutlineLogout } from "react-icons/hi";

const ProgramHeadSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isStudentMenuOpen, setIsStudentMenuOpen] = useState(false);
  const [isCourseMenuOpen, setIsCourseMenuOpen] = useState(false);

  // Function to get active tab based on current route
  const getActiveTab = () => {
    const path = location.pathname;
    switch (path) {
      case '/program-head-dashboard':
        return 0;
      case '/program-student-list':
        return 1;
      case '/course-assignments':
        return 2;
      case '/program-head-tor-evaluation':
        return 3;
      default:
        return 0;
    }
  };

  const activeTab = getActiveTab();

  const toggleStudentMenu = (index) => {
    setIsStudentMenuOpen(!isStudentMenuOpen);
  };

  const toggleCourseMenu = (index) => {
    setIsCourseMenuOpen(!isCourseMenuOpen);
  };

  const handleLogout = () => {
      // Clear all local storage data
      localStorage.clear();
      // Redirect to homepage
      navigate('/homepage');
  };

  return (
    <>
      <div className="sidebar">
        <ul>
          <li>
            <Link to="/programhead-dashboard">
              <Button className={`w-100 ${activeTab === 0 ? 'active' : ''}`}>
                <span className='icon'><RiDashboardHorizontalLine /></span>
                Dashboard
                <span className='arrow'><FaAnglesRight /></span>
              </Button>
            </Link>
          </li>
          <li>
            <Link to="/program-studentlist">
              <Button className={`w-100 ${activeTab === 1 && isStudentMenuOpen ? 'active' : ''}`} onClick={() => toggleStudentMenu(1)}>
                <span className='icon'><PiStudentBold /></span>
                Student List
                <span className='arrow'><FaAnglesRight /></span>
              </Button>
            </Link>
            <div className={`studentMenuWrap ${isStudentMenuOpen ? 'colapse' : 'colapsed'}`}>
              <ul className="studentMenu">
                <li><Link to="#">First Year</Link></li>
                <li><Link to="#">Second Year</Link></li>
                <li><Link to="#">Third Year</Link></li>
                <li><Link to="#">Fourth Year</Link></li>
                <li><Link to="#">Fifth Year</Link></li>
              </ul>
            </div>
          </li>
          <li>
            <Link to="/course-assignments">
              <Button className={`w-100 ${activeTab === 2 && isCourseMenuOpen ? 'active' : ''}`} onClick={() => toggleCourseMenu(2)}>
                <span className='icon'><HiOutlineDesktopComputer /></span>
                Course Assignments
                <span className='arrow'><FaAnglesRight /></span>
              </Button>
            </Link>
            <div className={`studentMenuWrap ${isCourseMenuOpen ? 'colapse' : 'colapsed'}`}>
              <ul className="studentMenu">
                <li><Link to="/course-assignments?year=1">First Year</Link></li>
                <li><Link to="/course-assignments?year=2">Second Year</Link></li>
                <li><Link to="/course-assignments?year=3">Third Year</Link></li>
                <li><Link to="/course-assignments?year=4">Fourth Year</Link></li>
              </ul>
            </div>
          </li>
          <li>
            <Link to="/program-head-tor-evaluation">
              <Button className={`w-100 ${activeTab === 3 ? 'active' : ''}`}>
                <span className='icon'><FaFileAlt /></span>
                TOR Evaluation
                <span className='arrow'><FaAnglesRight /></span>
              </Button>
            </Link>
          </li>
        </ul>

        <br />
        <div className='logoutWrap'>
          <div className='logoutBox'>
            <Button variant="contained" onClick={handleLogout}>
              <HiOutlineLogout />Logout
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ProgramHeadSidebar;
