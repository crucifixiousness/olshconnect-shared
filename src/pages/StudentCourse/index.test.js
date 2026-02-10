import { render, screen } from '@testing-library/react';
import StudentCourses from './index';
import { MyContext } from "../../App";

// Mock context provider
const mockSetIsHideComponents = jest.fn();
const mockContextValue = {
  user: { name: 'Test User' },
  setIsHideComponents: mockSetIsHideComponents
};

const wrapper = ({ children }) => (
  <MyContext.Provider value={mockContextValue}>
    {children}
  </MyContext.Provider>
);

describe('StudentCourses Component', () => {
  beforeEach(() => {
    render(<StudentCourses />, { wrapper });
  });

  it('renders the courses page', () => {
    expect(screen.getByTestId('student-courses')).toBeInTheDocument();
    expect(screen.getByText('My Courses')).toBeInTheDocument();
  });

  it('renders the courses table with correct headers', () => {
    const table = screen.getByTestId('courses-table');
    expect(table).toBeInTheDocument();
    
    expect(screen.getByTestId('header-course-title')).toHaveTextContent('COURSE TITLE');
    expect(screen.getByTestId('header-code')).toHaveTextContent('CODE');
    expect(screen.getByTestId('header-units')).toHaveTextContent('UNIT/S');
    expect(screen.getByTestId('header-prerequisite')).toHaveTextContent('PRE-REQUISITE');
  });

  it('renders course data correctly', () => {
    expect(screen.getByText('Application Development and Emerging Technologies')).toBeInTheDocument();
    expect(screen.getByText('CC106')).toBeInTheDocument();
    expect(screen.getByText('Cybersecuirity Principles 1')).toBeInTheDocument();
    expect(screen.getByText('SPT1-CYBER1')).toBeInTheDocument();
  });

  it('calls setIsHideComponents on mount', () => {
    expect(mockSetIsHideComponents).toHaveBeenCalledWith(false);
  });

  it('renders all course entries', () => {
    const courseNames = [
      'Application Development and Emerging Technologies',
      'Cybersecuirity Principles 1',
      'Information Assurance and Security',
      'Web Systems Technology 2',
      'Project Management for IT',
      'Internet of Things',
      'Capstone Project and Research 1'
    ];

    courseNames.forEach(courseName => {
      expect(screen.getByText(courseName)).toBeInTheDocument();
    });
  });
});