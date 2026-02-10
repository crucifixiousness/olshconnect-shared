import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import StudentProfile from './index';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock axios
jest.mock('axios');

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock student data
const mockStudentData = {
  firstName: "John",
  middleName: "Doe",
  lastName: "Smith",
  suffix: "Jr",
  email: "john.smith@example.com",
  number: "09123456789",
  birthdate: "2000-01-01",
  age: 23,
  religion: "Catholic",
  street_text: "123 Main St",
  guardianName: "Jane Smith",
  guardianContactNo: "09987654321",
  enrollment: {
    status: "Registered",
    idpic: null
  }
};

// Wrapper component for router
const wrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('StudentProfile Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Set default localStorage mock return
    mockLocalStorage.getItem.mockReturnValue('mock-token');
    // Set default axios mock response
    axios.get.mockResolvedValue({ data: mockStudentData });
  });

  it('renders loading state initially', () => {
    render(<StudentProfile />, { wrapper });
    expect(screen.getByText('Loading your profile...')).toBeInTheDocument();
  });

  it('renders student profile after loading', async () => {
    render(<StudentProfile />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('John D. Smith Jr')).toBeInTheDocument();
      expect(screen.getByText('Catholic')).toBeInTheDocument();
      expect(screen.getByText('09123456789')).toBeInTheDocument();
    });
  });

  it('opens edit profile modal when edit button is clicked', async () => {
    render(<StudentProfile />, { wrapper });

    await waitFor(() => {
      const editButton = screen.getByTestId('edit-profile-button');
      fireEvent.click(editButton);
    });

    expect(screen.getByTestId('edit-profile-modal')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Religion')).toBeInTheDocument();
  });

  it('handles form submission in edit profile', async () => {
    axios.put.mockResolvedValueOnce({ data: mockStudentData });
    
    render(<StudentProfile />, { wrapper });

    // Wait for component to load and click edit button
    await waitFor(() => {
      const editButton = screen.getByText('Edit Profile');
      fireEvent.click(editButton);
    });

    // Find form elements and submit
    const religionInput = screen.getByLabelText('Religion');
    fireEvent.change(religionInput, { target: { value: 'Buddhist' } });

    const submitButton = screen.getByText('Save Changes');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/updatestudentprofile",
        expect.objectContaining({ religion: 'Buddhist' }),
        expect.any(Object)
      );
    });
  });

  it('opens enrollment modal when enroll button is clicked', async () => {
    render(<StudentProfile />, { wrapper });

    await waitFor(() => {
      const enrollButton = screen.getByText('Enroll Now!');
      fireEvent.click(enrollButton);
    });

    expect(screen.getByText('Enrollment Form')).toBeInTheDocument();
    expect(screen.getByText('Program Selection')).toBeInTheDocument();
  });

  // Add new tests for additional form elements
  it('handles file uploads in enrollment form', async () => {
    render(<StudentProfile />, { wrapper });

    await waitFor(() => {
      const enrollButton = screen.getByTestId('enroll-button');
      fireEvent.click(enrollButton);
    });

    // Test file uploads
    const idPicInput = screen.getByTestId('id-pic-input');
    const birthCertInput = screen.getByTestId('birth-cert-input');
    const form137Input = screen.getByTestId('form137-input');

    const mockFile = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });

    fireEvent.change(idPicInput, { target: { files: [mockFile] } });
    fireEvent.change(birthCertInput, { target: { files: [mockFile] } });
    fireEvent.change(form137Input, { target: { files: [mockFile] } });

    expect(idPicInput.files[0]).toBe(mockFile);
    expect(birthCertInput.files[0]).toBe(mockFile);
    expect(form137Input.files[0]).toBe(mockFile);
  });

  it('validates required fields in enrollment form', async () => {
    render(<StudentProfile />, { wrapper });

    // Wait for the component to load and click enroll button
    await waitFor(() => {
      const enrollButton = screen.getByTestId('enroll-button');
      fireEvent.click(enrollButton);
    });

    // Find and click submit button
    const submitButton = screen.getByTestId('submit-enrollment-button');
    fireEvent.click(submitButton);

    // Check for validation message
    await waitFor(() => {
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Please fill in all required fields');
    });

    // Verify stepper is still at initial step
    const stepper = screen.getByTestId('enrollment-stepper');
    expect(stepper).toBeInTheDocument();
    expect(screen.getByText('Registration')).toBeInTheDocument();
  });
});

it('redirects to login when no token is present', () => {
    mockLocalStorage.getItem.mockReturnValueOnce(null);
    render(<StudentProfile />, { wrapper });
    expect(window.location.pathname).toBe('/login');
  });