import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MyContext } from '../../../App';
import axios from 'axios';
import Homepage from '../Homepage';

jest.mock('axios');

describe('Student Registration', () => {
  const mockContextValue = {
    setIsHideComponents: jest.fn(),
  };

  const renderHomepage = () => {
    return render(
      <BrowserRouter>
        <MyContext.Provider value={mockContextValue}>
          <Homepage />
        </MyContext.Provider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders homepage with register button', () => {
    renderHomepage();
    expect(screen.getByText('REGISTER NOW!')).toBeInTheDocument();
  });

  test('opens modal when register button is clicked', async () => {
    renderHomepage();
    expect(screen.queryByTestId("registration-modal")).not.toBeInTheDocument();
    
    // Click register button
    fireEvent.click(screen.getByTestId("open-modal-button"));
    
    // Wait for modal content
    await waitFor(() => {
      expect(screen.getByTestId("registration-modal")).toBeInTheDocument();
      expect(screen.getByTestId("registration-header")).toBeInTheDocument();
    });
  });

  test('submits form with valid data', async () => {
    const mockResponse = { data: { message: 'Registration successful!' } };
    axios.post.mockResolvedValueOnce(mockResponse);

    renderHomepage();
    
    // Open modal
    fireEvent.click(screen.getByText('REGISTER NOW!'));

    // Wait for modal and fill required fields
    await waitFor(() => {
      // Use more generic selectors that match your actual form
      const inputs = screen.getAllByRole('textbox');
      const passwordInput = screen.getByLabelText(/password/i);
      
      // Fill in form fields
      fireEvent.change(inputs[0], { target: { value: 'testuser' } }); // username
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(inputs[1], { target: { value: 'John' } }); // firstName
      fireEvent.change(inputs[2], { target: { value: 'Doe' } }); // lastName
    });

    // Find and click submit button by its text or role
    const submitButton = screen.getByRole('button', { name: /submit|register/i });
    fireEvent.click(submitButton);

    // Verify API call was made
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
  });

  test('shows success message after registration', async () => {
    const mockResponse = { data: { message: 'Registration successful!' } };
    axios.post.mockResolvedValueOnce(mockResponse);

    renderHomepage();
    fireEvent.click(screen.getByText('REGISTER NOW!'));

    // Wait for modal to be visible
    await waitFor(() => {
      expect(screen.getByTestId('registration-modal')).toBeInTheDocument();
    });

    // Fill in form fields using the existing selectors
    const inputs = screen.getAllByRole('textbox');
    const passwordInput = screen.getByLabelText(/password/i);
    
    fireEvent.change(inputs[0], { target: { value: 'testuser' } }); // username
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(inputs[1], { target: { value: 'John' } }); // firstName
    fireEvent.change(inputs[2], { target: { value: 'Doe' } }); // lastName

    // Submit form
    const submitButton = screen.getByRole('button', { name: /register/i });
    fireEvent.click(submitButton);

    // Check for success message in snackbar
    await waitFor(() => {
      expect(screen.getByText('Registration successful!')).toBeInTheDocument();
    });

    // Click the close button using test-id instead of role
    const closeButton = screen.getByTestId('modal-close-button');
    fireEvent.click(closeButton);

    // Verify modal closes
    await waitFor(() => {
      expect(screen.queryByTestId('registration-modal')).not.toBeInTheDocument();
    });
  });

  test('shows error message on registration failure', async () => {
    axios.post.mockRejectedValueOnce(new Error('Registration failed'));

    renderHomepage();
    fireEvent.click(screen.getByText('REGISTER NOW!'));

    // Wait for modal to be visible
    await waitFor(() => {
      expect(screen.getByTestId('registration-modal')).toBeInTheDocument();
    });

    // Fill in form fields using the existing selectors
    const inputs = screen.getAllByRole('textbox');
    const passwordInput = screen.getByLabelText(/password/i);
    
    fireEvent.change(inputs[0], { target: { value: 'testuser' } }); // username
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(inputs[1], { target: { value: 'John' } }); // firstName
    fireEvent.change(inputs[2], { target: { value: 'Doe' } }); // lastName

    // Submit form
    const submitButton = screen.getByRole('button', { name: /register/i });
    fireEvent.click(submitButton);

    // Check for error message in snackbar
    await waitFor(() => {
      expect(screen.getByText('Registration failed. Please try again.')).toBeInTheDocument();
    });
  });

  test('validates required fields', async () => {
    renderHomepage();
    fireEvent.click(screen.getByTestId('open-modal-button'));

    // Wait for modal to be visible and form elements to be loaded
    await waitFor(() => {
      expect(screen.getByTestId('registration-modal')).toBeInTheDocument();
    });

    // Get the form element
    const form = screen.getByTestId('registration-form');
    
    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: /register/i });
    fireEvent.click(submitButton);

    // Check for HTML5 validation by verifying the form is invalid
    await waitFor(() => {
      expect(form).toBeInvalid();
      
      // Check specific required inputs
      const userName = screen.getByLabelText(/username/i);
      const password = screen.getByLabelText(/password/i);
      const firstName = screen.getByLabelText(/first name/i);
      const lastName = screen.getByLabelText(/last name/i);
      
      expect(userName).toBeInvalid();
      expect(password).toBeInvalid();
      expect(firstName).toBeInvalid();
      expect(lastName).toBeInvalid();
    });
  });

  test('calculates age from birthdate', async () => {
    renderHomepage();
    fireEvent.click(screen.getByTestId('open-modal-button'));

    // Wait for modal to be visible
    await waitFor(() => {
      expect(screen.getByTestId('registration-modal')).toBeInTheDocument();
    });

    // Set birthdate to 20 years ago
    const today = new Date();
    const twentyYearsAgo = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
    const formattedDate = twentyYearsAgo.toISOString().split('T')[0];

    // Find birthdate input and trigger change event
    const birthdateInput = screen.getByTestId('input-birthdate').querySelector('input');
    fireEvent.input(birthdateInput, { target: { value: formattedDate } });

    // Check if age is calculated correctly
    await waitFor(() => {
      const ageField = screen.getByTestId('input-age').querySelector('input');
      expect(ageField.value).toBe('20');
    });
  });

});