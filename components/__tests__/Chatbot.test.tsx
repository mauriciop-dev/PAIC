import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Chatbot from '../Chatbot';
import { UserProfile, UserRole } from '../../types';

vi.mock('../../services/geminiService', () => ({
  geminiService: {
    loadHistory: vi.fn().mockResolvedValue([]),
    resetSession: vi.fn(),
    runChat: vi.fn().mockResolvedValue('ok'),
    notifyAction: vi.fn(),
  },
}));

vi.mock('../../utils/chatActions', () => ({
  executeAction: vi.fn().mockResolvedValue('ok'),
  loadListForKey: vi.fn().mockResolvedValue({ columns: [], rows: [] }),
  getListEmptyMessage: vi.fn().mockReturnValue('vacío'),
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

const renderOpen = () =>
  render(
    <Chatbot
      isOpen={true}
      setIsOpen={() => {}}
      userProfile={userProfile}
      conjuntoInfo={conjuntoInfo}
    />
  );

describe('Chatbot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('renders the mobile bottom spacer so the input sits above the bottom nav', () => {
    renderOpen();
    const spacer = screen.getByTestId('chatbot-bottom-spacer');
    expect(spacer).toBeInTheDocument();
    expect(spacer.className).toContain('md:hidden');
    expect(spacer.className).toContain('64px');
  });

  it('renders the input box', () => {
    renderOpen();
    expect(screen.getByPlaceholderText(/Escribe tu mensaje/)).toBeInTheDocument();
  });

  it('renders the main menu chips on welcome', async () => {
    renderOpen();
    expect(await screen.findByText('Datos')).toBeInTheDocument();
    expect(screen.getByText('Reservas')).toBeInTheDocument();
    expect(screen.getByText('Finanzas')).toBeInTheDocument();
  });

  it('navigates from Datos to entity chips and then to action chips', async () => {
    renderOpen();
    fireEvent.click(await screen.findByText('Datos'));
    const residentes = await screen.findByText('Residentes');
    expect(residentes).toBeInTheDocument();
    fireEvent.click(residentes);
    expect(await screen.findByText('Agregar')).toBeInTheDocument();
    expect(screen.getByText('Modificar')).toBeInTheDocument();
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
    expect(screen.getByText('Consultar')).toBeInTheDocument();
  });

  it('opens the add resident form when the Agregar action chip is tapped', async () => {
    renderOpen();
    fireEvent.click(await screen.findByText('Datos'));
    fireEvent.click(await screen.findByText('Residentes'));
    fireEvent.click(await screen.findByText('Agregar'));
    expect(await screen.findByTestId('form-field-apartment')).toBeInTheDocument();
    expect(screen.getByTestId('form-submit')).toBeInTheDocument();
  });

  it('shows the persistent menu reset button', () => {
    renderOpen();
    expect(screen.getByTestId('chatbot-menu-reset')).toBeInTheDocument();
    expect(screen.getByText('☰ Menú')).toBeInTheDocument();
  });
});
