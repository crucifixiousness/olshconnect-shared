import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import StudentPayment from './index';

// Mock axios
jest.mock('axios');

// Mock payment data
const mockPayments = [
  {
    id: 1,
    description: 'First Semester Payment',
    dueDate: '2024-01-15',
    amount: 25000,
    status: 'pending',
    breakdown: {
      tuition: 15000,
      misc: 5000,
      lab: 3000,
      other: 2000
    }
  },
  {
    id: 2,
    description: 'Second Payment',
    dueDate: '2024-02-15',
    amount: 10000,
    status: 'paid',
    breakdown: {
      tuition: 6000,
      misc: 2000,
      lab: 1000,
      other: 1000
    }
  }
];

describe('StudentPayment Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => 'mock-token');
    
    // Mock successful axios response
    axios.get.mockResolvedValue({ data: mockPayments });
  });

  it('renders the payment information page', async () => {
    render(<StudentPayment />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading payment information...')).not.toBeInTheDocument();
    });
    
    // Now check for the rendered content
    expect(screen.getByTestId('student-payment')).toBeInTheDocument();
    expect(screen.getByText('Payment Information')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    // Mock axios to delay response
    axios.get.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<StudentPayment />);
    expect(screen.getByText('Loading payment information...')).toBeInTheDocument();
  });

  it('fetches and displays payment data', async () => {
    render(<StudentPayment />);

    await waitFor(() => {
      expect(screen.getByTestId('payment-table')).toBeInTheDocument();
    });

    expect(screen.getByText('First Semester Payment')).toBeInTheDocument();
    expect(screen.getByText('₱25000.00')).toBeInTheDocument();
  });

  it('displays payment breakdown correctly', async () => {
    render(<StudentPayment />);

    await waitFor(() => {
      expect(screen.getByTestId('payment-summary')).toBeInTheDocument();
    });

    expect(screen.getByText('Tuition Fee: ₱15000.00')).toBeInTheDocument();
    expect(screen.getByText('Miscellaneous: ₱5000.00')).toBeInTheDocument();
    expect(screen.getByText('Laboratory: ₱3000.00')).toBeInTheDocument();
    expect(screen.getByText('Other Fees: ₱2000.00')).toBeInTheDocument();
  });

  it('displays correct status chips', async () => {
    render(<StudentPayment />);

    await waitFor(() => {
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('paid')).toBeInTheDocument();
    });
  });

  it('disables pay button for paid payments', async () => {
    render(<StudentPayment />);

    await waitFor(() => {
      const payButtons = screen.getAllByText('Pay Now');
      expect(payButtons[1]).toBeDisabled();
    });
  });
});