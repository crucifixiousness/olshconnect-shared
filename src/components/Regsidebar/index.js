import Button from '@mui/material/Button';
import { RiDashboardHorizontalLine } from "react-icons/ri";
import { FaAnglesRight } from "react-icons/fa6";
import { PiStudentBold } from "react-icons/pi";
import { IoDocuments } from "react-icons/io5";
import { IoIosPeople } from "react-icons/io";
import { FaExchangeAlt } from "react-icons/fa";
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext, useState } from 'react';
import { HiOutlineLogout } from "react-icons/hi";
import { MyContext } from '../../App';

const RegistrarSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setRole, setIsLogin } = useContext(MyContext);

  const handleLogout = () => {
    // Clear all localStorage
    localStorage.clear();
    
    // Reset context states
    setUser(null);
    setRole(null);
    setIsLogin(false);
    
    // Navigate to homepage
    navigate('/homepage', { replace: true });
  };

  // Function to get active tab based on current route
  const getActiveTab = () => {
    const path = location.pathname;
    switch (path) {
      case '/registrar-dashboard':
        return 0;
      case '/studentlist':
        return 1;
      case '/registrar-enrollmentt':
        return 2;
      case '/document-request':
        return 3;
      case '/registrar-credit-transfer':
        return 4;
      default:
        return 0;
    }
  };

  const activeTab = getActiveTab();
  const [isToggleStudentMenu, setIsToggleStudentMenu] = useState(false);

  const isOpenStudentMenu = (index) => {
    setIsToggleStudentMenu(!isToggleStudentMenu);
  };


    return(
      <>
        <div className="sidebar">
          <ul>
            <li>
              <Link to="/registrar-dashboard">
                <Button className={`w-100 ${activeTab===0 ? 'active' : ''}`} onClick={()=>isOpenStudentMenu(0)}>
                  <span className='icon'><RiDashboardHorizontalLine /></span>
                    Registrar Dashboard 
                  <span className='arrow'><FaAnglesRight />
                  </span>
                </Button>
              </Link>              
            </li>
            <li>
                <Link to="/studentlist">            
                  <Button className={`w-100 ${activeTab===1  && isToggleStudentMenu===true ? 'active' : ''}`} onClick={()=>isOpenStudentMenu(1)}>
                    <span className='icon'><PiStudentBold /></span>
                      Student List 
                    <span className='arrow'><FaAnglesRight />
                    </span>             
                  </Button>
                </Link>
                <div className={`studentMenuWrap ${activeTab===1 && isToggleStudentMenu===true ? 'colapse' : 'colapsed'}`}>
                  <ul className="studentMenu">
                    <li><Link to="#">Bachelor of Science in Education</Link></li>
                    <li><Link to="#">Bachelor of Science in Criminology</Link></li>
                    <li><Link to="#">Bachelor of Science in Hospitality Management</Link></li>
                    <li><Link to="#">Bachelor of Science in Information Technology</Link></li>
                    <li><Link to="#">Bachelor of Science in Office Administration</Link></li>
                  </ul>
                </div>                             
            </li>
            <li>
              <Link to="/registrar-enrollmentt">
                <Button className={`w-100 ${activeTab===2 ? 'active' : ''}`} onClick={()=>isOpenStudentMenu(2)}>
                  <span className='icon'><IoDocuments />
                  </span>
                    Enrollment 
                  <span className='arrow'><FaAnglesRight />
                  </span>
                </Button>
              </Link>              
            </li>
            <li>
              <Link to="/document-request">
                <Button className={`w-100 ${activeTab===3 ? 'active' : ''}`} onClick={()=>isOpenStudentMenu(3)}>
                  <span className='icon'><IoIosPeople />
                  </span>
                    Document Request
                  <span className='arrow'><FaAnglesRight />
                  </span>
                </Button>
              </Link>              
            </li>
            <li>
              <Link to="/registrar-credit-transfer">
                <Button className={`w-100 ${activeTab===4 ? 'active' : ''}`} onClick={()=>isOpenStudentMenu(4)}>
                  <span className='icon'><FaExchangeAlt />
                  </span>
                    Credit Transfer
                  <span className='arrow'><FaAnglesRight />
                  </span>
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
    )
}

export default RegistrarSidebar;
