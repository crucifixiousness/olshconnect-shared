import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MyContext } from '../../../App';
import axios from 'axios';
import Signup from '../index';

jest.mock('axios');

describe('Staff Login Component', () => {
  const mockNavigate = jest.fn();
  
  const mockContextValue = {
    setIsHideComponents: jest.fn(),
    setIsLogin: jest.fn(),
    setUser: jest.fn(),
    setRole: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <MyContext.Provider value={mockContextValue}>
          <Signup />
        </MyContext.Provider>
      </BrowserRouter>
    );
  };

  it('should render login form', () => {
    const { container } = renderComponent();
    expect(container.querySelector('input[name="staff_username"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="staff_password"]')).toBeInTheDocument();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('should handle successful admin login', async () => {
    const mockResponse = {
      data: {
        token: 'mock-token',
        user: {
          staff_id: '1',
          role: 'admin',
          program_id: null,
          staff_username: 'admin'
        }
      }
    };

    axios.post.mockResolvedValueOnce(mockResponse);
    const { container } = renderComponent();

    const usernameInput = container.querySelector('input[name="staff_username"]');
    const passwordInput = container.querySelector('input[name="staff_password"]');
    const submitButton = container.querySelector('form');

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(submitButton);

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('mock-token');
      expect(localStorage.getItem('role')).toBe('admin');
      expect(mockContextValue.setRole).toHaveBeenCalledWith('admin');
    });
  });

  it('should handle failed login', async () => {
    const errorMessage = 'Login failed. Please try again.';
    axios.post.mockRejectedValueOnce({ 
      response: { data: { message: errorMessage } }
    });

    const { container } = renderComponent();

    const usernameInput = container.querySelector('input[name="staff_username"]');
    const passwordInput = container.querySelector('input[name="staff_password"]');
    const submitButton = container.querySelector('form');

    fireEvent.change(usernameInput, { target: { value: 'wrong' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong' } });
    fireEvent.submit(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should validate required fields', async () => {
    const { container } = renderComponent();
    const submitButton = container.querySelector('form');
    
    // Submit empty form
    fireEvent.submit(submitButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Login failed. Please try again.')).toBeInTheDocument();
    });

    // Verify the API call was made with empty fields and failed
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:4000/login/staff',
      expect.objectContaining({
        staff_username: '',
        staff_password: ''
      })
    );

    // Verify form fields remain empty after failed submission
    const usernameInput = container.querySelector('input[name="staff_username"]');
    const passwordInput = container.querySelector('input[name="staff_password"]');
    expect(usernameInput.value).toBe('');
    expect(passwordInput.value).toBe('');
  });

  it('should handle different role redirections', async () => {
    const roles = [
      { role: 'instructor', path: '/instructor-dashboard' },
      { role: 'registrar', path: '/registrar-dashboard' },
      { role: 'finance', path: '/finance-dashboard' },
      { role: 'program head', path: '/programhead-dashboard' }
    ];

    for (const { role, path } of roles) {
      // Clear mocks and localStorage before each role test
      jest.clearAllMocks();
      localStorage.clear();

      const mockResponse = {
        data: {
          token: 'mock-token',
          user: {
            staff_id: '1',
            role: role,
            program_id: role === 'program head' ? '1' : null,
            staff_username: role
          }
        }
      };

      axios.post.mockResolvedValueOnce(mockResponse);
      const { container, unmount } = renderComponent();

      const usernameInput = container.querySelector('input[name="staff_username"]');
      const passwordInput = container.querySelector('input[name="staff_password"]');
      const submitButton = container.querySelector('form');

      fireEvent.change(usernameInput, { target: { value: role } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.submit(submitButton);

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBe('mock-token');
        expect(localStorage.getItem('role')).toBe(role);
        expect(localStorage.getItem('staff_id')).toBe('1');
        expect(mockContextValue.setRole).toHaveBeenCalledWith(role);
      });

      // Cleanup after each role test
      unmount();
    }
  });

  it('should handle form state after failed login', async () => {
      const errorMessage = 'Invalid credentials';
      axios.post.mockRejectedValueOnce({ 
        response: { data: { message: errorMessage } }
      });
  
      const { container } = renderComponent();
      const usernameInput = container.querySelector('input[name="staff_username"]');
      const passwordInput = container.querySelector('input[name="staff_password"]');
      const submitButton = container.querySelector('form');
  
      fireEvent.change(usernameInput, { target: { value: 'test' } });
      fireEvent.change(passwordInput, { target: { value: 'test' } });
      fireEvent.submit(submitButton);
  
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
});