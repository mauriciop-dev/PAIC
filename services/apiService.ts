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
  UserRoleDefinition,
  Booking,
  CommonArea,
  DueDate,
  Task,
  Income,
  Expense,
  VisitorLog,
  PackageLog,
  DashboardSummary,
  ChartData,
  NotificationItem,
  PlatformStats,
  SuperAdminChartData,
  StoredFile,
  AccessPoint,
  UserRole,
  Tab
} from '../types';

// A helper for handling Supabase errors
const handleSupabaseError = ({ error, data }: { error: any, data?: any }, context: string) => {
    if (error) {
        console.error(`Error in ${context}:`, error);
        throw new Error(error.message);
    }
    return data;
};

// --- AUTH & USERS ---

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
    handleSupabaseError({ data, error }, 'fetchUserProfile');
    return fromSupabase(data);
}

async function updateUserProfile(profile: UserProfile): Promise<void> {
    const { error } = await supabase
        .from('user_profiles')
        .update(toSupabase(profile))
        .eq('id', profile.id);
    handleSupabaseError({ error }, 'updateUserProfile');
}

async function authenticateUser(email: string, password: string): Promise<PlatformUser | null> {
    const { data, error } = await supabase.rpc('authenticate_user', {
        p_email: email,
        p_password: password
    });
    handleSupabaseError({ error }, 'authenticateUser');
    return fromSupabase(data);
}

// --- CONJUNTO ---

async function fetchConjuntoInfo(conjuntoId: string): Promise<ConjuntoInfo | null> {
    const { data, error } = await supabase
        .from('conjuntos')
        .select('*')
        .eq('id', conjuntoId)
        .single();
    handleSupabaseError({ data, error }, 'fetchConjuntoInfo');
    return fromSupabase(data);
}

async function addConjuntoInfo(conjuntoInfo: ConjuntoInfo): Promise<void> {
    const { error } = await supabase
        .from('conjuntos')
        .insert(toSupabase(conjuntoInfo));
    handleSupabaseError({ error }, 'addConjuntoInfo');
}

async function updateConjuntoInfo(conjuntoInfo: ConjuntoInfo): Promise<void> {
    const { error } = await supabase
        .from('conjuntos')
        .update(toSupabase(conjuntoInfo))
        .eq('id', conjuntoInfo.id);
    handleSupabaseError({ error }, 'updateConjuntoInfo');
}

// --- DATABASE TABLES ---

async function fetchResidents(conjuntoId: string): Promise<Resident[]> {
    const { data, error } = await supabase.from('residents').select('*').eq('conjunto_id', conjuntoId);
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchResidents'));
}
async function addResident(conjuntoId: string, resident: Resident): Promise<void> {
    await supabase.from('residents').insert(toSupabase({ ...resident, conjuntoId }));
}
async function updateResident(conjuntoId: string, resident: Resident): Promise<void> {
    await supabase.from('residents').update(toSupabase(resident)).match({ conjunto_id: conjuntoId, apartment: resident.apartment });
}
async function deleteResident(conjuntoId: string, apartment: string): Promise<void> {
    await supabase.from('residents').delete().match({ conjunto_id: conjuntoId, apartment });
}
async function bulkUpsertResidents(conjuntoId: string, residents: Resident[]): Promise<void> {
    const payload = residents.map(r => toSupabase({ ...r, conjuntoId }));
    const { error } = await supabase.from('residents').upsert(payload, { onConflict: 'conjunto_id, apartment' });
    handleSupabaseError({ error }, 'bulkUpsertResidents');
}
async function fetchResidentByApartment(conjuntoId: string, apartment: string): Promise<Resident | null> {
    const { data, error } = await supabase.from('residents').select('*').eq('conjunto_id', conjuntoId).eq('apartment', apartment).single();
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchResidentByApartment'));
}

async function fetchAccountStatus(conjuntoId: string): Promise<AccountStatus[]> {
    const { data, error } = await supabase.from('account_status').select('*').eq('conjunto_id', conjuntoId);
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchAccountStatus'));
}
async function fetchAccountStatusByApartment(conjuntoId: string, apartment: string): Promise<AccountStatus | null> {
    const { data, error } = await supabase.from('account_status').select('*').eq('conjunto_id', conjuntoId).eq('apartment', apartment).single();
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchAccountStatusByApartment'));
}
async function addAccountStatus(conjuntoId: string, account: AccountStatus): Promise<void> {
    await supabase.from('account_status').insert(toSupabase({ ...account, conjuntoId }));
}
async function updateAccountStatus(conjuntoId: string, account: AccountStatus): Promise<void> {
    await supabase.from('account_status').update(toSupabase(account)).match({ conjunto_id: conjuntoId, apartment: account.apartment });
}
async function deleteAccountStatus(conjuntoId: string, apartment: string): Promise<void> {
    await supabase.from('account_status').delete().match({ conjunto_id: conjuntoId, apartment });
}
async function bulkUpsertAccountStatus(conjuntoId: string, accounts: AccountStatus[]): Promise<void> {
    const payload = accounts.map(a => toSupabase({ ...a, conjuntoId }));
    const { error } = await supabase.from('account_status').upsert(payload, { onConflict: 'conjunto_id, apartment' });
    handleSupabaseError({ error }, 'bulkUpsertAccountStatus');
}
async function fetchDebtors(conjuntoId: string): Promise<{ apartment: string, name: string, balance: number }[]> {
    const { data: accounts, error: accError } = await supabase.from('account_status').select('apartment, outstanding_balance').eq('conjunto_id', conjuntoId).gt('outstanding_balance', 0);
    handleSupabaseError({ data: accounts, error: accError }, 'fetchDebtors (accounts)');

    if (!accounts || accounts.length === 0) return [];
    
    const apartments = accounts.map(a => a.apartment);
    const { data: residents, error: resError } = await supabase.from('residents').select('apartment, name').eq('conjunto_id', conjuntoId).in('apartment', apartments);
    handleSupabaseError({ data: residents, error: resError }, 'fetchDebtors (residents)');

    const residentMap = new Map(residents.map(r => [r.apartment, r.name]));
    
    return accounts.map(acc => ({
        apartment: acc.apartment,
        name: residentMap.get(acc.apartment) || 'Residente no encontrado',
        balance: acc.outstanding_balance
    }));
}


async function fetchProviders(conjuntoId: string): Promise<Provider[]> {
    const { data, error } = await supabase.from('providers').select('*').eq('conjunto_id', conjuntoId);
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchProviders'));
}
async function fetchProvidersBySpecialty(conjuntoId: string, specialty: string): Promise<Provider[]> {
    const query = supabase.from('providers').select('*').eq('conjunto_id', conjuntoId);
    if(specialty) {
        query.ilike('specialty', `%${specialty}%`);
    }
    const { data, error } = await query;
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchProvidersBySpecialty'));
}
async function addProvider(conjuntoId: string, provider: Omit<Provider, 'id'>): Promise<void> {
    await supabase.from('providers').insert(toSupabase({ ...provider, conjuntoId }));
}
async function updateProvider(conjuntoId: string, provider: Provider): Promise<void> {
    await supabase.from('providers').update(toSupabase(provider)).match({ id: provider.id, conjunto_id: conjuntoId });
}
async function deleteProvider(conjuntoId: string, id: number): Promise<void> {
    await supabase.from('providers').delete().match({ id: id, conjunto_id: conjuntoId });
}
async function bulkUpsertProviders(conjuntoId: string, providers: Provider[]): Promise<void> {
    const payload = providers.map(p => toSupabase({ ...p, conjuntoId }));
    const { error } = await supabase.from('providers').upsert(payload, { onConflict: 'id, conjunto_id' });
     handleSupabaseError({ error }, 'bulkUpsertProviders');
}

async function fetchInternalStaff(conjuntoId: string): Promise<InternalStaff[]> {
    const { data, error } = await supabase.from('internal_staff').select('*').eq('conjunto_id', conjuntoId);
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchInternalStaff'));
}
async function addInternalStaff(conjuntoId: string, staff: InternalStaff): Promise<void> {
    await supabase.from('internal_staff').insert(toSupabase({ ...staff, conjuntoId }));
}
async function updateInternalStaff(conjuntoId: string, staff: InternalStaff): Promise<void> {
    await supabase.from('internal_staff').update(toSupabase(staff)).match({ conjunto_id: conjuntoId, name: staff.name });
}
async function deleteInternalStaff(conjuntoId: string, name: string): Promise<void> {
    await supabase.from('internal_staff').delete().match({ conjunto_id: conjuntoId, name: name });
}
async function bulkUpsertInternalStaff(conjuntoId: string, staff: InternalStaff[]): Promise<void> {
    const payload = staff.map(s => toSupabase({ ...s, conjuntoId }));
    const { error } = await supabase.from('internal_staff').upsert(payload, { onConflict: 'conjunto_id, name' });
    handleSupabaseError({ error }, 'bulkUpsertInternalStaff');
}

async function fetchUsers(conjuntoId: string): Promise<PlatformUser[]> {
    const { data, error } = await supabase.from('platform_users').select('*').eq('conjunto_id', conjuntoId);
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchUsers'));
}
async function addUser(conjuntoId: string, user: PlatformUser): Promise<void> {
    const { error } = await supabase.from('platform_users').insert(toSupabase({ ...user, conjuntoId }));
    handleSupabaseError({ error }, 'addUser');
}
async function updateUser(conjuntoId: string, user: PlatformUser): Promise<void> {
    const { error } = await supabase.from('platform_users').update(toSupabase(user)).match({ id: user.id, conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'updateUser');
}
async function deleteUser(conjuntoId: string, userId: number): Promise<void> {
    const { error } = await supabase.from('platform_users').delete().match({ id: userId, conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'deleteUser');
}

async function fetchRoles(conjuntoId: string): Promise<UserRoleDefinition[]> {
    const { data, error } = await supabase.from('user_roles').select('*').eq('conjunto_id', conjuntoId);
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchRoles'));
}
async function addRole(conjuntoId: string, role: Omit<UserRoleDefinition, 'id'>): Promise<void> {
    const { error } = await supabase.from('user_roles').insert(toSupabase({ ...role, conjuntoId }));
    handleSupabaseError({ error }, 'addRole');
}
async function updateRole(conjuntoId: string, role: UserRoleDefinition): Promise<void> {
    const { error } = await supabase.from('user_roles').update(toSupabase(role)).match({ id: role.id, conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'updateRole');
}
async function deleteRole(conjuntoId: string, roleId: string): Promise<void> {
    const { error } = await supabase.from('user_roles').delete().match({ id: roleId, conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'deleteRole');
}

async function fetchBookings(conjuntoId: string): Promise<Booking[]> {
    const { data, error } = await supabase.from('bookings').select('*').eq('conjunto_id', conjuntoId);
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchBookings'));
}
async function addBooking(conjuntoId: string, booking: Booking): Promise<void> {
    const { error } = await supabase.from('bookings').insert(toSupabase({ ...booking, conjuntoId }));
    handleSupabaseError({ error }, 'addBooking');
}

async function fetchCommonAreas(conjuntoId: string): Promise<CommonArea[]> {
    const { data, error } = await supabase.from('common_areas').select('*').eq('conjunto_id', conjuntoId);
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchCommonAreas'));
}
async function addCommonArea(conjuntoId: string, areaName: string): Promise<void> {
    const colors = [
        { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
        { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
        { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
        { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
        { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
    ];
    const { data: areas, error: countError } = await supabase.from('common_areas').select('id', { count: 'exact' }).eq('conjunto_id', conjuntoId);
    handleSupabaseError({ error: countError }, 'addCommonArea (count)');
    const color = colors[areas?.length % colors.length];
    
    const { error } = await supabase.from('common_areas').insert(toSupabase({ name: areaName, color, conjuntoId }));
    handleSupabaseError({ error }, 'addCommonArea');
}
async function removeCommonArea(conjuntoId: string, areaId: string): Promise<void> {
    const { error } = await supabase.from('common_areas').delete().match({ id: areaId, conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'removeCommonArea');
}

async function fetchDueDates(conjuntoId: string): Promise<DueDate[]> {
    const { data, error } = await supabase.from('due_dates').select('*').eq('conjunto_id', conjuntoId);
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchDueDates'));
}
async function addDueDate(conjuntoId: string, dueDate: Omit<DueDate, 'id'>): Promise<void> {
    const { error } = await supabase.from('due_dates').insert(toSupabase({ ...dueDate, conjuntoId }));
    handleSupabaseError({ error }, 'addDueDate');
}
async function updateDueDate(conjuntoId: string, dueDate: DueDate): Promise<void> {
    const { error } = await supabase.from('due_dates').update(toSupabase(dueDate)).match({ id: dueDate.id, conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'updateDueDate');
}
async function deleteDueDate(conjuntoId: string, dueDateId: number): Promise<void> {
    const { error } = await supabase.from('due_dates').delete().match({ id: dueDateId, conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'deleteDueDate');
}

async function fetchTasks(conjuntoId: string): Promise<Task[]> {
    const { data, error } = await supabase.from('tasks').select('*').eq('conjunto_id', conjuntoId);
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchTasks'));
}
async function addTask(conjuntoId: string, task: Omit<Task, 'id'>): Promise<void> {
    const { error } = await supabase.from('tasks').insert(toSupabase({ ...task, conjuntoId }));
    handleSupabaseError({ error }, 'addTask');
}
async function updateTask(conjuntoId: string, task: Task): Promise<void> {
    const { error } = await supabase.from('tasks').update(toSupabase(task)).match({ id: task.id, conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'updateTask');
}
async function deleteTask(conjuntoId: string, taskId: number): Promise<void> {
    const { error } = await supabase.from('tasks').delete().match({ id: taskId, conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'deleteTask');
}

async function fetchIncomes(conjuntoId: string): Promise<Income[]> {
    const { data, error } = await supabase.from('incomes').select('*').eq('conjunto_id', conjuntoId);
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchIncomes'));
}
async function addIncome(conjuntoId: string, income: Omit<Income, 'id'>): Promise<void> {
    const { error } = await supabase.from('incomes').insert(toSupabase({ ...income, conjuntoId }));
    handleSupabaseError({ error }, 'addIncome');
}
async function updateIncome(conjuntoId: string, income: Income): Promise<void> {
    const { error } = await supabase.from('incomes').update(toSupabase(income)).match({ id: income.id, conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'updateIncome');
}
async function deleteIncome(conjuntoId: string, incomeId: number): Promise<void> {
    const { error } = await supabase.from('incomes').delete().match({ id: incomeId, conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'deleteIncome');
}
async function deleteAllIncomes(conjuntoId: string): Promise<void> {
    const { error } = await supabase.from('incomes').delete().match({ conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'deleteAllIncomes');
}
async function bulkInsertIncomes(conjuntoId: string, incomes: Omit<Income, 'id'>[]): Promise<void> {
    const payload = incomes.map(i => toSupabase({ ...i, conjuntoId }));
    const { error } = await supabase.from('incomes').insert(payload);
    handleSupabaseError({ error }, 'bulkInsertIncomes');
}


async function fetchExpenses(conjuntoId: string): Promise<Expense[]> {
    const { data, error } = await supabase.from('expenses').select('*').eq('conjunto_id', conjuntoId);
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchExpenses'));
}
async function addExpense(conjuntoId: string, expense: Omit<Expense, 'id'>): Promise<void> {
    const { error } = await supabase.from('expenses').insert(toSupabase({ ...expense, conjuntoId }));
    handleSupabaseError({ error }, 'addExpense');
}
async function updateExpense(conjuntoId: string, expense: Expense): Promise<void> {
    const { error } = await supabase.from('expenses').update(toSupabase(expense)).match({ id: expense.id, conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'updateExpense');
}
async function deleteExpense(conjuntoId: string, expenseId: number): Promise<void> {
    const { error } = await supabase.from('expenses').delete().match({ id: expenseId, conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'deleteExpense');
}
async function deleteAllExpenses(conjuntoId: string): Promise<void> {
    const { error } = await supabase.from('expenses').delete().match({ conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'deleteAllExpenses');
}
async function bulkInsertExpenses(conjuntoId: string, expenses: Omit<Expense, 'id'>[]): Promise<void> {
    const payload = expenses.map(e => toSupabase({ ...e, conjuntoId }));
    const { error } = await supabase.from('expenses').insert(payload);
    handleSupabaseError({ error }, 'bulkInsertExpenses');
}

async function fetchVisitorLogs(conjuntoId: string): Promise<VisitorLog[]> {
    const { data, error } = await supabase.from('visitor_logs').select('*').eq('conjunto_id', conjuntoId).order('id', { ascending: false });
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchVisitorLogs'));
}
async function addVisitorLog(conjuntoId: string, log: Omit<VisitorLog, 'id'>): Promise<void> {
    const { error } = await supabase.from('visitor_logs').insert(toSupabase({ ...log, conjuntoId }));
    handleSupabaseError({ error }, 'addVisitorLog');
}
async function updateVisitorLog(conjuntoId: string, logId: number, updates: Partial<Omit<VisitorLog, 'id'>>): Promise<void> {
    const { error } = await supabase.from('visitor_logs').update(toSupabase(updates)).match({ id: logId, conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'updateVisitorLog');
}

async function fetchPackageLogs(conjuntoId: string): Promise<PackageLog[]> {
    const { data, error } = await supabase.from('package_logs').select('*').eq('conjunto_id', conjuntoId).order('id', { ascending: false });
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchPackageLogs'));
}
async function addPackageLog(conjuntoId: string, log: Partial<Omit<PackageLog, 'id'>>): Promise<void> {
    const payload = {
        ...log,
        conjuntoId,
        receivedDate: new Date().toISOString(),
        status: 'En recepción'
    };
    const { error } = await supabase.from('package_logs').insert(toSupabase(payload));
    handleSupabaseError({ error }, 'addPackageLog');
}
async function updatePackageLogStatus(conjuntoId: string, packageId: number, status: PackageLog['status']): Promise<void> {
    const { error } = await supabase.from('package_logs').update({ status }).match({ id: packageId, conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'updatePackageLogStatus');
}

async function fetchAccessPoints(conjuntoId: string): Promise<AccessPoint[]> {
    const { data, error } = await supabase.from('access_points').select('*').eq('conjunto_id', conjuntoId);
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchAccessPoints'));
}
async function addAccessPoint(conjuntoId: string, name: string): Promise<void> {
    const { error } = await supabase.from('access_points').insert({ name, conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'addAccessPoint');
}
async function deleteAccessPoint(conjuntoId: string, id: number): Promise<void> {
    const { error } = await supabase.from('access_points').delete().match({ id, conjunto_id: conjuntoId });
    handleSupabaseError({ error }, 'deleteAccessPoint');
}

// --- DASHBOARD & ANALYTICS ---

async function fetchDashboardSummary(conjuntoId: string): Promise<DashboardSummary> {
    // This would be better as a single RPC call in a real DB
    const [debtors, tasks, dueDates, packages] = await Promise.all([
        fetchDebtors(conjuntoId),
        fetchTasks(conjuntoId),
        fetchDueDates(conjuntoId),
        fetchPackageLogs(conjuntoId),
    ]);

    const notifications: NotificationItem[] = [];
    const overdue = dueDates.filter(d => d.status === 'Vencido');
    if(overdue.length > 0) {
        notifications.push({ id: 'due-1', type: 'due-date', text: `${overdue.length} pagos se encuentran vencidos.`, details: `Ej: ${overdue[0].item}`, urgency: 'high', linkTo: Tab.DueDates });
    }
    const pendingTasks = tasks.filter(t => !t.completed);
    if(pendingTasks.length > 0) {
        notifications.push({ id: 'task-1', type: 'task', text: `Tienes ${pendingTasks.length} tareas pendientes.`, details: `Ej: ${pendingTasks[0].text}`, urgency: 'medium', linkTo: Tab.PendingTasks });
    }
    const packagesToDeliver = packages.filter(p => p.status === 'En recepción');
    if(packagesToDeliver.length > 0) {
        notifications.push({ id: 'pkg-1', type: 'package', text: `${packagesToDeliver.length} paquetes por entregar.`, details: `Ej: Paquete de ${packagesToDeliver[0].courier}`, urgency: 'low', linkTo: Tab.Seguridad });
    }
    
    return {
        stats: {
            residentsInDebt: { count: debtors.length, details: debtors.slice(0, 5).map(d => `Apto ${d.apartment}: $${d.balance.toLocaleString()}`) },
            pendingTasks: { count: pendingTasks.length, details: pendingTasks.slice(0, 5).map(t => t.text) },
            overduePayments: { count: overdue.length, details: overdue.slice(0, 5).map(d => d.item) },
            packagesToDeliver: { count: packagesToDeliver.length, details: packagesToDeliver.slice(0, 5).map(p => `Apto ${p.apartment} de ${p.courier}`) },
        },
        notifications: notifications.slice(0, 4)
    };
}
async function fetchFinancialChartData(conjuntoId: string): Promise<any> {
    // Dummy data for now. In production, this would be an RPC call.
     const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
     const monthlyIncomeVsExpense = months.map(month => ({
        name: month,
        ingresos: Math.floor(Math.random() * 2000000) + 5000000,
        gastos: Math.floor(Math.random() * 1500000) + 4000000,
    }));
     const expensesByCategory = [
        { name: 'Servicios', value: 400000, fill: '#0088FE' },
        { name: 'Mantenimiento', value: 300000, fill: '#00C49F' },
        { name: 'Nómina', value: 800000, fill: '#FFBB28' },
        { name: 'Otros', value: 200000, fill: '#FF8042' },
    ];
     const packageVolume = months.map(month => ({ name: month, value: Math.floor(Math.random() * 100) + 50 }));
     const visitorTraffic = [
        { name: 'Portería Principal', value: 450, fill: '#AF19FF' },
        { name: 'Portería Vehicular', value: 220, fill: '#FF8042' },
    ];
    
    return { monthlyIncomeVsExpense, expensesByCategory, packageVolume, visitorTraffic };
}

// --- SUPER ADMIN ---

async function fetchAllConjuntos(): Promise<ConjuntoInfo[]> {
    const { data, error } = await supabase.from('conjuntos').select('*');
    return fromSupabase(handleSupabaseError({ data, error }, 'fetchAllConjuntos'));
}

async function fetchPlatformStats(): Promise<PlatformStats> {
    // Dummy data, would be RPC calls
    return { totalConjuntos: 15, paidSubscriptions: 8, totalResidents: 1250, monthlyRecurringRevenue: 1120000, newThisMonth: 2 };
}

async function fetchSuperAdminChartData(): Promise<SuperAdminChartData> {
    // Dummy data
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    return {
        // FIX: Add missing 'fill' property to satisfy ChartData type
        chatbotUsage: months.map(m => ({ name: m, value: Math.floor(Math.random() * 200) + 100, fill: '#8884d8' })),
        packageVolume: [],
        visitorTraffic: []
    };
}

// --- COMMUNICATIONS & FILES ---

async function uploadFileForConjunto(conjuntoId: string, file: File): Promise<void> {
    const { error } = await supabase.storage.from('conjunto-files').upload(`${conjuntoId}/${file.name}`, file);
    handleSupabaseError({ error }, 'uploadFileForConjunto');
}
async function listFilesForConjunto(conjuntoId: string): Promise<StoredFile[]> {
    const { data, error } = await supabase.storage.from('conjunto-files').list(conjuntoId);
    handleSupabaseError({ error }, 'listFilesForConjunto');
    if (!data) return [];
    
    return data.map(file => {
        const { data: { publicUrl } } = supabase.storage.from('conjunto-files').getPublicUrl(`${conjuntoId}/${file.name}`);
        return {
            id: file.id,
            name: file.name,
            url: publicUrl,
            size: file.metadata.size,
            mimeType: file.metadata.mimetype,
            createdAt: file.created_at,
        }
    });
}
async function deleteFileForConjunto(conjuntoId: string, fileName: string): Promise<void> {
    const { error } = await supabase.storage.from('conjunto-files').remove([`${conjuntoId}/${fileName}`]);
    handleSupabaseError({ error }, 'deleteFileForConjunto');
}
async function uploadCommunicationAttachment(conjuntoId: string, file: File): Promise<{ name: string; url: string } | null> {
    const filePath = `communications/${conjuntoId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('conjunto-files').upload(filePath, file);
    handleSupabaseError({ error }, 'uploadCommunicationAttachment');

    const { data: { publicUrl } } = supabase.storage.from('conjunto-files').getPublicUrl(filePath);
    return { name: file.name, url: publicUrl };
}
async function sendCommunicationEmail(to: string[], subject: string, body: string, attachments: {name: string, url: string}[], fromName: string, fromEmail: string): Promise<{ success: boolean; error?: string; }> {
    let htmlBody = `<p>${body.replace(/\n/g, '<br>')}</p>`;
    if (attachments.length > 0) {
        htmlBody += '<br><hr><b>Archivos Adjuntos:</b><ul>';
        attachments.forEach(att => {
            htmlBody += `<li><a href="${att.url}">${att.name}</a></li>`;
        });
        htmlBody += '</ul>';
    }
    
    const { data, error } = await supabase.functions.invoke('send-email', {
        body: { to, subject, html: htmlBody, fromName },
    });
    if (error) {
        return { success: false, error: error.message };
    }
    return data;
}
async function sendMassEmail(conjuntoId: string, group: string, subject: string, body: string): Promise<{ message: string; }> {
     // This is a simplified version for the chatbot
    return { message: `Simulación: Correo masivo enviado al grupo '${group}' con el asunto '${subject}'.` };
}

// --- LOGGING ---
async function logChatbotInteraction(conjuntoId: string): Promise<void> {
    const { error } = await supabase.from('chatbot_interactions').insert({ conjunto_id: conjuntoId });
    if(error) console.error("Failed to log chatbot interaction:", error);
}

export const apiService = {
    fetchUserProfile,
    updateUserProfile,
    authenticateUser,
    fetchConjuntoInfo,
    addConjuntoInfo,
    updateConjuntoInfo,
    fetchResidents,
    addResident,
    updateResident,
    deleteResident,
    bulkUpsertResidents,
    fetchResidentByApartment,
    fetchAccountStatus,
    fetchAccountStatusByApartment,
    addAccountStatus,
    updateAccountStatus,
    deleteAccountStatus,
    bulkUpsertAccountStatus,
    fetchDebtors,
    fetchProviders,
    fetchProvidersBySpecialty,
    addProvider,
    updateProvider,
    deleteProvider,
    bulkUpsertProviders,
    fetchInternalStaff,
    addInternalStaff,
    updateInternalStaff,
    deleteInternalStaff,
    bulkUpsertInternalStaff,
    fetchUsers,
    addUser,
    updateUser,
    deleteUser,
    fetchRoles,
    addRole,
    updateRole,
    deleteRole,
    fetchBookings,
    addBooking,
    fetchCommonAreas,
    addCommonArea,
    removeCommonArea,
    fetchDueDates,
    addDueDate,
    updateDueDate,
    deleteDueDate,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    fetchIncomes,
    addIncome,
    updateIncome,
    deleteIncome,
    deleteAllIncomes,
    bulkInsertIncomes,
    fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    deleteAllExpenses,
    bulkInsertExpenses,
    fetchVisitorLogs,
    addVisitorLog,
    updateVisitorLog,
    fetchPackageLogs,
    addPackageLog,
    updatePackageLogStatus,
    fetchAccessPoints,
    addAccessPoint,
    deleteAccessPoint,
    fetchDashboardSummary,
    fetchFinancialChartData,
    fetchAllConjuntos,
    fetchPlatformStats,
    fetchSuperAdminChartData,
    uploadFileForConjunto,
    listFilesForConjunto,
    deleteFileForConjunto,
    uploadCommunicationAttachment,
    sendCommunicationEmail,
    sendMassEmail,
    logChatbotInteraction,
};