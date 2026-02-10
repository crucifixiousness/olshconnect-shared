import Button from '@mui/material/Button';
import { RiDashboardHorizontalLine } from "react-icons/ri";
import { FaAnglesRight } from "react-icons/fa6";
import { PiStudentBold } from "react-icons/pi";
import { IoDocuments } from "react-icons/io5";
import { IoIosPeople } from "react-icons/io";
import { FaGraduationCap } from "react-icons/fa";
import { FaUserCog } from "react-icons/fa";
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { HiOutlineLogout } from "react-icons/hi";


const Sidebar = () =>{
  const [isToggleStudentMenu, setIsToggleStudentMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Function to get active tab based on current route
  const getActiveTab = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return 0;
      case '/studentlist':
        return 1;
      case '/':
        return 2;
      case '/staffs':
        return 3;
      case '/program-management':
        return 4;
      case '/document-request':
        return 5;
      case '/admin-account-management':
        return 6; // Add admin account management
      case '/student-accounts-management':
        return 7; // Add student accounts management
      default:
        return 0;
    }
  };

  const activeTab = getActiveTab();

  const isOpenStudentMenu = (index) => {
    setIsToggleStudentMenu(!isToggleStudentMenu);
  };

  const handleLogout = () => {
    // Clear all local storage data
    localStorage.clear();
    // Redirect to homepage
    navigate('/homepage');
  };

    return(
      <>
        <div className="sidebar">
          <ul>
            <li>
              <Link to="/dashboard">
                <Button className={`w-100 ${activeTab===0 ? 'active' : ''}`} onClick={()=>isOpenStudentMenu(0)}>
                  <span className='icon'><RiDashboardHorizontalLine /></span>
                    Dashboard 
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
              <Link to="/">
                <Button className={`w-100 ${activeTab===2 ? 'active' : ''}`} onClick={()=>isOpenStudentMenu(2)}>
                  <span className='icon'><IoDocuments />
                  </span>
                    Records 
                  <span className='arrow'><FaAnglesRight />
                  </span>
                </Button>
              </Link>              
            </li>
            <li>
              <Link to="/staffs">
                <Button className={`w-100 ${activeTab===3 ? 'active' : ''}`} onClick={()=>isOpenStudentMenu(3)}>
                  <span className='icon'><IoIosPeople />
                  </span>
                    Manage Staffs
                  <span className='arrow'><FaAnglesRight />
                  </span>
                </Button>
              </Link>              
            </li>
            <li>
              <Link to="/program-management">
                <Button className={`w-100 ${activeTab===4 ? 'active' : ''}`} onClick={()=>isOpenStudentMenu(4)}>
                  <span className='icon'><FaGraduationCap />
                  </span>
                    Manage Programs
                  <span className='arrow'><FaAnglesRight />
                  </span>
                </Button>
              </Link>              
            </li>
            <li>
              <Link to="/document-request">
                <Button className={`w-100 ${activeTab===5 ? 'active' : ''}`} onClick={()=>isOpenStudentMenu(5)}>
                  <span className='icon'><IoIosPeople />
                  </span>
                    Document Request
                  <span className='arrow'><FaAnglesRight />
                  </span>
                </Button>
              </Link>              
            </li>
            <li>
              <Link to="/admin-account-management">
                <Button className={`w-100 ${activeTab===6 ? 'active' : ''}`} onClick={()=>isOpenStudentMenu(6)}>
                  <span className='icon'><FaUserCog />
                  </span>
                    Admin Account Management
                  <span className='arrow'><FaAnglesRight />
                  </span>
                </Button>
              </Link>              
            </li>
            <li>
              <Link to="/student-accounts-management">
                <Button className={`w-100 ${activeTab===7 ? 'active' : ''}`} onClick={()=>isOpenStudentMenu(7)}>
                  <span className='icon'><PiStudentBold />
                  </span>
                    Student Accounts
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

export default Sidebar;
