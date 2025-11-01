import { supabase } from './supabaseClient';
import { fromSupabase, toSupabase } from '../utils/dbMappers';
import { 
    UserProfile, 
    ConjuntoInfo, 
    Resident, 
    AccountStatus,
    Provider,
    InternalStaff,
    PlatformUser,
    DueDate,
    Task,
    CommonArea,
    Booking,
    DashboardSummary,
    ChartData,
    NotificationItem,
    Tab,
    Expense,
    VisitorLog,
    PackageLog,
    AccessPoint,
    PlatformStats,
    UserRole
} from '../types';
import { PostgrestError } from '@supabase/supabase-js';

const handleApiError = (error: PostgrestError, context: string) => {
    console.error(`Error in ${context}:`, error);
    // In a real app, you might want to throw the error or handle it more gracefully
    return null;
}

export const apiService = {
    // Conjunto & User
    async fetchConjuntoInfo(conjuntoId: string): Promise<ConjuntoInfo | null> {
        const { data, error } = await supabase.from('conjuntos').select('*').eq('id', conjuntoId).single();
        if (error) return handleApiError(error, `fetchConjuntoInfo for ${conjuntoId}`);
        return fromSupabase(data) as ConjuntoInfo | null;
    },
    async updateConjuntoInfo(info: ConjuntoInfo): Promise<void> {
        const { error } = await supabase.from('conjuntos').update(toSupabase(info)).eq('id', info.id);
        if (error) handleApiError(error, 'updateConjuntoInfo');
    },
    async checkIfSuperAdmin(email: string): Promise<boolean> {
        const { data, error } = await supabase.from('super_admins').select('email').eq('email', email).single();
        if (error) {
            // 'PGRST116' is the code for "No rows found", which is not an error here.
            if (error.code !== 'PGRST116') {
                 console.error('Error checking for super admin:', error);
            }
            return false;
        }
        return !!data;
    },
    async findUserByEmail(email: string): Promise<PlatformUser | null> {
        const { data, error } = await supabase.from('platform_users').select('*').eq('email', email).single();
        if (error) {
            if (error.code !== 'PGRST116') {
                handleApiError(error, `findUserByEmail for ${email}`);
            }
            return null;
        }
        return fromSupabase(data) as PlatformUser | null;
    },
    async authenticateUser(email: string, password: string):Promise<PlatformUser | null> {
        const { data, error } = await supabase.rpc('authenticate_user', { p_email: email, p_password: password });
        if(error) {
            handleApiError(error, `authenticateUser for ${email}`);
            return null;
        }
        return fromSupabase(data) as PlatformUser | null;
    },

    // DatabaseView related
    async fetchResidents(conjuntoId: string): Promise<Resident[]> {
        const { data, error } = await supabase.from('residents').select('*').eq('conjunto_id', conjuntoId);
        if (error) return handleApiError(error, 'fetchResidents') || [];
        return fromSupabase(data) as Resident[];
    },
    async updateResident(conjuntoId: string, resident: Resident): Promise<void> {
        const { error } = await supabase.from('residents').update(toSupabase(resident)).eq('conjunto_id', conjuntoId).eq('apartment', resident.apartment);
        if (error) handleApiError(error, 'updateResident');
    },
    async deleteResident(conjuntoId: string, apartment: string): Promise<void> {
        const { error } = await supabase.from('residents').delete().eq('conjunto_id', conjuntoId).eq('apartment', apartment);
        if (error) handleApiError(error, 'deleteResident');
    },
    async bulkUpsertResidents(conjuntoId: string, residents: Resident[]): Promise<void> {
        const payload = residents.map(r => toSupabase({ ...r, conjuntoId }));
        const { error } = await supabase.from('residents').upsert(payload, { onConflict: 'conjunto_id,apartment' });
        if(error) handleApiError(error, 'bulkUpsertResidents');
    },

    async fetchAccountStatus(conjuntoId: string): Promise<AccountStatus[]> {
        const { data, error } = await supabase.from('account_status').select('*').eq('conjunto_id', conjuntoId);
        if (error) return handleApiError(error, 'fetchAccountStatus') || [];
        return fromSupabase(data) as AccountStatus[];
    },
    async bulkUpsertAccountStatus(conjuntoId: string, accounts: AccountStatus[]): Promise<void> {
        const payload = accounts.map(a => toSupabase({ ...a, conjuntoId }));
        const { error } = await supabase.from('account_status').upsert(payload, { onConflict: 'conjunto_id,apartment' });
        if(error) handleApiError(error, 'bulkUpsertAccountStatus');
    },

    async fetchProviders(conjuntoId: string): Promise<Provider[]> {
        const { data, error } = await supabase.from('providers').select('*').eq('conjunto_id', conjuntoId);
        if (error) return handleApiError(error, 'fetchProviders') || [];
        return fromSupabase(data) as Provider[];
    },
    async bulkUpsertProviders(conjuntoId: string, providers: Provider[]): Promise<void> {
        const payload = providers.map(p => toSupabase({ ...p, conjuntoId }));
        const { error } = await supabase.from('providers').upsert(payload, { onConflict: 'id' });
        if (error) handleApiError(error, 'bulkUpsertProviders');
    },

    async fetchInternalStaff(conjuntoId: string): Promise<InternalStaff[]> {
        const { data, error } = await supabase.from('internal_staff').select('*').eq('conjunto_id', conjuntoId);
        if (error) return handleApiError(error, 'fetchInternalStaff') || [];
        return fromSupabase(data) as InternalStaff[];
    },
    async bulkUpsertInternalStaff(conjuntoId: string, staff: InternalStaff[]): Promise<void> {
        const payload = staff.map(s => toSupabase({ ...s, conjuntoId }));
        const { error } = await supabase.from('internal_staff').upsert(payload, { onConflict: 'id' });
        if (error) handleApiError(error, 'bulkUpsertInternalStaff');
    },

    async fetchUsers(conjuntoId: string): Promise<PlatformUser[]> {
        const { data, error } = await supabase.from('platform_users').select('*').eq('conjunto_id', conjuntoId);
        if (error) return handleApiError(error, 'fetchUsers') || [];
        return fromSupabase(data) as PlatformUser[];
    },
    async addUser(conjuntoId: string, user: Omit<PlatformUser, 'id'>): Promise<void> {
        const { error } = await supabase.from('platform_users').insert(toSupabase({ ...user, conjuntoId }));
        if (error) handleApiError(error, 'addUser');
    },
    async updateUser(conjuntoId: string, user: PlatformUser): Promise<void> {
        const { error } = await supabase.from('platform_users').update(toSupabase(user)).eq('id', user.id).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'updateUser');
    },
    async deleteUser(conjuntoId: string, userId: number): Promise<void> {
        const { error } = await supabase.from('platform_users').delete().eq('id', userId).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'deleteUser');
    },

    // Due Dates & Tasks
    async fetchDueDates(conjuntoId: string): Promise<DueDate[]> {
        const { data, error } = await supabase.from('due_dates').select('*').eq('conjunto_id', conjuntoId);
        if (error) return handleApiError(error, 'fetchDueDates') || [];
        return fromSupabase(data) as DueDate[];
    },
    async addDueDate(conjuntoId: string, dueDate: Omit<DueDate, 'id'>): Promise<void> {
        const { error } = await supabase.from('due_dates').insert(toSupabase({ ...dueDate, conjuntoId }));
        if (error) handleApiError(error, 'addDueDate');
    },
    async updateDueDate(conjuntoId: string, dueDate: DueDate): Promise<void> {
        const { error } = await supabase.from('due_dates').update(toSupabase(dueDate)).eq('id', dueDate.id).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'updateDueDate');
    },
    async deleteDueDate(conjuntoId: string, id: number): Promise<void> {
        const { error } = await supabase.from('due_dates').delete().eq('id', id).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'deleteDueDate');
    },

    async fetchTasks(conjuntoId: string): Promise<Task[]> {
        const { data, error } = await supabase.from('tasks').select('*').eq('conjunto_id', conjuntoId);
        if (error) return handleApiError(error, 'fetchTasks') || [];
        return fromSupabase(data) as Task[];
    },
    async addTask(conjuntoId: string, task: Omit<Task, 'id'|'completed'> & {completed?: boolean}): Promise<void> {
        const payload = { ...task, completed: task.completed || false };
        const { error } = await supabase.from('tasks').insert(toSupabase({ ...payload, conjuntoId }));
        if (error) handleApiError(error, 'addTask');
    },
    async updateTask(conjuntoId: string, task: Task): Promise<void> {
        const { error } = await supabase.from('tasks').update(toSupabase(task)).eq('id', task.id).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'updateTask');
    },
    async deleteTask(conjuntoId: string, id: number): Promise<void> {
        const { error } = await supabase.from('tasks').delete().eq('id', id).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'deleteTask');
    },

    // Common Areas
    async fetchCommonAreas(conjuntoId: string): Promise<CommonArea[]> {
        const { data, error } = await supabase.from('common_areas').select('*').eq('conjunto_id', conjuntoId);
        if (error) return handleApiError(error, 'fetchCommonAreas') || [];
        return fromSupabase(data) as CommonArea[];
    },
    async addCommonArea(conjuntoId: string, name: string): Promise<void> {
        // This is a simplified version. A real app might have more sophisticated color logic.
        const colors = [
            { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
            { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
            { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
            { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const { error } = await supabase.from('common_areas').insert({ conjunto_id: conjuntoId, name, color });
        if (error) handleApiError(error, 'addCommonArea');
    },
    async removeCommonArea(conjuntoId: string, id: string): Promise<void> {
        const { error } = await supabase.from('common_areas').delete().eq('id', id).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'removeCommonArea');
    },
    async fetchBookings(conjuntoId: string): Promise<Booking[]> {
        const { data, error } = await supabase.from('bookings').select('*').eq('conjunto_id', conjuntoId);
        if (error) return handleApiError(error, 'fetchBookings') || [];
        return fromSupabase(data) as Booking[];
    },
    async addBooking(conjuntoId: string, booking: Omit<Booking, 'id'>): Promise<void> {
        const { error } = await supabase.from('bookings').insert(toSupabase({ ...booking, conjuntoId }));
        if (error) handleApiError(error, 'addBooking');
    },
    
    // Financial
    async fetchExpenses(conjuntoId: string): Promise<Expense[]> {
        const { data, error } = await supabase.from('expenses').select('*').eq('conjunto_id', conjuntoId);
        if (error) return handleApiError(error, 'fetchExpenses') || [];
        return fromSupabase(data) as Expense[];
    },
    async addExpense(conjuntoId: string, expense: Omit<Expense, 'id'>): Promise<void> {
        const { error } = await supabase.from('expenses').insert(toSupabase({ ...expense, conjuntoId }));
        if (error) handleApiError(error, 'addExpense');
    },
    async deleteExpense(conjuntoId: string, id: number): Promise<void> {
        const { error } = await supabase.from('expenses').delete().eq('id', id).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'deleteExpense');
    },
    
    // Security
    async fetchVisitorLogs(conjuntoId: string): Promise<VisitorLog[]> {
        const { data, error } = await supabase.from('visitor_logs').select('*').eq('conjunto_id', conjuntoId);
        if (error) return handleApiError(error, 'fetchVisitorLogs') || [];
        return fromSupabase(data) as VisitorLog[];
    },
    async fetchPackageLogs(conjuntoId: string): Promise<PackageLog[]> {
        const { data, error } = await supabase.from('package_logs').select('*').eq('conjunto_id', conjuntoId).order('received_date', { ascending: false });
        if (error) return handleApiError(error, 'fetchPackageLogs') || [];
        return fromSupabase(data) as PackageLog[];
    },
    async addPackageLog(conjuntoId: string, pkg: Omit<PackageLog, 'id' | 'receivedDate' | 'status'>): Promise<void> {
        const payload = { ...pkg, receivedDate: new Date().toISOString(), status: 'En recepción' as const, conjuntoId };
        const { error } = await supabase.from('package_logs').insert(toSupabase(payload));
        if (error) handleApiError(error, 'addPackageLog');
    },
    async updatePackageLogStatus(conjuntoId: string, packageId: number, status: PackageLog['status']): Promise<void> {
        const { error } = await supabase.from('package_logs').update({ status }).eq('id', packageId).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'updatePackageLogStatus');
    },

    // Settings
    async fetchAccessPoints(conjuntoId: string): Promise<AccessPoint[]> {
        const { data, error } = await supabase.from('access_points').select('*').eq('conjunto_id', conjuntoId);
        if (error) return handleApiError(error, 'fetchAccessPoints') || [];
        return fromSupabase(data) as AccessPoint[];
    },
    async addAccessPoint(conjuntoId: string, name: string): Promise<void> {
        const { error } = await supabase.from('access_points').insert({ conjunto_id: conjuntoId, name });
        if (error) handleApiError(error, 'addAccessPoint');
    },
    async deleteAccessPoint(conjuntoId: string, id: number): Promise<void> {
        const { error } = await supabase.from('access_points').delete().eq('id', id).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'deleteAccessPoint');
    },

    // Super Admin
    async fetchAllConjuntos(): Promise<ConjuntoInfo[]> {
        const { data, error } = await supabase.from('conjuntos').select('*');
        if (error) return handleApiError(error, 'fetchAllConjuntos') || [];
        return fromSupabase(data) as ConjuntoInfo[];
    },
    async fetchPlatformStats(): Promise<PlatformStats | null> {
         const { data, error } = await supabase.rpc('get_platform_stats');
         if (error) return handleApiError(error, 'fetchPlatformStats');
         return fromSupabase(data) as PlatformStats;
    },
    
    // Dashboard Specific
    async fetchDashboardSummary(conjuntoId: string): Promise<DashboardSummary | null> {
        // This would be a single RPC call in a real app for efficiency
        const [debtors, tasks, overdue, packages, dueDates, recentPackages] = await Promise.all([
             supabase.from('account_status').select('apartment', { count: 'exact' }).eq('conjunto_id', conjuntoId).gt('outstanding_balance', 0),
             supabase.from('tasks').select('id', { count: 'exact' }).eq('conjunto_id', conjuntoId).eq('completed', false),
             supabase.from('due_dates').select('id', { count: 'exact' }).eq('conjunto_id', conjuntoId).eq('status', 'Vencido'),
             supabase.from('package_logs').select('id', { count: 'exact' }).eq('conjunto_id', conjuntoId).eq('status', 'En recepción'),
             this.fetchDueDates(conjuntoId),
             this.fetchPackageLogs(conjuntoId)
        ]);

        const dueDateNotifications: NotificationItem[] = dueDates
            .filter(d => d.status !== 'Pagado')
            .slice(0, 2)
            .map(d => ({
                id: `due-${d.id}`,
                type: 'due-date',
                text: `${d.status}: ${d.item}`,
                details: `Vence el ${d.dueDate}`,
                urgency: d.status === 'Vencido' ? 'high' : 'medium',
                linkTo: Tab.DueDates
            }));
            
        const packageNotifications: NotificationItem[] = (fromSupabase(recentPackages) as PackageLog[])
            .filter(p => p.status === 'En recepción')
            .slice(0, 2)
            .map(p => ({
                id: `pkg-${p.id}`,
                type: 'package',
                text: `Paquete para Apto ${p.apartment}`,
                details: `Recibido de ${p.courier}`,
                urgency: 'low',
                linkTo: Tab.Seguridad,
            }));
        
        return {
            stats: {
                residentsInDebt: debtors.count ?? 0,
                pendingTasks: tasks.count ?? 0,
                overduePayments: overdue.count ?? 0,
                packagesToDeliver: packages.count ?? 0,
            },
            notifications: [...dueDateNotifications, ...packageNotifications].slice(0,4),
        };
    },
    async fetchFinancialChartData(conjuntoId: string): Promise<{ monthlyIncomeVsExpense: ChartData[], expensesByCategory: ChartData[], monthlyBudget: number } | null> {
        // This is a simplified mock. A real implementation would involve complex SQL queries or RPC calls.
        const expenses = await this.fetchExpenses(conjuntoId);
        const accounts = await this.fetchAccountStatus(conjuntoId);

        const totalPotentialIncome = accounts.reduce((sum, acc) => sum + acc.adminFeeValue, 0);

        const expensesByCategory: ChartData[] = expenses.reduce((acc, expense) => {
            let category = acc.find(c => c.name === expense.category);
            if (!category) {
                category = { name: expense.category, value: 0, fill: '' };
                acc.push(category);
            }
            category.value += expense.amount;
            return acc;
        }, [] as ChartData[]).map((cat, i) => {
            const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];
            cat.fill = colors[i % colors.length];
            return cat;
        });
        
        // FIX: Add 'fill' property to conform to ChartData type. This property is not used by the BarChart but is required by the type definition.
        const monthlyIncomeVsExpense: ChartData[] = [
             { name: 'Hace 2 Meses', ingresos: totalPotentialIncome, gastos: 18500000, value: totalPotentialIncome, fill: '' },
             { name: 'Mes Pasado', ingresos: totalPotentialIncome, gastos: 21000000, value: totalPotentialIncome, fill: '' },
             { name: 'Este Mes', ingresos: totalPotentialIncome, gastos: expenses.reduce((sum, e) => sum + e.amount, 0), value: totalPotentialIncome, fill: '' }
        ];

        return {
            monthlyIncomeVsExpense,
            expensesByCategory,
            monthlyBudget: totalPotentialIncome * 0.9 // Assume 90% budget
        };
    },
    
    // Communications
    async sendCommunicationEmail(bcc: string[], subject: string, html: string): Promise<{ success: boolean; error?: string }> {
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: { bcc, subject, html },
        });

        if (error) {
            console.error('Error invoking send-email function:', error);
            return { success: false, error: error.message };
        }
        
        // The invoked function itself might return a failure state in its body
        if (data && data.success === false) {
             console.error('Error from inside send-email function:', data.error);
             return { success: false, error: data.error };
        }

        return { success: true };
    },
};