import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Staff from '../index';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

const renderStaff = () => {
  return render(
    <BrowserRouter>
      <Staff />
    </BrowserRouter>
  );
};

describe('Staff Management Component', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  test('renders staff management page', async () => {
    // Mock successful staff list fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        { staff_id: 1, full_name: 'John Doe', role: 'instructor' },
        { staff_id: 2, full_name: 'Jane Smith', role: 'admin' }
      ])
    });

    renderStaff();
    
    expect(screen.getByText('Staff Management')).toBeInTheDocument();
    expect(screen.getByText('Staff List')).toBeInTheDocument();
  });

  test('adds new staff successfully', async () => {
    // Mock successful staff creation
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ([]) }) // Initial staff list
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Account Added!' })
      }); // Staff creation

    renderStaff();

    // Click add staff button
    const addButton = screen.getByText('+ Add Staff');
    fireEvent.click(addButton);

    // Fill the form
    const fullNameInput = screen.getByRole('textbox', { name: /full name/i });
    fireEvent.change(fullNameInput, { target: { value: 'Test Staff' } });

    const usernameInput = screen.getByRole('textbox', { name: /username/i });
    fireEvent.change(usernameInput, { target: { value: 'teststaff' } });

    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Select role
    const roleSelect = screen.getByRole('combobox', { name: /role/i });
    fireEvent.mouseDown(roleSelect);
    const instructorOption = screen.getByText('instructor');
    fireEvent.click(instructorOption);

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText('Account Added!')).toBeInTheDocument();
    });

    // Verify API call
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/registerStaff',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String)
      })
    );
  });

  test('shows program selection for program head', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ([]) });

    renderStaff();

    // Open modal
    fireEvent.click(screen.getByText('+ Add Staff'));

    // Select program head role
    const roleSelect = screen.getByRole('combobox', { name: /role/i });
    fireEvent.mouseDown(roleSelect);
    fireEvent.click(screen.getByText('program head'));

    // Verify program dropdown appears
    expect(screen.getByLabelText('Program')).toBeInTheDocument();
  });
});