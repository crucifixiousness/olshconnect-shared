import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import axios from 'axios';
import InstructorSchedule from './index';

jest.mock('axios');

// Mock data
const mockSchedules = [
  {
    course_code: 'CS101',
    course_name: 'Introduction to Programming',
    units: 3,
    section: 'A',
    day: 'Monday',
    start_time: '08:00:00',
    end_time: '09:30:00',
    program_name: 'BSCS',
    year_level: '1st',
    semester: '1st'
  },
  {
    course_code: 'CS102',
    course_name: 'Data Structures',
    units: 3,
    section: 'B',
    day: 'Wednesday',
    start_time: '13:00:00',
    end_time: '14:30:00',
    program_name: 'BSCS',
    year_level: '1st',
    semester: '2nd'
  }
];

// Mock localStorage
const mockUser = { staff_id: '12345' };
const mockToken = 'mock-token';
const mockLocalStorage = {
  getItem: jest.fn((key) => {
    if (key === 'user') return JSON.stringify(mockUser);
    if (key === 'token') return mockToken;
    return null;
  }),
  setItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('InstructorSchedule Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValueOnce({ data: mockSchedules });
  });

  test('renders instructor schedule page', async () => {
    render(<InstructorSchedule />);
    expect(screen.getByText('My Teaching Schedule')).toBeInTheDocument();
    // Use getByLabelText instead of getByText for the Select component
    expect(screen.getByLabelText('Filter by Semester')).toBeInTheDocument();
  });

  test('fetches and displays schedules', async () => {
    // Setup localStorage mock first
    const mockLocalStorage = {
      getItem: jest.fn().mockImplementation((key) => {
        if (key === 'user') return JSON.stringify({ staff_id: '12345' });
        if (key === 'token') return 'mock-token';
        return null;
      })
    };
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

    // Mock API response
    axios.get.mockResolvedValueOnce({ 
      data: [
        {
          course_code: 'CS101',
          course_name: 'Introduction to Programming',
          units: 3,
          section: 'A',
          day: 'Monday',
          start_time: '08:00:00',
          end_time: '09:30:00',
          program_name: 'BSCS',
          year_level: '1st',
          semester: '1st'
        }
      ]
    });

    render(<InstructorSchedule />);

    // Wait for loading state to finish and data to appear
    await waitFor(() => {
      expect(screen.queryByTestId('loading-message')).not.toBeInTheDocument();
    });

    // Verify the data is displayed
    await waitFor(() => {
      expect(screen.getByTestId('course-code-0')).toHaveTextContent('CS101');
      expect(screen.getByText('Introduction to Programming')).toBeInTheDocument();
    });

    // Verify API call
    expect(axios.get).toHaveBeenCalledWith(
      'http://localhost:4000/instructor-courses/12345',
      {
        headers: {
          Authorization: 'Bearer mock-token'
        }
      }
    );
  });

  test('filters schedules by semester', async () => {
    // Mock localStorage
    const mockLocalStorage = {
      getItem: jest.fn((key) => {
        if (key === 'user') return JSON.stringify({ staff_id: '12345' });
        if (key === 'token') return 'mock-token';
        return null;
      })
    };
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

    // Mock schedules data with different semesters
    const mockSchedules = [
      {
        course_code: 'CS101',
        course_name: 'Introduction to Programming',
        units: 3,
        section: 'A',
        day: 'Monday',
        start_time: '08:00:00',
        end_time: '09:30:00',
        program_name: 'BSCS',
        year_level: '1st',
        semester: '1st'
      },
      {
        course_code: 'CS102',
        course_name: 'Data Structures',
        units: 3,
        section: 'B',
        day: 'Wednesday',
        start_time: '13:00:00',
        end_time: '14:30:00',
        program_name: 'BSCS',
        year_level: '1st',
        semester: '2nd'
      }
    ];

    // Mock API response
    axios.get.mockResolvedValueOnce({ data: mockSchedules });

    render(<InstructorSchedule />);

    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-message')).not.toBeInTheDocument();
    });

    // Open select dropdown
    const selectElement = screen.getByLabelText('Filter by Semester');
    await userEvent.click(selectElement);

    // Wait for dropdown to open and select 2nd semester
    const secondSemesterOption = await screen.findByText('2nd Semester');
    await userEvent.click(secondSemesterOption);

    // Verify filtered results
    await waitFor(() => {
      expect(screen.queryByText('CS101')).not.toBeInTheDocument();
      expect(screen.getByText('CS102')).toBeInTheDocument();
    });
  });

  test('formats time correctly', async () => {
    // Setup localStorage mock
    const mockLocalStorage = {
      getItem: jest.fn((key) => {
        if (key === 'user') return JSON.stringify({ staff_id: '12345' });
        if (key === 'token') return 'mock-token';
        return null;
      })
    };
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

    // Mock API response
    const testSchedule = {
      course_code: 'CS101',
      course_name: 'Programming',
      units: 3,
      section: 'A',
      day: 'Monday',
      start_time: '08:00:00',
      end_time: '09:30:00',
      program_name: 'BSCS',
      year_level: '1st',
      semester: '1st'
    };

    axios.get.mockReset();
    axios.get.mockResolvedValueOnce({ data: [testSchedule] });

    render(<InstructorSchedule />);

    // Wait for data to load and loading state to finish
    await waitFor(() => {
      expect(screen.queryByTestId('loading-message')).not.toBeInTheDocument();
    });

    // Check if data is rendered
    await waitFor(() => {
      const timeCell = screen.getByTestId('time-0');
      expect(timeCell).toHaveTextContent('8:00 AM - 9:30 AM');
    });
  });

  test('handles missing user ID', async () => {
    // Mock localStorage to return null for user
    jest.spyOn(window.localStorage, 'getItem')
      .mockImplementationOnce(() => null);

    render(<InstructorSchedule />);

    await waitFor(() => {
      expect(screen.getByText('No instructor ID found. Please login again.')).toBeInTheDocument();
    });
  });

  test('sorts schedules by day and time', async () => {
    // Setup localStorage mock
    const mockLocalStorage = {
      getItem: jest.fn((key) => {
        if (key === 'user') return JSON.stringify({ staff_id: '12345' });
        if (key === 'token') return 'mock-token';
        return null;
      })
    };
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

    // Setup unsorted schedules
    const unsortedSchedules = [
      {
        course_code: 'CS102',
        course_name: 'Data Structures',
        units: 3,
        section: 'B',
        day: 'Wednesday',
        start_time: '13:00:00',
        end_time: '14:30:00',
        program_name: 'BSCS',
        year_level: '1st',
        semester: '2nd'
      },
      {
        course_code: 'CS101',
        course_name: 'Programming',
        units: 3,
        section: 'A',
        day: 'Monday',
        start_time: '08:00:00',
        end_time: '09:30:00',
        program_name: 'BSCS',
        year_level: '1st',
        semester: '1st'
      }
    ];

    // Reset and mock axios
    axios.get.mockReset();
    axios.get.mockResolvedValue({ data: unsortedSchedules });

    render(<InstructorSchedule />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-message')).not.toBeInTheDocument();
    });

    // Wait for data to be displayed
    await waitFor(() => {
      const mondayRow = screen.getByText('Monday');
      const wednesdayRow = screen.getByText('Wednesday');
      expect(mondayRow).toBeInTheDocument();
      expect(wednesdayRow).toBeInTheDocument();
      // Verify order
      expect(mondayRow.compareDocumentPosition(wednesdayRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  test('displays empty state message', async () => {
    // Setup localStorage mock
    const mockLocalStorage = {
      getItem: jest.fn((key) => {
        if (key === 'user') return JSON.stringify({ staff_id: '12345' });
        if (key === 'token') return 'mock-token';
        return null;
      })
    };
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
    
    // Mock empty response from API
    axios.get.mockReset();
    axios.get.mockResolvedValueOnce({ data: [] });
    
    render(<InstructorSchedule />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-message')).not.toBeInTheDocument();
    });

    // Check for empty state message
    await waitFor(() => {
      expect(screen.getByTestId('empty-message')).toBeInTheDocument();
    });
  });
});