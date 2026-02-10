import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import axios from 'axios';
import RegistrarEnrollment from './index';

jest.mock('../../components/Searchbar', () => {
  return function DummySearchbar() {
    return <div data-testid="enrollment-searchbar">Search</div>;
  };
});

jest.mock('axios');

const mockEnrollment = {
  _id: '1',
  student: {
    firstName: 'John',
    middleName: 'Doe',
    lastName: 'Smith',
    suffix: 'Jr'
  },
  yearLevel: '1st',
  programs: '1',
  status: 'Pending',
  semester: '1st',
  academic_year: '2023-2024',
  idpic: 'base64string',
  birthCertificateDoc: 'base64string',
  form137Doc: 'base64string'
};

describe('RegistrarEnrollment Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'mock-token');
    axios.get.mockResolvedValueOnce({ data: [mockEnrollment] });
  });

  test('renders main components and structure', async () => {
    render(<RegistrarEnrollment />);
    
    expect(screen.getByTestId('registrar-enrollment-page')).toBeInTheDocument();
    expect(screen.getByTestId('page-title')).toBeInTheDocument();
    expect(screen.getByTestId('list-title')).toBeInTheDocument();
    expect(screen.getByTestId('enrollment-searchbar')).toBeInTheDocument();
    expect(screen.getByTestId('enrollments-table')).toBeInTheDocument();
    expect(screen.getByTestId('sort-select')).toBeInTheDocument();
    expect(screen.getByTestId('program-select')).toBeInTheDocument();
  });

  test('displays enrollment data with correct formatting', async () => {
    render(<RegistrarEnrollment />);

    await waitFor(() => {
      expect(screen.getByTestId('student-name-0')).toHaveTextContent('Smith, John D. Jr');
      expect(screen.getByTestId('year-level-0')).toHaveTextContent('1st');
      expect(screen.getByTestId('program-0')).toHaveTextContent('BSIT');
      expect(screen.getByTestId('status-0')).toHaveTextContent('Pending');
    });
  });

  test('handles view details modal', async () => {
    render(<RegistrarEnrollment />);

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('view-button-0'));
    });

    expect(screen.getByTestId('enrollment-details-modal')).toBeInTheDocument();
    expect(screen.getByTestId('enrollment-details')).toBeInTheDocument();
    expect(screen.getByText('Enrollment Details')).toBeInTheDocument();

    // Check modal content
    expect(screen.getByTestId('modal-student-name')).toHaveTextContent('Smith, John D. Jr');
    expect(screen.getByTestId('modal-program')).toHaveTextContent('BSIT');
    expect(screen.getByTestId('modal-year-level')).toHaveTextContent('1st');
    expect(screen.getByText('2023-2024')).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByTestId('modal-close-button'));
    await waitFor(() => {
      expect(screen.queryByTestId('enrollment-details')).not.toBeInTheDocument();
    });
  });

  test('handles verify enrollment action', async () => {
    axios.put.mockResolvedValueOnce({ data: { message: 'Success' } });
    
    render(<RegistrarEnrollment />);

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('verify-button-0'));
    });

    expect(axios.put).toHaveBeenCalledWith(
      'http://localhost:4000/registrar/verify-enrollment/1',
      {},
      { headers: { Authorization: 'Bearer mock-token' } }
    );
  });

  test('displays document previews in modal', async () => {
    render(<RegistrarEnrollment />);

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('view-button-0'));
    });

    expect(screen.getByText('Required Documents')).toBeInTheDocument();
    expect(screen.getByText('Student ID Picture')).toBeInTheDocument();
    expect(screen.getByText('Birth Certificate')).toBeInTheDocument();
    expect(screen.getByText('Form 137')).toBeInTheDocument();

    // Check images
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
    expect(images[0]).toHaveAttribute('alt', 'Student ID');
    expect(images[1]).toHaveAttribute('alt', 'Birth Certificate');
    expect(images[2]).toHaveAttribute('alt', 'Form 137');
  });
});