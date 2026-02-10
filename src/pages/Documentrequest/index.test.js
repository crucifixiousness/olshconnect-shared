import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import axios from 'axios';
import DocumentRequests from './index';

jest.mock('axios');

// Mock data
const mockRequests = [
  {
    req_id: 1,
    first_name: 'John',
    middle_name: 'Michael',
    last_name: 'Doe',
    suffix: 'Jr',
    doc_type: 'Certificate of Grades',
    req_date: '2024-01-20',
    req_status: 'Pending'
  },
  {
    req_id: 2,
    first_name: 'Jane',
    middle_name: '',
    last_name: 'Smith',
    suffix: '',
    doc_type: 'Diploma',
    req_date: '2024-01-21',
    req_status: 'Approved'
  }
];

const mockToken = 'mock-token';
const mockLocalStorage = {
  getItem: jest.fn(() => mockToken),
  setItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('DocumentRequests Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValueOnce({ data: mockRequests });
  });

  test('renders document requests page', async () => {
    render(<DocumentRequests />);
    expect(screen.getByText('Document Requests')).toBeInTheDocument();
    expect(screen.getByText('FILTER BY DOCUMENT')).toBeInTheDocument();
  });

  test('fetches and displays requests', async () => {
    render(<DocumentRequests />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:4000/requests/all',
        expect.any(Object)
      );
    });

    // Check if the table headers are rendered
    expect(screen.getByText('STUDENT NAME')).toBeInTheDocument();
    expect(screen.getByText('DOCUMENT TYPE')).toBeInTheDocument();
    expect(screen.getByText('REQUEST DATE')).toBeInTheDocument();
    expect(screen.getByText('STATUS')).toBeInTheDocument();
  });

  test('formats student name correctly', async () => {
    render(<DocumentRequests />);

    await waitFor(() => {
      // Full name with middle initial and suffix
      expect(screen.getByText('Doe, John M. Jr')).toBeInTheDocument();
      // Name without middle name and suffix
      expect(screen.getByText('Smith, Jane')).toBeInTheDocument();
    });
  });

  test('filters requests by document type', async () => {
    render(<DocumentRequests />);

    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByText('Doe, John M. Jr')).toBeInTheDocument();
    });

    // Open the select dropdown
    const select = screen.getByRole('combobox');
    await userEvent.click(select);

    // Find and click the Diploma option in the dropdown menu
    const diplomaOption = screen.getByRole('option', { name: 'Diploma' });
    await userEvent.click(diplomaOption);

    // Wait for the filtering to take effect
    await waitFor(() => {
      // Check if only Diploma requests are shown
      expect(screen.queryByText('Doe, John M. Jr')).not.toBeInTheDocument();
      expect(screen.getByText('Smith, Jane')).toBeInTheDocument();
    });
  });

  test('handles status update', async () => {
    axios.put.mockResolvedValueOnce({});
    render(<DocumentRequests />);

    await waitFor(() => {
      expect(screen.getByText('Doe, John M. Jr')).toBeInTheDocument();
    });

    // Click approve button for first request
    const approveButtons = screen.getAllByRole('button');
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        'http://localhost:4000/requests/1/status',
        { status: 'Approved' },
        expect.any(Object)
      );
    });
  });

  test('handles empty requests list', async () => {
    axios.get.mockResolvedValueOnce({ data: [] });
    render(<DocumentRequests />);

    await waitFor(() => {
      expect(screen.getByText('No document requests available')).toBeInTheDocument();
    });
  });

  test('handles pagination', async () => {
    const manyRequests = Array.from({ length: 15 }, (_, i) => ({
      ...mockRequests[0],
      req_id: i + 1
    }));
    
    axios.get.mockResolvedValueOnce({ data: manyRequests });
    render(<DocumentRequests />);

    await waitFor(() => {
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    // Test page change
    const nextPageButton = screen.getByRole('button', { name: /go to next page/i });
    fireEvent.click(nextPageButton);

    // Verify page change (implementation specific checks can be added)
    expect(nextPageButton).toBeInTheDocument();
  });
});