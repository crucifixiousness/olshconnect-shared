import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MyContext } from '../../../App';
import axios from 'axios';
import Login from '../index';

jest.mock('axios');

describe('Student Login Component', () => {
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
          <Login />
        </MyContext.Provider>
      </BrowserRouter>
    );
  };

  it('should render student login form', () => {
    const { container } = renderComponent();
    expect(container.querySelector('input[name="username"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="password"]')).toBeInTheDocument();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('FORGOT PASSWORD')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  it('should handle successful student login', async () => {
    const mockResponse = {
      data: {
        token: 'mock-token',
        user: {
          student_id: '1',
          role: 'student',
          username: 'student123'
        }
      }
    };

    axios.post.mockResolvedValueOnce(mockResponse);
    const { container } = renderComponent();

    const usernameInput = container.querySelector('input[name="username"]');
    const passwordInput = container.querySelector('input[name="password"]');
    const submitButton = container.querySelector('form');

    fireEvent.change(usernameInput, { target: { value: 'student123' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(submitButton);

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('mock-token');
      expect(localStorage.getItem('role')).toBe('student');
      expect(mockContextValue.setRole).toHaveBeenCalledWith('student');
      expect(mockContextValue.setIsLogin).toHaveBeenCalledWith(true);
    });
  });

  it('should handle failed login', async () => {
    const errorMessage = 'Login failed. Please try again.';
    axios.post.mockRejectedValueOnce({ 
      response: { data: { message: errorMessage } }
    });

    const { container } = renderComponent();

    const usernameInput = container.querySelector('input[name="username"]');
    const passwordInput = container.querySelector('input[name="password"]');
    const submitButton = container.querySelector('form');

    fireEvent.change(usernameInput, { target: { value: 'wrong' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong' } });
    fireEvent.submit(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should toggle password visibility', () => {
    const { container } = renderComponent();
    const passwordInput = container.querySelector('input[name="password"]');
    const toggleButton = container.querySelector('.showPass');

    // Initially password should be hidden
    expect(passwordInput.type).toBe('password');

    // Click to show password
    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    // Click to hide password again
    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  it('should handle input focus states', () => {
    const { container } = renderComponent();
    const usernameInput = container.querySelector('input[name="username"]');
    const passwordInput = container.querySelector('input[name="password"]');

    // Test username input focus
    fireEvent.focus(usernameInput);
    expect(usernameInput.parentElement).toHaveClass('focus');
    fireEvent.blur(usernameInput);
    expect(usernameInput.parentElement).not.toHaveClass('focus');

    // Test password input focus
    fireEvent.focus(passwordInput);
    expect(passwordInput.parentElement).toHaveClass('focus');
    fireEvent.blur(passwordInput);
    expect(passwordInput.parentElement).not.toHaveClass('focus');
  });

  it('should handle navigation links', () => {
    renderComponent();
    
    const forgotPasswordLink = screen.getByText('FORGOT PASSWORD');
    const registerLink = screen.getByText('Register');

    expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/forgot-password');
    expect(registerLink.closest('a')).toHaveAttribute('href', '/homepage');
  });

  it('should handle undefined role in response', async () => {
    const mockResponse = {
      data: {
        token: 'mock-token',
        user: {
          student_id: '1',
          username: 'student123'
          // role is intentionally missing
        }
      }
    };

    axios.post.mockResolvedValueOnce(mockResponse);
    const { container } = renderComponent();

    const usernameInput = container.querySelector('input[name="username"]');
    const passwordInput = container.querySelector('input[name="password"]');
    const submitButton = container.querySelector('form');

    fireEvent.change(usernameInput, { target: { value: 'student123' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Unexpected error occurred. Please contact support.')).toBeInTheDocument();
    });
  });
});