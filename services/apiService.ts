import { supabase } from './supabaseClient';
import { Resident, AccountStatus, Provider, InternalStaff, Booking, CommonArea, DueDate, Task, Expense, VisitorLog, PackageLog, DashboardSummary, NotificationItem, Tab, PlatformUser, AccessPoint, ConjuntoInfo, PlatformStats, ChartData } from '../types';
import { fromSupabase, toSupabase } from '../utils/dbMappers';

const handleApiError = (error: any, context: string) => {
    console.error(`Supabase error in ${context}:`, error);
    return null; 
}

export const apiService = {
  // --- Super Admin ---
  checkIfSuperAdmin: async (email: string): Promise<boolean> => {
      const { data, error } = await supabase.from('super_admins').select('email').eq('email', email).single();
      if (error && error.code !== 'PGRST116') handleApiError(error, 'checkIfSuperAdmin');
      return !!data;
  },
  fetchPlatformStats: async (): Promise<PlatformStats | null> => {
    try {
        const { count: totalConjuntos } = await supabase.from('conjuntos').select('*', { count: 'exact', head: true });
        const { count: paidSubscriptions } = await supabase.from('conjuntos').select('*', { count: 'exact', head: true }).eq('subscription_plan', 'Paid');
        const { count: totalResidents } = await supabase.from('residents').select('*', { count: 'exact', head: true });
        const { data: paidConjuntosData } = await supabase.from('conjuntos').select('plan_price').eq('subscription_plan', 'Paid');
        
        const paidConjuntos = fromSupabase(paidConjuntosData) as { planPrice?: number }[] | null;
        const monthlyRecurringRevenue = paidConjuntos?.reduce((sum: number, c) => sum + (c.planPrice || 0), 0) || 0;

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
    } catch(error) {
        return handleApiError(error, 'fetchPlatformStats');
    }
  },
  fetchAllConjuntos: async (): Promise<ConjuntoInfo[]> => {
      const { data, error } = await supabase.from('conjuntos').select('*');
      if (error) {
          handleApiError(error, 'fetchAllConjuntos');
          return [];
      }
      return (fromSupabase(data) as ConjuntoInfo[]) || [];
  },
  fetchConjuntoInfo: async (id: string): Promise<ConjuntoInfo | null> => {
      const { data, error } = await supabase.from('conjuntos').select('*').eq('id', id).single();
      if (error) return handleApiError(error, `fetchConjuntoInfo for ${id}`);
      return fromSupabase(data) as ConjuntoInfo | null;
  },
  updateConjuntoInfo: async (info: ConjuntoInfo): Promise<void> => {
      const { error } = await supabase.from('conjuntos').upsert(toSupabase(info), { onConflict: 'id' });
      if (error) handleApiError(error, 'updateConjuntoInfo');
  },

  // --- Auth & User Management ---
  authenticateUser: async (email: string, pass: string): Promise<PlatformUser | null> => {
      const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('password', pass).single();
      if (error) return handleApiError(error, 'authenticateUser');
      return fromSupabase(data) as PlatformUser | null;
  },
  findUserByEmail: async (email: string): Promise<PlatformUser | null> => {
      const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
      if (error && error.code !== 'PGRST116') return handleApiError(error, 'findUserByEmail');
      return fromSupabase(data) as PlatformUser | null;
  },
  fetchUsers: async (conjuntoId: string): Promise<PlatformUser[]> => {
      const { data, error } = await supabase.from('users').select('*').eq('conjunto_id', conjuntoId);
      if (error) {
        handleApiError(error, 'fetchUsers');
        return [];
      }
      return (fromSupabase(data) as PlatformUser[]) || [];
  },
  addUser: async (conjuntoId: string, user: Omit<PlatformUser, 'id' | 'conjuntoId'>): Promise<void> => {
      const { error } = await supabase.from('users').insert({ ...toSupabase(user), conjunto_id: conjuntoId });
      if (error) handleApiError(error, 'addUser');
  },
  updateUser: async (conjuntoId: string, user: PlatformUser): Promise<void> => {
      const { error } = await supabase.from('users').update(toSupabase(user)).eq('id', user.id).eq('conjunto_id', conjuntoId);
      if (error) handleApiError(error, 'updateUser');
  },
  deleteUser: async (conjuntoId: string, userId: number): Promise<void> => {
      const { error } = await supabase.from('users').delete().eq('id', userId).eq('conjunto_id', conjuntoId);
      if (error) handleApiError(error, 'deleteUser');
  },
  
  // --- Access Point Management ---
  fetchAccessPoints: async (conjuntoId: string): Promise<AccessPoint[]> => {
      const { data, error } = await supabase.from('access_points').select('*').eq('conjunto_id', conjuntoId);
      if (error) {
        handleApiError(error, 'fetchAccessPoints');
        return [];
      }
      return (fromSupabase(data) as AccessPoint[]) || [];
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
    if (error) {
        handleApiError(error, 'fetchResidents');
        return [];
    }
    return (fromSupabase(data) as Resident[]) || [];
  },
  fetchAccountStatus: async (conjuntoId: string): Promise<AccountStatus[]> => {
    const { data, error } = await supabase.from('account_status').select('*').eq('conjunto_id', conjuntoId);
    if (error) {
        handleApiError(error, 'fetchAccountStatus');
        return [];
    }
    return (fromSupabase(data) as AccountStatus[]) || [];
  },
  fetchProviders: async (conjuntoId: string): Promise<Provider[]> => {
    const { data, error } = await supabase.from('providers').select('*').eq('conjunto_id', conjuntoId);
    if (error) {
        handleApiError(error, 'fetchProviders');
        return [];
    }
    return (fromSupabase(data) as Provider[]) || [];
  },
  fetchInternalStaff: async (conjuntoId: string): Promise<InternalStaff[]> => {
    const { data, error } = await supabase.from('internal_staff').select('*').eq('conjunto_id', conjuntoId);
    if (error) {
        handleApiError(error, 'fetchInternalStaff');
        return [];
    }
    return (fromSupabase(data) as InternalStaff[]) || [];
  },
  fetchDueDates: async (conjuntoId: string): Promise<DueDate[]> => {
    const { data, error } = await supabase.from('due_dates').select('*').eq('conjunto_id', conjuntoId);
    if (error) {
        handleApiError(error, 'fetchDueDates');
        return [];
    }
    return (fromSupabase(data) as DueDate[]) || [];
  },
  fetchTasks: async (conjuntoId: string): Promise<Task[]> => {
    const { data, error } = await supabase.from('tasks').select('*').eq('conjunto_id', conjuntoId);
    if (error) {
        handleApiError(error, 'fetchTasks');
        return [];
    }
    return (fromSupabase(data) as Task[]) || [];
  },
  fetchBookings: async (conjuntoId: string): Promise<Booking[]> => {
    const { data, error } = await supabase.from('bookings').select('*').eq('conjunto_id', conjuntoId);
    if (error) {
        handleApiError(error, 'fetchBookings');
        return [];
    }
    return (fromSupabase(data) as Booking[]) || [];
  },
  fetchCommonAreas: async (conjuntoId: string): Promise<CommonArea[]> => {
    const { data, error } = await supabase.from('common_areas').select('*').eq('conjunto_id', conjuntoId);
    if (error) {
        handleApiError(error, 'fetchCommonAreas');
        return [];
    }
    const areas = fromSupabase(data) as any[];
    return areas?.map((area: any) => ({ ...area, color: typeof area.color === 'string' ? JSON.parse(area.color) : area.color })) || [];
  },
  fetchExpenses: async (conjuntoId: string): Promise<Expense[]> => {
      const { data, error } = await supabase.from('expenses').select('*').eq('conjunto_id', conjuntoId);
      if (error) {
        handleApiError(error, 'fetchExpenses');
        return [];
      }
      return (fromSupabase(data) as Expense[]) || [];
  },
  fetchVisitorLogs: async (conjuntoId: string): Promise<VisitorLog[]> => {
      const { data, error } = await supabase.from('visitor_logs').select('*').eq('conjunto_id', conjuntoId);
      if (error) {
        handleApiError(error, 'fetchVisitorLogs');
        return [];
      }
      return (fromSupabase(data) as VisitorLog[]) || [];
  },
  fetchPackageLogs: async (conjuntoId: string): Promise<PackageLog[]> => {
      const { data, error } = await supabase.from('package_logs').select('*').eq('conjunto_id', conjuntoId);
      if (error) {
        handleApiError(error, 'fetchPackageLogs');
        return [];
      }
      return (fromSupabase(data) as PackageLog[]) || [];
  },

  fetchFinancialChartData: async (conjuntoId: string): Promise<{
    monthlyIncomeVsExpense: ChartData[],
    expensesByCategory: ChartData[],
    monthlyBudget: number,
  } | null> => {
    try {
      // 1. Get expenses from the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('date, amount, category')
        .eq('conjunto_id', conjuntoId)
        .gte('date', sixMonthsAgo.toISOString().split('T')[0]);

      if (expensesError) throw expensesError;
      
      const expenses = (fromSupabase(expensesData) as {date: string, amount: number, category: string}[]) || [];

      // 2. Get total potential income
      const { data: accountsData, error: accountsError } = await supabase
        .from('account_status')
        .select('admin_fee_value')
        .eq('conjunto_id', conjuntoId);
      
      if (accountsError) throw accountsError;
      
      const potentialMonthlyIncome = ((fromSupabase(accountsData) as {adminFeeValue: number}[]) || [])
        .reduce((sum, acc) => sum + acc.adminFeeValue, 0);

      // 3. Process data for charts
      const monthlyData: { [key: string]: { ingresos: number, gastos: number } } = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthName = d.toLocaleString('es-ES', { month: 'short' }).replace('.', '').replace(/^\w/, c => c.toUpperCase());
        monthlyData[monthName] = { ingresos: potentialMonthlyIncome, gastos: 0 };
      }

      expenses.forEach(expense => {
        const d = new Date(expense.date);
        const monthName = d.toLocaleString('es-ES', { month: 'short' }).replace('.', '').replace(/^\w/, c => c.toUpperCase());
        if (monthlyData[monthName]) {
          monthlyData[monthName].gastos += expense.amount;
        }
      });
      
      const monthlyIncomeVsExpense: ChartData[] = Object.entries(monthlyData).map(([name, values]) => ({
        name,
        ingresos: values.ingresos,
        gastos: values.gastos,
        value: values.ingresos, // for dashboard chart
        fill: '', // not needed for this bar chart
      }));

      // 4. Process expenses by category for the current month
      const currentMonthExpenses = expenses.filter(e => new Date(e.date).getMonth() === new Date().getMonth());
      const expenseByCategoryMap = currentMonthExpenses.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
            return acc;
        }, {} as Record<string, number>);
      
      const COLORS = ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#3b82f6', '#10b981'];
      const expensesByCategory: ChartData[] = Object.entries(expenseByCategoryMap).map(([name, value], index) => ({
          name,
          value,
          fill: COLORS[index % COLORS.length]
      }));

      return {
        monthlyIncomeVsExpense,
        expensesByCategory,
        monthlyBudget: 25000000,
      };

    } catch (error) {
      return handleApiError(error, 'fetchFinancialChartData');
    }
  },

  fetchDashboardSummary: async (conjuntoId: string): Promise<DashboardSummary | null> => {
    try {
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
    } catch (error) {
        return handleApiError(error, 'fetchDashboardSummary');
    }
  },
  
  // --- Modifying Data (Tenant-Aware) ---
  updateResident: async (conjuntoId: string, resident: Resident): Promise<void> => {
    const { error } = await supabase.from('residents').update(toSupabase(resident)).eq('conjunto_id', conjuntoId).eq('apartment', resident.apartment);
    if (error) handleApiError(error, 'updateResident');
  },
  deleteResident: async (conjuntoId: string, apartment: string): Promise<void> => {
    const { error } = await supabase.from('residents').delete().eq('conjunto_id', conjuntoId).eq('apartment', apartment);
    if (error) handleApiError(error, 'deleteResident');
  },
  addBooking: async (conjuntoId: string, booking: Booking): Promise<void> => {
    const { error } = await supabase.from('bookings').insert({ ...toSupabase(booking), conjunto_id: conjuntoId });
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
    const { error } = await supabase.from('tasks').insert({ ...toSupabase(task), conjunto_id: conjuntoId });
    if (error) handleApiError(error, 'addTask');
  },
  updateTask: async (conjuntoId: string, task: Task): Promise<void> => {
    const { error } = await supabase.from('tasks').update(toSupabase(task)).eq('conjunto_id', conjuntoId).eq('id', task.id);
    if (error) handleApiError(error, 'updateTask');
  },
  deleteTask: async (conjuntoId: string, id: number): Promise<void> => {
    const { error } = await supabase.from('tasks').delete().eq('conjunto_id', conjuntoId).eq('id', id);
    if (error) handleApiError(error, 'deleteTask');
  },
  
  addDueDate: async (conjuntoId: string, dueDate: Omit<DueDate, 'id'>): Promise<void> => {
    const { error } = await supabase.from('due_dates').insert({ ...toSupabase(dueDate), conjunto_id: conjuntoId });
    if (error) handleApiError(error, 'addDueDate');
  },
  updateDueDate: async (conjuntoId: string, dueDate: DueDate): Promise<void> => {
    const { error } = await supabase.from('due_dates').update(toSupabase(dueDate)).eq('conjunto_id', conjuntoId).eq('id', dueDate.id);
    if (error) handleApiError(error, 'updateDueDate');
  },
  deleteDueDate: async (conjuntoId: string, id: number): Promise<void> => {
    const { error } = await supabase.from('due_dates').delete().eq('conjunto_id', conjuntoId).eq('id', id);
    if (error) handleApiError(error, 'deleteDueDate');
  },
  
  addExpense: async (conjuntoId: string, expense: Omit<Expense, 'id'>): Promise<void> => {
    const { error } = await supabase.from('expenses').insert({ ...toSupabase(expense), conjunto_id: conjuntoId });
    if (error) handleApiError(error, 'addExpense');
  },
  updateExpense: async (conjuntoId: string, expense: Expense): Promise<void> => {
    const { error } = await supabase.from('expenses').update(toSupabase(expense)).eq('conjunto_id', conjuntoId).eq('id', expense.id);
    if (error) handleApiError(error, 'updateExpense');
  },
  deleteExpense: async (conjuntoId: string, id: number): Promise<void> => {
    const { error } = await supabase.from('expenses').delete().eq('conjunto_id', conjuntoId).eq('id', id);
    if (error) handleApiError(error, 'deleteExpense');
  },
};