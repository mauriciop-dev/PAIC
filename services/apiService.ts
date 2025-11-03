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
    UserRole,
    Income,
    UserRoleDefinition,
    StoredFile
} from '../types';
import { PostgrestError } from '@supabase/supabase-js';

// FIX: Broadened the error type to accept any error object with a `message` property,
// resolving a type conflict between `PostgrestError` and `StorageError`.
const handleApiError = (error: { message: string }, context: string) => {
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
     async addResident(conjuntoId: string, resident: Omit<Resident, 'id'>): Promise<void> {
        const { error } = await supabase.from('residents').insert(toSupabase({ ...resident, conjuntoId }));
        if (error) handleApiError(error, 'addResident');
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
     async fetchAccountStatusByApartment(conjuntoId: string, apartment: string): Promise<AccountStatus | null> {
        const { data, error } = await supabase.from('account_status').select('*').eq('conjunto_id', conjuntoId).eq('apartment', apartment).single();
        if (error) return handleApiError(error, 'fetchAccountStatusByApartment');
        return fromSupabase(data) as AccountStatus | null;
    },
    async addAccountStatus(conjuntoId: string, account: Omit<AccountStatus, 'id'>): Promise<void> {
        const { error } = await supabase.from('account_status').insert(toSupabase({ ...account, conjuntoId }));
        if (error) handleApiError(error, 'addAccountStatus');
    },
    async updateAccountStatus(conjuntoId: string, account: AccountStatus): Promise<void> {
        const { error } = await supabase.from('account_status').update(toSupabase(account)).eq('conjunto_id', conjuntoId).eq('apartment', account.apartment);
        if (error) handleApiError(error, 'updateAccountStatus');
    },
    async deleteAccountStatus(conjuntoId: string, apartment: string): Promise<void> {
        const { error } = await supabase.from('account_status').delete().eq('conjunto_id', conjuntoId).eq('apartment', apartment);
        if (error) handleApiError(error, 'deleteAccountStatus');
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
     async addProvider(conjuntoId: string, provider: Omit<Provider, 'id'>): Promise<void> {
        const { error } = await supabase.from('providers').insert(toSupabase({ ...provider, conjuntoId }));
        if (error) handleApiError(error, 'addProvider');
    },
    async updateProvider(conjuntoId: string, provider: Provider): Promise<void> {
        const { error } = await supabase.from('providers').update(toSupabase(provider)).eq('id', provider.id).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'updateProvider');
    },
    async deleteProvider(conjuntoId: string, providerId: number): Promise<void> {
        const { error } = await supabase.from('providers').delete().eq('id', providerId).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'deleteProvider');
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
    async addInternalStaff(conjuntoId: string, staff: Omit<InternalStaff, 'id'>): Promise<void> {
        const { error } = await supabase.from('internal_staff').insert(toSupabase({ ...staff, conjuntoId }));
        if (error) handleApiError(error, 'addInternalStaff');
    },
    async updateInternalStaff(conjuntoId: string, staff: InternalStaff): Promise<void> {
        const { error } = await supabase.from('internal_staff').update(toSupabase(staff)).eq('id', staff.id).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'updateInternalStaff');
    },
    async deleteInternalStaff(conjuntoId: string, staffId: number): Promise<void> {
        const { error } = await supabase.from('internal_staff').delete().eq('id', staffId).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'deleteInternalStaff');
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
    async fetchRoles(conjuntoId: string): Promise<UserRoleDefinition[]> {
        // This is mocked for now. In a real app, this would fetch from a `user_roles` table.
        return Promise.resolve([
            { id: 'contador', name: 'Contador', permissions: [Tab.Finanzas] },
        ]);
    },
    async addRole(conjuntoId: string, role: Omit<UserRoleDefinition, 'id'>): Promise<void> {
        // Mocked
        console.log('Mocked addRole:', { ...role, conjuntoId });
        return Promise.resolve();
    },
    async updateRole(conjuntoId: string, role: UserRoleDefinition): Promise<void> {
        // Mocked
        console.log('Mocked updateRole:', { ...role, conjuntoId });
        return Promise.resolve();
    },
    async deleteRole(conjuntoId: string, roleId: string): Promise<void> {
        // Mocked
        console.log('Mocked deleteRole:', { roleId, conjuntoId });
        return Promise.resolve();
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
    async fetchIncomes(conjuntoId: string): Promise<Income[]> {
        const { data, error } = await supabase.from('incomes').select('*').eq('conjunto_id', conjuntoId);
        if (error) return handleApiError(error, 'fetchIncomes') || [];
        return fromSupabase(data) as Income[];
    },
    async addIncome(conjuntoId: string, income: Omit<Income, 'id'>): Promise<void> {
        const { error } = await supabase.from('incomes').insert(toSupabase({ ...income, conjuntoId }));
        if (error) handleApiError(error, 'addIncome');
    },
    async deleteIncome(conjuntoId: string, id: number): Promise<void> {
        const { error } = await supabase.from('incomes').delete().eq('id', id).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'deleteIncome');
    },

    
    // Security
    async fetchVisitorLogs(conjuntoId: string): Promise<VisitorLog[]> {
        const { data, error } = await supabase.from('visitor_logs').select('*').eq('conjunto_id', conjuntoId);
        if (error) return handleApiError(error, 'fetchVisitorLogs') || [];
        return fromSupabase(data) as VisitorLog[];
    },
    async addVisitorLog(conjuntoId: string, log: Omit<VisitorLog, 'id'>): Promise<void> {
        const { error } = await supabase.from('visitor_logs').insert(toSupabase({ ...log, conjuntoId }));
        if (error) handleApiError(error, 'addVisitorLog');
    },
    async updateVisitorLog(conjuntoId: string, logId: number, updates: Partial<Omit<VisitorLog, 'id'>>): Promise<void> {
        const { error } = await supabase.from('visitor_logs').update(toSupabase(updates)).eq('id', logId).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'updateVisitorLog');
    },
    async fetchPackageLogs(conjuntoId: string): Promise<PackageLog[]> {
        const { data, error } = await supabase.from('package_logs').select('*').eq('conjunto_id', conjuntoId).order('received_date', { ascending: false });
        if (error) return handleApiError(error, 'fetchPackageLogs') || [];
        return fromSupabase(data) as PackageLog[];
    },
    async addPackageLog(conjuntoId: string, pkg: Omit<PackageLog, 'id' | 'receivedDate' | 'status'>): Promise<void> {
        const payload = { ...pkg, receivedDate: new Date().toISOString(), status: 'En recepción' as const, conjuntoId };
        const { error } = await supabase.from('package_logs').insert(toSupabase(payload));
        if (error) {
            handleApiError(error, 'addPackageLog');
            return;
        }
        
        // After successful insertion, trigger email notification
        const resident = (await this.fetchResidents(conjuntoId)).find(r => r.apartment === pkg.apartment);
        if (resident && resident.email) {
            this.sendCommunicationEmail(
                [resident.email],
                `📦 ¡Tienes un paquete en recepción!`,
                `<p>Hola ${resident.name},</p><p>Te informamos que hemos recibido un paquete para ti de <strong>${pkg.courier}</strong>. Puedes reclamarlo en la recepción.</p>`,
                []
            );
        }
    },
    async updatePackageLogStatus(conjuntoId: string, packageId: number, status: PackageLog['status']): Promise<void> {
        const { data: pkgBeforeUpdate, error: fetchError } = await supabase.from('package_logs').select('apartment, courier').eq('id', packageId).single();
        if (fetchError || !pkgBeforeUpdate) {
            handleApiError(fetchError!, 'fetching package before status update');
            return;
        }

        const { error } = await supabase.from('package_logs').update({ status }).eq('id', packageId).eq('conjunto_id', conjuntoId);
        if (error) {
            handleApiError(error, 'updatePackageLogStatus');
            return;
        }
        
        if (status === 'Entregado') {
             const resident = (await this.fetchResidents(conjuntoId)).find(r => r.apartment === pkgBeforeUpdate.apartment);
             if (resident && resident.email) {
                 this.sendCommunicationEmail(
                    [resident.email],
                    `✅ Tu paquete ha sido entregado`,
                    `<p>Hola ${resident.name},</p><p>Te confirmamos que tu paquete de <strong>${pkgBeforeUpdate.courier}</strong> ha sido entregado exitosamente.</p>`,
                    []
                );
             }
        }
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
        const [debtors, tasks, overdue, packages, dueDates, recentPackages, residents, accounts] = await Promise.all([
             supabase.from('account_status').select('apartment', { count: 'exact' }).eq('conjunto_id', conjuntoId).gt('outstanding_balance', 0),
             supabase.from('tasks').select('id, text', { count: 'exact' }).eq('conjunto_id', conjuntoId).eq('completed', false),
             supabase.from('due_dates').select('id, item', { count: 'exact' }).eq('conjunto_id', conjuntoId).eq('status', 'Vencido'),
             supabase.from('package_logs').select('id, apartment', { count: 'exact' }).eq('conjunto_id', conjuntoId).eq('status', 'En recepción'),
             this.fetchDueDates(conjuntoId),
             this.fetchPackageLogs(conjuntoId),
             this.fetchResidents(conjuntoId),
             this.fetchAccountStatus(conjuntoId),
        ]);

        const debtorApartments = accounts.filter(a => a.outstandingBalance > 0).map(a => a.apartment);
        const debtorDetails = residents.filter(r => debtorApartments.includes(r.apartment)).map(r => `${r.name} (Apto ${r.apartment})`);

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
                residentsInDebt: { count: debtors.count ?? 0, details: debtorDetails },
                pendingTasks: { count: tasks.count ?? 0, details: (fromSupabase(tasks.data) as Task[]).map(t => t.text) },
                overduePayments: { count: overdue.count ?? 0, details: (fromSupabase(overdue.data) as DueDate[]).map(d => d.item) },
                packagesToDeliver: { count: packages.count ?? 0, details: (fromSupabase(packages.data) as PackageLog[]).map(p => `Apto ${p.apartment}`) },
            },
            notifications: [...dueDateNotifications, ...packageNotifications].slice(0,4),
        };
    },
    async fetchFinancialChartData(conjuntoId: string): Promise<{ monthlyIncomeVsExpense: ChartData[], expensesByCategory: ChartData[], monthlyBudget: number } | null> {
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
        
        const monthlyIncomeVsExpense: ChartData[] = Array.from({ length: 12 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthName = date.toLocaleString('es-ES', { month: 'short' });
            return { 
                name: monthName,
                ingresos: totalPotentialIncome, // Simplified: uses same potential income for all past months
                gastos: Math.random() * (20000000 - 15000000) + 15000000, // Mocked historical expenses
                value: 0, 
                fill: ''
            };
        }).reverse();
        
        monthlyIncomeVsExpense[11].gastos = expenses.reduce((sum, e) => sum + e.amount, 0); // Use real data for current month


        return {
            monthlyIncomeVsExpense,
            expensesByCategory,
            monthlyBudget: totalPotentialIncome
        };
    },
    
    // Communications
    async uploadCommunicationAttachment(conjuntoId: string, file: File): Promise<{name: string, url: string} | null> {
        const filePath = `public/${conjuntoId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
            .from('adjuntos_comunicaciones')
            .upload(filePath, file);

        if (error) {
            handleApiError(error, `uploadCommunicationAttachment for file ${file.name}`);
            return null;
        }

        const { data } = supabase.storage
            .from('adjuntos_comunicaciones')
            .getPublicUrl(filePath);

        return { name: file.name, url: data.publicUrl };
    },
    async sendCommunicationEmail(bcc: string[], subject: string, html: string, attachments: {name: string, url: string}[]): Promise<{ success: boolean; error?: string }> {
        let finalHtml = html;
        if (attachments.length > 0) {
            const attachmentLinks = attachments.map(att => `<li><a href="${att.url}" target="_blank" rel="noopener noreferrer">${att.name}</a></li>`).join('');
            finalHtml += `<br><hr><p><strong>Archivos Adjuntos:</strong></p><ul>${attachmentLinks}</ul>`;
        }
        
        try {
            const { data, error } = await supabase.functions.invoke('send-email', {
                body: { bcc, subject, html: finalHtml },
            });

            if (error) {
                throw new Error(`Function invocation failed: ${error.message}`);
            }

            // The 'data' object from the function response needs to be checked.
            if (data && data.success) {
                console.log("Supabase function 'send-email' reported success:", data);
                return { success: true };
            } else {
                 // If the function ran but reported an internal error (e.g., from Resend)
                 const errorMessage = (data && data.error) ? data.error : 'Unknown error from function.';
                 throw new Error(errorMessage);
            }

        } catch (error: any) {
            console.error("Error invoking Supabase function 'send-email':", error);
            return { success: false, error: error.message };
        }
    },
    async sendMassEmail(conjuntoId: string, group: 'all' | 'debtors', subject: string, body: string): Promise<{success: boolean, message: string}> {
        let emailList: string[] = [];
        if (group === 'all') {
            const residents = await this.fetchResidents(conjuntoId);
            emailList = residents.map(r => r.email).filter(Boolean);
        } else if (group === 'debtors') {
            const accounts = await this.fetchAccountStatus(conjuntoId);
            const debtorApartments = accounts.filter(a => a.outstandingBalance > 0).map(a => a.apartment);
            const residents = await this.fetchResidents(conjuntoId);
            emailList = residents.filter(r => debtorApartments.includes(r.apartment)).map(r => r.email).filter(Boolean);
        }

        if(emailList.length === 0) {
            return { success: false, message: "No se encontraron destinatarios." };
        }
        
        const result = await this.sendCommunicationEmail(emailList, subject, body, []);
        if (result.success) {
            return { success: true, message: `¡Correo enviado a ${emailList.length} destinatarios!` };
        }
        return { success: false, message: `Error al enviar: ${result.error}` };
    }
};