import { ChartData, Resident, AccountStatus, DueDate, Task, Provider, InternalStaff } from "../types";

export const accountStatusData: ChartData[] = [
    { name: 'Al día', value: 120, fill: '#34d399' },
    { name: 'En mora', value: 30, fill: '#f87171' },
];

export const monthlyCollectionData: ChartData[] = [
    { name: 'Ene', value: 45000, fill: '#60a5fa' },
    { name: 'Feb', value: 48000, fill: '#60a5fa' },
    { name: 'Mar', value: 52000, fill: '#60a5fa' },
    { name: 'Abr', value: 47000, fill: '#60a5fa' },
    { name: 'May', value: 55000, fill: '#60a5fa' },
    { name: 'Jun', value: 53000, fill: '#60a5fa' },
];

export const pendingPaymentsData: ChartData[] = [
    { name: 'Vigilancia', value: 25000, fill: '#fb923c' },
    { name: 'Aseo', value: 12000, fill: '#fbbf24' },
    { name: 'Servicios', value: 8000, fill: '#a78bfa' },
    { name: 'Otros', value: 5000, fill: '#f472b6' },
];

export const overdueInstallmentsData: ChartData[] = [
    { name: '1 cuota', value: 15, fill: '#fde047' },
    { name: '2 cuotas', value: 10, fill: '#f59e0b' },
    { name: '3+ cuotas', value: 5, fill: '#ef4444' },
];

export const weeklyChatbotSummaryData: ChartData[] = [
    { name: 'Consultas', value: 135, fill: '#60a5fa' },
    { name: 'Reservas', value: 42, fill: '#34d399' },
    { name: 'Mantenimiento', value: 18, fill: '#f87171' },
    { name: 'Otros', value: 25, fill: '#a78bfa' },
];

const generateMonthlyData = (baseValue: number, color: string) => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    return months.map(month => ({
        name: month,
        value: Math.floor(baseValue + (Math.random() - 0.5) * (baseValue * 0.3)), // baseValue +/- 15%
        fill: color,
    }));
};

export const waterBillHistoryData = generateMonthlyData(1200, '#3b82f6');
export const electricityBillHistoryData = generateMonthlyData(2500, '#f59e0b');
export const gasBillHistoryData = generateMonthlyData(800, '#10b981');
export const phoneBillHistoryData = generateMonthlyData(500, '#8b5cf6');
export const maintenanceHistoryData = generateMonthlyData(1800, '#ec4899');
export const securityBillHistoryData = generateMonthlyData(5000, '#64748b');


export const residentsData: Resident[] = [
    { apartment: '101', name: 'Juan Perez', email: 'juan.perez@email.com', phone: '3001234567' },
    { apartment: '102', name: 'Maria Rodriguez', email: 'maria.r@email.com', phone: '3109876543' },
    { apartment: '201', name: 'Carlos Gomez', email: 'carlos.g@email.com', phone: '3201112233' },
    { apartment: '202', name: 'Ana Lopez', email: 'ana.lopez@email.com', phone: '3015556677' },
    { apartment: '301', name: 'Luis Martinez', email: 'luis.m@email.com', phone: '3154443322' },
];

export const accountStatusDetailsData: AccountStatus[] = [
    { apartment: '101', lastPaymentDate: '2024-06-05', adminFeeValue: 100, pendingInstallments: 0, otherCharges: 0, outstandingBalance: 0 },
    { apartment: '102', lastPaymentDate: '2024-05-04', adminFeeValue: 100, pendingInstallments: 1, otherCharges: 10, outstandingBalance: 110 },
    { apartment: '201', lastPaymentDate: '2024-06-02', adminFeeValue: 120, pendingInstallments: 0, otherCharges: 0, outstandingBalance: 0 },
    { apartment: '202', lastPaymentDate: '2024-03-05', adminFeeValue: 120, pendingInstallments: 3, otherCharges: 0, outstandingBalance: 360 },
    { apartment: '301', lastPaymentDate: '2024-06-01', adminFeeValue: 100, pendingInstallments: 0, otherCharges: 0, outstandingBalance: 0 },
];

export const providersData: Provider[] = [
    { id: 1, company: 'Vigilancia Segura SAS', specialty: 'Vigilancia', email: 'contacto@vigilanciasegura.com', phone: '6012345678' },
    { id: 2, company: 'Aseo Brillante Ltda', specialty: 'Aseo', email: 'ventas@aseobrillante.co', phone: '6018765432' },
    { id: 3, company: 'Plomería Express', specialty: 'Plomero', email: 'servicio@plomeriaexpress.com', phone: '3151231234' },
    { id: 4, company: 'Electri-Ya Soluciones', specialty: 'Electricista', email: 'info@electriya.com', phone: '3109879876' },
];

export const internalStaffData: InternalStaff[] = [
    { id: 1, name: 'Pedro Pascal', position: 'Todero', email: 'pedro.todero@conjunto.com', phone: '3001112233' },
    { id: 2, name: 'Lucia Mendez', position: 'Contadora', email: 'contadora@conjunto.com', phone: '3203334455' },
    { id: 3, name: 'Jorge Jimenez', position: 'Jardinero', email: 'jorge.jardinero@conjunto.com', phone: '3115556677' },
];


export const dueDatesData: DueDate[] = [
    { id: 1, item: 'Servicio de Vigilancia', category: 'Servicios', dueDate: '2024-06-30', status: 'Pendiente' },
    { id: 2, item: 'Servicio de Aseo', category: 'Servicios', dueDate: '2024-06-30', status: 'Pendiente' },
    { id: 3, item: 'Mantenimiento Ascensores', category: 'Mantenimiento', dueDate: '2024-07-05', status: 'Pendiente' },
    { id: 4, item: 'Seguro de Áreas Comunes', category: 'Seguros', dueDate: '2024-05-31', status: 'Vencido' },
    { id: 5, item: 'Servicios Públicos (Agua, Luz)', category: 'Servicios', dueDate: '2024-07-10', status: 'Pendiente' },
    { id: 6, item: 'Pago de Nómina', category: 'Nómina', dueDate: '2024-06-28', status: 'Pagado' },
];

export const tasksData: Task[] = [
    { id: 1, text: 'Contactar a plomero para cotización de arreglo en torre 2', dueDate: '2024-06-25', completed: false },
    { id: 2, text: 'Preparar informe de cartera para la asamblea', dueDate: '2024-07-01', completed: false },
    { id: 3, text: 'Comprar bombillos para pasillos', dueDate: '2024-06-22', completed: true },
    { id: 4, text: 'Revisar contrato de vigilancia', dueDate: '2024-06-28', completed: false },
    { id: 5, text: 'Enviar comunicado sobre uso de piscina', dueDate: '2024-06-20', completed: true },
];