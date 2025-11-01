import { supabase } from './supabaseClient';
import { Resident, AccountStatus, Provider, InternalStaff, Booking, CommonArea, DueDate, Task, Expense, VisitorLog, PackageLog, DashboardSummary, NotificationItem, Tab, PlatformUser, AccessPoint, ConjuntoInfo, PlatformStats, UserRole } from '../types';

const handleApiError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error.message);
    // In a real app, you might want to throw the error or return a specific error object.
    // For now, we return empty arrays or null to prevent crashes.
    return null;
}

export const apiService = {
  // --- Super Admin ---
  checkIfSuperAdmin: async (email: string): Promise<boolean> => {
      const { data, error } = await supabase.from('super_admins').select('email').eq('email', email).single();
      if (error && error.code !== 'PGRST116') handleApiError(error, 'checkIfSuperAdmin');
      return !!data;
  },
  fetchPlatformStats: async (): Promise<PlatformStats> => {
      const { count: totalConjuntos } = await supabase.from('conjuntos').select('*', { count: 'exact', head: true });
      const { count: paidSubscriptions } = await supabase.from('conjuntos').select('*', { count: 'exact', head: true }).eq('subscription_plan', 'Paid');
      const { count: totalResidents } = await supabase.from('residents').select('*', { count: 'exact', head: true });
      const { data: paidConjuntos } = await supabase.from('conjuntos').select('plan_price').eq('subscription_plan', 'Paid');
      
      const monthlyRecurringRevenue = paidConjuntos?.reduce((sum, c) => sum + (c.plan_price || 0), 0) || 0;

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count: newThisMonth } = await supabase.from('conjuntos').select('*', { count: 'exact', head: true }).gte('registration_date', firstDayOfMonth);

      return {
          totalConjuntos: totalConjuntos ?? 0,
          paidSubscriptions: paidSubscriptions ?? 0,
          totalResidents: totalResidents ?? 0,
          monthlyRecurringRevenue,
          newThisMonth: newThisMonth ?? 0,
      };
  },
  fetchAllConjuntos: async (): Promise<ConjuntoInfo[]> => {
      const { data, error } = await supabase.from('conjuntos').select('*');
      if (error) return handleApiError(error, 'fetchAllConjuntos') || [];
      return data || [];
  },
  fetchConjuntoInfo: async (id: string): Promise<ConjuntoInfo | null> => {
      const { data, error } = await supabase.from('conjuntos').select('*').eq('id', id).single();
      if (error) return handleApiError(error, `fetchConjuntoInfo for ${id}`);
      return data;
  },
  updateConjuntoInfo: async (info: ConjuntoInfo): Promise<void> => {
      const { error } = await supabase.from('conjuntos').upsert(info);
      if (error) handleApiError(error, 'updateConjuntoInfo');
  },

  // --- Auth & User Management ---
  authenticateUser: async (email: string, pass: string): Promise<PlatformUser | null> => {
      const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('password', pass).single();
      if (error) return handleApiError(error, 'authenticateUser');
      return data;
  },
  findUserByEmail: async (email: string): Promise<PlatformUser | null> => {
      const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
      // Don't log "no rows found" as an error for this function
      if (error && error.code !== 'PGRST116') return handleApiError(error, 'findUserByEmail');
      return data;
  },
  fetchUsers: async (conjuntoId: string): Promise<PlatformUser[]> => {
      const { data, error } = await supabase.from('users').select('*').eq('conjunto_id', conjuntoId);
      if (error) return handleApiError(error, 'fetchUsers') || [];
      return data || [];
  },
  addUser: async (conjuntoId: string, user: Omit<PlatformUser, 'id'>): Promise<void> => {
      const { error } = await supabase.from('users').insert({ ...user, conjunto_id: conjuntoId });
      if (error) handleApiError(error, 'addUser');
  },
  updateUser: async (user: PlatformUser): Promise<void> => {
      const { error } = await supabase.from('users').update(user).eq('id', user.id);
      if (error) handleApiError(error, 'updateUser');
  },
  deleteUser: async (userId: number): Promise<void> => {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) handleApiError(error, 'deleteUser');
  },
  
  // --- Access Point Management ---
  fetchAccessPoints: async (conjuntoId: string): Promise<AccessPoint[]> => {
      const { data, error } = await supabase.from('access_points').select('*').eq('conjunto_id', conjuntoId);
      if (error) return handleApiError(error, 'fetchAccessPoints') || [];
      return data || [];
  },
  addAccessPoint: async (conjuntoId: string, name: string): Promise<void> => {
      const { error } = await supabase.from('access_points').insert({ name, conjunto_id: conjuntoId });
      if (error) handleApiError(error, 'addAccessPoint');
  },
  deleteAccessPoint: async (conjuntoId: string, id: number): Promise<void> => {
      const { error } = await supabase.from('access_points').delete().eq('conjunto_id', conjuntoId).eq('id', id);
      if (error) handleApiError(error, 'deleteAccessPoint');
  },

  // --- Fetching Data (Tenant-Aware) ---
  fetchResidents: async (conjuntoId: string): Promise<Resident[]> => {
    const { data, error } = await supabase.from('residents').select('*').eq('conjunto_id', conjuntoId);
    if (error) return handleApiError(error, 'fetchResidents') || [];
    return data || [];
  },
  fetchAccountStatus: async (conjuntoId: string): Promise<AccountStatus[]> => {
    const { data, error } = await supabase.from('account_status').select('*').eq('conjunto_id', conjuntoId);
    if (error) return handleApiError(error, 'fetchAccountStatus') || [];
    return data || [];
  },
  fetchProviders: async (conjuntoId: string): Promise<Provider[]> => {
    const { data, error } = await supabase.from('providers').select('*').eq('conjunto_id', conjuntoId);
    if (error) return handleApiError(error, 'fetchProviders') || [];
    return data || [];
  },
  fetchInternalStaff: async (conjuntoId: string): Promise<InternalStaff[]> => {
    const { data, error } = await supabase.from('internal_staff').select('*').eq('conjunto_id', conjuntoId);
    if (error) return handleApiError(error, 'fetchInternalStaff') || [];
    return data || [];
  },
  fetchDueDates: async (conjuntoId: string): Promise<DueDate[]> => {
    const { data, error } = await supabase.from('due_dates').select('*').eq('conjunto_id', conjuntoId);
    if (error) return handleApiError(error, 'fetchDueDates') || [];
    return data || [];
  },
  fetchTasks: async (conjuntoId: string): Promise<Task[]> => {
    const { data, error } = await supabase.from('tasks').select('*').eq('conjunto_id', conjuntoId);
    if (error) return handleApiError(error, 'fetchTasks') || [];
    return data || [];
  },
  fetchBookings: async (conjuntoId: string): Promise<Booking[]> => {
    const { data, error } = await supabase.from('bookings').select('*').eq('conjunto_id', conjuntoId);
    if (error) return handleApiError(error, 'fetchBookings') || [];
    return data || [];
  },
  fetchCommonAreas: async (conjuntoId: string): Promise<CommonArea[]> => {
    const { data, error } = await supabase.from('common_areas').select('*').eq('conjunto_id', conjuntoId);
    if (error) return handleApiError(error, 'fetchCommonAreas') || [];
    // Colors need to be parsed from JSON string in DB
    return data?.map(area => ({ ...area, color: JSON.parse(area.color) })) || [];
  },
  fetchExpenses: async (conjuntoId: string): Promise<Expense[]> => {
      const { data, error } = await supabase.from('expenses').select('*').eq('conjunto_id', conjuntoId);
      if (error) return handleApiError(error, 'fetchExpenses') || [];
      return data || [];
  },
  fetchVisitorLogs: async (conjuntoId: string): Promise<VisitorLog[]> => {
      const { data, error } = await supabase.from('visitor_logs').select('*').eq('conjunto_id', conjuntoId);
      if (error) return handleApiError(error, 'fetchVisitorLogs') || [];
      return data || [];
  },
  fetchPackageLogs: async (conjuntoId: string): Promise<PackageLog[]> => {
      const { data, error } = await supabase.from('package_logs').select('*').eq('conjunto_id', conjuntoId);
      if (error) return handleApiError(error, 'fetchPackageLogs') || [];
      return data || [];
  },

  fetchDashboardSummary: async (conjuntoId: string): Promise<DashboardSummary> => {
    const [accounts, tasks, dueDates, packages] = await Promise.all([
        apiService.fetchAccountStatus(conjuntoId),
        apiService.fetchTasks(conjuntoId),
        apiService.fetchDueDates(conjuntoId),
        apiService.fetchPackageLogs(conjuntoId),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const notifications: NotificationItem[] = [];
    dueDates.forEach(d => {
        if (d.status === 'Vencido') notifications.push({ id: `due-${d.id}`, type: 'due-date', text: `Pago Vencido: ${d.item}`, details: `Venció el ${d.dueDate}.`, urgency: 'high', linkTo: Tab.DueDates });
        else if (d.status === 'Pendiente') {
            const dayDiff = Math.ceil((new Date(d.dueDate).getTime() - today.getTime()) / (1000 * 3600 * 24));
            if (dayDiff >= 0 && dayDiff <= 3) notifications.push({ id: `due-${d.id}`, type: 'due-date', text: `Pago Próximo: ${d.item}`, details: `Vence en ${dayDiff} día(s).`, urgency: 'medium', linkTo: Tab.DueDates });
        }
    });
    tasks.forEach(t => {
        if (!t.completed && t.dueDate) {
            const dayDiff = Math.ceil((new Date(t.dueDate).getTime() - today.getTime()) / (1000 * 3600 * 24));
            if (dayDiff < 0) notifications.push({ id: `task-${t.id}`, type: 'task', text: `Tarea Atrasada: ${t.text}`, details: `Venció hace ${Math.abs(dayDiff)} día(s).`, urgency: 'high', linkTo: Tab.PendingTasks });
            else if (dayDiff <= 3) notifications.push({ id: `task-${t.id}`, type: 'task', text: `Tarea Urgente: ${t.text}`, details: `Vence en ${dayDiff} día(s).`, urgency: 'medium', linkTo: Tab.PendingTasks });
        }
    });
    packages.forEach(p => {
        if (p.status === 'En recepción') notifications.push({ id: `pkg-${p.id}`, type: 'package', text: `Paquete para Apto ${p.apartment}`, details: `Recibido de ${p.courier} el ${p.receivedDate}.`, urgency: 'low', linkTo: Tab.Seguridad });
    });
    notifications.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.urgency] - order[b.urgency];
    });

    return {
        stats: {
            residentsInDebt: accounts.filter(a => a.outstandingBalance > 0).length,
            pendingTasks: tasks.filter(t => !t.completed).length,
            overduePayments: dueDates.filter(d => d.status === 'Vencido').length,
            packagesToDeliver: packages.filter(p => p.status === 'En recepción').length,
        },
        notifications: notifications.slice(0, 5)
    };
  },
  
  // --- Modifying Data (Tenant-Aware) ---
  updateResident: async (conjuntoId: string, resident: Resident): Promise<void> => {
    const { error } = await supabase.from('residents').update(resident).eq('conjunto_id', conjuntoId).eq('apartment', resident.apartment);
    if (error) handleApiError(error, 'updateResident');
  },
  deleteResident: async (conjuntoId: string, apartment: string): Promise<void> => {
    const { error } = await supabase.from('residents').delete().eq('conjunto_id', conjuntoId).eq('apartment', apartment);
    if (error) handleApiError(error, 'deleteResident');
  },
  addBooking: async (conjuntoId: string, booking: Booking): Promise<void> => {
    const { error } = await supabase.from('bookings').insert({ ...booking, conjunto_id: conjuntoId });
    if (error) handleApiError(error, 'addBooking');
  },
  addCommonArea: async (conjuntoId: string, name: string): Promise<void> => {
    const availableColors = [
      { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
      { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
      { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
      { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    ];
    const { count } = await supabase.from('common_areas').select('*', { count: 'exact', head: true }).eq('conjunto_id', conjuntoId);
    const color = availableColors[ (count || 0) % availableColors.length ];

    const { error } = await supabase.from('common_areas').insert({ name, color: JSON.stringify(color), conjunto_id: conjuntoId });
    if (error) handleApiError(error, 'addCommonArea');
  },
  removeCommonArea: async (conjuntoId: string, id: string): Promise<void> => {
    const { error } = await supabase.from('common_areas').delete().eq('conjunto_id', conjuntoId).eq('id', id);
    if (error) handleApiError(error, 'removeCommonArea');
  },
  
  addTask: async (conjuntoId: string, task: Omit<Task, 'id'>): Promise<void> => {
    const { error } = await supabase.from('tasks').insert({ ...task, conjunto_id: conjuntoId });
    if (error) handleApiError(error, 'addTask');
  },
  updateTask: async (conjuntoId: string, task: Task): Promise<void> => {
    const { error } = await supabase.from('tasks').update(task).eq('conjunto_id', conjuntoId).eq('id', task.id);
    if (error) handleApiError(error, 'updateTask');
  },
  deleteTask: async (conjuntoId: string, id: number): Promise<void> => {
    const { error } = await supabase.from('tasks').delete().eq('conjunto_id', conjuntoId).eq('id', id);
    if (error) handleApiError(error, 'deleteTask');
  },
  
  addDueDate: async (conjuntoId: string, dueDate: Omit<DueDate, 'id'>): Promise<void> => {
    const { error } = await supabase.from('due_dates').insert({ ...dueDate, conjunto_id: conjuntoId });
    if (error) handleApiError(error, 'addDueDate');
  },
  updateDueDate: async (conjuntoId: string, dueDate: DueDate): Promise<void> => {
    const { error } = await supabase.from('due_dates').update(dueDate).eq('conjunto_id', conjuntoId).eq('id', dueDate.id);
    if (error) handleApiError(error, 'updateDueDate');
  },
  deleteDueDate: async (conjuntoId: string, id: number): Promise<void> => {
    const { error } = await supabase.from('due_dates').delete().eq('conjunto_id', conjuntoId).eq('id', id);
    if (error) handleApiError(error, 'deleteDueDate');
  },
  
  addExpense: async (conjuntoId: string, expense: Omit<Expense, 'id'>): Promise<void> => {
    const { error } = await supabase.from('expenses').insert({ ...expense, conjunto_id: conjuntoId });
    if (error) handleApiError(error, 'addExpense');
  },
  updateExpense: async (conjuntoId: string, expense: Expense): Promise<void> => {
    const { error } = await supabase.from('expenses').update(expense).eq('conjunto_id', conjuntoId).eq('id', expense.id);
    if (error) handleApiError(error, 'updateExpense');
  },
  deleteExpense: async (conjuntoId: string, id: number): Promise<void> => {
    const { error } = await supabase.from('expenses').delete().eq('conjunto_id', conjuntoId).eq('id', id);
    if (error) handleApiError(error, 'deleteExpense');
  },
};