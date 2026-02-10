import React from 'react';
import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MyContext } from "../../App";

const NotFound = () => {
  const context = useContext(MyContext);
  const navigate = useNavigate();

  useEffect(() => {
    context.setIsHideComponents(true);
    window.scrollTo(0, 0);
  }, [context]);

  const handleGoHome = () => {
    navigate('/homepage');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        {/* Animated 404 Number */}
        <div className="error-number">
          <span className="digit">4</span>
          <div className="zero-container">
            <div className="zero">0</div>
          </div>
          <span className="digit">4</span>
        </div>

        {/* Main Message */}
        <h1 className="error-title">Oops! Page Not Found</h1>
        <p className="error-description">
          The page you're looking for seems to have wandered off into the digital wilderness.
        </p>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="btn btn-primary" onClick={handleGoHome}>
            <span className="btn-icon">🏠</span>
            Go to Homepage
          </button>
          <button className="btn btn-secondary" onClick={handleGoBack}>
            <span className="btn-icon">⬅️</span>
            Go Back
          </button>
        </div>

        {/* Decorative Elements */}
        <div className="floating-elements">
          <div className="floating-shape shape-1"></div>
          <div className="floating-shape shape-2"></div>
          <div className="floating-shape shape-3"></div>
          <div className="floating-shape shape-4"></div>
        </div>

        {/* Helpful Links */}
        <div className="helpful-links">
          <p className="links-text">Or try these helpful links:</p>
          <div className="link-grid">
            <button className="link-item" onClick={() => navigate('/student-dashboard')}>
              Student Dashboard
            </button>
            <button className="link-item" onClick={() => navigate('/dashboard')}>
              Admin Dashboard
            </button>
            <button className="link-item" onClick={() => navigate('/login')}>
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;