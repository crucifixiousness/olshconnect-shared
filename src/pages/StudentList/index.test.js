import { render, screen, fireEvent, within } from '@testing-library/react';
import StudentList from './index';
import { BrowserRouter } from 'react-router-dom';

// Wrapper component for router
const wrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('StudentList Component', () => {
  beforeEach(() => {
    render(<StudentList />, { wrapper });
  });

  it('renders the student list page', () => {
    expect(screen.getByText('Student List')).toBeInTheDocument();
    expect(screen.getByText('Enrolled Student List')).toBeInTheDocument();
  });

  it('renders the table with correct headers', () => {
    // Use getByTestId to target the header elements directly
    expect(screen.getByTestId('header-student-name')).toBeInTheDocument();
    expect(screen.getByTestId('header-year-level')).toBeInTheDocument();
    expect(screen.getByTestId('header-program')).toBeInTheDocument();
    expect(screen.getByTestId('header-sex')).toBeInTheDocument();
    expect(screen.getByTestId('header-action')).toBeInTheDocument();
  });
  

  it('renders student data in the table', () => {
    expect(screen.getByText('Cee Jay P. Madayag')).toBeInTheDocument();
    expect(screen.getByText('Ken L. Magno')).toBeInTheDocument();
    expect(screen.getAllByText('BSIT')).toHaveLength(2);
    expect(screen.getAllByText('3rd Year')).toHaveLength(2);
  });

  it('renders action buttons for each student', () => {
    const viewButtons = screen.getAllByRole('button', { name: '' });
    expect(viewButtons.length).toBeGreaterThan(0);
  });

  it('renders pagination component', () => {
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders search bar component', () => {
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});