import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Header from '../Header';
import { UserProfile, UserRole } from '../../types';

const userProfile: UserProfile = {
  id: 'u1',
  email: 'ana@test.com',
  fullName: 'Ana',
  role: UserRole.Subscriber,
};

const defaultProps = {
  onHelpClick: vi.fn(),
  onStartTour: vi.fn(),
  userProfile,
  conjuntoInfo: null,
  onLogout: vi.fn(),
  onSettingsClick: vi.fn(),
  activeTabName: 'Centro de Control',
};

describe('Header', () => {
  it('renders the PAIC title and active tab name', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText(/PAIC/)).toBeInTheDocument();
    expect(screen.getByText('Centro de Control')).toBeInTheDocument();
  });

  it('does not render the hamburger menu button', () => {
    render(<Header {...defaultProps} />);
    expect(screen.queryByTestId('btn-mobile-menu')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Abrir menú')).not.toBeInTheDocument();
  });

  it('still renders the user avatar menu', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByLabelText('Menú de usuario')).toBeInTheDocument();
  });
});
