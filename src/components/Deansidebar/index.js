import Button from '@mui/material/Button';
import { RiDashboardHorizontalLine } from "react-icons/ri";
import { FaAnglesRight } from "react-icons/fa6";
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { HiOutlineLogout } from "react-icons/hi";
import { MyContext } from '../../App';

const DeanSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setRole, setIsLogin } = useContext(MyContext);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setRole(null);
    setIsLogin(false);
    navigate('/homepage', { replace: true });
  };

  // Function to get active tab based on current route
  const getActiveTab = () => {
    const path = location.pathname;
    switch (path) {
      case '/dean-dashboard':
        return 0;
      default:
        return 0;
    }
  };

  const activeTab = getActiveTab();

  return (
    <>
      <div className="sidebar">
        <ul>
          <li>
            <Link to="/dean-dashboard">
              <Button className={`w-100 ${activeTab===0 ? 'active' : ''}`}>
                <span className='icon'><RiDashboardHorizontalLine /></span>
                Dean Dashboard
                <span className='arrow'><FaAnglesRight /></span>
              </Button>
            </Link>
          </li>
        </ul>

        <br/>
        <div className='logoutWrap'>
          <div className='logoutBox'>
            <Button variant="contained" onClick={handleLogout}>
              <HiOutlineLogout/>Logout
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeanSidebar;
