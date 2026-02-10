import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import AcademicRecords from './index';
import { MyContext } from "../../App";

// Mock user data
const mockUser = {
  id: "2020-00123",
  firstName: "John",
  lastName: "Doe"
};

// Mock context
const mockContext = {
  user: mockUser,
  isLogin: true,
  setIsHideComponents: jest.fn(),
};

// Mock window.scrollTo
window.scrollTo = jest.fn();

describe('AcademicRecords Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  const renderWithContext = () => {
    return render(
      <MyContext.Provider value={mockContext}>
        <AcademicRecords />
      </MyContext.Provider>
    );
  };

  test('renders academic records page with user data', () => {
    renderWithContext();
    
    // Check header using test-id
    expect(screen.getByTestId('page-title')).toHaveTextContent('Academic Records');
    expect(screen.getByText(`Welcome to your Academic Records, ${mockUser.firstName}`)).toBeInTheDocument();
    
    // Check personal information
    expect(screen.getByText(/Student No:/)).toBeInTheDocument();
    expect(screen.getByText(mockUser.id)).toBeInTheDocument();
    expect(screen.getByText(/BSIT/)).toBeInTheDocument();
  });

  test('renders grades overview section', () => {
    renderWithContext();
    
    expect(screen.getByText('Grades Overview')).toBeInTheDocument();
    expect(screen.getByText('IT101')).toBeInTheDocument();
    expect(screen.getByText('Introduction to IT')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  test('renders GPA overview section', () => {
    renderWithContext();
    
    expect(screen.getByText('GPA Overview')).toBeInTheDocument();
    expect(screen.getByText('Semester GPA:')).toBeInTheDocument();
    expect(screen.getByText('3.5')).toBeInTheDocument();
    expect(screen.getByText('Cumulative GPA:')).toBeInTheDocument();
    expect(screen.getByText('3.2')).toBeInTheDocument();
  });

  test('renders enrollment history section', () => {
    renderWithContext();
    
    // Check section header
    expect(screen.getByText('Enrollment History')).toBeInTheDocument();
    
    // Get all tables and find the enrollment history table
    const tables = screen.getAllByRole('table');
    const enrollmentTable = tables[1]; // Second table in the component
    
    // Get rows from the enrollment table
    const rows = within(enrollmentTable).getAllByRole('row');
    const firstDataRow = rows[1]; // First row after header
    
    // Check the content of the first row
    within(firstDataRow).getByText('2024-2025');
    within(firstDataRow).getByText('1st Semester');
    within(firstDataRow).getByText('Enrolled');
    within(firstDataRow).getByText('21');
    within(firstDataRow).getByText('18');
  });

  test('renders transcript request button', () => {
    renderWithContext();
    
    expect(screen.getByText('Transcript Request')).toBeInTheDocument();
    expect(screen.getByText('Request TOR')).toBeInTheDocument();
  });

  test('calls setIsHideComponents and scrollTo on mount', () => {
    renderWithContext();
    
    expect(mockContext.setIsHideComponents).toHaveBeenCalledWith(false);
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  test('does not render welcome message when not logged in', () => {
    const notLoggedInContext = {
      ...mockContext,
      isLogin: false
    };

    render(
      <MyContext.Provider value={notLoggedInContext}>
        <AcademicRecords />
      </MyContext.Provider>
    );

    expect(screen.queryByText(/Welcome to your Academic Records/)).not.toBeInTheDocument();
  });
});