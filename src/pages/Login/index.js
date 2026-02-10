import logo from '../../asset/images/olshco-logo1.png';
import loginbackground from '../../asset/images/login-background.jpg';
import { MyContext } from '../../App';
import React, { useContext, useEffect, useState } from 'react';
import { FaRegUserCircle } from "react-icons/fa";
import { RiLockPasswordLine } from "react-icons/ri";
import { VscEye } from "react-icons/vsc";
import { VscEyeClosed } from "react-icons/vsc";
import Button from '@mui/material/Button';
import { Link } from 'react-router-dom';
import axios from 'axios';
import CircularProgress from '@mui/material/CircularProgress';

// Honeypot monitoring system for login page
const LoginHoneypotMonitor = {
  suspiciousActivities: [],
  sessionStartTime: Date.now(),
  commandCount: 0,
  loginAttempts: 0,

  logActivity: async (type, details) => {
    const activity = {
      timestamp: new Date().toISOString(),
      type,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    LoginHoneypotMonitor.suspiciousActivities.push(activity);
    LoginHoneypotMonitor.commandCount++;

    // Calculate session duration
    const sessionDuration = Math.floor((Date.now() - LoginHoneypotMonitor.sessionStartTime) / 1000);

    // Format timestamp for log file
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');

    // Create detailed log entry
    const logEntry = `
=== LOGIN HONEYPOT LOG ENTRY ===
Visitor IP Address: ${details.ipAddress || 'Unknown'}

Timestamp: ${timestamp}

Requested URL or Endpoint: ${window.location.pathname}

HTTP Method: ${details.httpMethod || 'POST'}

User-Agent: ${navigator.userAgent}

Referrer: ${document.referrer || '(none)'}

Request Body / POST Data: ${JSON.stringify(details) || 'N/A'}

Login Attempted (Username / Password): ${details.username || 'N/A'}:${details.password || 'N/A'}

Command Attempted (SSH / Telnet Honeypot): ${details.commandAttempt || 'N/A'}

Exploit Payload or Input: ${details.exploitPayload || details.value || 'N/A'}

Uploaded or Downloaded File Info: Filename: ${details.fileName || 'N/A'}, Size: ${details.fileSize || 'N/A'} bytes, Type: ${details.fileType || 'N/A'}

GeoIP Location (Resolved from IP): ${details.geoLocation || 'Unknown'}

Port Accessed: ${details.port || '443'}

Protocol Used: ${details.protocol || 'HTTPS'}

Session Duration: Connected for ${sessionDuration} seconds

Number of Commands Issued: Commands: ${LoginHoneypotMonitor.commandCount}

Detected Vulnerability Attempt: ${details.vulnerabilityType || type}

Bot Score / Risk Score: Bot Score: ${details.botScore || '85%'}, Risk: ${details.riskLevel || 'High'}

Honeypot Path Accessed: ${details.honeypotPath || '/fake_login_form'}

Headers: Content-Type: application/json, User-Agent: ${navigator.userAgent.substring(0, 50)}...

Activity Type: ${type}
Action: ${details.action || 'N/A'}
Additional Data: ${JSON.stringify(details, null, 2)}

=== END LOG ENTRY ===

`;

    // Send to payment log file (same endpoint for all honeypot logs)
    try {
      console.log('📝 Sending login log to payment-log API:', { activityType: type, timestamp });
      await axios.post('/api/payment-log', {
        logEntry,
        timestamp,
        activityType: type,
        ...details
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error('Login logging failed:', err);
    }

    console.warn('🚨 LOGIN HONEYPOT TRIGGERED:', activity);
  },

  detectMaliciousLogin: (username, password) => {
    const suspiciousUsernames = [
      'admin', 'root', 'administrator', 'test', 'guest', 'user', 'demo',
      'sqlmap', 'hacker', 'attacker', 'malware', 'virus', 'backdoor'
    ];

    const suspiciousPasswords = [
      'admin', '123456', 'password', 'root', 'toor', 'test', 'guest',
      '123456789', 'qwerty', 'abc123', 'password123', 'admin123'
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

    // Check for suspicious usernames
    if (suspiciousUsernames.some(susp => username_lower.includes(susp))) {
      return { detected: true, type: 'Suspicious Username', pattern: username };
    }

    // Check for suspicious passwords
    if (suspiciousPasswords.some(susp => password_lower.includes(susp))) {
      return { detected: true, type: 'Suspicious Password', pattern: password };
    }

    // Check for SQL injection patterns
    if (sqlInjectionPatterns.some(pattern => 
      username_lower.includes(pattern.toLowerCase()) || 
      password_lower.includes(pattern.toLowerCase())
    )) {
      return { detected: true, type: 'SQL Injection Attempt', pattern: `${username}:${password}` };
    }

    // Check for XSS patterns
    if (xssPatterns.some(pattern => 
      username_lower.includes(pattern.toLowerCase()) || 
      password_lower.includes(pattern.toLowerCase())
    )) {
      return { detected: true, type: 'XSS Attempt', pattern: `${username}:${password}` };
    }

    // Check for brute force (multiple rapid attempts)
    LoginHoneypotMonitor.loginAttempts++;
    if (LoginHoneypotMonitor.loginAttempts > 5) {
      return { detected: true, type: 'Brute Force Attempt', pattern: `Multiple attempts: ${LoginHoneypotMonitor.loginAttempts}` };
    }

    return { detected: false };
  }
};

const Login = () => {
  const [inputIndex, setInputIndex] = useState(null);
  const [isShowPass, setIsShowPass] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const context = useContext(MyContext);
  const { isLogin, setIsLogin, setUser, setRole, setToken } = useContext(MyContext);

  useEffect(() => {
      context.setIsHideComponents(true);
  }, [context]);

  const focusInput = (index) => {
      setInputIndex(index);
  }

    const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value });
    };

    // Add loading state
    const [isLoading, setIsLoading] = useState(false);

    // Add this useEffect after your existing useEffect
    useEffect(() => {
      if (isLogin) {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const redirectPath = userData.enrollment_status === 'Officially Enrolled' 
          ? '/student-dashboard' 
          : '/student-profile';
        window.location.href = redirectPath;
      }
    }, [isLogin]);
    
    // Then modify your handleLogin function to remove the redirect logic
    const handleLogin = async (e) => {
      e.preventDefault();
      setIsLoading(true);

      try {
        // 🚨 HONEYPOT: Check for malicious login attempt
        const maliciousCheck = LoginHoneypotMonitor.detectMaliciousLogin(credentials.username, credentials.password);

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
            username: credentials.username,
            password: credentials.password,
            exploitPayload: maliciousCheck.pattern,
            honeypotPath: '/login',
            action: 'attempt',
            vulnerabilityType: maliciousCheck.type,
            pageType: 'student_login_real',
            // Add any other details you want to log
          }, {
            headers: { 'Content-Type': 'application/json' }
          });

          // Then redirect to fake login
          window.location.href = '/logIn';
          return;
        }

        const response = await axios.post('/api/loginstudent', credentials);
        const { token, user } = response.data;

        // Clear any existing data first
        localStorage.clear();

        // Store login state
        localStorage.setItem('isLogin', 'true');

        // Store other data
        localStorage.setItem('token', token);
        localStorage.setItem('role', user.role);
        localStorage.setItem('student_id', user.student_id);
        localStorage.setItem('user', JSON.stringify(user));

        // Update context
        setToken(token);
        setRole(user.role);
        setUser(user);
        setIsLogin(true);

      } catch (error) {
        let errorMsg = 'Login failed. Please try again.';
        if (error.response?.data?.message) {
          errorMsg = error.response.data.message;
        }
        setErrorMessage(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };


  return (
    <>
        <img src={loginbackground} alt="samp" className='loginBg' />
        <section className='loginSection'>
            <div className='loginBox'>
                <div className='loginWrap mt-5 card border'>
                    {/* Moved logo and header inside the loginWrap */}
                    <div className='logo text-center'>
                      <img src={logo} alt="samp" width="60px" className='pb-1' />
                      <h5 className='loginHeader'>Login to OLSHCOnnect</h5>
                    </div>

                    <form onSubmit={handleLogin}>
                        {errorMessage && (
                            <div className='alert alert-danger'>
                                {errorMessage}
                            </div>
                        )}                        
                        <div className={`form-group position-relative mt-5 ${inputIndex === 0 && 'focus'}`}>
                            <span className='icon'><FaRegUserCircle /></span>
                            <input type='text' className='form-control' placeholder='Username' onFocus={() => focusInput(0)} onBlur={() => setInputIndex(null)} name='username' value={credentials.username} onChange={handleInputChange} autoFocus />
                        </div>

                        <div className={`form-group position-relative ${inputIndex === 1 && 'focus'}`}>
                            <span className='icon'><RiLockPasswordLine /></span>
                            <input type={`${isShowPass === true ? 'text' : 'password'}`} className='form-control' placeholder='Password' onFocus={() => focusInput(1)} onBlur={() => setInputIndex(null)} name='password' value={credentials.password} onChange={handleInputChange} />

                            <span className='showPass' onClick={() => setIsShowPass(!isShowPass)}>
                                {isShowPass === true ? <VscEye /> : <VscEyeClosed />}
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

                        <div className='form-group text-center mb-0'>                        
                            <Link to={'/forgot-password'} className='link'>FORGOT PASSWORD</Link>
                        </div>
                    </form>
                </div>

                <div className='loginWrap mt-3 card border footer p-3'>
                    <span className='text-center'>
                        Don't have an account?
                        <Link to={'/homepage'} className='link'>Register</Link>
                    </span>
                </div>
            </div>
        </section>
    </>
  );
}

export default Login;
