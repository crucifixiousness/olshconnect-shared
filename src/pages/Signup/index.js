import logo from '../../asset/images/olshco-logo1.png';
import loginbackground from '../../asset/images/login-background.jpg';
import { MyContext } from '../../App';
import React, { useContext, useEffect, useState } from 'react';
import { FaRegUserCircle } from "react-icons/fa";
import { RiLockPasswordLine } from "react-icons/ri";
import { VscEye } from "react-icons/vsc";
import { VscEyeClosed } from "react-icons/vsc";
import Button from '@mui/material/Button';
import axios from 'axios';
import CircularProgress from '@mui/material/CircularProgress';

// Honeypot detection for staff login
const detectMaliciousStaffLogin = (username, password) => {
  const suspiciousUsernames = [
    'root', 'administrator', 'guest', 'user', 'demo',
    'sqlmap', 'hacker', 'attacker', 'malware', 'virus', 'backdoor'
  ];
  const suspiciousPasswords = [
    '123456', 'password', 'root', 'toor', 'test', 'guest',
    '123456789', 'qwerty', 'abc123', 'password123'
  ];
  const sqlInjectionPatterns = [
    "' OR '1'='1", "' OR 1=1--", "admin'--", "admin'/*", 
    "' UNION SELECT", "'; DROP TABLE", "'; INSERT INTO",
    "1' OR '1'='1", "1' OR 1=1#", "admin' #"
  ];
  const xssPatterns = [
    "<script>", 
    // eslint-disable-next-line no-script-url
    "javascript:", "onload=", "onerror=", "onclick=",
    "<img src=x onerror=", "<svg onload=", "alert(", "confirm("
  ];
  const username_lower = username.toLowerCase();
  const password_lower = password.toLowerCase();

  if (suspiciousUsernames.some(susp => username_lower.includes(susp))) {
    return { detected: true, type: 'Suspicious Username', pattern: username };
  }
  if (suspiciousPasswords.some(susp => password_lower.includes(susp))) {
    return { detected: true, type: 'Suspicious Password', pattern: password };
  }
  if (sqlInjectionPatterns.some(pattern => 
    username_lower.includes(pattern.toLowerCase()) || 
    password_lower.includes(pattern.toLowerCase())
  )) {
    return { detected: true, type: 'SQL Injection Attempt', pattern: `${username}:${password}` };
  }
  if (xssPatterns.some(pattern => 
    username_lower.includes(pattern.toLowerCase()) || 
    password_lower.includes(pattern.toLowerCase())
  )) {
    return { detected: true, type: 'XSS Attempt', pattern: `${username}:${password}` };
  }
  return { detected: false };
};

const Signup = () => {
  const [inputIndex, setInputIndex] = useState(null);
  const [isShowPass, setIsShowPass] = useState(false);
  const [credentials, setCredentials] = useState({ staff_username: '', staff_password: '' });
  const [errorMessage, setErrorMessage] = useState('');

  const { setIsLogin, setUser, setRole, setToken } = useContext(MyContext);

  const context = useContext(MyContext);

  useEffect(() => {
      context.setIsHideComponents(true);
      window.scrollTo(0, 0);
  }, [context]);

  const focusInput = (index) => {
      setInputIndex(index);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value });
  };

  // Add loading state
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // 🚨 HONEYPOT: Check for malicious staff login attempt
    const maliciousCheck = detectMaliciousStaffLogin(credentials.staff_username, credentials.staff_password);

    if (maliciousCheck.detected) {
      // Log the malicious attempt
      await axios.post('/api/login-honeypot-log', {
        timestamp: new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2'),
        activityType: maliciousCheck.type,
        username: credentials.staff_username,
        password: credentials.staff_password,
        exploitPayload: maliciousCheck.pattern,
        honeypotPath: '/staff-login',
        action: 'attempt',
        vulnerabilityType: maliciousCheck.type,
        pageType: 'staff_login_real'
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      // Optionally, show a fake error or redirect to a fake staff login page
      setErrorMessage('Login failed. Please try again.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/loginstaff', credentials);
      const { token, user } = response.data;
  
      // Clear existing data
      localStorage.clear();
      
      // Store new data
      localStorage.setItem('isLogin', 'true');
      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role);
      localStorage.setItem('user', JSON.stringify({
        ...user,
        staff_username: user.staff_username || user.username,
        fullName: user.fullName || user.staff_name
      }));
      
      // Store program_id and staff_id separately for easy access
      if (user.program_id) {
        localStorage.setItem('program_id', user.program_id.toString());
      }
      if (user.staff_id) {
        localStorage.setItem('staff_id', user.staff_id.toString());
      }
  
      // Update context
      setToken(token);
      setRole(user.role);
      setUser(user);
      setIsLogin(true);
  
      // Navigate
      const paths = {
        'admin': '/dashboard',
        'instructor': '/instructor-dashboard',
        'registrar': '/registrar-dashboard',
        'finance': '/finance-dashboard',
        'program head': '/programhead-dashboard',
        'dean': '/dean-dashboard'
      };
  
      const redirectPath = paths[user.role] || '/dashboard';
      window.location.href = redirectPath;
  
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update the submit button in the form

  return (
    <>
      <img src={loginbackground} className='loginBg' alt="Login Background" />
      <section className='loginSection signupSection'>
        <div className='row'>
          <div className='col-md-8 d-flex align-items-center flex-column justify-content-center part1'>
            <h1>
              WELCOME TO <span className='text-sky'>OLSHCOnnect</span>, MAINLY FOR 
              <span className='text-sky'> ADMIN</span> AND <span className='text-sky'>STAFFS</span>
            </h1>
            <p>
              In the OLSHCOnnect's Portal, the Admin manages user access and system operations to ensure smooth functionality. 
              The Registrar oversees enrollment by reviewing applications and documents, finalizing enrollment once Finance confirms payment. 
              Finance handles tuition processing, updating payment status so the Registrar can complete official registration. 
              Instructors also have access to input calculated student grades, allowing students to view their academic progress. 
              This coordinated system ensures each role efficiently manages its tasks, creating a seamless enrollment and academic tracking process.
            </p>
          </div>

          <div className='col-md-4 pr-0'>
            <div className='loginBox'>
              <div className='logo text-center'>
                <img src={logo} width="60px" className='pb-1' alt="Logo" />
                <h5 className='loginHeader'>Staff Login</h5>
              </div>

              <div className='loginWrap card border'>
                <form onSubmit={handleLogin}>
                  {errorMessage && (
                    <div className='alert alert-danger'>
                      {errorMessage}
                    </div>
                  )}
                  <div className={`form-group position-relative ${inputIndex === 0 && 'focus'}`}>
                    <span className='icon'><FaRegUserCircle /></span>
                    <input
                      type='text'
                      className='form-control'
                      placeholder='Username'
                      name='staff_username'
                      value={credentials.staff_username}
                      onChange={handleInputChange}
                      onFocus={() => focusInput(0)}
                      onBlur={() => setInputIndex(null)}
                      autoFocus
                    />
                  </div>

                  <div className={`form-group position-relative ${inputIndex === 1 && 'focus'}`}>
                    <span className='icon'><RiLockPasswordLine /></span>
                    <input
                      type={isShowPass ? 'text' : 'password'}
                      className='form-control'
                      placeholder='Password'
                      name='staff_password'
                      value={credentials.staff_password}
                      onChange={handleInputChange}
                      onFocus={() => focusInput(1)}
                      onBlur={() => setInputIndex(null)}
                    />
                    <span className='showPass' onClick={() => setIsShowPass(!isShowPass)}>
                      {isShowPass ? <VscEye /> : <VscEyeClosed />}
                    </span>
                  </div>

                  <div className='form-group'>
                  <Button 
                    className="btn-blue btn-lg w-100 btn-big" 
                    type="submit" 
                    disabled={isLoading}
                    sx={{ 
                      display: 'flex', 
                      gap: '10px',
                      alignItems: 'center',
                      justifyContent: 'center' 
                    }}
                  >
                    {isLoading && <CircularProgress size={20} color="inherit" />}
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

    </>
  );
};

export default Signup;
