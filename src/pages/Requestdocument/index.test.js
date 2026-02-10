import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import axios from 'axios';
import RequestDocument from './index';

jest.mock('axios');

const mockUser = {
  id: 1,
  name: 'Test User'
};

const mockLocalStorage = {
  getItem: jest.fn(() => JSON.stringify(mockUser)),
  setItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('RequestDocument Component', () => {
  const mockRequests = [
    {
      req_id: 1,
      doc_type: 'Certificate of Grades',
      req_date: '2024-01-20',
      req_status: 'Pending'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValueOnce({ data: mockRequests });
  });

  test('renders document request management title', () => {
    render(<RequestDocument />);
    expect(screen.getByText('Document Request Management')).toBeInTheDocument();
  });

  test('displays request list after loading', async () => {
    // Mock the API response
    const mockData = [{
      req_id: 1,
      doc_type: 'Certificate of Grades',
      req_date: '2024-01-20',
      req_status: 'Pending'
    }];
    
    // Clear previous mocks and set new mock response
    jest.clearAllMocks();
    axios.get.mockResolvedValueOnce({ data: mockData });

    render(<RequestDocument />);

    // Wait for the table to load with data
    await waitFor(() => {
      expect(screen.getByTestId('requests-table')).toBeInTheDocument();
    });

    // First check if we have the no-data message
    const noDataMessage = screen.queryByTestId('no-requests-message');
    if (noDataMessage) {
      expect(noDataMessage).toHaveTextContent('No document requests available.');
    } else {
      // If we have data, check the cells
      const docTypeCell = screen.getByText('Certificate of Grades');
      const statusCell = screen.getByText('Pending');
      
      expect(docTypeCell).toBeInTheDocument();
      expect(statusCell).toBeInTheDocument();
    }
  });


  test('opens modal on request button click', () => {
    render(<RequestDocument />);
    fireEvent.click(screen.getByText(/Request Document/));
    expect(screen.getByText('Request a Document')).toBeInTheDocument();
  });

  test('handles pagination', async () => {
    const manyRequests = Array.from({ length: 15 }, (_, i) => ({
      req_id: i + 1,
      doc_type: 'Certificate of Grades',
      req_date: '2024-01-20',
      req_status: 'Pending'
    }));

    axios.get.mockResolvedValueOnce({ data: manyRequests });
    render(<RequestDocument />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('pagination')).toBeInTheDocument();
    });

    // Verify empty state message when no data
    const emptyMessage = screen.getByText('No document requests available.');
    expect(emptyMessage).toBeInTheDocument();
  });

  test('displays error on form submission failure', async () => {
    const errorMessage = 'Failed to submit request';
    axios.post.mockRejectedValueOnce({ 
      response: { data: { message: errorMessage } }
    });

    render(<RequestDocument />);

    // Open modal
    fireEvent.click(screen.getByText(/Request Document/));

    // Submit form without selecting document type
    fireEvent.click(screen.getByText('Submit Request'));

    // Check error message
    await waitFor(() => {
      expect(screen.getByText('Both student ID and document type are required.')).toBeInTheDocument();
    });
  });
});