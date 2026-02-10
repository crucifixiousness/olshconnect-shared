import logo from '../../asset/images/olshco-logo1.png';
import loginbackground from '../../asset/images/login-background.jpg';
import React, { useState } from 'react';
import { FaRegUserCircle } from "react-icons/fa";
import { RiLockPasswordLine } from "react-icons/ri";
import { VscEye } from "react-icons/vsc";
import { VscEyeClosed } from "react-icons/vsc";
import Button from '@mui/material/Button';
import { Link } from 'react-router-dom';
import axios from 'axios';
import CircularProgress from '@mui/material/CircularProgress';

const LoginHoneypotMonitor = {
  logActivity: async (type, details) => {
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

    // Create detailed log entry (preformatted)
    const logEntry = `
=== LOGIN HONEYPOT LOG ENTRY ===
Visitor IP Address: Unknown

Timestamp: ${timestamp}

Requested URL or Endpoint: /fake-login

HTTP Method: POST

User-Agent: ${navigator.userAgent}

Referrer: ${document.referrer || '(none)'}

Request Body / POST Data: ${JSON.stringify(details) || 'N/A'}

Login Attempted (Username / Password): ${details.username || 'N/A'}:${details.password || 'N/A'}

Command Attempted (SSH / Telnet Honeypot): ${details.commandAttempt || 'N/A'}

Exploit Payload or Input: ${details.exploitPayload || details.value || 'N/A'}

Uploaded or Downloaded File Info: Filename: ${details.fileName || 'N/A'}, Size: ${details.fileSize || 'N/A'} bytes, Type: ${details.fileType || 'N/A'}

GeoIP Location (Resolved from IP): Unknown

Port Accessed: 443

Protocol Used: HTTPS

Session Duration: Unknown

Number of Commands Issued: Commands: 1

Detected Vulnerability Attempt: ${details.vulnerabilityType || type}

Bot Score / Risk Score: Bot Score: 85%, Risk: High

Honeypot Path Accessed: ${details.honeypotPath || '/fake-login-page'}

Headers: Content-Type: application/json, User-Agent: ${navigator.userAgent.substring(0, 50)}...

Activity Type: ${type}
Action: ${details.action || 'N/A'}
Additional Data: ${JSON.stringify(details, null, 2)}

=== END LOG ENTRY ===
`;

    try {
      await axios.post('/api/login-honeypot-log', {
        logEntry,
        timestamp,
        activityType: type,
        ...details
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      // Optionally log to console
      console.error('❌ Login honeypot logging failed:', err);
    }
  }
};

const FakeLogin = () => {
  const [inputIndex, setInputIndex] = useState(null);
  const [isShowPass, setIsShowPass] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const focusInput = (index) => {
      setInputIndex(index);
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value });
  };

  const handleFakeLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await LoginHoneypotMonitor.logActivity('fake_login_page_submitted', {
        username: credentials.username,
        password: credentials.password,
        honeypotPath: '/fake-login-page',
        action: 'submit',
        vulnerabilityType: 'Fake Login Page Attempt',
        pageType: 'student_login_honeypot'
      });
      
      // Always show error message to maintain deception
      setErrorMessage('Invalid credentials. Please try again.');
      
    } catch (error) {
      // Even if there's an error, show the fake error message
      setErrorMessage('Invalid credentials. Please try again.');
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
                    {/* Same logo and header as real login */}
                    <div className='logo text-center'>
                      <img src={logo} alt="samp" width="60px" className='pb-1' />
                      <h5 className='loginHeader'>Login to OLSHCOnnect</h5>
                    </div>

                    <form onSubmit={handleFakeLogin}>
                        {errorMessage && (
                            <div className='alert alert-danger'>
                                {errorMessage}
                            </div>
                        )}                        
                        <div className={`form-group position-relative mt-5 ${inputIndex === 0 && 'focus'}`}>
                            <span className='icon'><FaRegUserCircle /></span>
                            <input 
                              type='text' 
                              className='form-control' 
                              placeholder='Username' 
                              onFocus={() => focusInput(0)} 
                              onBlur={() => setInputIndex(null)} 
                              name='username' 
                              value={credentials.username} 
                              onChange={handleInputChange} 
                              autoFocus 
                            />
                        </div>

                        <div className={`form-group position-relative ${inputIndex === 1 && 'focus'}`}>
                            <span className='icon'><RiLockPasswordLine /></span>
                            <input 
                              type={`${isShowPass === true ? 'text' : 'password'}`} 
                              className='form-control' 
                              placeholder='Password' 
                              onFocus={() => focusInput(1)} 
                              onBlur={() => setInputIndex(null)} 
                              name='password' 
                              value={credentials.password} 
                              onChange={handleInputChange} 
                            />

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
                        <Link to={'/homepage'} className='link color'>Register</Link>
                    </span>
                </div>
            </div>
        </section>
    </>
  );
}

export default FakeLogin; 