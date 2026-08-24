import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BottomNav from '../BottomNav';

const defaultProps = {
  activeTab: 'Centro de Control',
  onTabSelect: vi.fn(),
  isConjuntoAdmin: true,
  onSettingsClick: vi.fn(),
  onHelpClick: vi.fn(),
  onStartTour: vi.fn(),
};

const primaryLabels = ['Panel', 'Datos', 'Reservas', 'Finanzas', 'Correos'];
const secondaryLabels = ['Archivos', 'Seguridad', 'Tareas', 'Vencen', 'Ajustes', 'Soporte', 'Tour', 'Mi Perfil'];

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the five primary items when collapsed', () => {
    render(<BottomNav {...defaultProps} />);
    primaryLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('does not render secondary items when collapsed', () => {
    render(<BottomNav {...defaultProps} />);
    secondaryLabels.forEach((label) => {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    });
  });

  it('maps a primary item to its tab and calls onTabSelect', async () => {
    render(<BottomNav {...defaultProps} />);
    await userEvent.click(screen.getByText('Datos'));
    expect(defaultProps.onTabSelect).toHaveBeenCalledWith('Base de datos');
  });

  it('maps Panel to Centro de Control', async () => {
    render(<BottomNav {...defaultProps} />);
    await userEvent.click(screen.getByText('Panel'));
    expect(defaultProps.onTabSelect).toHaveBeenCalledWith('Centro de Control');
  });

  it('expands the sheet when the chevron is clicked', async () => {
    render(<BottomNav {...defaultProps} />);
    await userEvent.click(screen.getByLabelText('Ver más opciones'));
    secondaryLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('selects a secondary tab from the sheet and collapses it', async () => {
    render(<BottomNav {...defaultProps} />);
    await userEvent.click(screen.getByLabelText('Ver más opciones'));
    await userEvent.click(screen.getByText('Vencen'));
    expect(defaultProps.onTabSelect).toHaveBeenCalledWith('Vencimientos');
    expect(screen.queryByText('Mi Perfil')).not.toBeInTheDocument();
  });

  it('opens settings without a tab from Ajustes', async () => {
    render(<BottomNav {...defaultProps} />);
    await userEvent.click(screen.getByLabelText('Ver más opciones'));
    await userEvent.click(screen.getByText('Ajustes'));
    expect(defaultProps.onSettingsClick).toHaveBeenCalledWith();
  });

  it('opens settings on Mi Perfil', async () => {
    render(<BottomNav {...defaultProps} />);
    await userEvent.click(screen.getByLabelText('Ver más opciones'));
    await userEvent.click(screen.getByText('Mi Perfil'));
    expect(defaultProps.onSettingsClick).toHaveBeenCalledWith('Perfil');
  });

  it('opens help from Soporte', async () => {
    render(<BottomNav {...defaultProps} />);
    await userEvent.click(screen.getByLabelText('Ver más opciones'));
    await userEvent.click(screen.getByText('Soporte'));
    expect(defaultProps.onHelpClick).toHaveBeenCalled();
  });

  it('starts the tour from Tour', async () => {
    render(<BottomNav {...defaultProps} />);
    await userEvent.click(screen.getByLabelText('Ver más opciones'));
    await userEvent.click(screen.getByText('Tour'));
    expect(defaultProps.onStartTour).toHaveBeenCalled();
  });

  it('expands the sheet when swiping up on the bar', () => {
    render(<BottomNav {...defaultProps} />);
    fireEvent.touchStart(screen.getByText('Panel'), { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(screen.getByText('Panel'), { touches: [{ clientY: 40 }] });
    fireEvent.touchEnd(screen.getByText('Panel'));
    expect(screen.getByText('Mi Perfil')).toBeInTheDocument();
  });

  it('collapses the sheet when swiping down on it', () => {
    render(<BottomNav {...defaultProps} />);
    fireEvent.touchStart(screen.getByText('Panel'), { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(screen.getByText('Panel'), { touches: [{ clientY: 40 }] });
    fireEvent.touchEnd(screen.getByText('Panel'));
    expect(screen.getByText('Archivos')).toBeInTheDocument();

    fireEvent.touchStart(screen.getByText('Archivos'), { touches: [{ clientY: 40 }] });
    fireEvent.touchMove(screen.getByText('Archivos'), { touches: [{ clientY: 120 }] });
    expect(screen.queryByText('Mi Perfil')).not.toBeInTheDocument();
  });

  it('collapses the sheet when tapping the backdrop', async () => {
    render(<BottomNav {...defaultProps} />);
    await userEvent.click(screen.getByLabelText('Ver más opciones'));
    const backdrop = screen.getByTestId('bottom-nav-backdrop');
    await userEvent.click(backdrop);
    expect(screen.queryByText('Mi Perfil')).not.toBeInTheDocument();
  });
});
