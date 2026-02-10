import Button from '@mui/material/Button';
import { RiDashboardHorizontalLine } from "react-icons/ri";
import { FaAnglesRight } from "react-icons/fa6";
import { IoDocuments } from "react-icons/io5";
import { BsCalendar3 } from "react-icons/bs";
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { HiOutlineLogout } from "react-icons/hi";

const InstructorSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isClassMenuOpen, setIsClassMenuOpen] = useState(false);

  // Function to get active tab based on current route
  const getActiveTab = () => {
    const path = location.pathname;
    switch (path) {
      case '/instructor-dashboard':
        return 0;
      case '/instructor-classes':
      case '/instructor-classes/grades':
        return 1;
      case '/instructor-schedule':
        return 2;
      default:
        return 0;
    }
  };

  const activeTab = getActiveTab();

  const toggleClassMenu = (index) => {
    setIsClassMenuOpen(!isClassMenuOpen);
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
            <Link to="/instructor-dashboard">
              <Button className={`w-100 ${activeTab === 0 ? 'active' : ''}`} >
                <span className='icon'><RiDashboardHorizontalLine /></span>
                Dashboard
                <span className='arrow'><FaAnglesRight /></span>
              </Button>
            </Link>
          </li>
          <li>
            <Link to="/instructor-classes">
              <Button className={`w-100 ${activeTab === 1 && isClassMenuOpen ? 'active' : ''}`} onClick={() => toggleClassMenu(1)}>
                <span className='icon'><IoDocuments /></span>
                Class Management
                <span className='arrow'><FaAnglesRight /></span>
              </Button>
            </Link>
            <div className={`studentMenuWrap ${isClassMenuOpen ? 'colapse' : 'colapsed'}`}>
              <ul className="studentMenu">
                <li><Link to="/instructor-classes/grades">Grade Entry</Link></li>
              </ul>
            </div>
          </li>
          <li>
            <Link to="/instructor-schedule">
              <Button className={`w-100 ${activeTab === 2 ? 'active' : ''}`} >
                <span className='icon'><BsCalendar3 /></span>
                Schedule
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

export default InstructorSidebar;