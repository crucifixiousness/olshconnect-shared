import React, { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MyContext } from '../../App';
import olshcoLogo from '../../asset/images/olshco-logo1.png';
import loginbackground from '../../asset/images/login-background.jpg';
import { FaRegUserCircle, FaRegEnvelope, FaPhone } from "react-icons/fa";
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import axios from 'axios';

const ForgotPassword = () => {
  const context = useContext(MyContext);
  const [username, setUsername] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [studentId, setStudentId] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [inputIndex, setInputIndex] = useState(null);

  useEffect(() => {
    if (context && context.setIsHideComponents) {
      context.setIsHideComponents(true);
    }
  }, [context]);

  const focusInput = (index) => {
    setInputIndex(index);
  };

  const handleContactNumberChange = (e) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > 11) {
      value = value.slice(0, 11);
    }
    if (value.length === 1 && value !== '0') {
      value = '';
    }
    if (value.length === 2 && value !== '09') {
      value = '09';
    }
    setContactNumber(value);
    setError('');
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    if (!username || !contactNumber || !email) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (contactNumber.length !== 11) {
      setError('Contact number must be exactly 11 digits');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/verify-forgot-password', {
        username,
        contactNumber,
        email
      });
      
      if (response && response.data && response.data.success) {
        setMessage('Account verified successfully. You can now reset your password.');
        setIsVerified(true);
        setStudentId(response.data.studentId);
        setStudentName(response.data.studentName || 'Student');
      } else {
        setError('Invalid response from server');
      }
    } catch (error) {
      console.error('Verification error:', error);
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to verify account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/reset-password', {
        studentId: studentId,
        newPassword: newPassword
      });
      
      if (response && response.data && response.data.success) {
        setMessage('Password reset successfully. Redirecting to login...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError('Invalid response from server');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <img src={loginbackground} alt="background" className='loginBg' />
      <section className='loginSection'>
        <div className='loginBox'>
          <div className='loginWrap mt-5 card border'>
            <div className='logo text-center'>
              <img src={olshcoLogo} alt="OLSHCO Logo" width="60px" className='pb-1' />
              <h5 className='loginHeader'>Reset Your Password</h5>
              <p style={{ color: '#6c757d', fontSize: '14px', marginTop: '10px' }}>
                {!isVerified 
                  ? "Enter your account details to verify your identity"
                  : `Welcome back, ${studentName}! Set your new password`
                }
              </p>
            </div>

            {error && (
              <div className='alert alert-danger'>
                {error}
              </div>
            )}
            
            {message && (
              <div className='alert alert-success'>
                {message}
              </div>
            )}

            {!isVerified ? (
              <form onSubmit={handleVerify}>
                <div className={`form-group position-relative mt-4 ${inputIndex === 0 && 'focus'}`}>
                  <span className='icon'><FaRegUserCircle /></span>
                  <input 
                    type='text' 
                    className='form-control' 
                    placeholder='Username' 
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError('');
                    }}
                    onFocus={() => focusInput(0)}
                    onBlur={() => setInputIndex(null)}
                    required
                    autoFocus
                  />
                </div>

                <div className={`form-group position-relative mt-3 ${inputIndex === 1 && 'focus'}`}>
                  <span className='icon'><FaPhone /></span>
                  <input 
                    type='tel' 
                    className='form-control' 
                    placeholder='Contact Number (09xxxxxxxxx)' 
                    value={contactNumber}
                    onChange={handleContactNumberChange}
                    onFocus={() => focusInput(1)}
                    onBlur={() => setInputIndex(null)}
                    required
                  />
                </div>

                <div className={`form-group position-relative mt-3 ${inputIndex === 2 && 'focus'}`}>
                  <span className='icon'><FaRegEnvelope /></span>
                  <input 
                    type='email' 
                    className='form-control' 
                    placeholder='Email Address' 
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    onFocus={() => focusInput(2)}
                    onBlur={() => setInputIndex(null)}
                    required
                  />
                </div>

                <div className='form-group mt-4'>
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
                    {isLoading ? 'Verifying...' : 'Verify Account'}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div className={`form-group position-relative mt-4 ${inputIndex === 3 && 'focus'}`}>
                  <span className='icon'><FaRegUserCircle /></span>
                  <input 
                    type='password' 
                    className='form-control' 
                    placeholder='New Password' 
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError('');
                    }}
                    onFocus={() => focusInput(3)}
                    onBlur={() => setInputIndex(null)}
                    required
                    autoFocus
                  />
                </div>

                <div className={`form-group position-relative mt-3 ${inputIndex === 4 && 'focus'}`}>
                  <span className='icon'><FaRegUserCircle /></span>
                  <input 
                    type='password' 
                    className='form-control' 
                    placeholder='Confirm New Password' 
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    onFocus={() => focusInput(4)}
                    onBlur={() => setInputIndex(null)}
                    required
                  />
                </div>

                <div className='form-group mt-4'>
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
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </Button>
                </div>
              </form>
            )}

            <div className='form-group text-center mt-4'>
              <Link to={'/login'} className='link'>Back to Login</Link>
            </div>
          </div>

          <div className='loginWrap mt-3 card border footer p-3'>
            <span className='text-center'>
              Remember your password?
              <Link to={'/login'} className='link'> Sign In</Link>
            </span>
          </div>
        </div>
      </section>
    </>
  );
};

export default ForgotPassword;