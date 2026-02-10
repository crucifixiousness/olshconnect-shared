import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ClassManagement from './index';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn()
}));

// Mock axios
jest.mock('axios');

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('ClassManagement Component', () => {
  const mockNavigate = jest.fn();
  const mockCourses = [
    {
      pc_id: '1',
      course_code: 'CS101',
      course_name: 'Introduction to Programming',
      section: 'A',
      day: 'Monday',
      start_time: '09:00',
      end_time: '10:30',
      semester: '1st'
    },
    {
      pc_id: '2',
      course_code: 'CS102',
      course_name: 'Data Structures',
      section: 'B',
      day: 'Tuesday',
      start_time: '13:00',
      end_time: '14:30',
      semester: '2nd'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    mockLocalStorage.getItem.mockImplementation((key) => {
      const values = {
        'staff_id': 'staff123',
        'token': 'mock-token'
      };
      return values[key];
    });
    axios.get.mockResolvedValue({ data: mockCourses });
  });

  test('renders class management title', () => {
    render(<ClassManagement />);
    expect(screen.getByText('Class Management')).toBeInTheDocument();
  });

  test('displays loading state', () => {
    render(<ClassManagement />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('displays courses after loading', async () => {
    render(<ClassManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
      expect(screen.getByText('Introduction to Programming')).toBeInTheDocument();
    });
  });

  test('formats time correctly', async () => {
    render(<ClassManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/Monday 9:00 AM - 10:30 AM/)).toBeInTheDocument();
    });
  });

  test('handles course click', async () => {
    render(<ClassManagement />);
    
    await waitFor(() => {
      const manageButton = screen.getAllByText('Manage Class')[0];
      fireEvent.click(manageButton);
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'selectedCourse',
      JSON.stringify(mockCourses[0])
    );
    expect(mockNavigate).toHaveBeenCalledWith('/instructor-classes/grades?course=1');
  });

  test('displays error message when API call fails', async () => {
    const errorMessage = 'Failed to fetch courses';
    axios.get.mockRejectedValueOnce(new Error(errorMessage));
    
    render(<ClassManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch courses')).toBeInTheDocument();
    });
  });

  test('displays error when token is missing', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    
    render(<ClassManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Please login again')).toBeInTheDocument();
    });
  });
});