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
    const { data, error } = await supabase.rpc('authenticate_platform_user', { _email: email, _password: password });
    if (error) {
        console.error('Authentication error:', error);
        throw new Error('Error de autenticación.');
    }
    if (!data) return null;
    return fromSupabase(data) as T.PlatformUser;
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
  async addAccessPoint(conjuntoId: string, name: string): Promise<void> {
    const { error } = await supabase.from('access_points').insert({ conjunto_id: conjuntoId, name });
    if (error) {
      console.error('Error adding access point:', error);
      throw error;
    }
  },
  async deleteAccessPoint(conjuntoId: string, id: number): Promise<void> {
    const { error } = await supabase.from('access_points').delete().eq('conjunto_id', conjuntoId).eq('id', id);
    if (error) {
      console.error('Error deleting access point:', error);
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
};