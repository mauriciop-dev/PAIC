import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import DashboardView from '../views/DashboardView';
import { UserProfile, UserRole, Tab } from '../../types';

vi.mock('recharts', () => {
    const MockChart = ({ children }: { children?: ReactNode }) => <div data-testid="mock-chart">{children}</div>;
    return {
        ResponsiveContainer: MockChart,
        LineChart: MockChart,
        BarChart: MockChart,
        PieChart: MockChart,
        Line: () => null,
        Bar: () => null,
        Pie: () => null,
        Cell: () => null,
        XAxis: () => null,
        YAxis: () => null,
        CartesianGrid: () => null,
        Tooltip: () => null,
        Legend: () => null,
    };
});

vi.mock('../../services/apiService', () => ({
    apiService: {
        fetchAccountStatus: vi.fn().mockResolvedValue([]),
        fetchTasks: vi.fn().mockResolvedValue([]),
        fetchDueDates: vi.fn().mockResolvedValue([]),
        fetchPackageLogs: vi.fn().mockResolvedValue([]),
        fetchVisitorLogs: vi.fn().mockResolvedValue([]),
        fetchIncomes: vi.fn().mockResolvedValue([
            { id: 'i1', date: '2026-01-15', amount: 1000 },
            { id: 'i2', date: '2026-02-15', amount: 2000 },
        ]),
        fetchExpenses: vi.fn().mockResolvedValue([
            { id: 'e1', date: '2026-01-20', amount: 500, category: 'Mantenimiento' },
        ]),
        fetchAccessPoints: vi.fn().mockResolvedValue([]),
    },
}));

vi.mock('../ui/Icon', () => ({
    Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock('../../hooks/useMediaQuery', () => ({
    useMediaQuery: vi.fn().mockReturnValue(false),
}));

const userProfile: UserProfile = {
    id: 'u1',
    email: 'ana@test.com',
    fullName: 'Ana',
    role: UserRole.Admin,
    conjuntoId: 'c1',
};

describe('DashboardView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the stat cards and the charts title after loading', async () => {
        render(<DashboardView setActiveTab={() => {}} userProfile={userProfile} />);
        expect(await screen.findByText('Residentes en Mora')).toBeInTheDocument();
        expect(screen.getByText('Tareas Pendientes')).toBeInTheDocument();
        expect(screen.getByText('Pagos Vencidos')).toBeInTheDocument();
        expect(screen.getByText('Paquetes por Entregar')).toBeInTheDocument();
    });

    it('shows the progress ring within the tasks card', async () => {
        render(<DashboardView setActiveTab={() => {}} userProfile={userProfile} />);
        expect(await screen.findByTestId('progress-ring')).toBeInTheDocument();
    });

    it('shows the desktop charts header when not mobile', async () => {
        render(<DashboardView setActiveTab={() => {}} userProfile={userProfile} />);
        expect(await screen.findByText('Ingresos vs Gastos (Últimos 6 meses)')).toBeInTheDocument();
    });
});
