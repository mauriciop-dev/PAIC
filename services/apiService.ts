// services/apiService.ts
import { supabase } from './supabaseClient';
import { fromSupabase, toSupabase } from '../utils/dbMappers';
import {
    Resident,
    AccountStatus,
    Provider,
    InternalStaff,
    PlatformUser,
    UserRole,
    UserRoleDefinition,
    Booking,
    CommonArea,
    DueDate,
    Task,
    Expense,
    Income,
    VisitorLog,
    PackageLog,
    AccessPoint,
    ConjuntoInfo,
    DashboardSummary,
    ChartData,
    NotificationItem,
    Tab,
    PlatformStats,
    SuperAdminChartData,
    StoredFile,
} from '../types';
import { PostgrestError } from '@supabase/supabase-js';

// In a real app, this list might come from a DB table or a more secure source.
const SUPER_ADMIN_EMAILS = ['superadmin@paic.com', 'test.superadmin@example.com']; // Example email for testing

const handleError = (error: PostgrestError | null, context: string) => {
    if (error) {
        console.error(`Error in ${context}:`, error);
        throw new Error(`Database error in ${context}: ${error.message}`);
    }
};

// A helper to generate random colors for common areas
const getRandomColor = () => {
    const colors = [
      { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
      { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
      { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
      { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
      { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
      { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
    ];
    return colors[Math.floor(Math.random() * colors.length)];
};


export const apiService = {

    // =================================================================
    // CONJUNTO & PLATFORM
    // =================================================================
    
    async fetchConjuntoInfo(conjuntoId: string): Promise<ConjuntoInfo | null> {
        const { data, error } = await supabase.from('conjuntos').select('*').eq('id', conjuntoId).single();
        handleError(error, 'fetchConjuntoInfo');
        return fromSupabase(data) as ConjuntoInfo | null;
    },
    
    async updateConjuntoInfo(info: ConjuntoInfo): Promise<void> {
        const { error } = await supabase.from('conjuntos').upsert(toSupabase(info));
        handleError(error, 'updateConjuntoInfo');
    },

    async fetchAllConjuntos(): Promise<ConjuntoInfo[]> {
        const { data, error } = await supabase.from('conjuntos').select('*');
        handleError(error, 'fetchAllConjuntos');
        return fromSupabase(data) as ConjuntoInfo[];
    },

    async fetchPlatformStats(): Promise<PlatformStats> {
        // Mocked data for demonstration
        return {
            totalConjuntos: 25,
            paidSubscriptions: 18,
            totalResidents: 1250,
            monthlyRecurringRevenue: 18 * 140000,
            newThisMonth: 3,
        };
    },
    
    async fetchSuperAdminChartData(): Promise<SuperAdminChartData> {
        // Mocked data
        // FIX: Added 'fill' property to chart data objects to satisfy the ChartData type.
        return {
            chatbotUsage: [
                { name: 'Ene', value: 400, fill: '#8884d8' }, { name: 'Feb', value: 300, fill: '#8884d8' }, { name: 'Mar', value: 500, fill: '#8884d8' },
                { name: 'Abr', value: 450, fill: '#8884d8' }, { name: 'May', value: 600, fill: '#8884d8' }, { name: 'Jun', value: 700, fill: '#8884d8' },
            ],
            packageVolume: [],
            visitorTraffic: [],
        };
    },

    async seedDatabase(conjuntoId: string): Promise<void> {
        // Check if residents table is empty for this conjunto, which implies it's a new setup.
        const { data, error } = await supabase.from('residents').select('apartment').eq('conjunto_id', conjuntoId).limit(1);
        handleError(error, 'seedDatabase check');

        // If data is empty, it means no residents, so we seed the database with sample data.
        if (data && data.length === 0) {
            console.log(`Seeding database for new conjunto: ${conjuntoId}`);

            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);


            const sampleResidents = [
                { conjuntoId, apartment: '101', name: 'Juan Perez', email: 'juan.perez.sample@email.com', phone: '3001234567' },
                { conjuntoId, apartment: '102', name: 'Maria Rodriguez', email: 'maria.r.sample@email.com', phone: '3011234568' },
                { conjuntoId, apartment: '201', name: 'Carlos Lopez (En Mora)', email: 'carlos.l.sample@email.com', phone: '3021234569' },
                { conjuntoId, apartment: '202', name: 'Ana Martinez', email: 'ana.m.sample@email.com', phone: '3031234570' },
            ];

            const sampleAccountStatus = [
                { conjuntoId, apartment: '101', lastPaymentDate: today.toISOString().split('T')[0], adminFeeValue: 200000, pendingInstallments: 0, otherCharges: 0, outstandingBalance: 0 },
                { conjuntoId, apartment: '102', lastPaymentDate: yesterday.toISOString().split('T')[0], adminFeeValue: 220000, pendingInstallments: 0, otherCharges: 0, outstandingBalance: 0 },
                { conjuntoId, apartment: '201', lastPaymentDate: lastWeek.toISOString().split('T')[0], adminFeeValue: 200000, pendingInstallments: 1, otherCharges: 50000, outstandingBalance: 250000 },
                { conjuntoId, apartment: '202', lastPaymentDate: today.toISOString().split('T')[0], adminFeeValue: 220000, pendingInstallments: 0, otherCharges: 0, outstandingBalance: 0 },
            ];
            
            const sampleProviders = [
                { conjuntoId, company: 'Plomería J.J.', specialty: 'Plomería', email: 'plomeriajj.sample@email.com', phone: '3101234567' },
                { conjuntoId, company: 'Seguridad Águila', specialty: 'Vigilancia', email: 'contacto.aguila.sample@email.com', phone: '3111234568' },
            ];

            const sampleInternalStaff = [
                { conjuntoId, name: 'Pedro Gomez', position: 'Todero', email: 'pedro.g.sample@email.com', phone: '3131234567' },
            ];

            const sampleAccessPoints = [
                { conjunto_id: conjuntoId, name: 'Portería Principal' },
                { conjunto_id: conjuntoId, name: 'Portería Vehicular' },
            ];
            
            const sampleDueDates = [
                { conjuntoId, item: 'Pago de Vigilancia', category: 'Servicios' as const, dueDate: nextWeek.toISOString().split('T')[0], status: 'Pendiente' as const },
                { conjuntoId, item: 'Mantenimiento Ascensor', category: 'Mantenimiento' as const, dueDate: lastWeek.toISOString().split('T')[0], status: 'Pagado' as const },
                { conjuntoId, item: 'Seguro de áreas comunes', category: 'Seguros' as const, dueDate: yesterday.toISOString().split('T')[0], status: 'Vencido' as const },
            ];

            const sampleTasks = [
                { conjuntoId, text: 'Revisar bomba de agua', dueDate: tomorrow.toISOString().split('T')[0], completed: false },
                { conjuntoId, text: 'Comprar bombillos pasillo 3', dueDate: yesterday.toISOString().split('T')[0], completed: true },
            ];
            
            const sampleIncomes = [
                { conjuntoId, description: 'Cuota de Admin Apto 101', amount: 200000, category: 'Cuota de Administración' as const, date: today.toISOString().split('T')[0] },
                { conjuntoId, description: 'Alquiler Salón Social Apto 102', amount: 150000, category: 'Alquiler de Áreas' as const, date: yesterday.toISOString().split('T')[0] },
            ];

            const sampleExpenses = [
                { conjuntoId, description: 'Pago Vigilancia', amount: 80000, category: 'Servicios' as const, date: today.toISOString().split('T')[0], providerId: null },
                { conjuntoId, description: 'Reparación Plomería', amount: 120000, category: 'Mantenimiento' as const, date: lastWeek.toISOString().split('T')[0], providerId: null },
            ];

            const sampleVisitorLogs = [
                { conjuntoId, apartment: '102', visitorName: 'Laura Prima', date: today.toISOString().split('T')[0], status: 'Autorizado' as const },
                { conjuntoId, apartment: '202', visitorName: 'Técnico Internet', date: yesterday.toISOString().split('T')[0], status: 'Salió' as const, entryTime: '09:00', exitTime: '10:30' },
            ];

            const samplePackageLogs = [
                { conjuntoId, apartment: '101', courier: 'Servientrega', receivedDate: today.toISOString(), status: 'En recepción' as const },
                { conjuntoId, apartment: '201', courier: 'MercadoLibre', receivedDate: yesterday.toISOString(), status: 'Entregado' as const },
            ];
            
            const sampleCommonAreas = [
                 { conjuntoId, name: 'Salón Social', color: getRandomColor() },
                 { conjuntoId, name: 'Gimnasio', color: getRandomColor() },
                 { conjuntoId, name: 'Zona BBQ', color: getRandomColor() },
            ];

            // Using Promise.all to run insertions in parallel for efficiency
            await Promise.all([
                supabase.from('residents').insert(sampleResidents.map(toSupabase)),
                supabase.from('account_status').insert(sampleAccountStatus.map(toSupabase)),
                supabase.from('providers').insert(sampleProviders.map(toSupabase)),
                supabase.from('internal_staff').insert(sampleInternalStaff.map(toSupabase)),
                supabase.from('access_points').insert(sampleAccessPoints),
                supabase.from('due_dates').insert(sampleDueDates.map(toSupabase)),
                supabase.from('tasks').insert(sampleTasks.map(toSupabase)),
                supabase.from('incomes').insert(sampleIncomes.map(toSupabase)),
                supabase.from('expenses').insert(sampleExpenses.map(toSupabase)),
                supabase.from('visitor_logs').insert(sampleVisitorLogs.map(toSupabase)),
                supabase.from('package_logs').insert(samplePackageLogs.map(toSupabase)),
                supabase.from('common_areas').insert(sampleCommonAreas.map(toSupabase)),
            ]);

            console.log(`Database seeded successfully for conjunto: ${conjuntoId}`);
        }
    },


    // =================================================================
    // AUTH & USERS
    // =================================================================

    async findUserByEmail(email: string): Promise<PlatformUser | null> {
        const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
        if (error && error.code !== 'PGRST116') { // Ignore 'not found' error
            handleError(error, 'findUserByEmail');
        }
        return fromSupabase(data) as PlatformUser | null;
    },

    async checkIfSuperAdmin(email: string): Promise<boolean> {
        return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
    },

    async authenticateUser(email: string, password: string): Promise<PlatformUser | null> {
        const user = await this.findUserByEmail(email);
        // This is a simplified password check. In a real app, use Supabase Auth or hashed passwords.
        if (user && user.password === password) {
            return user;
        }
        return null;
    },
    
    async addUser(conjuntoId: string, user: Omit<PlatformUser, 'id'>): Promise<void> {
        const { error } = await supabase.from('users').insert(toSupabase({ ...user, conjuntoId }));
        handleError(error, 'addUser');
    },

    async updateUser(conjuntoId: string, user: PlatformUser): Promise<void> {
        const { error } = await supabase.from('users').update(toSupabase(user)).eq('id', user.id).eq('conjunto_id', conjuntoId);
        handleError(error, 'updateUser');
    },

    async deleteUser(conjuntoId: string, userId: number): Promise<void> {
        const { error } = await supabase.from('users').delete().eq('id', userId).eq('conjunto_id', conjuntoId);
        handleError(error, 'deleteUser');
    },

    async fetchUsers(conjuntoId: string): Promise<PlatformUser[]> {
        const { data, error } = await supabase.from('users').select('*').eq('conjunto_id', conjuntoId);
        handleError(error, 'fetchUsers');
        return fromSupabase(data) as PlatformUser[];
    },


    // =================================================================
    // DATABASE VIEWS
    // =================================================================

    // Residents
    async fetchResidents(conjuntoId: string): Promise<Resident[]> {
        const { data, error } = await supabase.from('residents').select('*').eq('conjunto_id', conjuntoId);
        handleError(error, 'fetchResidents');
        return fromSupabase(data) as Resident[];
    },
    async fetchResidentByApartment(conjuntoId: string, apartment: string): Promise<Resident | null> {
        const { data, error } = await supabase.from('residents').select('*').eq('conjunto_id', conjuntoId).eq('apartment', apartment).single();
        if (error && error.code !== 'PGRST116') handleError(error, 'fetchResidentByApartment');
        return fromSupabase(data) as Resident | null;
    },
    async addResident(conjuntoId: string, resident: Omit<Resident, 'id'>): Promise<void> {
        const { error } = await supabase.from('residents').insert(toSupabase({ ...resident, conjuntoId }));
        handleError(error, 'addResident');
    },
    async updateResident(conjuntoId: string, resident: Resident): Promise<void> {
        const { error } = await supabase.from('residents').update(toSupabase(resident)).eq('apartment', resident.apartment).eq('conjunto_id', conjuntoId);
        handleError(error, 'updateResident');
    },
    async deleteResident(conjuntoId: string, apartment: string): Promise<void> {
        const { error } = await supabase.from('residents').delete().eq('apartment', apartment).eq('conjunto_id', conjuntoId);
        handleError(error, 'deleteResident');
    },
    async bulkUpsertResidents(conjuntoId: string, residents: Resident[]): Promise<void> {
        const payload = residents.map(r => toSupabase({ ...r, conjuntoId }));
        const { error } = await supabase.from('residents').upsert(payload, { onConflict: 'apartment, conjunto_id' });
        handleError(error, 'bulkUpsertResidents');
    },

    // Account Status
    async fetchAccountStatus(conjuntoId: string): Promise<AccountStatus[]> {
        const { data, error } = await supabase.from('account_status').select('*').eq('conjunto_id', conjuntoId);
        handleError(error, 'fetchAccountStatus');
        return fromSupabase(data) as AccountStatus[];
    },
    async fetchAccountStatusByApartment(conjuntoId: string, apartment: string): Promise<AccountStatus | null> {
        const { data, error } = await supabase.from('account_status').select('*').eq('conjunto_id', conjuntoId).eq('apartment', apartment).single();
        if (error && error.code !== 'PGRST116') handleError(error, 'fetchAccountStatusByApartment');
        return fromSupabase(data) as AccountStatus | null;
    },
    async fetchDebtors(conjuntoId: string): Promise<{ apartment: string; name: string; balance: number }[]> {
        const statuses = await this.fetchAccountStatus(conjuntoId);
        const residents = await this.fetchResidents(conjuntoId);
        const residentMap = new Map(residents.map(r => [r.apartment, r.name]));
        return statuses
            .filter(s => s.outstandingBalance > 0)
            .map(s => ({
                apartment: s.apartment,
                name: residentMap.get(s.apartment) || 'N/A',
                balance: s.outstandingBalance,
            }));
    },
    async addAccountStatus(conjuntoId: string, account: AccountStatus): Promise<void> {
        const { error } = await supabase.from('account_status').insert(toSupabase({ ...account, conjuntoId }));
        handleError(error, 'addAccountStatus');
    },
    async updateAccountStatus(conjuntoId: string, account: AccountStatus): Promise<void> {
        const { error } = await supabase.from('account_status').update(toSupabase(account)).eq('apartment', account.apartment).eq('conjunto_id', conjuntoId);
        handleError(error, 'updateAccountStatus');
    },
    async deleteAccountStatus(conjuntoId: string, apartment: string): Promise<void> {
        const { error } = await supabase.from('account_status').delete().eq('apartment', apartment).eq('conjunto_id', conjuntoId);
        handleError(error, 'deleteAccountStatus');
    },
    async bulkUpsertAccountStatus(conjuntoId: string, accounts: AccountStatus[]): Promise<void> {
        const payload = accounts.map(a => toSupabase({ ...a, conjuntoId }));
        const { error } = await supabase.from('account_status').upsert(payload, { onConflict: 'apartment, conjunto_id' });
        handleError(error, 'bulkUpsertAccountStatus');
    },
    
    // Providers
    async fetchProviders(conjuntoId: string): Promise<Provider[]> {
        const { data, error } = await supabase.from('providers').select('*').eq('conjunto_id', conjuntoId);
        handleError(error, 'fetchProviders');
        return fromSupabase(data) as Provider[];
    },
     async fetchProvidersBySpecialty(conjuntoId: string, specialty: string): Promise<Provider[]> {
        let query = supabase.from('providers').select('*').eq('conjunto_id', conjuntoId);
        if (specialty) {
            query = query.ilike('specialty', `%${specialty}%`);
        }
        const { data, error } = await query;
        handleError(error, 'fetchProvidersBySpecialty');
        return fromSupabase(data) as Provider[];
    },
    async addProvider(conjuntoId: string, provider: Omit<Provider, 'id'>): Promise<void> {
        const { error } = await supabase.from('providers').insert(toSupabase({ ...provider, conjuntoId }));
        handleError(error, 'addProvider');
    },
    async updateProvider(conjuntoId: string, provider: Provider): Promise<void> {
        const { error } = await supabase.from('providers').update(toSupabase(provider)).eq('id', provider.id).eq('conjunto_id', conjuntoId);
        handleError(error, 'updateProvider');
    },
    async deleteProvider(conjuntoId: string, id: number): Promise<void> {
        const { error } = await supabase.from('providers').delete().eq('id', id).eq('conjunto_id', conjuntoId);
        handleError(error, 'deleteProvider');
    },
    async bulkUpsertProviders(conjuntoId: string, providers: Provider[]): Promise<void> {
        const payload = providers.map(p => toSupabase({ ...p, conjuntoId }));
        const { error } = await supabase.from('providers').upsert(payload, { onConflict: 'id, conjunto_id', ignoreDuplicates: false });
        handleError(error, 'bulkUpsertProviders');
    },

    // Internal Staff
    async fetchInternalStaff(conjuntoId: string): Promise<InternalStaff[]> {
        const { data, error } = await supabase.from('internal_staff').select('*').eq('conjunto_id', conjuntoId);
        handleError(error, 'fetchInternalStaff');
        return fromSupabase(data) as InternalStaff[];
    },
    async addInternalStaff(conjuntoId: string, staff: InternalStaff): Promise<void> {
        const { error } = await supabase.from('internal_staff').insert(toSupabase({ ...staff, conjuntoId }));
        handleError(error, 'addInternalStaff');
    },
    async updateInternalStaff(conjuntoId: string, staff: InternalStaff): Promise<void> {
        const { error } = await supabase.from('internal_staff').update(toSupabase(staff)).eq('name', staff.name).eq('conjunto_id', conjuntoId);
        handleError(error, 'updateInternalStaff');
    },
    async deleteInternalStaff(conjuntoId: string, name: string): Promise<void> {
        const { error } = await supabase.from('internal_staff').delete().eq('name', name).eq('conjunto_id', conjuntoId);
        handleError(error, 'deleteInternalStaff');
    },
    async bulkUpsertInternalStaff(conjuntoId: string, staff: InternalStaff[]): Promise<void> {
        const payload = staff.map(s => toSupabase({ ...s, conjuntoId }));
        const { error } = await supabase.from('internal_staff').upsert(payload, { onConflict: 'name, conjunto_id' });
        handleError(error, 'bulkUpsertInternalStaff');
    },
    
    // Roles
    async fetchRoles(conjuntoId: string): Promise<UserRoleDefinition[]> {
        const { data, error } = await supabase.from('user_roles').select('*').eq('conjunto_id', conjuntoId);
        handleError(error, 'fetchRoles');
        return fromSupabase(data) as UserRoleDefinition[];
    },
    async addRole(conjuntoId: string, role: Omit<UserRoleDefinition, 'id'>): Promise<void> {
        const { error } = await supabase.from('user_roles').insert(toSupabase({ ...role, conjuntoId }));
        handleError(error, 'addRole');
    },
    async updateRole(conjuntoId: string, role: UserRoleDefinition): Promise<void> {
        const { error } = await supabase.from('user_roles').update(toSupabase(role)).eq('id', role.id).eq('conjunto_id', conjuntoId);
        handleError(error, 'updateRole');
    },
    async deleteRole(conjuntoId: string, id: string): Promise<void> {
        const { error } = await supabase.from('user_roles').delete().eq('id', id).eq('conjunto_id', conjuntoId);
        handleError(error, 'deleteRole');
    },
    

    // =================================================================
    // FEATURES
    // =================================================================

    // Common Areas
    async fetchCommonAreas(conjuntoId: string): Promise<CommonArea[]> {
        const { data, error } = await supabase.from('common_areas').select('*').eq('conjunto_id', conjuntoId);
        handleError(error, 'fetchCommonAreas');
        return fromSupabase(data) as CommonArea[];
    },
    async addCommonArea(conjuntoId: string, name: string): Promise<void> {
        const newArea = { name, conjuntoId, color: getRandomColor() };
        const { error } = await supabase.from('common_areas').insert(toSupabase(newArea));
        handleError(error, 'addCommonArea');
    },
    async removeCommonArea(conjuntoId: string, id: string): Promise<void> {
        const { error } = await supabase.from('common_areas').delete().eq('id', id).eq('conjunto_id', conjuntoId);
        handleError(error, 'removeCommonArea');
    },

    // Bookings
    async fetchBookings(conjuntoId: string): Promise<Booking[]> {
        const { data, error } = await supabase.from('bookings').select('*').eq('conjunto_id', conjuntoId);
        handleError(error, 'fetchBookings');
        return fromSupabase(data) as Booking[];
    },
    async addBooking(conjuntoId: string, booking: Booking): Promise<void> {
        const { error } = await supabase.from('bookings').insert(toSupabase({ ...booking, conjuntoId }));
        handleError(error, 'addBooking');
    },

    // Due Dates
    async fetchDueDates(conjuntoId: string): Promise<DueDate[]> {
        const { data, error } = await supabase.from('due_dates').select('*').eq('conjunto_id', conjuntoId);
        handleError(error, 'fetchDueDates');
        return fromSupabase(data) as DueDate[];
    },
    async addDueDate(conjuntoId: string, dueDate: Omit<DueDate, 'id'>): Promise<void> {
        const { error } = await supabase.from('due_dates').insert(toSupabase({ ...dueDate, conjuntoId }));
        handleError(error, 'addDueDate');
    },
    async updateDueDate(conjuntoId: string, dueDate: DueDate): Promise<void> {
        const { error } = await supabase.from('due_dates').update(toSupabase(dueDate)).eq('id', dueDate.id).eq('conjunto_id', conjuntoId);
        handleError(error, 'updateDueDate');
    },
    async deleteDueDate(conjuntoId: string, id: number): Promise<void> {
        const { error } = await supabase.from('due_dates').delete().eq('id', id).eq('conjunto_id', conjuntoId);
        handleError(error, 'deleteDueDate');
    },

    // Tasks
    async fetchTasks(conjuntoId: string): Promise<Task[]> {
        const { data, error } = await supabase.from('tasks').select('*').eq('conjunto_id', conjuntoId);
        handleError(error, 'fetchTasks');
        return fromSupabase(data) as Task[];
    },
    async addTask(conjuntoId: string, task: Omit<Task, 'id'>): Promise<void> {
        const { error } = await supabase.from('tasks').insert(toSupabase({ ...task, conjuntoId }));
        handleError(error, 'addTask');
    },
    async updateTask(conjuntoId: string, task: Task): Promise<void> {
        const { error } = await supabase.from('tasks').update(toSupabase(task)).eq('id', task.id).eq('conjunto_id', conjuntoId);
        handleError(error, 'updateTask');
    },
    async deleteTask(conjuntoId: string, id: number): Promise<void> {
        const { error } = await supabase.from('tasks').delete().eq('id', id).eq('conjunto_id', conjuntoId);
        handleError(error, 'deleteTask');
    },

    // Finances
    async fetchExpenses(conjuntoId: string): Promise<Expense[]> {
        const { data, error } = await supabase.from('expenses').select('*').eq('conjunto_id', conjuntoId);
        handleError(error, 'fetchExpenses');
        return fromSupabase(data) as Expense[];
    },
    async addExpense(conjuntoId: string, expense: Omit<Expense, 'id'>): Promise<void> {
        const { error } = await supabase.from('expenses').insert(toSupabase({ ...expense, conjuntoId }));
        handleError(error, 'addExpense');
    },
    async deleteExpense(conjuntoId: string, id: number): Promise<void> {
        const { error } = await supabase.from('expenses').delete().eq('id', id).eq('conjunto_id', conjuntoId);
        handleError(error, 'deleteExpense');
    },
    async bulkUpsertExpenses(conjuntoId: string, expenses: Omit<Expense, 'id'>[]): Promise<void> {
        const payload = expenses.map(e => toSupabase({ ...e, conjuntoId }));
        const { error } = await supabase.from('expenses').upsert(payload, { onConflict: 'id, conjunto_id' });
        handleError(error, 'bulkUpsertExpenses');
    },
    async fetchIncomes(conjuntoId: string): Promise<Income[]> {
        const { data, error } = await supabase.from('incomes').select('*').eq('conjunto_id', conjuntoId);
        handleError(error, 'fetchIncomes');
        return fromSupabase(data) as Income[];
    },
    async addIncome(conjuntoId: string, income: Omit<Income, 'id'>): Promise<void> {
        const { error } = await supabase.from('incomes').insert(toSupabase({ ...income, conjuntoId }));
        handleError(error, 'addIncome');
    },
    async deleteIncome(conjuntoId: string, id: number): Promise<void> {
        const { error } = await supabase.from('incomes').delete().eq('id', id).eq('conjunto_id', conjuntoId);
        handleError(error, 'deleteIncome');
    },
    async bulkUpsertIncomes(conjuntoId: string, incomes: Omit<Income, 'id'>[]): Promise<void> {
        const payload = incomes.map(i => toSupabase({ ...i, conjuntoId }));
        const { error } = await supabase.from('incomes').upsert(payload, { onConflict: 'id, conjunto_id' });
        handleError(error, 'bulkUpsertIncomes');
    },

    // Security
    async fetchVisitorLogs(conjuntoId: string): Promise<VisitorLog[]> {
        const { data, error } = await supabase.from('visitor_logs').select('*').eq('conjunto_id', conjuntoId).order('date', { ascending: false });
        handleError(error, 'fetchVisitorLogs');
        return fromSupabase(data) as VisitorLog[];
    },
    async addVisitorLog(conjuntoId: string, log: Omit<VisitorLog, 'id'>): Promise<void> {
        const { error } = await supabase.from('visitor_logs').insert(toSupabase({ ...log, conjuntoId }));
        handleError(error, 'addVisitorLog');
    },
    async updateVisitorLog(conjuntoId: string, logId: number, updates: Partial<Omit<VisitorLog, 'id'>>): Promise<void> {
        const { error } = await supabase.from('visitor_logs').update(toSupabase(updates)).eq('id', logId).eq('conjunto_id', conjuntoId);
        handleError(error, 'updateVisitorLog');
    },
    async fetchPackageLogs(conjuntoId: string): Promise<PackageLog[]> {
        const { data, error } = await supabase.from('package_logs').select('*').eq('conjunto_id', conjuntoId).order('received_date', { ascending: false });
        handleError(error, 'fetchPackageLogs');
        return fromSupabase(data) as PackageLog[];
    },
    async addPackageLog(conjuntoId: string, log: Omit<PackageLog, 'id' | 'status' | 'receivedDate'>): Promise<void> {
        const { error } = await supabase.from('package_logs').insert(toSupabase({
            ...log,
            conjuntoId,
            status: 'En recepción',
            receivedDate: new Date().toISOString()
        }));
        handleError(error, 'addPackageLog');
    },
    async updatePackageLogStatus(conjuntoId: string, packageId: number, status: PackageLog['status']): Promise<void> {
        const { error } = await supabase.from('package_logs').update({ status }).eq('id', packageId).eq('conjunto_id', conjuntoId);
        handleError(error, 'updatePackageLogStatus');
    },

    // Access Points
    async fetchAccessPoints(conjuntoId: string): Promise<AccessPoint[]> {
        const { data, error } = await supabase.from('access_points').select('*').eq('conjunto_id', conjuntoId);
        handleError(error, 'fetchAccessPoints');
        return fromSupabase(data) as AccessPoint[];
    },
    async addAccessPoint(conjuntoId: string, name: string): Promise<void> {
        const { error } = await supabase.from('access_points').insert({ name, conjunto_id: conjuntoId });
        handleError(error, 'addAccessPoint');
    },
    async deleteAccessPoint(conjuntoId: string, id: number): Promise<void> {
        const { error } = await supabase.from('access_points').delete().eq('id', id).eq('conjunto_id', conjuntoId);
        handleError(error, 'deleteAccessPoint');
    },


    // =================================================================
    // COMMUNICATIONS
    // =================================================================

    async sendMassEmail(conjuntoId: string, group: string, subject: string, body: string): Promise<{ message: string }> {
        // This is a mock. The real implementation is sendCommunicationEmail.
        console.log(`Sending email to ${group} for ${conjuntoId}: ${subject}`);
        return { message: `Email to ${group} sent.` };
    },

    async uploadCommunicationAttachment(conjuntoId: string, file: File): Promise<{ name: string; url: string } | null> {
        const filePath = `communications/${conjuntoId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('conjunto-files').upload(filePath, file);
        if (error) {
            console.error('Error uploading attachment:', error);
            return null;
        }
        const { data } = supabase.storage.from('conjunto-files').getPublicUrl(filePath);
        return { name: file.name, url: data.publicUrl };
    },

    async sendCommunicationEmail(recipients: string[], subject: string, body: string, attachments: { name: string, url: string }[], fromName: string, fromEmail: string): Promise<{ success: boolean, error?: string }> {
        let finalHtml = body.replace(/\n/g, '<br>');
        if (attachments.length > 0) {
            finalHtml += '<br/><hr/><h3>Archivos Adjuntos:</h3><ul>';
            attachments.forEach(att => {
                finalHtml += `<li><a href="${att.url}" target="_blank" rel="noopener noreferrer">${att.name}</a></li>`;
            });
            finalHtml += '</ul>';
        }

        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                to: recipients,
                subject,
                html: finalHtml,
                fromName,
                fromEmail,
            },
        });

        if (error) {
            console.error('Error invoking send-email function:', error);
            return { success: false, error: error.message };
        }
        return data;
    },
    
    // =================================================================
    // LOGGING & DASHBOARDS
    // =================================================================

    async logChatbotInteraction(conjuntoId: string): Promise<void> {
        const { error } = await supabase.from('chatbot_interactions').insert({ conjunto_id: conjuntoId });
        if(error) console.error("Error logging chatbot interaction:", error);
    },

    async fetchDashboardSummary(conjuntoId: string): Promise<DashboardSummary> {
        // Mock data. A real implementation would run DB queries.
        return {
            stats: {
                residentsInDebt: { 
                    count: 5, 
                    details: ['Apto 101', 'Apto 203', 'Apto 305', 'Apto 401', 'Apto 502'] 
                },
                pendingTasks: { 
                    count: 3, 
                    details: ['Revisar bomba de agua', 'Comprar pintura pasillos', 'Llamar a empresa de jardinería'] 
                },
                overduePayments: { 
                    count: 2, 
                    details: ['Pago de seguridad (Vencido)', 'Mantenimiento ascensor (Vencido)'] 
                },
                packagesToDeliver: { 
                    count: 8, 
                    details: [
                        'Paquete para Apto 505', 
                        'Sobre para Apto 102', 
                        'Caja para Apto 301', 
                        'Paquete para Apto 604', 
                        'Sobre para Apto 202', 
                        'Paquete para Apto 701', 
                        'Caja para Apto 403',
                        'Paquete para Apto 104'
                    ] 
                },
            },
            notifications: [
                { id: 1, type: 'due-date', text: 'Pago de vigilancia vence pronto', details: 'Vence en 3 días', urgency: 'high', linkTo: Tab.DueDates },
                { id: 2, type: 'task', text: 'Revisar cámaras de seguridad', details: 'Asignada a: Personal', urgency: 'medium', linkTo: Tab.PendingTasks },
                { id: 3, type: 'package', text: 'Paquete para Apto 101', details: 'Recibido de Servientrega', urgency: 'low', linkTo: Tab.Seguridad },
            ]
        };
    },
    
    async fetchFinancialChartData(conjuntoId: string): Promise<{ monthlyIncomeVsExpense: ChartData[], expensesByCategory: ChartData[], packageVolume: ChartData[], visitorTraffic: ChartData[] }> {
        // Mock data
        return {
            monthlyIncomeVsExpense: [
                // FIX: Added 'value' and 'fill' properties to conform to ChartData type.
                { name: 'Ene', ingresos: 4000, gastos: 2400, value: 0, fill: '' },
                { name: 'Feb', ingresos: 3000, gastos: 1398, value: 0, fill: '' },
                { name: 'Mar', ingresos: 2000, gastos: 9800, value: 0, fill: '' },
                { name: 'Abr', ingresos: 2780, gastos: 3908, value: 0, fill: '' },
                { name: 'May', ingresos: 1890, gastos: 4800, value: 0, fill: '' },
                { name: 'Jun', ingresos: 2390, gastos: 3800, value: 0, fill: '' },
            ],
            expensesByCategory: [
                { name: 'Servicios', value: 400, fill: '#0088FE' },
                { name: 'Mantenimiento', value: 300, fill: '#00C49F' },
                { name: 'Nómina', value: 300, fill: '#FFBB28' },
                { name: 'Otros', value: 200, fill: '#FF8042' },
            ],
            packageVolume: [
                // FIX: Added 'fill' property to conform to ChartData type.
                { name: 'Ene', value: 50, fill: '#82ca9d' }, { name: 'Feb', value: 65, fill: '#82ca9d' }, { name: 'Mar', value: 70, fill: '#82ca9d' },
                { name: 'Abr', value: 82, fill: '#82ca9d' }, { name: 'May', value: 95, fill: '#82ca9d' }, { name: 'Jun', value: 110, fill: '#82ca9d' },
            ],
            visitorTraffic: [
                 // FIX: Added 'fill' property to conform to ChartData type.
                 { name: 'Portería 1', value: 400, fill: '#0088FE' },
                 { name: 'Portería 2', value: 250, fill: '#00C49F' },
            ],
        };
    },

    // =================================================================
    // FILE MANAGEMENT
    // =================================================================
    async listFilesForConjunto(conjuntoId: string): Promise<StoredFile[]> {
        const { data, error } = await supabase.storage.from('conjunto-files').list(conjuntoId, {
            limit: 100,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' },
        });
        // FIX: The error from supabase.storage.list() is a `StorageError`, not a `PostgrestError`,
        // which caused a type mismatch with the `handleError` utility function.
        // Replaced with direct error handling that preserves the original logic.
        if (error) {
            console.error(`Error in listFilesForConjunto:`, error);
            throw new Error(`Database error in listFilesForConjunto: ${error.message}`);
        }
        if (!data) return [];

        return data.map(file => ({
            id: file.id ?? file.name,
            name: file.name,
            url: supabase.storage.from('conjunto-files').getPublicUrl(`${conjuntoId}/${file.name}`).data.publicUrl,
            size: file.metadata.size,
            mimeType: file.metadata.mimetype,
            createdAt: file.created_at,
        }));
    },
    async uploadFileForConjunto(conjuntoId: string, file: File): Promise<void> {
        const filePath = `${conjuntoId}/${file.name}`;
        const { error } = await supabase.storage.from('conjunto-files').upload(filePath, file, { upsert: true });
        if(error) throw error;
    },
    async deleteFileForConjunto(conjuntoId: string, fileName: string): Promise<void> {
        const { error } = await supabase.storage.from('conjunto-files').remove([`${conjuntoId}/${fileName}`]);
        if(error) throw error;
    }
};