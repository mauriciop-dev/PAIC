import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Chatbot from '../Chatbot';
import { UserProfile, UserRole } from '../../types';

vi.mock('../services/geminiService', () => ({
  geminiService: {
    loadHistory: vi.fn().mockResolvedValue([]),
    resetSession: vi.fn(),
    runChat: vi.fn().mockResolvedValue('ok'),
  },
}));

const userProfile: UserProfile = {
  id: 'u1',
  email: 'ana@test.com',
  fullName: 'Ana',
  role: UserRole.Subscriber,
};

const conjuntoInfo = {
  id: 'c1',
  name: 'Torres',
  nit: '1',
  address: 'Calle 1',
  adminName: 'Ana',
  adminEmail: 'ana@test.com',
  adminPhone: '123',
  subscriptionPlan: 'Paid' as const,
};

describe('Chatbot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('renders the mobile bottom spacer so the input sits above the bottom nav', () => {
    render(
      <Chatbot
        isOpen={true}
        setIsOpen={() => {}}
        userProfile={userProfile}
        conjuntoInfo={conjuntoInfo}
      />
    );
    const spacer = screen.getByTestId('chatbot-bottom-spacer');
    expect(spacer).toBeInTheDocument();
    expect(spacer.className).toContain('md:hidden');
    expect(spacer.className).toContain('64px');
  });

  it('renders the input box', () => {
    render(
      <Chatbot
        isOpen={true}
        setIsOpen={() => {}}
        userProfile={userProfile}
        conjuntoInfo={conjuntoInfo}
      />
    );
    expect(screen.getByPlaceholderText(/Escribe tu mensaje/)).toBeInTheDocument();
  });
});
