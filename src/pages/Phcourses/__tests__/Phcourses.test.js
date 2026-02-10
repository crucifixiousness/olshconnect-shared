import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import AssignCourses from '../index';

jest.mock('axios');

describe('AssignCourses Component', () => {
  const mockLocalStorage = {
    getItem: jest.fn(),
  };

  beforeEach(() => {
    global.localStorage = mockLocalStorage;
    mockLocalStorage.getItem.mockReturnValue('1'); // Mock program_id
    jest.clearAllMocks();
  });

  const renderAssignCourses = () => {
    return render(
      <BrowserRouter>
        <AssignCourses />
      </BrowserRouter>
    );
  };

  test('renders assign courses page', () => {
    renderAssignCourses();
    expect(screen.getByText('Assign Courses to Year Level')).toBeInTheDocument();
  });

  test('opens add course modal', async () => {
    renderAssignCourses();
    
    fireEvent.click(screen.getByText('ASSIGN COURSE'));
    
    await waitFor(() => {
      expect(screen.getByText('Assign Course')).toBeInTheDocument();
    });
  });

  test('filters courses by semester', async () => {
    const mockCourses = [
      { program_name: 'BSIT', year_level: 1, course_code: 'CS101', course_name: 'Intro', units: 3, semester: '1st' },
      { program_name: 'BSIT', year_level: 1, course_code: 'CS102', course_name: 'Advanced', units: 3, semester: '2nd' }
    ];
    
    // Mock both API calls
    axios.get.mockImplementation((url) => {
      if (url.includes('/program-course/')) {
        return Promise.resolve({ data: mockCourses });
      }
      if (url.includes('/api/programs/')) {
        return Promise.resolve({ data: { program_name: 'BSIT' } });
      }
      return Promise.resolve({ data: [] });
    });
    
    renderAssignCourses();
    
    // Wait for table and data to load
    await waitFor(() => {
      const table = screen.getByTestId('courses-table');
      expect(table).toBeInTheDocument();
      expect(screen.getByText('Intro')).toBeInTheDocument();
    });
    
    // Select 1st semester filter
    const semesterFilter = screen.getByTestId('semester-filter');
    fireEvent.mouseDown(semesterFilter);
    
    // Wait for dropdown to appear and select option
    const firstSemesterOption = await screen.findByText('1st Semester');
    fireEvent.click(firstSemesterOption);

    // Check filtered results
    await waitFor(() => {
      expect(screen.getByText('Intro')).toBeInTheDocument();
      expect(screen.queryByText('Advanced')).not.toBeInTheDocument();
    });
  });

  test('submits new course assignment successfully', async () => {
    const mockResponse = { data: { message: 'Course assigned successfully!' } };
    axios.post.mockResolvedValueOnce(mockResponse);
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/programs/')) {
        return Promise.resolve({ data: { program_name: 'BSIT' } });
      }
      return Promise.resolve({ data: [] });
    });

    renderAssignCourses();
    
    // Open modal
    const addButton = screen.getByTestId('assign-course-button');
    fireEvent.click(addButton);

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByTestId('add-course-modal')).toBeInTheDocument();
    });

    // Fill form
    const yearSelect = screen.getByTestId('input-year-level');
    fireEvent.mouseDown(yearSelect);
    const yearOption = await screen.findByText('1st Year');
    fireEvent.click(yearOption);

    fireEvent.change(screen.getByTestId('input-course-code'), {
      target: { value: 'CS101' }
    });

    fireEvent.change(screen.getByTestId('input-course-name'), {
      target: { value: 'Introduction to Programming' }
    });

    fireEvent.change(screen.getByTestId('input-units'), {
      target: { value: '3' }
    });

    const semesterSelect = screen.getByTestId('input-semester');
    fireEvent.mouseDown(semesterSelect);
    const semesterOption = await screen.findByText('1st Semester');
    fireEvent.click(semesterOption);

    // Submit form
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    // Verify API call
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:4000/program-course',
        expect.objectContaining({
          program_id: 1,
          course_code: 'CS101',
          course_name: 'Introduction to Programming',
          units: '3',
          semester: '1st',
          year_level: 1
        })
      );
    });
  });

  test('shows error message when form is incomplete', async () => {
    renderAssignCourses();
    
    // Open modal
    fireEvent.click(screen.getByText('ASSIGN COURSE'));

    // Submit without filling form
    fireEvent.click(screen.getByText('Save'));

    // Check error message
    await waitFor(() => {
      expect(screen.getByText('Please fill in all required fields')).toBeInTheDocument();
    });
  });
});