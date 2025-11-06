import { supabase } from './supabaseClient';
import { fromSupabase, toSupabase } from '../utils/dbMappers';
import { 
    Resident, 
    AccountStatus, 
    Provider, 
    InternalStaff, 
    UserProfile,
    UserRole,
    ConjuntoInfo,
    DueDate,
    Task,
    Expense,
    Income,
    Booking,
    CommonArea,
    VisitorLog,
    PackageLog,
    PlatformUser,
    UserRoleDefinition,
    DashboardSummary,
    PlatformStats,
    SuperAdminChartData,
    StoredFile,
    AccessPoint,
    Tab,
    ChartData
} from '../types';

const MOCK_DELAY = 150; // ms

const mockPromise = <T>(data: T, delay: number = MOCK_DELAY): Promise<T> => 
    new Promise(resolve => setTimeout(() => resolve(data), delay));

// This is a complex mock. In a real app, this would be an aggregation query on the DB.
const mockDashboardSummary = (): DashboardSummary => ({
    stats: {
        residentsInDebt: { count: 5, details: ['Apto 101', 'Apto 203', 'Apto 401', 'Apto 502', 'Apto 804'] },
        pendingTasks: { count: 3, details: ['Revisar bomba de agua', 'Cotizar pintura fachada', 'Llamar a proveedor de seguridad'] },
        overduePayments: { count: 2, details: ['Pago de seguridad (Vencido)', 'Mantenimiento ascensor (Vencido)'] },
        packagesToDeliver: { count: 8, details: ['Paquete para Apto 302', 'Sobre para Apto 701'] },
    },
    notifications: [
        { id: 1, type: 'due-date', text: 'Pago de Vigilancia vence en 3 días', details: 'Factura #12345 - $5,000,000', urgency: 'high', linkTo: Tab.DueDates },
        { id: 2, type: 'task', text: 'Revisar bomba de agua', details: 'Asignado: Mantenimiento', urgency: 'medium', linkTo: Tab.PendingTasks },
        { id: 3, type: 'package', text: 'Nuevo paquete para Apto 101', details: 'Transportadora: Servientrega', urgency: 'low', linkTo: Tab.Seguridad },
    ],
});

const handleError = (error: any, context: string) => {
    console.error(`API Error in ${context}:`, error);
    if (error.message) {
        throw new Error(error.message);
    }
    throw new Error(`An unknown error occurred in ${context}.`);
};

// NOTE: This service uses a mix of real Supabase calls (for core features) and mocked data.
// In a full production app, all of these would be real database interactions.

export const apiService = {
    // AUTH & USERS
    async authenticateUser(email: string, password: string): Promise<PlatformUser | null> {
        const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('password', password).single();
        if (error && error.code !== 'PGRST116') handleError(error, 'authenticateUser');
        return data ? fromSupabase(data) : null;
    },
    async findUserByEmail(email: string): Promise<PlatformUser | null> {
        const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
        if (error && error.code !== 'PGRST116') handleError(error, 'findUserByEmail');
        return data ? fromSupabase(data) : null;
    },
    async checkIfSuperAdmin(email: string): Promise<boolean> {
        const { data, error } = await supabase.from('super_admins').select('email').eq('email', email).single();
        if (error && error.code !== 'PGRST116') return false;
        return !!data;
    },
    async fetchUsers(conjuntoId: string): Promise<PlatformUser[]> {
        const { data, error } = await supabase.from('users').select('*').eq('conjunto_id', conjuntoId);
        if (error) handleError(error, 'fetchUsers');
        return fromSupabase(data || []);
    },
    async addUser(conjuntoId: string, user: Omit<PlatformUser, 'id' | 'password'>): Promise<void> {
        const payload = { ...user, conjuntoId };
        const { error } = await supabase.from('users').insert(toSupabase(payload));
        if (error) handleError(error, 'addUser');
    },
    async updateUser(conjuntoId: string, user: PlatformUser): Promise<void> {
        const { error } = await supabase.from('users').update(toSupabase(user)).eq('id', user.id).eq('conjunto_id', conjuntoId);
        if (error) handleError(error, 'updateUser');
    },
    async deleteUser(conjuntoId: string, userId: number): Promise<void> {
        const { error } = await supabase.from('users').delete().eq('id', userId).eq('conjunto_id', conjuntoId);
        if (error) handleError(error, 'deleteUser');
    },

    // CONJUNTO
    async fetchConjuntoInfo(conjuntoId: string): Promise<ConjuntoInfo | null> {
        const { data, error } = await supabase.from('conjuntos').select('*').eq('id', conjuntoId).single();
        if (error && error.code !== 'PGRST116') handleError(error, 'fetchConjuntoInfo');
        return data ? fromSupabase(data) : null;
    },
    async updateConjuntoInfo(info: ConjuntoInfo): Promise<void> {
        const { error } = await supabase.from('conjuntos').upsert(toSupabase(info), { onConflict: 'id' });
        if (error) handleError(error, 'updateConjuntoInfo');
    },
    async seedDatabase(conjuntoId: string): Promise<void> {
        console.log(`Seeding database for ${conjuntoId} if needed.`);
        // In a real app, this would be an RPC call to a Supabase function.
        return mockPromise(undefined, 50);
    },

    // ROLES
    async fetchRoles(conjuntoId: string): Promise<UserRoleDefinition[]> { return mockPromise([]); },
    async addRole(conjuntoId: string, role: Omit<UserRoleDefinition, 'id'>): Promise<void> { return mockPromise(undefined); },
    async updateRole(conjuntoId: string, role: UserRoleDefinition): Promise<void> { return mockPromise(undefined); },
    async deleteRole(conjuntoId: string, id: string): Promise<void> { return mockPromise(undefined); },

    // DATABASE TABS (Residents, Accounts, etc.)
    async fetchResidents(conjuntoId: string): Promise<Resident[]> { return mockPromise([]); },
    async addResident(conjuntoId: string, resident: Resident): Promise<void> { return mockPromise(undefined); },
    async updateResident(conjuntoId: string, resident: Resident): Promise<void> { return mockPromise(undefined); },
    async deleteResident(conjuntoId: string, apartment: string): Promise<void> { return mockPromise(undefined); },
    async bulkUpsertResidents(conjuntoId: string, residents: Resident[]): Promise<void> { return mockPromise(undefined); },

    async fetchAccountStatus(conjuntoId: string): Promise<AccountStatus[]> { return mockPromise([]); },
    async addAccountStatus(conjuntoId: string, account: AccountStatus): Promise<void> { return mockPromise(undefined); },
    async updateAccountStatus(conjuntoId: string, account: AccountStatus): Promise<void> { return mockPromise(undefined); },
    async deleteAccountStatus(conjuntoId: string, apartment: string): Promise<void> { return mockPromise(undefined); },
    async bulkUpsertAccountStatus(conjuntoId: string, accounts: AccountStatus[]): Promise<void> { return mockPromise(undefined); },

    async fetchProviders(conjuntoId: string): Promise<Provider[]> { return mockPromise([]); },
    async addProvider(conjuntoId: string, provider: Provider): Promise<void> { return mockPromise(undefined); },
    async updateProvider(conjuntoId: string, provider: Provider): Promise<void> { return mockPromise(undefined); },
    async deleteProvider(conjuntoId: string, id: number): Promise<void> { return mockPromise(undefined); },
    async bulkUpsertProviders(conjuntoId: string, providers: Provider[]): Promise<void> { return mockPromise(undefined); },
    
    async fetchInternalStaff(conjuntoId: string): Promise<InternalStaff[]> { return mockPromise([]); },
    async addInternalStaff(conjuntoId: string, staff: InternalStaff): Promise<void> { return mockPromise(undefined); },
    async updateInternalStaff(conjuntoId: string, staff: InternalStaff): Promise<void> { return mockPromise(undefined); },
    async deleteInternalStaff(conjuntoId: string, name: string): Promise<void> { return mockPromise(undefined); },
    async bulkUpsertInternalStaff(conjuntoId: string, staff: InternalStaff[]): Promise<void> { return mockPromise(undefined); },

    // DASHBOARD & FINANZAS
    async fetchDashboardSummary(conjuntoId: string): Promise<DashboardSummary> { return mockPromise(mockDashboardSummary()); },
    async fetchFinancialChartData(conjuntoId: string): Promise<{ monthlyIncomeVsExpense: ChartData[], expensesByCategory: ChartData[], packageVolume: ChartData[], visitorTraffic: ChartData[], monthlyBudget: number }> { 
        return mockPromise({
            monthlyIncomeVsExpense: [
                { name: 'Ene', ingresos: 4000, gastos: 2400 },
                { name: 'Feb', ingresos: 3000, gastos: 1398 },
                { name: 'Mar', ingresos: 2000, gastos: 9800 },
                { name: 'Abr', ingresos: 2780, gastos: 3908 },
                { name: 'May', ingresos: 1890, gastos: 4800 },
                { name: 'Jun', ingresos: 2390, gastos: 3800 },
            ],
            expensesByCategory: [
                { name: 'Servicios', value: 400, fill: '#0088FE' },
                { name: 'Mantenimiento', value: 300, fill: '#00C49F' },
                { name: 'Nómina', value: 300, fill: '#FFBB28' },
                { name: 'Otros', value: 200, fill: '#FF8042' },
            ],
            packageVolume: [
                { name: 'Ene', value: 50 }, { name: 'Feb', value: 65 }, { name: 'Mar', value: 70 },
                { name: 'Abr', value: 82 }, { name: 'May', value: 95 }, { name: 'Jun', value: 110 },
            ],
            visitorTraffic: [
                { name: 'Portería 1', value: 250, fill: '#0088FE' },
                { name: 'Portería 2', value: 150, fill: '#00C49F' },
            ],
            monthlyBudget: 10000
        });
    },
    async fetchExpenses(conjuntoId: string): Promise<Expense[]> { return mockPromise([]); },
    async addExpense(conjuntoId: string, expense: Omit<Expense, 'id'>): Promise<void> { return mockPromise(undefined); },
    async deleteExpense(conjuntoId: string, id: number): Promise<void> { return mockPromise(undefined); },
    async bulkUpsertExpenses(conjuntoId: string, expenses: Omit<Expense, 'id'>[]): Promise<void> { return mockPromise(undefined); },
    
    async fetchIncomes(conjuntoId: string): Promise<Income[]> { return mockPromise([]); },
    async addIncome(conjuntoId: string, income: Omit<Income, 'id'>): Promise<void> { return mockPromise(undefined); },
    async deleteIncome(conjuntoId: string, id: number): Promise<void> { return mockPromise(undefined); },
    async bulkUpsertIncomes(conjuntoId: string, incomes: Omit<Income, 'id'>[]): Promise<void> { return mockPromise(undefined); },

    // COMMON AREAS
    async fetchBookings(conjuntoId: string): Promise<Booking[]> { return mockPromise([]); },
    async fetchCommonAreas(conjuntoId: string): Promise<CommonArea[]> { return mockPromise([{ id: '1', name: 'Salón Social', color: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' } }]); },
    async addCommonArea(conjuntoId: string, name: string): Promise<void> { return mockPromise(undefined); },
    async removeCommonArea(conjuntoId: string, id: string): Promise<void> { return mockPromise(undefined); },

    // DUE DATES & TASKS
    async fetchDueDates(conjuntoId: string): Promise<DueDate[]> { return mockPromise([]); },
    async addDueDate(conjuntoId: string, dueDate: Omit<DueDate, 'id'>): Promise<void> { return mockPromise(undefined); },
    async updateDueDate(conjuntoId: string, dueDate: DueDate): Promise<void> { return mockPromise(undefined); },
    async deleteDueDate(conjuntoId: string, id: number): Promise<void> { return mockPromise(undefined); },
    
    async fetchTasks(conjuntoId: string): Promise<Task[]> { return mockPromise([]); },
    async addTask(conjuntoId: string, task: Omit<Task, 'id'>): Promise<void> { return mockPromise(undefined); },
    async updateTask(conjuntoId: string, task: Task): Promise<void> { return mockPromise(undefined); },
    async deleteTask(conjuntoId: string, id: number): Promise<void> { return mockPromise(undefined); },

    // COMUNICACIONES
    async uploadCommunicationAttachment(conjuntoId: string, file: File): Promise<{name: string, url: string} | null> { return mockPromise({ name: file.name, url: 'mock_url' }); },
    async sendCommunicationEmail(recipients: string[], subject: string, body: string, attachments: {name: string, url: string}[]): Promise<{success: boolean, error?: string}> { return mockPromise({ success: true }); },

    // SEGURIDAD
    async fetchVisitorLogs(conjuntoId: string): Promise<VisitorLog[]> { return mockPromise([]); },
    async addVisitorLog(conjuntoId: string, log: Omit<VisitorLog, 'id'>): Promise<void> { return mockPromise(undefined); },
    async updateVisitorLog(conjuntoId: string, id: number, updates: Partial<Omit<VisitorLog, 'id'>>): Promise<void> { return mockPromise(undefined); },
    
    async fetchPackageLogs(conjuntoId: string): Promise<PackageLog[]> { return mockPromise([]); },
    async addPackageLog(conjuntoId: string, log: Omit<PackageLog, 'id' | 'receivedDate' | 'status'>): Promise<void> { return mockPromise(undefined); },
    async updatePackageLogStatus(conjuntoId: string, id: number, status: 'Entregado'): Promise<void> { return mockPromise(undefined); },
    
    async fetchAccessPoints(conjuntoId: string): Promise<AccessPoint[]> { return mockPromise([{ id: 1, name: 'Portería Principal' }]); },
    async addAccessPoint(conjuntoId: string, name: string): Promise<void> { return mockPromise(undefined); },
    async deleteAccessPoint(conjuntoId: string, id: number): Promise<void> { return mockPromise(undefined); },

    // SUPER ADMIN
    async fetchAllConjuntos(): Promise<ConjuntoInfo[]> { return mockPromise([]); },
    async fetchPlatformStats(): Promise<PlatformStats> { return mockPromise({ totalConjuntos: 0, paidSubscriptions: 0, totalResidents: 0, monthlyRecurringRevenue: 0, newThisMonth: 0 }); },
    async fetchSuperAdminChartData(): Promise<SuperAdminChartData> { return mockPromise({ chatbotUsage: [], packageVolume: [], visitorTraffic: [] }); },
    
    // FILE MANAGEMENT
    async listFilesForConjunto(conjuntoId: string): Promise<StoredFile[]> { return mockPromise([]); },
    async uploadFileForConjunto(conjuntoId: string, file: File): Promise<void> { return mockPromise(undefined); },
    async deleteFileForConjunto(conjuntoId: string, fileName: string): Promise<void> { return mockPromise(undefined); },
};
