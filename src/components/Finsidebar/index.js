import Button from '@mui/material/Button';
import { RiDashboardHorizontalLine } from "react-icons/ri";
import { FaAnglesRight } from "react-icons/fa6";
import { PiStudentBold } from "react-icons/pi";
import { FaCashRegister } from "react-icons/fa";
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { HiOutlineLogout } from "react-icons/hi";
import { IoDocuments } from "react-icons/io5";
import { FaMoneyBillTransfer } from "react-icons/fa6"; // Add this import
import { FaHistory } from 'react-icons/fa';


const FinanceSidebar = () =>{
  const navigate = useNavigate();
  const location = useLocation();
  const [isToggleStudentMenu, setIsToggleStudentMenu] = useState(false);

  // Function to get active tab based on current route
  const getActiveTab = () => {
    const path = location.pathname;
    switch (path) {
      case '/finance-dashboard':
        return 0;
      case '/counter-payment':
        return 1;
      case '/student-balance':
        return 2;
      case '/tuition-management':
        return 3;
      case '/payment-verification':
        return 4;
      case '/payment-history':
        return 5;
      case '/finance-document-requests':
        return 6;
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
              <Link to="/finance-dashboard">
                <Button className={`w-100 ${activeTab===0 ? 'active' : ''}`} >
                  <span className='icon'><RiDashboardHorizontalLine /></span>
                    Finance Dashboard 
                  <span className='arrow'><FaAnglesRight />
                  </span>
                </Button>
              </Link>              
            </li>
            
            {/* Add new Counter Payment menu item */}
            <li>
              <Link to="/counter-payment">
                <Button className={`w-100 ${activeTab===1 ? 'active' : ''}`} >
                  <span className='icon'><FaMoneyBillTransfer /></span>
                    Counter Payment
                  <span className='arrow'><FaAnglesRight /></span>
                </Button>
              </Link>
            </li>

            {/* Move Student Balance to index 2 */}
            <li>
              <Link to="/student-balance">            
                <Button className={`w-100 ${activeTab===2 && isToggleStudentMenu===true ? 'active' : ''}`} onClick={()=>isOpenStudentMenu(2)}>
                  <span className='icon'><PiStudentBold /></span>
                    Students Balance 
                  <span className='arrow'><FaAnglesRight /></span>             
                </Button>
              </Link>
              <div className={`studentMenuWrap ${activeTab===2 && isToggleStudentMenu===true ? 'colapse' : 'colapsed'}`}>
                <ul className="studentMenu">
                  <li><Link to="#">Bachelor of Science in Education</Link></li>
                  <li><Link to="#">Bachelor of Science in Criminology</Link></li>
                  <li><Link to="#">Bachelor of Science in Hospitality Management</Link></li>
                  <li><Link to="#">Bachelor of Science in Information Technology</Link></li>
                  <li><Link to="#">Bachelor of Science in Office Administration</Link></li>
                </ul>
              </div>                             
            </li>

            {/* Adjust other menu indices */}
            <li>
              <Link to="/tuition-management">
                <Button className={`w-100 ${activeTab===3 ? 'active' : ''}`} >
                  <span className='icon'><FaCashRegister /></span>
                    Tuition Management
                  <span className='arrow'><FaAnglesRight /></span>
                </Button>
              </Link>              
            </li>

            <li>
              <Link to="/payment-verification">
                <Button className={`w-100 ${activeTab===4 ? 'active' : ''}`} >
                  <span className='icon'><IoDocuments /></span>
                    Payment Verification
                  <span className='arrow'><FaAnglesRight /></span>
                </Button>
              </Link>              
            </li>

            {/* Add Payment History menu item */}
            <li>
              <Link to="/payment-history">
                <Button className={`w-100 ${activeTab===5 ? 'active' : ''}`} >
                  <span className='icon'><FaHistory /></span>
                    Payment History
                  <span className='arrow'><FaAnglesRight /></span>
                </Button>
              </Link>              
            </li>

            {/* Add Document Requests menu item */}
            <li>
              <Link to="/finance-document-requests">
                <Button className={`w-100 ${activeTab===6 ? 'active' : ''}`} >
                  <span className='icon'><IoDocuments /></span>
                    Document Requests
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
    )
}

export default FinanceSidebar;
