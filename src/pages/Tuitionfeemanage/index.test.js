import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import TuitionManagement from './index';

jest.mock('axios');

const mockLocalStorage = {
  getItem: jest.fn(() => 'mock-token'),
  setItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('TuitionManagement Component', () => {
  const mockPrograms = [
    { program_id: 1, program_name: 'BSIT' },
    { program_id: 2, program_name: 'BSED' }
  ];

  const mockTuitionFees = [
    {
      fee_id: 1,
      program_name: 'BSIT',
      year_level: '1',
      semester: '1st',
      tuition_amount: '30000',
      misc_fees: '5000',
      lab_fees: '3000',
      other_fees: '2000'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockImplementation((url) => {
      if (url.includes('programs')) {
        return Promise.resolve({ data: mockPrograms });
      }
      if (url.includes('tuition-fees')) {
        return Promise.resolve({ data: mockTuitionFees });
      }
    });
  });

  test('renders tuition management title', () => {
    render(<TuitionManagement />);
    expect(screen.getByText('Tuition Fee Management')).toBeInTheDocument();
  });

  test('displays loading state', () => {
    render(<TuitionManagement />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('displays tuition fees after loading', async () => {
    render(<TuitionManagement />);
    await waitFor(() => {
      expect(screen.getByText('BSIT')).toBeInTheDocument();
      // Use a function to match the cell containing both ₱ and 30000
      const tuitionCell = screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'td' && 
               element.textContent.includes('₱') && 
               element.textContent.includes('30000');
      });
      expect(tuitionCell).toBeInTheDocument();
    });
  });

  test('opens modal on add button click', async () => {
    render(<TuitionManagement />);
    const addButton = screen.getByTestId('add-tuition-button');
    fireEvent.click(addButton);
    expect(screen.getByText('Set Tuition Fee')).toBeInTheDocument();
  });

  test('handles form submission', async () => {
    axios.post.mockResolvedValueOnce({ data: 'success' });
    render(<TuitionManagement />);

    // Open modal
    fireEvent.click(screen.getByTestId('add-tuition-button'));

    // Fill form
    await waitFor(() => {
      const programSelect = screen.getByTestId('program-select');
      fireEvent.mouseDown(programSelect);
    });
    fireEvent.click(screen.getByText('BSIT'));

    await waitFor(() => {
      const yearSelect = screen.getByTestId('year-select');
      fireEvent.mouseDown(yearSelect);
    });
    fireEvent.click(screen.getByText('1'));

    await waitFor(() => {
      const semesterSelect = screen.getByTestId('semester-select');
      fireEvent.mouseDown(semesterSelect);
    });
    fireEvent.click(screen.getByText('1st'));

    // Fill in all required fields with values from the table
    fireEvent.change(screen.getByRole('spinbutton', { name: /Tuition Amount/i }), {
      target: { value: '30000.00' }
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: /Miscellaneous Fees/i }), {
      target: { value: '5000.00' }
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: /Laboratory Fees/i }), {
      target: { value: '3000.00' }
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: /Other Fees/i }), {
      target: { value: '200.00' }
    });

    // Submit form
    fireEvent.click(screen.getByText('Save Tuition Fee'));

    await waitFor(() => {
      expect(screen.getByText('Tuition fee set successfully!')).toBeInTheDocument();
    });
  });

  test('displays error message on API failure', async () => {
    // Mock the API error
    axios.post.mockRejectedValueOnce(new Error('Failed to set tuition fee'));
    render(<TuitionManagement />);

    // Open modal and submit form
    fireEvent.click(screen.getByTestId('add-tuition-button'));
    fireEvent.click(screen.getByText('Save Tuition Fee'));

    // Check for error message in Snackbar
    await waitFor(() => {
      expect(screen.getByText('Failed to set tuition fee')).toBeInTheDocument();
    });
  });
});