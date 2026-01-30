import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Register from '../../components/Register';
import React from 'react';

// Mock lucide-react to avoid issues with SVG rendering in tests
vi.mock('lucide-react', () => ({
  UserPlus: () => <div data-testid="icon-userplus" />,
  Mail: () => <div data-testid="icon-mail" />,
  Phone: () => <div data-testid="icon-phone" />,
  Lock: () => <div data-testid="icon-lock" />,
  Check: () => <div data-testid="icon-check" />,
  X: () => <div data-testid="icon-x" />,
  AlertCircle: () => <div data-testid="icon-alert" />,
  Loader2: () => <div data-testid="icon-loader" />,
  ArrowLeft: () => <div data-testid="icon-arrowleft" />,
}));

describe('Register Component', () => {
  const mockOnRegisterSuccess = vi.fn();
  const mockOnBackToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for the password policy
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        minLength: 12, 
        requireUppercase: true, 
        requireLowercase: true, 
        requireDigit: true, 
        requireSpecial: true 
      }),
    });
  });

  it('displays the username hint below the email field', () => {
    render(<Register onRegisterSuccess={mockOnRegisterSuccess} onBackToLogin={mockOnBackToLogin} />);
    
    expect(screen.getByText(/This will also be your username for signing in/i)).toBeInTheDocument();
  });

  it('renders the email label correctly', () => {
    render(<Register onRegisterSuccess={mockOnRegisterSuccess} onBackToLogin={mockOnBackToLogin} />);
    
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
  });
});
