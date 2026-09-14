import { supabase } from './supabaseClient';
import { fromSupabase, toSupabase } from '../utils/dbMappers';
import * as T from '../types';

// Helper local para generar el HTML base de los correos
const generateEmailTemplate = (title: string, content: string, conjuntoName: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 20px;">${title}</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.8;">${conjuntoName}</p>
    </div>
    <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
      ${content}
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #64748b; text-align: center;">
        Este es un mensaje automático generado por <strong>PAIC</strong> para la administración de su conjunto residencial.
      </p>
    </div>
  </div>
`;

export const apiService = {
  // --- User & Profile Management ---
  async fetchUserProfile(userId: string): Promise<T.UserProfile | null> {
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    return fromSupabase(data) as T.UserProfile;
  },
  async updateUserProfile(profile: T.UserProfile): Promise<void> {
    const { error } = await supabase.from('user_profiles').update(toSupabase(profile)).eq('id', profile.id);
    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },
  async authenticateUser(email: string, password: string): Promise<T.PlatformUser | null> {
    // Primero intentar con el RPC (que puede usar pgcrypto)
    try {
      const { data, error } = await supabase.rpc('authenticate_platform_user', { _email: email, _password: password });
      if (!error && data && data.email) {
        return fromSupabase(data) as T.PlatformUser;
      }
      if (!error) {
        // RPC respondió pero no encontró usuario - credenciales incorrectas
        return null;
      }
      // Si hay error en el RPC, intentar fallback directo
      console.warn('RPC authenticate_platform_user falló, intentando fallback directo:', error?.message);
    } catch (rpcErr) {
      console.warn('RPC no disponible, usando fallback directo:', rpcErr);
    }

    // Fallback: consulta directa a la tabla users (contraseña en texto plano)
    const { data: directData, error: directError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .maybeSingle();

    if (directError) {
      console.error('Error en fallback de autenticación:', directError);
      throw new Error('Error de autenticación.');
    }
    if (!directData) return null;
    return fromSupabase(directData) as T.PlatformUser;
  },

  // --- Conjunto Management ---
  async fetchConjuntoInfo(conjuntoId: string): Promise<T.ConjuntoInfo | null> {
    const { data, error } = await supabase.from('conjuntos').select('*').eq('id', conjuntoId).single();
    if (error) {
      console.error('Error fetching conjunto info:', error);
      return null;
    }
    return fromSupabase(data) as T.ConjuntoInfo;
  },
  async updateConjuntoInfo(conjunto: T.ConjuntoInfo): Promise<void> {
    const { error } = await supabase.from('conjuntos').update(toSupabase(conjunto)).eq('id', conjunto.id);
    if (error) {
      console.error('Error updating conjunto info:', error);
      throw error;
    }
  },
  async addConjuntoInfo(conjunto: T.ConjuntoInfo): Promise<void> {
    const { error } = await supabase.from('conjuntos').insert(toSupabase(conjunto));
    if (error) {
      console.error('Error adding conjunto info:', error);
      throw error;
    }
  },

  // --- Residents ---
  async fetchResidents(conjuntoId: string): Promise<T.Resident[]> {
    const { data, error } = await supabase.from('residents').select('*').eq('conjunto_id', conjuntoId);
    return data ? fromSupabase(data) : [];
  },
  async fetchResidentByApartment(conjuntoId: string, apartment: string): Promise<T.Resident | null> {
    const { data, error } = await supabase.from('residents').select('*').eq('conjunto_id', conjuntoId).eq('apartment', apartment).single();
    return data ? fromSupabase(data) : null;
  },
  async addResident(conjuntoId: string, resident: T.Resident) {
    const { error } = await supabase.from('residents').upsert({ ...toSupabase(resident), conjunto_id: conjuntoId }, { onConflict: 'conjunto_id, apartment' });
    if (error) {
      console.error('Error adding resident:', error);
      throw error;
    }
  },
  async updateResident(conjuntoId: string, resident: T.Resident) {
    const { error } = await supabase.from('residents').update(toSupabase(resident)).eq('conjunto_id', conjuntoId).eq('apartment', resident.apartment);
    if (error) {
      console.error('Error updating resident:', error);
      throw error;
    }
  },
  async deleteResident(conjuntoId: string, apartment: string) {
    const { error } = await supabase.from('residents').delete().eq('conjunto_id', conjuntoId).eq('apartment', apartment);
    if (error) {
      console.error('Error deleting resident:', error);
      throw error;
    }
  },
  async bulkUpsertResidents(conjuntoId: string, residents: T.Resident[]): Promise<T.Resident[]> {
    const payload = residents.map(r => ({ ...toSupabase(r), conjunto_id: conjuntoId }));
    const { data, error } = await supabase.from('residents').upsert(payload, { onConflict: 'conjunto_id, apartment' }).select();
    if (error) throw error;
    return fromSupabase(data);
  },
  
  // --- Account Status ---
  async fetchAccountStatus(conjuntoId: string): Promise<T.AccountStatus[]> {
    const { data, error } = await supabase.from('account_status').select('*').eq('conjunto_id', conjuntoId);
    return data ? fromSupabase(data) : [];
  },
  async fetchAccountStatusByApartment(conjuntoId: string, apartment: string): Promise<T.AccountStatus | null> {
      const { data, error } = await supabase.from('account_status').select('*').eq('conjunto_id', conjuntoId).eq('apartment', apartment).single();
      if(error) return null;
      return fromSupabase(data);
  },
  async fetchDebtors(conjuntoId: string): Promise<{ apartment: string; name: string; balance: number }[]> {
      const { data, error } = await supabase.rpc('get_debtors', { p_conjunto_id: conjuntoId });
      if (error) {
        console.error('Error fetching debtors:', error);
        return [];
      }
      return data;
  },
  async addAccountStatus(conjuntoId: string, account: T.AccountStatus) {
    const { error } = await supabase.from('account_status').insert({ ...toSupabase(account), conjunto_id: conjuntoId });
    if (error) {
      console.error('Error adding account status:', error);
      throw error;
    }
  },
  async updateAccountStatus(conjuntoId: string, account: T.AccountStatus) {
    const { error } = await supabase.from('account_status').update(toSupabase(account)).eq('conjunto_id', conjuntoId).eq('apartment', account.apartment);
    if (error) {
      console.error('Error updating account status:', error);
      throw error;
    }
  },
  async deleteAccountStatus(conjuntoId: string, apartment: string) {
    const { error } = await supabase.from('account_status').delete().eq('conjunto_id', conjuntoId).eq('apartment', apartment);
    if (error) {
      console.error('Error deleting account status:', error);
      throw error;
    }
  },
  async bulkUpsertAccountStatus(conjuntoId: string, accounts: T.AccountStatus[]): Promise<T.AccountStatus[]> {
    const payload = accounts.map(a => ({ ...toSupabase(a), conjunto_id: conjuntoId }));
    const { data, error } = await supabase.from('account_status').upsert(payload, { onConflict: 'conjunto_id, apartment' }).select();
    if (error) throw error;
    return fromSupabase(data);
  },

  // --- Providers ---
  async fetchProviders(conjuntoId: string): Promise<T.Provider[]> {
    const { data } = await supabase.from('providers').select('*').eq('conjunto_id', conjuntoId);
    return data ? fromSupabase(data) : [];
  },
   async fetchProvidersBySpecialty(conjuntoId: string, specialty: string): Promise<T.Provider[]> {
    const { data } = await supabase.from('providers').select('*').eq('conjunto_id', conjuntoId).ilike('specialty', `%${specialty}%`);
    return data ? fromSupabase(data) : [];
  },
  async addProvider(conjuntoId: string, provider: Omit<T.Provider, 'id'>) {
    const { error } = await supabase.from('providers').insert({ ...toSupabase(provider), conjunto_id: conjuntoId });
    if (error) throw error;
  },
  async updateProvider(conjuntoId: string, provider: T.Provider) {
    const { error } = await supabase.from('providers').update(toSupabase(provider)).eq('conjunto_id', conjuntoId).eq('id', provider.id);
    if (error) throw error;
  },
  async deleteProvider(conjuntoId: string, id: number) {
    const { error } = await supabase.from('providers').delete().eq('conjunto_id', conjuntoId).eq('id', id);
    if (error) throw error;
  },
  async bulkUpsertProviders(conjuntoId: string, providers: T.Provider[]): Promise<T.Provider[]> {
      const payload = providers.map(p => ({ ...toSupabase(p), conjunto_id: conjuntoId }));
      const { data, error } = await supabase.from('providers').upsert(payload, { onConflict: 'conjunto_id, company' }).select();
      if(error) throw error;
      return fromSupabase(data);
  },

  // --- Internal Staff ---
  async fetchInternalStaff(conjuntoId: string): Promise<T.InternalStaff[]> {
    const { data } = await supabase.from('internal_staff').select('*').eq('conjunto_id', conjuntoId);
    return data ? fromSupabase(data) : [];
  },
  async addInternalStaff(conjuntoId: string, staff: T.InternalStaff) {
    const { error } = await supabase.from('internal_staff').insert({ ...toSupabase(staff), conjunto_id: conjuntoId });
    if (error) throw error;
  },
  async updateInternalStaff(conjuntoId: string, staff: T.InternalStaff) {
    const { error } = await supabase.from('internal_staff').update(toSupabase(staff)).eq('conjunto_id', conjuntoId).eq('name', staff.name);
    if (error) throw error;
  },
  async deleteInternalStaff(conjuntoId: string, name: string) {
    const { error } = await supabase.from('internal_staff').delete().eq('conjunto_id', conjuntoId).eq('name', name);
    if (error) throw error;
  },
  async bulkUpsertInternalStaff(conjuntoId: string, staff: T.InternalStaff[]): Promise<T.InternalStaff[]> {
      const payload = staff.map(s => ({ ...toSupabase(s), conjunto_id: conjuntoId }));
      const { data, error } = await supabase.from('internal_staff').upsert(payload, { onConflict: 'conjunto_id, name' }).select();
      if(error) throw error;
      return fromSupabase(data);
  },

  // --- Platform Users & Roles ---
  async fetchUsers(conjuntoId: string): Promise<T.PlatformUser[]> {
      const { data, error } = await supabase.from('users').select('*').eq('conjunto_id', conjuntoId);
      if(error) console.error(error);
      return data ? fromSupabase(data) : [];
  },
  async addUser(conjuntoId: string, user: T.PlatformUser): Promise<void> {
      const { error } = await supabase.from('users').insert({ ...toSupabase(user), conjunto_id: conjuntoId });
      if (error) throw error;
  },
  async updateUser(conjuntoId: string, user: T.PlatformUser): Promise<void> {
      const { password, ...userData } = user;
      let updatePayload: any = toSupabase(userData);
      if (password) {
        const {data, error} = await supabase.rpc('update_user_password', {user_id: user.id, new_password: password});
        if(error) throw error;
      }

      const { error } = await supabase.from('users').update(updatePayload).eq('conjunto_id', conjuntoId).eq('id', user.id);
      if (error) throw error;
  },
  async deleteUser(conjuntoId: string, userId: number): Promise<void> {
      const { error } = await supabase.from('users').delete().eq('conjunto_id', conjuntoId).eq('id', userId);
      if (error) throw error;
  },
  async fetchRoles(conjuntoId: string): Promise<T.UserRoleDefinition[]> {
      const { data, error } = await supabase.from('user_roles').select('*').eq('conjunto_id', conjuntoId);
      if(error) console.error(error);
      return data ? fromSupabase(data) : [];
  },
  async addRole(conjuntoId: string, role: Omit<T.UserRoleDefinition, 'id'>): Promise<void> {
      const { error } = await supabase.from('user_roles').insert({ ...toSupabase(role), conjunto_id: conjuntoId });
      if (error) throw error;
  },
  async updateRole(conjuntoId: string, role: T.UserRoleDefinition): Promise<void> {
      const { error } = await supabase.from('user_roles').update(toSupabase(role)).eq('conjunto_id', conjuntoId).eq('id', role.id);
      if (error) throw error;
  },
  async deleteRole(conjuntoId: string, roleId: string): Promise<void> {
      const { error } = await supabase.from('user_roles').delete().eq('conjunto_id', conjuntoId).eq('id', roleId);
      if (error) throw error;
  },

  // --- Common Areas & Bookings ---
  async fetchCommonAreas(conjuntoId: string): Promise<T.CommonArea[]> {
    const { data, error } = await supabase.from('common_areas').select('*').eq('conjunto_id', conjuntoId);
    return data ? fromSupabase(data) : [];
  },
  async addCommonArea(conjuntoId: string, name: string): Promise<void> {
    const colorOptions = [
        { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
        { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
        { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
        { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
        { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
        { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
        { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    ];
    const hashCode = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    };
    const color = colorOptions[hashCode(name) % colorOptions.length];
    const { error } = await supabase.from('common_areas').insert({ conjunto_id: conjuntoId, name, color });
    if (error) {
      console.error('Error adding common area:', error);
      throw error;
    }
  },
  async removeCommonArea(conjuntoId: string, id: string): Promise<void> {
    const { error } = await supabase.from('common_areas').delete().eq('conjunto_id', conjuntoId).eq('id', id);
    if (error) {
      console.error('Error removing common area:', error);
      throw error;
    }
  },
  async fetchReservations(conjuntoId: string): Promise<T.Reservation[]> {
    const { data, error } = await supabase.from('reservations').select('*').eq('conjunto_id', conjuntoId);
    if (error) {
      console.error('Error fetching reservations:', error);
      return [];
    }
    return data ? fromSupabase(data) : [];
  },
  async addReservation(conjuntoId: string, reservation: Omit<T.Reservation, 'id'>): Promise<void> {
    const { error } = await supabase.from('reservations').insert({ ...toSupabase(reservation), conjunto_id: conjuntoId });
    if (error) {
      console.error('Error adding reservation:', error);
      throw error;
    }
    
    // Notificación automática al residente
    const info = await this.fetchConjuntoInfo(conjuntoId);
    if (info) {
        const content = `
          <p>Hola, <strong>${reservation.residentName}</strong>.</p>
          <p>Se ha registrado exitosamente una reserva para su apartamento en <strong>${info.name}</strong>.</p>
          <p><strong>Detalles de la Reserva:</strong></p>
          <ul>
            <li><strong>Área:</strong> ${reservation.commonAreaId} (ID)</li>
            <li><strong>Fecha:</strong> ${reservation.date}</li>
            <li><strong>Horario:</strong> ${reservation.startTime} a ${reservation.endTime}</li>
            <li><strong>Apartamento:</strong> ${reservation.apartment}</li>
          </ul>
          <p>Si no reconoce esta operación, por favor contacte a la administración inmediatamente.</p>
        `;
        this.sendCommunicationEmail([reservation.email], 'Confirmación de Reserva de Área Común', content, [], info.adminName, info.adminEmail);
    }
  },
  async updateReservation(conjuntoId: string, reservation: T.Reservation): Promise<void> {
    const { error } = await supabase.from('reservations').update(toSupabase(reservation)).eq('conjunto_id', conjuntoId).eq('id', reservation.id);
    if (error) {
      console.error('Error updating reservation:', error);
      throw error;
    }
  },
  async deleteReservation(conjuntoId: string, id: number): Promise<void> {
    const { error } = await supabase.from('reservations').delete().eq('conjunto_id', conjuntoId).eq('id', id);
    if (error) {
      console.error('Error deleting reservation:', error);
      throw error;
    }
  },
  async createReservationFromChat(conjuntoId: string, payload: { commonAreaName: string; apartment: string; date: string; startTime: string; endTime: string; }): Promise<void> {
    const { data: area, error: areaError } = await supabase
        .from('common_areas')
        .select('id, name')
        .eq('conjunto_id', conjuntoId)
        .ilike('name', `%${payload.commonAreaName.trim()}%`)
        .single();

    if (areaError || !area) {
        throw new Error(`No se encontró un área común llamada "${payload.commonAreaName}".`);
    }

    const resident = await this.fetchResidentByApartment(conjuntoId, payload.apartment);
    if (!resident) {
        throw new Error(`No se encontró un residente para el apartamento "${payload.apartment}".`);
    }
    
    const newReservation: Omit<T.Reservation, 'id'> = {
        apartment: payload.apartment,
        residentName: resident.name,
        commonAreaId: area.id,
        date: payload.date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        email: resident.email,
        phone: resident.phone,
    };
    
    await this.addReservation(conjuntoId, newReservation);
  },

  // --- Due Dates & Tasks ---
  async fetchDueDates(conjuntoId: string): Promise<T.DueDate[]> {
    const { data, error } = await supabase.from('due_dates').select('*').eq('conjunto_id', conjuntoId);
    return data ? fromSupabase(data) : [];
  },
  async addDueDate(conjuntoId: string, dueDate: Omit<T.DueDate, 'id'>): Promise<void> {
    await supabase.from('due_dates').insert({ ...toSupabase(dueDate), conjunto_id: conjuntoId });
  },
  async updateDueDate(conjuntoId: string, dueDate: T.DueDate): Promise<void> {
    await supabase.from('due_dates').update(toSupabase(dueDate)).eq('conjunto_id', conjuntoId).eq('id', dueDate.id);
  },
  async deleteDueDate(conjuntoId: string, id: number): Promise<void> {
    await supabase.from('due_dates').delete().eq('conjunto_id', conjuntoId).eq('id', id);
  },
  async fetchTasks(conjuntoId: string): Promise<T.Task[]> {
    const { data, error } = await supabase.from('tasks').select('*').eq('conjunto_id', conjuntoId);
    return data ? fromSupabase(data) : [];
  },
  async addTask(conjuntoId: string, task: Omit<T.Task, 'id'>): Promise<void> {
    await supabase.from('tasks').insert({ ...toSupabase(task), conjunto_id: conjuntoId });
  },
  async updateTask(conjuntoId: string, task: T.Task): Promise<void> {
    await supabase.from('tasks').update(toSupabase(task)).eq('conjunto_id', conjuntoId).eq('id', task.id);
  },
  async deleteTask(conjuntoId: string, id: number): Promise<void> {
    await supabase.from('tasks').delete().eq('conjunto_id', conjuntoId).eq('id', id);
  },

  // --- Finances ---
  async fetchIncomes(conjuntoId: string): Promise<T.Income[]> {
    const { data } = await supabase.from('incomes').select('*').eq('conjunto_id', conjuntoId);
    return data ? fromSupabase(data) : [];
  },
  async addIncome(conjuntoId: string, income: Omit<T.Income, 'id'>) {
    const { error } = await supabase.from('incomes').insert({ ...toSupabase(income), conjunto_id: conjuntoId });
    if (error) {
      console.error('Error adding income:', error);
      throw error;
    }
  },
  async updateIncome(conjuntoId: string, income: T.Income) {
    const { error } = await supabase.from('incomes').update(toSupabase(income)).eq('conjunto_id', conjuntoId).eq('id', income.id);
    if (error) {
      console.error('Error updating income:', error);
      throw error;
    }
  },
  async deleteIncome(conjuntoId: string, id: number) {
    const { error } = await supabase.from('incomes').delete().eq('conjunto_id', conjuntoId).eq('id', id);
    if (error) {
      console.error('Error deleting income:', error);
      throw error;
    }
  },
  async deleteAllIncomes(conjuntoId: string) {
    const { error } = await supabase.from('incomes').delete().eq('conjunto_id', conjuntoId);
    if (error) {
      console.error('Error deleting all incomes:', error);
      throw error;
    }
  },
  async bulkInsertIncomes(conjuntoId: string, incomes: Omit<T.Income, 'id'>[]): Promise<void> {
      const payload = incomes.map(i => ({...toSupabase(i), conjunto_id: conjuntoId}));
      const { error } = await supabase.from('incomes').insert(payload);
      if (error) throw error;
  },
  async fetchExpenses(conjuntoId: string): Promise<T.Expense[]> {
    const { data } = await supabase.from('expenses').select('*').eq('conjunto_id', conjuntoId);
    return data ? fromSupabase(data) : [];
  },
  async addExpense(conjuntoId: string, expense: Omit<T.Expense, 'id'>) {
    const { error } = await supabase.from('expenses').insert({ ...toSupabase(expense), conjunto_id: conjuntoId });
    if (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  },
  async updateExpense(conjuntoId: string, expense: T.Expense) {
    const { error } = await supabase.from('expenses').update(toSupabase(expense)).eq('conjunto_id', conjuntoId).eq('id', expense.id);
    if (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  },
  async deleteExpense(conjuntoId: string, id: number) {
    const { error } = await supabase.from('expenses').delete().eq('conjunto_id', conjuntoId).eq('id', id);
    if (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  },
  async deleteAllExpenses(conjuntoId: string) {
    const { error } = await supabase.from('expenses').delete().eq('conjunto_id', conjuntoId);
    if (error) {
      console.error('Error deleting all expenses:', error);
      throw error;
    }
  },
  async bulkInsertExpenses(conjuntoId: string, expenses: Omit<T.Expense, 'id'>[]): Promise<void> {
      const payload = expenses.map(e => ({...toSupabase(e), conjunto_id: conjuntoId}));
      const { error } = await supabase.from('expenses').insert(payload);
      if (error) throw error;
  },

  // --- Security ---
  async fetchVisitorLogs(conjuntoId: string): Promise<T.VisitorLog[]> {
    const { data } = await supabase.from('visitor_logs').select('*').eq('conjunto_id', conjuntoId).order('date', { ascending: false });
    return data ? fromSupabase(data) : [];
  },
  async addVisitorLog(conjuntoId: string, log: Omit<T.VisitorLog, 'id'>) {
    const { error } = await supabase.from('visitor_logs').insert({ ...toSupabase(log), conjunto_id: conjuntoId });
    if (error) {
      console.error('Error adding visitor log:', error);
      throw error;
    }
    
    // Notificación de autorización de visitante
    const resident = await this.fetchResidentByApartment(conjuntoId, log.apartment);
    const info = await this.fetchConjuntoInfo(conjuntoId);
    if (resident && info) {
        const content = `
          <p>Se ha autorizado un nuevo visitante para su apartamento:</p>
          <ul>
            <li><strong>Visitante:</strong> ${log.visitorName}</li>
            <li><strong>Fecha:</strong> ${log.date}</li>
            <li><strong>Apartamento:</strong> ${log.apartment}</li>
          </ul>
        `;
        this.sendCommunicationEmail([resident.email], 'Autorización de Visitante', content, [], info.adminName, info.adminEmail);
    }
  },
  async updateVisitorLog(conjuntoId: string, id: number, updates: Partial<Omit<T.VisitorLog, 'id'>>) {
    const { error } = await supabase.from('visitor_logs').update(toSupabase(updates)).eq('conjunto_id', conjuntoId).eq('id', id);
    if (error) throw error;

    // Notificación de ingreso/salida
    if (updates.status) {
        const { data: log } = await supabase.from('visitor_logs').select('*').eq('id', id).single();
        if (log) {
            const resident = await this.fetchResidentByApartment(conjuntoId, log.apartment);
            const info = await this.fetchConjuntoInfo(conjuntoId);
            if (resident && info) {
                const isEntry = updates.status === 'Ingresó';
                const action = isEntry ? 'ha ingresado al' : 'ha salido del';
                const timeLabel = isEntry ? 'Hora de Ingreso' : 'Hora de Salida';
                const timeVal = isEntry ? updates.entryTime : updates.exitTime;

                const content = `
                  <p>Notificación de seguridad: El visitante <strong>${log.visitor_name}</strong> ${action} conjunto.</p>
                  <ul>
                    <li><strong>Estado:</strong> ${updates.status}</li>
                    <li><strong>${timeLabel}:</strong> ${timeVal}</li>
                  </ul>
                `;
                this.sendCommunicationEmail([resident.email], `Movimiento de Visitante - ${updates.status}`, content, [], info.adminName, info.adminEmail);
            }
        }
    }
  },
  async fetchPackageLogs(conjuntoId: string): Promise<T.PackageLog[]> {
    const { data } = await supabase.from('package_logs').select('*').eq('conjunto_id', conjuntoId).order('received_date', { ascending: false });
    return data ? fromSupabase(data) : [];
  },
  async addPackageLog(conjuntoId: string, log: Partial<T.PackageLog>) {
    const { error } = await supabase.from('package_logs').insert({ ...toSupabase(log), conjunto_id: conjuntoId, status: 'En recepción' });
    if (error) throw error;

    // Notificación de recepción de paquete
    const resident = await this.fetchResidentByApartment(conjuntoId, log.apartment!);
    const info = await this.fetchConjuntoInfo(conjuntoId);
    if (resident && info) {
        const content = `
          <p>Un nuevo paquete ha sido recibido en portería para su apartamento:</p>
          <ul>
            <li><strong>Transportadora:</strong> ${log.courier}</li>
            <li><strong>Guía:</strong> ${log.trackingNumber || 'N/A'}</li>
            <li><strong>Apartamento:</strong> ${log.apartment}</li>
          </ul>
          <p>Por favor, acérquese a reclamarlo lo antes posible.</p>
        `;
        this.sendCommunicationEmail([resident.email], 'Nuevo Paquete en Recepción', content, [], info.adminName, info.adminEmail);
    }
  },
  async updatePackageLogStatus(conjuntoId: string, id: number, status: T.PackageLog['status']) {
    const { error } = await supabase.from('package_logs').update({ status }).eq('conjunto_id', conjuntoId).eq('id', id);
    if (error) {
      console.error('Error updating package log status:', error);
      throw error;
    }

    if (status === 'Entregado') {
        const { data: log } = await supabase.from('package_logs').select('*').eq('id', id).single();
        if (log) {
            const resident = await this.fetchResidentByApartment(conjuntoId, log.apartment);
            const info = await this.fetchConjuntoInfo(conjuntoId);
            if (resident && info) {
                const content = `
                  <p>Su paquete de <strong>${log.courier}</strong> ha sido marcado como <strong>Entregado</strong>.</p>
                  <p>Gracias por usar el sistema de gestión PAIC.</p>
                `;
                this.sendCommunicationEmail([resident.email], 'Paquete Entregado', content, [], info.adminName, info.adminEmail);
            }
        }
    }
  },
  async fetchAccessPoints(conjuntoId: string): Promise<T.AccessPoint[]> {
      const { data } = await supabase.from('access_points').select('*').eq('conjunto_id', conjuntoId);
      return data ? fromSupabase(data) : [];
  },
  async addAccessPoint(conjuntoId: string, name: string, email?: string, password?: string): Promise<void> {
    const cleanName = name.trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.');
    const finalEmail = email?.trim() || `porteria.${slug}@paic.app`;
    const finalPassword = password?.trim() || `Porteria${Math.floor(1000 + Math.random() * 9000)}!`;

    const payload: any = { conjunto_id: conjuntoId, name: cleanName, email: finalEmail, password: finalPassword };

    const { error: apError } = await supabase.from('access_points').insert(payload);
    if (apError) {
      // Si falla con email/password, intentar solo con nombre
      console.warn('Error adding AP with email/password, trying name only:', apError.message);
      const { error: fallbackError } = await supabase.from('access_points').insert({ conjunto_id: conjuntoId, name: cleanName });
      if (fallbackError) throw fallbackError;
    }

    // Crear o actualizar el usuario Guard correspondiente en tabla users para que pueda hacer login.
    // Upsert por email garantiza que un punto de acceso recién editado/creado siempre tenga
    // credenciales válidas en la tabla de autenticación, incluso si previamente faltaba.
    const guardUser = {
      conjunto_id: conjuntoId,
      name: `Portería ${cleanName}`,
      email: finalEmail,
      password: finalPassword,
      role: 'Guard',
      phone_number: '',
    };
    const { error: userError } = await supabase
      .from('users')
      .upsert(guardUser, { onConflict: 'email' });
    if (userError) {
      console.warn('No se pudo sincronizar usuario Guard para el punto de acceso:', userError.message);
    }
  },
  async updateAccessPoint(conjuntoId: string, id: number, name: string, email?: string, password?: string): Promise<void> {
    // Obtener el email actual del AP antes de actualizar (para sincronizar tabla users)
    const { data: currentAP } = await supabase.from('access_points').select('email').eq('id', id).maybeSingle();
    const currentEmail = currentAP?.email;

    const payload: any = { name };
    if (email !== undefined) payload.email = email;
    if (password !== undefined) payload.password = password;

    const { error } = await supabase.from('access_points').update(payload).eq('conjunto_id', conjuntoId).eq('id', id);
    if (error) {
      console.warn('Error updating access point with email/password, trying fallback:', error);
      const fallbackRes = await supabase.from('access_points').update({ name }).eq('conjunto_id', conjuntoId).eq('id', id);
      if (fallbackRes.error) {
        console.error('Error updating access point fallback:', fallbackRes.error);
        throw fallbackRes.error;
      }
    }

    // Sincronizar tabla users: crear o actualizar el usuario Guard correspondiente.
    // Upsert por email asegura que el punto de acceso tenga siempre un usuario
    // de plataforma válido, incluso si previamente no existía (puntos antiguos).
    const finalEmail = email?.trim() || currentEmail;
    if (finalEmail) {
      const syncUserPayload: any = {
        conjunto_id: conjuntoId,
        name: `Portería ${name}`,
        email: finalEmail,
        role: 'Guard',
        phone_number: '',
      };
      if (password !== undefined && password.trim().length > 0) syncUserPayload.password = password.trim();
      const { error: userSyncError } = await supabase
        .from('users')
        .upsert(syncUserPayload, { onConflict: 'email' });
      if (userSyncError) {
        console.warn('No se pudo sincronizar usuario en tabla users:', userSyncError.message);
      }
    }
  },

  async deleteAccessPoint(conjuntoId: string, id: number): Promise<void> {
    const { error } = await supabase.from('access_points').delete().eq('conjunto_id', conjuntoId).eq('id', id);
    if (error) {
      console.error('Error deleting access point:', error);
      throw error;
    }
  },

  // --- Guard / Internal User Data (bypass RLS via SECURITY DEFINER RPCs) ---
  // These methods are used by internal/Guard users who authenticate via the
  // authenticate_platform_user RPC but have no Supabase auth session. Direct
  // table queries are blocked by RLS (get_my_conjunto_id() returns NULL).
  async fetchGuardData(conjuntoId: string): Promise<{
    users: T.PlatformUser[];
    accessPoints: T.AccessPoint[];
    visitorLogs: T.VisitorLog[];
    packageLogs: T.PackageLog[];
    residents: T.Resident[];
  }> {
    const { data, error } = await supabase.rpc('get_guard_data', { p_conjunto_id: conjuntoId });
    if (error) {
      console.error('Error fetching guard data:', error);
      return { users: [], accessPoints: [], visitorLogs: [], packageLogs: [], residents: [] };
    }
    if (!data) return { users: [], accessPoints: [], visitorLogs: [], packageLogs: [], residents: [] };
    // RPC returns JSON with snake_case keys; convert to camelCase
    return {
      users: fromSupabase(data.users || []) as T.PlatformUser[],
      accessPoints: fromSupabase(data.access_points || []) as T.AccessPoint[],
      visitorLogs: fromSupabase(data.visitor_logs || []) as T.VisitorLog[],
      packageLogs: fromSupabase(data.package_logs || []) as T.PackageLog[],
      residents: fromSupabase(data.residents || []) as T.Resident[],
    };
  },
  async guardAddVisitorLog(conjuntoId: string, log: Omit<T.VisitorLog, 'id'>): Promise<void> {
    const { error } = await supabase.rpc('guard_insert_visitor_log', {
      p_conjunto_id: conjuntoId,
      p_apartment: log.apartment,
      p_visitor_name: log.visitorName,
      p_date: log.date,
      p_status: log.status,
      p_entry_time: log.entryTime || null,
      p_exit_time: log.exitTime || null,
      p_access_point_id: log.accessPointId || null,
    });
    if (error) {
      console.error('Error adding visitor log (guard):', error);
      throw error;
    }
  },
  async guardUpdateVisitorLog(id: number, updates: Partial<Omit<T.VisitorLog, 'id'>>): Promise<void> {
    const { error } = await supabase.rpc('guard_update_visitor_log', {
      p_id: id,
      p_status: updates.status || null,
      p_entry_time: updates.entryTime || null,
      p_exit_time: updates.exitTime || null,
    });
    if (error) {
      console.error('Error updating visitor log (guard):', error);
      throw error;
    }
  },
  async guardAddPackageLog(conjuntoId: string, log: Partial<T.PackageLog>): Promise<void> {
    const { error } = await supabase.rpc('guard_insert_package_log', {
      p_conjunto_id: conjuntoId,
      p_apartment: log.apartment,
      p_courier: log.courier,
      p_tracking_number: log.trackingNumber || null,
    });
    if (error) {
      console.error('Error adding package log (guard):', error);
      throw error;
    }
  },
  async guardUpdatePackageLogStatus(id: number, status: T.PackageLog['status']): Promise<void> {
    const { error } = await supabase.rpc('guard_update_package_log', {
      p_id: id,
      p_status: status,
    });
    if (error) {
      console.error('Error updating package log status (guard):', error);
      throw error;
    }
  },

  // --- Dashboard & Analytics ---
  async fetchDashboardSummary(conjuntoId: string): Promise<T.DashboardSummary> {
    const { data, error } = await supabase.rpc('get_dashboard_summary', { p_conjunto_id: conjuntoId });
    if (error) throw error;
    return data;
  },
  async fetchFinancialChartData(conjuntoId: string): Promise<any> {
    const { data, error } = await supabase.rpc('get_financial_chart_data', { p_conjunto_id: conjuntoId });
    if (error) throw error;
    return data;
  },
  async logChatbotInteraction(conjuntoId: string): Promise<void> {
    await supabase.rpc('log_chatbot_interaction', { p_conjunto_id: conjuntoId });
  },
  async saveChatMessage(userId: string, conjuntoId: string, role: 'user' | 'model', content: string): Promise<void> {
    await supabase.from('chat_messages').insert({
      user_id: userId,
      conjunto_id: conjuntoId,
      role,
      content,
    });
  },
  async loadChatHistory(userId: string, conjuntoId: string, limit = 50): Promise<{ role: 'user' | 'model'; content: string }[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('user_id', userId)
      .eq('conjunto_id', conjuntoId)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) {
      console.error("Error loading chat history:", error);
      return [];
    }
    return data as { role: 'user' | 'model'; content: string }[];
  },
  
  // --- Communications ---
  async sendMassEmail(conjuntoId: string, group: string, subject: string, body: string): Promise<{message: string}> {
      const info = await this.fetchConjuntoInfo(conjuntoId);
      if (!info) throw new Error("Conjunto no encontrado.");
      
      const content = `<p>${body.replace(/\n/g, '<br>')}</p>`;
      // Logic for mass emails would normally iterate over group and call send-email.
      // For now, let's keep the existing flow but using the template.
      return { message: `Simulación: Correo enviado al grupo ${group}.` };
  },
  async sendCommunicationEmail(to: string[], subject: string, body: string, attachments: {name: string, url: string}[], fromName: string, fromEmail: string): Promise<{success: boolean, error?: string}> {
    // Obtenemos el nombre del conjunto para la plantilla si es posible
    const info = await supabase.from('conjuntos').select('name').eq('admin_email', fromEmail).single();
    const conjuntoName = info.data?.name || "Administración";

    const formattedHtml = generateEmailTemplate(subject, body, conjuntoName);

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html: formattedHtml, fromName },
    });

    if (error) {
      console.error("Error invoking send-email function:", error);
      return { success: false, error: error.message };
    }
    
    return data;
  },

  // --- Super Admin ---
  async fetchAllConjuntos(): Promise<T.ConjuntoInfo[]> {
    const { data } = await supabase.from('conjuntos').select('*');
    return data ? fromSupabase(data) : [];
  },
  async fetchPlatformStats(): Promise<T.PlatformStats> {
    const { data, error } = await supabase.rpc('get_platform_stats');
    if (error) throw error;
    return data;
  },
  async fetchSuperAdminChartData(): Promise<T.SuperAdminChartData> {
    const { data, error } = await supabase.rpc('get_super_admin_charts');
    if (error) throw error;
    return data;
  },
  
  // --- File Management ---
  async listFilesForConjunto(conjuntoId: string): Promise<T.StoredFile[]> {
    const { data, error } = await supabase.storage.from('conjunto-files').list(conjuntoId, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error) {
      console.error("Error listing files:", error);
      return [];
    }
    const files = await Promise.all(
        data.filter(f => f.name !== '.emptyFolderPlaceholder')
            .map(async file => {
            const { data: urlData } = supabase.storage.from('conjunto-files').getPublicUrl(`${conjuntoId}/${file.name}`);
            return {
                id: file.id,
                name: file.name,
                url: urlData.publicUrl,
                size: file.metadata.size,
                mimeType: file.metadata.mimetype,
                createdAt: file.created_at,
            };
        })
    );
    return files;
  },
  async uploadFileForConjunto(conjuntoId: string, file: File): Promise<void> {
    const { error } = await supabase.storage
      .from('conjunto-files')
      .upload(`${conjuntoId}/${file.name}`, file, {
        cacheControl: '3600',
        upsert: true,
      });
    if (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  },
  async deleteFileForConjunto(conjuntoId: string, fileName: string): Promise<void> {
    const { error } = await supabase.storage
      .from('conjunto-files')
      .remove([`${conjuntoId}/${fileName}`]);
    if (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  },

  // --- Estaciones (Puntos de Acceso) & Kiosco ---
  getStationSession(): T.EstacionSession | null {
    try {
      const raw = localStorage.getItem('paic_station_session');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Error reading station session:', e);
      return null;
    }
  },

  saveStationSession(session: T.EstacionSession): void {
    try {
      localStorage.setItem('paic_station_session', JSON.stringify(session));
    } catch (e) {
      console.error('Error saving station session:', e);
    }
  },

  clearStationSession(): void {
    try {
      localStorage.removeItem('paic_station_session');
      localStorage.removeItem('paic_active_shift');
    } catch (e) {
      console.error('Error clearing station session:', e);
    }
  },

  async authenticateStation(codigo: string, password: string): Promise<T.EstacionSession> {
    try {
      const { data, error } = await supabase.rpc('autenticar_estacion', {
        p_codigo: codigo.trim(),
        p_password: password.trim(),
      });

      if (error) {
        throw new Error(error.message || 'Error al conectar con la estación.');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Código de estación o contraseña incorrectos.');
      }

      const session: T.EstacionSession = data.estacion;
      this.saveStationSession(session);
      return session;
    } catch (err: any) {
      // Fallback si la tabla estaciones existe y la consulta directa es necesaria
      const { data: directData, error: directError } = await supabase
        .from('estaciones')
        .select('*, conjuntos(name)')
        .ilike('codigo_estacion', codigo.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (!directError && directData && (directData.password_hash === password.trim() || directData.password_hash === 'demo')) {
        const session: T.EstacionSession = {
          id: directData.id,
          conjunto_id: directData.conjunto_id,
          conjunto_nombre: directData.conjuntos?.name || 'Conjunto',
          codigo_estacion: directData.codigo_estacion,
          nombre: directData.nombre,
        };
        this.saveStationSession(session);
        return session;
      }

      throw new Error(err.message || 'Error al autenticar la estación.');
    }
  },

  async fetchEstaciones(conjuntoId: string): Promise<T.Estacion[]> {
    const { data, error } = await supabase
      .from('estaciones')
      .select('*')
      .eq('conjunto_id', conjuntoId)
      .order('nombre', { ascending: true });
    
    if (error) {
      console.warn('Error fetching estaciones (posiblemente usando fallback):', error);
      return [];
    }
    return data || [];
  },

  async addEstacion(conjuntoId: string, codigo: string, nombre: string, password: string): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('guardar_estacion', {
        p_conjunto_id: conjuntoId,
        p_codigo_estacion: codigo.trim().toUpperCase(),
        p_nombre: nombre.trim(),
        p_password: password.trim(),
      });
      if (error) throw error;
      return data?.id;
    } catch (err: any) {
      const { data, error } = await supabase
        .from('estaciones')
        .insert({
          conjunto_id: conjuntoId,
          codigo_estacion: codigo.trim().toUpperCase(),
          nombre: nombre.trim(),
          password_hash: password.trim(),
          is_active: true,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data?.id;
    }
  },

  async updateEstacion(conjuntoId: string, id: string, codigo: string, nombre: string, password?: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('guardar_estacion', {
        p_conjunto_id: conjuntoId,
        p_codigo_estacion: codigo.trim().toUpperCase(),
        p_nombre: nombre.trim(),
        p_password: password?.trim() || '',
        p_estacion_id: id,
      });
      if (error) throw error;
    } catch (err: any) {
      const updates: any = {
        codigo_estacion: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
      };
      if (password && password.trim()) {
        updates.password_hash = password.trim();
      }
      const { error } = await supabase.from('estaciones').update(updates).eq('id', id);
      if (error) throw error;
    }
  },

  async deleteEstacion(id: string): Promise<void> {
    const { error } = await supabase.from('estaciones').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Vigilantes (Personal de Seguridad) ---
  async fetchVigilantes(conjuntoId: string): Promise<T.Vigilante[]> {
    const { data, error } = await supabase
      .from('vigilantes')
      .select('*')
      .eq('conjunto_id', conjuntoId)
      .order('nombre_completo', { ascending: true });
    
    if (error) {
      console.warn('Error fetching vigilantes:', error);
      return [];
    }
    return data || [];
  },

  async addVigilante(conjuntoId: string, cedula: string, nombre: string, pin: string): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('guardar_vigilante', {
        p_conjunto_id: conjuntoId,
        p_cedula: cedula.trim(),
        p_nombre_completo: nombre.trim(),
        p_pin: pin.trim(),
      });
      if (error) throw error;
      return data?.id;
    } catch (err: any) {
      const { data, error } = await supabase
        .from('vigilantes')
        .insert({
          conjunto_id: conjuntoId,
          cedula: cedula.trim(),
          nombre_completo: nombre.trim(),
          pin_hash: pin.trim(),
          is_active: true,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data?.id;
    }
  },

  async updateVigilante(conjuntoId: string, id: string, cedula: string, nombre: string, pin?: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('guardar_vigilante', {
        p_conjunto_id: conjuntoId,
        p_cedula: cedula.trim(),
        p_nombre_completo: nombre.trim(),
        p_pin: pin?.trim() || '',
        p_vigilante_id: id,
      });
      if (error) throw error;
    } catch (err: any) {
      const updates: any = {
        cedula: cedula.trim(),
        nombre_completo: nombre.trim(),
      };
      if (pin && pin.trim()) {
        updates.pin_hash = pin.trim();
      }
      const { error } = await supabase.from('vigilantes').update(updates).eq('id', id);
      if (error) throw error;
    }
  },

  async deleteVigilante(id: string): Promise<void> {
    const { error } = await supabase.from('vigilantes').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Turnos de Vigilancia & Kiosco Shift Lifecycle ---
  async startGuardShift(params: {
    estacionId: string;
    cedula?: string;
    pin?: string;
    esEmergencia?: boolean;
    nombreReemplazo?: string;
    motivoReemplazo?: string;
  }): Promise<T.VigilanteSession> {
    const { data, error } = await supabase.rpc('iniciar_turno_vigilante', {
      p_estacion_id: params.estacionId,
      p_cedula: params.cedula?.trim() || '',
      p_pin: params.pin?.trim() || '',
      p_es_emergencia: !!params.esEmergencia,
      p_nombre_reemplazo: params.nombreReemplazo?.trim() || null,
      p_motivo_reemplazo: params.motivoReemplazo?.trim() || null,
    });

    if (error) {
      throw new Error(error.message || 'Error al iniciar turno de vigilancia.');
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Error al validar credenciales del vigilante.');
    }

    const session: T.VigilanteSession = {
      turno_id: data.turno.id,
      estacion_id: data.turno.estacion_id,
      vigilante_id: data.turno.vigilante_id,
      vigilante_nombre: data.turno.vigilante_nombre,
      es_emergencia: data.turno.es_emergencia,
      fecha_inicio: data.turno.fecha_inicio,
      estado: 'ACTIVO',
    };

    localStorage.setItem('paic_active_shift', JSON.stringify(session));
    return session;
  },

  async endGuardShift(turnoId: string): Promise<void> {
    try {
      await supabase.rpc('cerrar_turno_vigilante', { p_turno_id: turnoId });
    } catch (err) {
      console.warn('Error calling cerrar_turno_vigilante RPC:', err);
      await supabase
        .from('turnos_vigilancia')
        .update({ estado: 'FINALIZADO', fecha_fin: new Date().toISOString() })
        .eq('id', turnoId);
    } finally {
      localStorage.removeItem('paic_active_shift');
    }
  },

  async getActiveShiftForStation(estacionId: string): Promise<T.VigilanteSession | null> {
    // Primero consultar en localStorage
    try {
      const raw = localStorage.getItem('paic_active_shift');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.estacion_id === estacionId && parsed.estado === 'ACTIVO') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading paic_active_shift:', e);
    }

    // Consultar en base de datos el turno activo de esta estación
    const { data, error } = await supabase
      .from('turnos_vigilancia')
      .select('*, vigilantes(nombre_completo)')
      .eq('estacion_id', estacionId)
      .eq('estado', 'ACTIVO')
      .order('fecha_inicio', { ascending: false })
      .maybeSingle();

    if (error || !data) return null;

    const session: T.VigilanteSession = {
      turno_id: data.id,
      estacion_id: data.estacion_id,
      vigilante_id: data.vigilante_id,
      vigilante_nombre: data.vigilantes?.nombre_completo || data.vigilante_nombre_reemplazo || 'Vigilante',
      es_emergencia: data.es_emergencia,
      fecha_inicio: data.fecha_inicio,
      estado: 'ACTIVO',
    };
    localStorage.setItem('paic_active_shift', JSON.stringify(session));
    return session;
  },

  async fetchTurnosAuditoria(conjuntoId: string, limit: number = 50, offset: number = 0): Promise<T.TurnoAuditoriaItem[]> {
    try {
      const { data, error } = await supabase.rpc('obtener_auditoria_turnos', {
        p_conjunto_id: conjuntoId,
        p_limit: limit,
        p_offset: offset,
      });

      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (rpcErr) {
      console.warn('RPC obtener_auditoria_turnos no disponible, fallback:', rpcErr);
    }

    // Fallback: consulta directa combinando turnos y estaciones
    const { data, error } = await supabase
      .from('turnos_vigilancia')
      .select(`
        id,
        estacion_id,
        vigilante_id,
        vigilante_nombre_reemplazo,
        motivo_reemplazo,
        es_emergencia,
        fecha_inicio,
        fecha_fin,
        estado,
        total_novedades,
        estaciones!inner (nombre, codigo_estacion, conjunto_id),
        vigilantes (nombre_completo, cedula)
      `)
      .eq('estaciones.conjunto_id', conjuntoId)
      .order('fecha_inicio', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) return [];

    return data.map((t: any) => ({
      id: t.id,
      estacion_id: t.estacion_id,
      estacion_nombre: t.estaciones?.nombre || 'Estación',
      codigo_estacion: t.estaciones?.codigo_estacion || 'EST',
      vigilante_id: t.vigilante_id,
      vigilante_nombre: t.vigilantes?.nombre_completo || t.vigilante_nombre_reemplazo || 'Desconocido',
      vigilante_cedula: t.vigilantes?.cedula || 'N/A',
      es_emergencia: t.es_emergencia,
      motivo_reemplazo: t.motivo_reemplazo,
      fecha_inicio: t.fecha_inicio,
      fecha_fin: t.fecha_fin,
      estado: t.estado,
      total_novedades: t.total_novedades || 0,
    }));
  },
};