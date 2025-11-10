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
    UserProfile,
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
    
    async addConjuntoInfo(info: ConjuntoInfo): Promise<void> {
        const { error } = await supabase.from('conjuntos').insert(toSupabase(info));
        handleError(error, 'addConjuntoInfo');
    },

    async updateConjuntoInfo(info: ConjuntoInfo): Promise<void> {
        const { error } = await supabase.from('conjuntos').update(toSupabase(info)).eq('id', info.id);
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

    // =================================================================
    // AUTH & USERS
    // =================================================================
    
    async fetchUserProfile(userId: string): Promise<UserProfile | null> {
        const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
        if (error && error.code !== 'PGRST116') { // Ignore 'not found' error
            handleError(error, 'fetchUserProfile');
        }
        return fromSupabase(data) as UserProfile | null;
    },
    
    async updateUserProfile(profile: UserProfile): Promise<void> {
        const { error } = await supabase.from('user_profiles').update(toSupabase(profile)).eq('id', profile.id);
        handleError(error, 'updateUserProfile');
    },
    
    async checkIfSuperAdmin(email: string): Promise<boolean> {
        const { data } = await supabase.from('user_profiles').select('role').eq('email', email).single();
        return data?.role === UserRole.Admin;
    },
    
    // FIX: Add missing authenticateUser method for internal staff login.
    async authenticateUser(email: string, password: string): Promise<PlatformUser | null> {
        const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
        
        if (error && error.code !== 'PGRST116') { // ignore not found
            handleError(error, 'authenticateUser: fetch user');
        }

        // IMPORTANT: This is plain text password comparison. This is very insecure and should be replaced with a proper hashing mechanism in a real application.
        // Implementing it this way to match what seems to be the existing (flawed) application design.
        if (data && data.password === password) { 
            return fromSupabase(data) as PlatformUser;
        }

        return null;
    },


    // The methods below manage `platform_users`, which are distinct from Supabase Auth users.
    // They are for internal staff (Guard, Accountant) created by a conjunto admin.
    
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
        // Workaround for missing UNIQUE constraint on the natural key (e.g., company name) in the database.
        // The direct upsert `onConflict('company', 'conjunto_id')` fails if the constraint doesn't exist.
        // This implementation manually fetches existing records, separates new from existing, and performs separate operations.

        // 1. Fetch existing providers to manually check for conflicts based on the company name.
        const { data: existingProvidersData, error: fetchError } = await supabase
            .from('providers')
            .select('id, company')
            .eq('conjunto_id', conjuntoId);
        handleError(fetchError, 'bulkUpsertProviders (fetch)');

        const existingProviders = fromSupabase(existingProvidersData) as { id: number; company: string }[];
        // Use a case-insensitive map for matching company names.
        const existingProviderMap = new Map(existingProviders.map(p => [p.company.toLowerCase(), p.id]));

        const recordsToInsert: any[] = [];
        const recordsToUpdate: any[] = [];

        providers.forEach(provider => {
            if (!provider.company) return; // Skip rows without a company name

            const existingId = existingProviderMap.get(provider.company.toLowerCase());
            const payload = toSupabase({ ...provider, conjuntoId });
            
            // The 'id' from the Excel file is irrelevant/non-existent, we manage it here.
            delete payload.id;

            if (existingId) {
                // This provider exists, add its ID to the payload to target it for an update.
                recordsToUpdate.push({ ...payload, id: existingId });
            } else {
                // This is a new provider, add it to the insert queue.
                recordsToInsert.push(payload);
            }
        });

        // 2. Perform batch operations.
        if (recordsToInsert.length > 0) {
            const { error: insertError } = await supabase.from('providers').insert(recordsToInsert);
            handleError(insertError, 'bulkUpsertProviders (insert)');
        }

        if (recordsToUpdate.length > 0) {
            // For updates, we use upsert targeting the primary key ('id').
            // This will efficiently update all records in the array.
            const { error: updateError } = await supabase.from('providers').upsert(recordsToUpdate, { onConflict: 'id' });
            handleError(updateError, 'bulkUpsertProviders (update)');
        }
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
    async bulkInsertExpenses(conjuntoId: string, expenses: Omit<Expense, 'id'>[]): Promise<void> {
        const payload = expenses.map(e => toSupabase({ ...e, conjuntoId }));
        const { error } = await supabase.from('expenses').insert(payload);
        handleError(error, 'bulkInsertExpenses');
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
    async bulkInsertIncomes(conjuntoId: string, incomes: Omit<Income, 'id'>[]): Promise<void> {
        const payload = incomes.map(i => toSupabase({ ...i, conjuntoId }));
        const { error } = await supabase.from('incomes').insert(payload);
        handleError(error, 'bulkInsertIncomes');
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