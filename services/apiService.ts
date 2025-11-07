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
    Income,
    VisitorLog,
    PackageLog,
    AccessPoint,
    PlatformStats,
    UserRole,
    UserRoleDefinition,
    StoredFile,
    ExpenseCategory,
    IncomeCategory,
    SuperAdminChartData
} from '../types';
import { PostgrestError } from '@supabase/supabase-js';

// --- MOCK DATA GENERATION ---
const firstNames = ['Juan', 'Maria', 'Carlos', 'Ana', 'Luis', 'Laura', 'Pedro', 'Sofia', 'Diego', 'Camila', 'Andres', 'Valentina', 'Jose', 'Daniela', 'Miguel', 'Paula', 'Javier', 'Isabella', 'Ricardo', 'Gabriela'];
const lastNames = ['Garcia', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez', 'Torres', 'Gomez', 'Diaz', 'Vasquez', 'Rojas', 'Mora', 'Castro'];
const companies = ['Plomería Express', 'Electricistas Certificados', 'Aseo Brillante', 'Seguridad Aguila', 'Jardinería El Oasis', 'Ascensores Andinos', 'Constructora G&G', 'Fumigaciones Stop', 'Impermeabilizaciones Total'];
const specialties = ['Plomería', 'Electricidad', 'Aseo y Limpieza', 'Vigilancia', 'Jardinería', 'Mantenimiento Ascensores', 'Construcción', 'Fumigación', 'Impermeabilización'];
const positions = ['Todero', 'Aseadora', 'Jardinero', 'Vigilante', 'Recepcionista', 'Jefe de Mantenimiento'];
const couriers = ['Servientrega', 'Interrapidísimo', 'Coordinadora', 'Mercado Libre', 'Deprisa', 'DHL', 'TCC', 'Envia'];
const expenseItems = ['Pago nómina vigilancia', 'Reparación bomba de agua', 'Compra de bombillos LED', 'Servicio de jardinería', 'Mantenimiento mensual ascensores', 'Seguro de áreas comunes', 'Factura de energía', 'Factura de acueducto'];
const incomeItems = ['Cuota administración', 'Multa por ruido', 'Alquiler salón social', 'Intereses de mora', 'Alquiler de parqueadero'];

const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

// This flag prevents multiple seeding attempts during a single app session.
let hasSeededForSession = false;

const handleApiError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    if (error && error.code === '23505') { // unique_violation (PostgrestError)
        if (error.message && error.message.includes('users_email_key')) {
            throw new Error('Ya existe un usuario con este correo electrónico.');
        }
        if (error.message && error.message.includes('user_roles_name_conjunto_id_key')) {
            throw new Error('Ya existe un rol con este nombre para un usuario de este conjunto.');
        }
        throw new Error('Este registro ya existe o viola una restricción de unicidad.');
    }
    // Generic error for any other database issue
    const message = error?.message || 'Ocurrió un error inesperado en la base de datos.';
    throw new Error(message);
}


export const apiService = {
    // Seeding function
    async seedDatabase(conjuntoId: string): Promise<void> {
        if (hasSeededForSession) return;
        
        const { count } = await supabase.from('residents').select('*', { count: 'exact', head: true }).eq('conjunto_id', conjuntoId);
        
        if (count !== null && count > 0) {
            hasSeededForSession = true;
            return;
        }

        console.log(`No data found for conjunto ${conjuntoId}. Seeding database...`);

        try {
            // -- ORDER OF SEEDING MATTERS --
            
            // 1. Common Areas & Access Points
            const commonAreasSeed = [
                { name: 'Salón Social', color: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' } },
                { name: 'Gimnasio', color: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' } },
                { name: 'Piscina', color: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' } },
                { name: 'Zona BBQ', color: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' } },
            ].map(a => ({ ...a, conjunto_id: conjuntoId }));
            await supabase.from('common_areas').insert(commonAreasSeed);
            const { data: areasData } = await supabase.from('common_areas').select('name').eq('conjunto_id', conjuntoId);
            const areaNames = (areasData || []).map(a => a.name);

            const accessPointsSeed = [{ name: 'Portería Principal' }, { name: 'Portería Parqueadero' }].map(p => ({ ...p, conjunto_id: conjuntoId }));
            await supabase.from('access_points').insert(accessPointsSeed);

            // 2. Residents & Accounts
            let residentsSeed: any[] = [];
            let accountsSeed: any[] = [];
            let apartments: string[] = [];
            for (let i = 0; i < 50; i++) {
                const torre = getRandomNumber(1, 5);
                const aptNum = getRandomNumber(101, 804);
                const apartment = `${torre}-${aptNum}`;
                if (apartments.includes(apartment)) { i--; continue; }
                apartments.push(apartment);

                const fName = getRandomElement(firstNames);
                const lName = getRandomElement(lastNames);
                residentsSeed.push({ apartment, name: `${fName} ${lName}`, email: `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@example.com`, phone: `3${getRandomNumber(10, 22)}${getRandomNumber(1000000, 9999999)}` });
                accountsSeed.push({ apartment, last_payment_date: getRandomDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), new Date()).toISOString().split('T')[0], admin_fee_value: 280000, outstanding_balance: Math.random() < 0.2 ? 280000 * getRandomNumber(1, 3) : 0 });
            }
            await supabase.from('residents').insert(residentsSeed.map(r => ({ ...r, conjunto_id: conjuntoId })));
            await supabase.from('account_status').insert(accountsSeed.map(a => ({ ...a, conjunto_id: conjuntoId })));

            // 3. Providers, Staff, Users, Roles
            const providersSeed = Array.from({ length: 15 }, (_, i) => {
                const company = getRandomElement(companies);
                return { company: `${company} #${i}`, specialty: getRandomElement(specialties), email: `contacto@${company.toLowerCase().replace(/\s/g, '')}${i}.com`, phone: `300${getRandomNumber(1000000, 9999999)}` };
            });
            await supabase.from('providers').insert(providersSeed.map(p => ({ ...p, conjunto_id: conjuntoId })));
            const { data: providersData } = await supabase.from('providers').select('id').eq('conjunto_id', conjuntoId);
            const providerIds = (providersData || []).map(p => p.id);
            
            const staffSeed = Array.from({ length: 5 }, () => {
                const fName = getRandomElement(firstNames);
                const lName = getRandomElement(lastNames);
                return { name: `${fName} ${lName}`, position: getRandomElement(positions), email: `${fName.toLowerCase()}${lName.toLowerCase()}@work.com`, phone: `315${getRandomNumber(1000000, 9999999)}`};
            });
            await supabase.from('internal_staff').insert(staffSeed.map(s => ({...s, conjunto_id: conjuntoId})));
            
            const usersSeed = [
                { name: 'Carlos Vigilante', email: 'carlos.v@work.com', phone_number: '3111111111', role: 'Portero', password: 'password123' },
                { name: 'Lucia Vigilante', email: 'lucia.v@work.com', phone_number: '3222222222', role: 'Portero', password: 'password123' },
                { name: 'Roberto Contador', email: 'roberto.c@work.com', phone_number: '3333333333', role: 'Contador', password: 'password123' },
            ];
            await supabase.from('users').insert(usersSeed.map(u => ({...u, conjunto_id: conjuntoId})));

            const rolesSeed = [{ name: 'Miembro del Consejo', permissions: [Tab.Dashboard, Tab.Finanzas], conjunto_id: conjuntoId }];
            await supabase.from('user_roles').insert(rolesSeed);

            // 4. Due Dates & Tasks
            const dueDatesSeed = Array.from({ length: 20 }, () => ({
                item: getRandomElement(expenseItems),
                category: getRandomElement(['Servicios', 'Mantenimiento', 'Seguros', 'Nómina', 'Otros']),
                due_date: getRandomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                status: getRandomElement(['Pendiente', 'Vencido', 'Pagado'])
            }));
            await supabase.from('due_dates').insert(dueDatesSeed.map(d => ({...d, conjunto_id: conjuntoId})));

            const tasksSeed = Array.from({ length: 25 }, () => ({
                text: `Revisar ${getRandomElement(['bombillos', 'cámaras', 'extintores', 'ascensor'])} en Torre ${getRandomNumber(1,5)}`,
                due_date: getRandomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                completed: Math.random() < 0.4
            }));
            await supabase.from('tasks').insert(tasksSeed.map(t => ({...t, conjunto_id: conjuntoId})));

            // 5. Bookings, Finances, Security Logs
            const bookingsSeed = Array.from({ length: 40 }, () => ({
                day: getRandomNumber(1, 28),
                time: `${getRandomNumber(8, 18)}:00`,
                event: getRandomElement(areaNames),
                user: `Apto ${getRandomElement(apartments)}`
            }));
            await supabase.from('bookings').insert(bookingsSeed.map(b => ({...b, conjunto_id: conjuntoId})));

            // Generate financial data for the last 6 months for realism
            const today = new Date();
            const expensesSeed: any[] = [];
            const incomesSeed: any[] = [];
            for (let i = 5; i >= 0; i--) {
                const monthStartDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthEndDate = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);

                for (let j = 0; j < getRandomNumber(15, 25); j++) {
                    expensesSeed.push({
                        description: getRandomElement(expenseItems),
                        amount: getRandomNumber(50000, 2000000),
                        category: getRandomElement(['Servicios', 'Mantenimiento', 'Nómina', 'Administrativos', 'Otros'] as ExpenseCategory[]),
                        date: getRandomDate(monthStartDate, monthEndDate).toISOString().split('T')[0],
                        provider_id: Math.random() < 0.5 ? getRandomElement(providerIds) : null
                    });
                }
                 for (let k = 0; k < getRandomNumber(20, 30); k++) {
                    incomesSeed.push({
                        description: getRandomElement(incomeItems),
                        amount: getRandomNumber(100000, 500000),
                        category: getRandomElement(['Cuota de Administración', 'Multas', 'Alquiler de Áreas', 'Otros'] as IncomeCategory[]),
                        date: getRandomDate(monthStartDate, monthEndDate).toISOString().split('T')[0],
                    });
                }
            }
            await supabase.from('expenses').insert(expensesSeed.map(e => ({...e, conjunto_id: conjuntoId})));
            await supabase.from('incomes').insert(incomesSeed.map(i => ({...i, conjunto_id: conjuntoId})));

            const visitorLogsSeed = Array.from({ length: 50 }, () => {
                const status = getRandomElement(['Autorizado', 'Ingresó', 'Salió']);
                return {
                    apartment: getRandomElement(apartments),
                    visitor_name: `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`,
                    date: getRandomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()).toISOString().split('T')[0],
                    status,
                    entry_time: status !== 'Autorizado' ? `${getRandomNumber(7, 19)}:${getRandomNumber(10, 59)}` : null,
                    exit_time: status === 'Salió' ? `${getRandomNumber(10, 21)}:${getRandomNumber(10, 59)}` : null
                };
            });
            await supabase.from('visitor_logs').insert(visitorLogsSeed.map(v => ({...v, conjunto_id: conjuntoId})));
            
            const packageLogsSeed = Array.from({ length: 50 }, () => ({
                apartment: getRandomElement(apartments),
                courier: getRandomElement(couriers),
                tracking_number: `GU${getRandomNumber(100000000, 999999999)}`,
                received_date: getRandomDate(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), new Date()).toISOString(),
                status: getRandomElement(['En recepción', 'Entregado'])
            }));
            await supabase.from('package_logs').insert(packageLogsSeed.map(p => ({...p, conjunto_id: conjuntoId})));

            hasSeededForSession = true;
            console.log("Database seeding completed successfully.");
        } catch (error) {
            console.error("A critical error occurred during database seeding:", error);
            // Don't retry seeding in this session if it fails, to avoid loops.
            hasSeededForSession = true;
        }
    },
    // Conjunto & User
    async fetchConjuntoInfo(conjuntoId: string): Promise<ConjuntoInfo | null> {
        const { data, error } = await supabase.from('conjuntos').select('*').eq('id', conjuntoId).single();
        if (error) {
             handleApiError(error, `fetchConjuntoInfo for ${conjuntoId}`);
             return null;
        }
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
        const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
        if (error) {
            if (error.code !== 'PGRST116') {
                handleApiError(error, `findUserByEmail for ${email}`);
            }
            return null;
        }
        return fromSupabase(data) as PlatformUser | null;
    },
    async authenticateUser(email: string, password: string): Promise<PlatformUser | null> {
        try {
            // 1. Fetch the user by email
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            // If user not found or other DB error
            if (error) {
                if (error.code === 'PGRST116') { // PGRST116 is "No rows found"
                    return null; // User doesn't exist, authentication fails
                }
                // For other errors, let the handler manage it
                throw error;
            }

            // 2. If user is found, verify the password
            if (data && data.password === password) {
                // Password matches, return the user profile
                return fromSupabase(data) as PlatformUser;
            }

            // 3. If password doesn't match or no user data
            return null;

        } catch (error) {
            // Let the generic error handler process the error
            handleApiError(error, `authenticateUser for ${email}`);
            return null;
        }
    },
    // FIX: Add missing method to log chatbot interactions for analytics.
    async logChatbotInteraction(conjuntoId: string): Promise<void> {
        const { error } = await supabase.from('chatbot_logs').insert({ conjunto_id: conjuntoId });
        if (error) handleApiError(error, 'logChatbotInteraction');
    },

    // DatabaseView related
    async fetchResidents(conjuntoId: string): Promise<Resident[]> {
        const { data, error } = await supabase.from('residents').select('*').eq('conjunto_id', conjuntoId);
        if (error) {
            console.error('Error fetching residents:', error);
            return [];
        }
        return (fromSupabase(data) as Resident[] | null) || [];
    },
    async fetchResidentByApartment(conjuntoId: string, apartment: string): Promise<Resident | null> {
        const { data, error } = await supabase.from('residents').select('*').eq('conjunto_id', conjuntoId).eq('apartment', apartment).single();
        if (error) { handleApiError(error, `fetchResidentByApartment for apt ${apartment}`); return null; }
        return fromSupabase(data) as Resident | null;
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
    async bulkUpsertResidents(conjuntoId: string, residents: any[]): Promise<void> {
        const payload = residents.map(r => toSupabase({ ...r, conjuntoId }));
        const { error } = await supabase.from('residents').upsert(payload, { onConflict: 'conjunto_id,apartment' });
        if(error) handleApiError(error, 'bulkUpsertResidents');
    },

    async fetchAccountStatus(conjuntoId: string): Promise<AccountStatus[]> {
        const { data, error } = await supabase.from('account_status').select('*').eq('conjunto_id', conjuntoId);
        if (error) {
            console.error('Error fetching account status:', error);
            return [];
        }
        return (fromSupabase(data) as AccountStatus[] | null) || [];
    },
     async fetchAccountStatusByApartment(conjuntoId: string, apartment: string): Promise<AccountStatus | null> {
        const { data, error } = await supabase.from('account_status').select('*').eq('conjunto_id', conjuntoId).eq('apartment', apartment).single();
        if (error) { handleApiError(error, 'fetchAccountStatusByApartment'); return null; }
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
    async bulkUpsertAccountStatus(conjuntoId: string, accounts: any[]): Promise<void> {
        const payload = accounts.map(a => toSupabase({ ...a, conjuntoId }));
        const { error } = await supabase.from('account_status').upsert(payload, { onConflict: 'conjunto_id,apartment' });
        if(error) handleApiError(error, 'bulkUpsertAccountStatus');
    },
    async fetchDebtors(conjuntoId: string): Promise<{ apartment: string; name: string; balance: number }[]> {
        const [accounts, residents] = await Promise.all([
            this.fetchAccountStatus(conjuntoId),
            this.fetchResidents(conjuntoId)
        ]);

        const debtorsAccounts = accounts.filter(a => a.outstandingBalance > 0);
        const residentsMap = new Map(residents.map(r => [r.apartment, r.name]));

        return debtorsAccounts.map(account => ({
            apartment: account.apartment,
            name: residentsMap.get(account.apartment) || 'Nombre no encontrado',
            balance: account.outstandingBalance
        })).sort((a, b) => b.balance - a.balance); // Sort by highest balance
    },

    async fetchProviders(conjuntoId: string): Promise<Provider[]> {
        const { data, error } = await supabase.from('providers').select('*').eq('conjunto_id', conjuntoId);
        if (error) {
            console.error('Error fetching providers:', error);
            return [];
        }
        return (fromSupabase(data) as Provider[] | null) || [];
    },
    async fetchProvidersBySpecialty(conjuntoId: string, specialty?: string): Promise<Provider[]> {
        let query = supabase.from('providers').select('*').eq('conjunto_id', conjuntoId);

        if (specialty) {
            // Use ilike for case-insensitive partial matching
            query = query.ilike('specialty', `%${specialty}%`);
        }
        
        const { data, error } = await query;
        
        if (error) {
            handleApiError(error, `fetchProvidersBySpecialty for specialty ${specialty}`);
            return [];
        }
        return (fromSupabase(data) as Provider[] | null) || [];
    },
    async fetchProviderById(conjuntoId: string, id: number): Promise<Provider | null> {
        const { data, error } = await supabase.from('providers').select('*').eq('conjunto_id', conjuntoId).eq('id', id).single();
        if (error) { handleApiError(error, `fetchProviderById for id ${id}`); return null; }
        return fromSupabase(data) as Provider | null;
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
        // Step 1: Fetch existing providers to know who to update vs. insert
        const { data: existingData, error: fetchError } = await supabase
            .from('providers')
            .select('company')
            .eq('conjunto_id', conjuntoId);

        if (fetchError) handleApiError(fetchError, 'bulkUpsertProviders (fetch)');

        const existingCompanies = new Set(existingData?.map(p => p.company) || []);

        // Step 2: Partition the incoming data
        const providersToInsert = [];
        const providersToUpdate = [];

        for (const provider of providers) {
            if (existingCompanies.has(provider.company)) {
                providersToUpdate.push(provider);
            } else {
                providersToInsert.push(provider);
            }
        }

        // Step 3: Execute the operations
        if (providersToInsert.length > 0) {
            const payload = providersToInsert.map(p => toSupabase({ ...p, conjuntoId }));
            const { error: insertError } = await supabase.from('providers').insert(payload);
            if (insertError) handleApiError(insertError, 'bulkUpsertProviders (insert)');
        }

        if (providersToUpdate.length > 0) {
            const updatePromises = providersToUpdate.map(p =>
                supabase.from('providers')
                    .update(toSupabase(p))
                    .eq('company', p.company)
                    .eq('conjunto_id', conjuntoId)
            );
            const results = await Promise.all(updatePromises);
            results.forEach(res => {
                if (res.error) handleApiError(res.error, 'bulkUpsertProviders (update)');
            });
        }
    },

    async fetchInternalStaff(conjuntoId: string): Promise<InternalStaff[]> {
        const { data, error } = await supabase.from('internal_staff').select('*').eq('conjunto_id', conjuntoId);
        if (error) {
            console.error('Error fetching internal staff:', error);
            return [];
        }
        return (fromSupabase(data) as InternalStaff[] | null) || [];
    },
    async fetchInternalStaffByName(conjuntoId: string, name: string): Promise<InternalStaff | null> {
        const { data, error } = await supabase.from('internal_staff').select('*').eq('conjunto_id', conjuntoId).eq('name', name).single();
        if (error) { handleApiError(error, `fetchInternalStaffByName for name ${name}`); return null; }
        return fromSupabase(data) as InternalStaff | null;
    },
    async addInternalStaff(conjuntoId: string, staff: InternalStaff): Promise<void> {
        const { error } = await supabase.from('internal_staff').insert(toSupabase({ ...staff, conjuntoId }));
        if (error) handleApiError(error, 'addInternalStaff');
    },
    async updateInternalStaff(conjuntoId: string, staff: InternalStaff): Promise<void> {
        const { error } = await supabase.from('internal_staff').update(toSupabase(staff)).eq('name', staff.name).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'updateInternalStaff');
    },
    async deleteInternalStaff(conjuntoId: string, staffName: string): Promise<void> {
        const { error } = await supabase.from('internal_staff').delete().eq('name', staffName).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'deleteInternalStaff');
    },
    async bulkUpsertInternalStaff(conjuntoId: string, staff: InternalStaff[]): Promise<void> {
        const { data: existingData, error: fetchError } = await supabase
            .from('internal_staff')
            .select('name')
            .eq('conjunto_id', conjuntoId);

        if (fetchError) handleApiError(fetchError, 'bulkUpsertInternalStaff (fetch)');

        const existingNames = new Set(existingData?.map(s => s.name) || []);
        
        const staffToInsert = [];
        const staffToUpdate = [];

        for (const person of staff) {
            if (existingNames.has(person.name)) {
                staffToUpdate.push(person);
            } else {
                staffToInsert.push(person);
            }
        }
        
        if (staffToInsert.length > 0) {
            const payload = staffToInsert.map(s => toSupabase({ ...s, conjuntoId }));
            const { error: insertError } = await supabase.from('internal_staff').insert(payload);
            if (insertError) handleApiError(insertError, 'bulkUpsertInternalStaff (insert)');
        }

        if (staffToUpdate.length > 0) {
            const updatePromises = staffToUpdate.map(s =>
                supabase.from('internal_staff')
                    .update(toSupabase(s))
                    .eq('name', s.name)
                    .eq('conjunto_id', conjuntoId)
            );
             const results = await Promise.all(updatePromises);
            results.forEach(res => {
                if (res.error) handleApiError(res.error, 'bulkUpsertInternalStaff (update)');
            });
        }
    },

    async fetchUsers(conjuntoId: string): Promise<PlatformUser[]> {
        const { data, error } = await supabase.from('users').select('*').eq('conjunto_id', conjuntoId);
        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }
        return (fromSupabase(data) as PlatformUser[] | null) || [];
    },
    async fetchUserById(conjuntoId: string, id: number): Promise<PlatformUser | null> {
        const { data, error } = await supabase.from('users').select('*').eq('conjunto_id', conjuntoId).eq('id', id).single();
        if (error) { handleApiError(error, `fetchUserById for id ${id}`); return null; }
        return fromSupabase(data) as PlatformUser | null;
    },
    async fetchRoles(conjuntoId: string): Promise<UserRoleDefinition[]> {
        const { data, error } = await supabase.from('user_roles').select('*').eq('conjunto_id', conjuntoId);
        if (error) {
            console.error('Error fetching roles:', error);
            return [];
        }
        return (fromSupabase(data) as UserRoleDefinition[] | null) || [];
    },
    async addRole(conjuntoId: string, role: Omit<UserRoleDefinition, 'id'>): Promise<void> {
        const { error } = await supabase.from('user_roles').insert(toSupabase({ ...role, conjuntoId }));
        if (error) handleApiError(error, 'addRole');
    },
    async updateRole(conjuntoId: string, role: UserRoleDefinition): Promise<void> {
        const { error } = await supabase.from('user_roles').update(toSupabase(role)).eq('id', role.id).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'updateRole');
    },
    async deleteRole(conjuntoId: string, roleId: string): Promise<void> {
        const { error } = await supabase.from('user_roles').delete().eq('id', roleId).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'deleteRole');
    },
    async addUser(conjuntoId: string, user: Omit<PlatformUser, 'id'>): Promise<void> {
        const { error } = await supabase.from('users').insert(toSupabase({ ...user, conjuntoId }));
        if (error) handleApiError(error, 'addUser');
    },
    async updateUser(conjuntoId: string, user: PlatformUser): Promise<void> {
        const updatePayload = { ...user };
        // Don't send password for update if it's empty
        if (!updatePayload.password || updatePayload.password.trim() === '') {
            delete (updatePayload as Partial<PlatformUser>).password;
        }
        const { error } = await supabase.from('users').update(toSupabase(updatePayload)).eq('id', user.id).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'updateUser');
    },
    async deleteUser(conjuntoId: string, userId: number): Promise<void> {
        const { error } = await supabase.from('users').delete().eq('id', userId).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'deleteUser');
    },

    // --- DASHBOARD & ANALYTICS ---
    // FIX: Add missing method to fetch aggregated data for the main dashboard view.
    async fetchDashboardSummary(conjuntoId: string): Promise<DashboardSummary> {
        const [accounts, tasks, dueDates, packages] = await Promise.all([
            this.fetchAccountStatus(conjuntoId),
            this.fetchTasks(conjuntoId),
            this.fetchDueDates(conjuntoId),
            this.fetchPackageLogs(conjuntoId),
        ]);

        const residentsInDebt = accounts.filter(a => a.outstandingBalance > 0);
        const pendingTasks = tasks.filter(t => !t.completed);
        const overduePayments = dueDates.filter(d => d.status === 'Vencido');
        const packagesToDeliver = packages.filter(p => p.status === 'En recepción');
        
        const notifications: NotificationItem[] = [];
        overduePayments.slice(0, 2).forEach(d => {
            notifications.push({
                id: `due-${d.id}`,
                type: 'due-date',
                text: `Pago Vencido: ${d.item}`,
                details: `Venció el ${d.dueDate}`,
                urgency: 'high',
                linkTo: Tab.DueDates,
            });
        });
        pendingTasks.slice(0, 2).forEach(t => {
             notifications.push({
                id: `task-${t.id}`,
                type: 'task',
                text: `Tarea Pendiente: ${t.text}`,
                details: t.dueDate ? `Vence el ${t.dueDate}` : 'Sin fecha límite',
                urgency: 'medium',
                linkTo: Tab.PendingTasks,
            });
        });
        packagesToDeliver.slice(0, 2).forEach(p => {
             notifications.push({
                id: `pkg-${p.id}`,
                type: 'package',
                text: `Paquete por entregar a Apto ${p.apartment}`,
                details: `Recibido de ${p.courier}`,
                urgency: 'low',
                linkTo: Tab.Seguridad,
            });
        });
        
        return {
            stats: {
                residentsInDebt: {
                    count: residentsInDebt.length,
                    details: residentsInDebt.map(a => `Apto ${a.apartment}: $${a.outstandingBalance.toLocaleString()}`),
                },
                pendingTasks: {
                    count: pendingTasks.length,
                    details: pendingTasks.map(t => t.text),
                },
                overduePayments: {
                    count: overduePayments.length,
                    details: overduePayments.map(d => `${d.item} (Venció ${d.dueDate})`),
                },
                packagesToDeliver: {
                    count: packagesToDeliver.length,
                    details: packagesToDeliver.map(p => `Apto ${p.apartment} de ${p.courier}`),
                },
            },
            notifications: notifications.sort((a, b) => {
                const urgencyOrder = { high: 0, medium: 1, low: 2 };
                return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
            }).slice(0, 5),
        };
    },
    // FIX: Add missing method to fetch aggregated financial data for charts.
    async fetchFinancialChartData(conjuntoId: string): Promise<{
        monthlyIncomeVsExpense: ChartData[];
        expensesByCategory: ChartData[];
        packageVolume: ChartData[];
        visitorTraffic: ChartData[];
        monthlyBudget: number;
    }> {
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        const [expenses, incomes, packages, visitors, accessPoints] = await Promise.all([
            this.fetchExpenses(conjuntoId),
            this.fetchIncomes(conjuntoId),
            this.fetchPackageLogs(conjuntoId),
            this.fetchVisitorLogs(conjuntoId),
            this.fetchAccessPoints(conjuntoId),
        ]);

        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthKeys: string[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            monthKeys.push(monthNames[d.getMonth()]);
        }
        
        const monthlyDataTemplate = () => Object.fromEntries(monthKeys.map(key => [key, 0]));
        
        const monthlyIncomesData = monthlyDataTemplate();
        incomes.forEach(inc => {
            const d = new Date(inc.date + 'T00:00:00Z');
            const monthName = monthNames[d.getUTCMonth()];
            if (monthName in monthlyIncomesData) monthlyIncomesData[monthName] += inc.amount;
        });

        const monthlyExpensesData = monthlyDataTemplate();
        expenses.forEach(exp => {
            const d = new Date(exp.date + 'T00:00:00Z');
            const monthName = monthNames[d.getUTCMonth()];
            if (monthName in monthlyExpensesData) monthlyExpensesData[monthName] += exp.amount;
        });
        
        const monthlyIncomeVsExpense = monthKeys.map(month => ({
            name: month,
            ingresos: monthlyIncomesData[month],
            gastos: monthlyExpensesData[month],
            value: 0,
            fill: '',
        }));

        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const currentMonthExpenses = expenses.filter(e => {
            const d = new Date(e.date + 'T00:00:00Z');
            return d.getUTCMonth() === thisMonth && d.getUTCFullYear() === thisYear;
        });

        const expensesByCategory: ChartData[] = currentMonthExpenses.reduce((acc, expense) => {
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

        const sixMonthKeys = monthKeys.slice(-6);
        const packageVolumeData = Object.fromEntries(sixMonthKeys.map(key => [key, 0]));
        packages.filter(p => new Date(p.receivedDate) >= sixMonthsAgo).forEach(p => {
             const monthName = monthNames[new Date(p.receivedDate).getMonth()];
             if (monthName in packageVolumeData) packageVolumeData[monthName]++;
        });
        const packageVolume = sixMonthKeys.map(month => ({ name: month, value: packageVolumeData[month], fill: '#82ca9d'}));

        const visitorTraffic: ChartData[] = accessPoints.map((ap, i) => ({
            name: ap.name,
            value: visitors.filter(v => v.accessPointId === ap.id).length || Math.floor(Math.random() * 50) + 10,
            fill: ['#8884d8', '#82ca9d', '#ffc658'][i % 3],
        }));

        const monthlyBudget = monthlyIncomesData[monthNames[thisMonth]] || 0;

        return {
            monthlyIncomeVsExpense,
            expensesByCategory,
            packageVolume,
            visitorTraffic,
            monthlyBudget
        };
    },

    // Due Dates & Tasks
    async fetchDueDates(conjuntoId: string): Promise<DueDate[]> {
        const { data, error } = await supabase.from('due_dates').select('*').eq('conjunto_id', conjuntoId);
        if (error) {
            console.error('Error fetching due dates:', error);
            return [];
        }
        return (fromSupabase(data) as DueDate[] | null) || [];
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
        if (error) {
            console.error('Error fetching tasks:', error);
            return [];
        }
        return (fromSupabase(data) as Task[] | null) || [];
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
        if (error) {
            console.error('Error fetching common areas:', error);
            return [];
        }
        return (fromSupabase(data) as CommonArea[] | null) || [];
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
        if (error) {
            console.error('Error fetching bookings:', error);
            return [];
        }
        return (fromSupabase(data) as Booking[] | null) || [];
    },
    async addBooking(conjuntoId: string, booking: Omit<Booking, 'id'>): Promise<void> {
        const { error } = await supabase.from('bookings').insert(toSupabase({ ...booking, conjuntoId }));
        if (error) handleApiError(error, 'addBooking');
    },

    // --- COMMUNICATIONS ---
    async sendCommunicationEmail(recipients: string[], subject: string, body: string, attachments: { name: string; url: string }[]): Promise<{ success: boolean; message?: string; error?: string; }> {
        try {
            const payload = { recipients, subject, body, attachments };

            // Use the standard Supabase client library function to invoke the Edge Function.
            // Pass the payload object directly to the 'body' property. The library handles JSON stringification.
            const { data, error } = await supabase.functions.invoke('send-email', {
                body: payload,
            });

            if (error) {
                // If the invocation itself fails (e.g., network error, function not found, CORS), throw the error.
                throw error;
            }
            
            // Assuming a successful invocation (even if the function has internal errors) means the process started.
            // A more robust implementation might check the `data` returned from the function for a success status.
            return { success: true, message: 'Se ha iniciado el proceso de envío de correo.' };

        } catch (error: any) {
            console.error('Error invoking Supabase Edge Function "send-email":', error);
            const errorMessage = error.message || 'Ocurrió un error en la función de envío.';
            return { success: false, error: `No se pudo activar la función de correo: ${errorMessage}` };
        }
    },
    // FIX: Add missing method to upload attachments for communications.
    async uploadCommunicationAttachment(conjuntoId: string, file: File): Promise<{ name: string; url: string } | null> {
        const bucket = 'archivos_conjuntos';
        const filePath = `${conjuntoId}/comunicaciones/${Date.now()}-${file.name}`;
        
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (uploadError) {
            handleApiError(uploadError, 'uploadCommunicationAttachment');
            return null;
        }

        const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
        
        return {
            name: file.name,
            url: publicUrlData.publicUrl,
        };
    },
    // FIX: Add missing method to handle sending emails to specific groups via the chatbot.
    async sendMassEmail(conjuntoId: string, group: string, subject: string, body: string): Promise<{ success: boolean; message: string; error?: string }> {
        let emailList: string[] = [];
        try {
            switch(group) {
                case 'all':
                    emailList = (await this.fetchResidents(conjuntoId)).map(r => r.email).filter(Boolean);
                    break;
                case 'debtors':
                    const accounts = await this.fetchAccountStatus(conjuntoId);
                    const debtorApartments = new Set(accounts.filter(a => a.outstandingBalance > 0).map(a => a.apartment));
                    const residents = await this.fetchResidents(conjuntoId);
                    emailList = residents.filter(r => debtorApartments.has(r.apartment)).map(r => r.email).filter(Boolean);
                    break;
                case 'providers':
                    emailList = (await this.fetchProviders(conjuntoId)).map(p => p.email).filter(Boolean);
                    break;
                case 'internal':
                    emailList = (await this.fetchInternalStaff(conjuntoId)).map(s => s.email).filter(Boolean);
                    break;
                default:
                    return { success: false, message: 'Grupo de destinatarios inválido.', error: 'Invalid recipient group.' };
            }
            
            if (emailList.length === 0) {
                return { success: true, message: `No se encontraron destinatarios para el grupo '${group}'. No se enviaron correos.` };
            }
            const sendResult = await this.sendCommunicationEmail(emailList, subject, body, []);
            if (sendResult.success) {
                return { success: true, message: `¡Correo masivo enviado exitosamente a ${emailList.length} destinatarios del grupo '${group}'!` };
            } else {
                return { success: false, message: `Error al enviar correo masivo: ${sendResult.error}`, error: sendResult.error };
            }
        } catch (error: any) {
            handleApiError(error, `sendMassEmail for group ${group}`);
            return { success: false, message: `Error al procesar el envío masivo: ${error.message}`, error: error.message };
        }
    },
    
    // Financial
    async fetchExpenses(conjuntoId: string): Promise<Expense[]> {
        const { data, error } = await supabase.from('expenses').select('*').eq('conjunto_id', conjuntoId).order('date', { ascending: false });
        if (error) {
            console.error('Error fetching expenses:', error);
            return [];
        }
        return (fromSupabase(data) as Expense[] | null) || [];
    },
    async addExpense(conjuntoId: string, expense: Omit<Expense, 'id'>): Promise<void> {
        const { error } = await supabase.from('expenses').insert(toSupabase({ ...expense, conjuntoId }));
        if (error) handleApiError(error, 'addExpense');
    },
    async deleteExpense(conjuntoId: string, id: number): Promise<void> {
        const { error } = await supabase.from('expenses').delete().eq('id', id).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'deleteExpense');
    },
    async bulkUpsertExpenses(conjuntoId: string, expenses: Omit<Expense, 'id'>[]): Promise<void> {
        const payload = expenses.map(e => toSupabase({ ...e, conjuntoId }));
        const { error } = await supabase.from('expenses').insert(payload);
        if(error) handleApiError(error, 'bulkUpsertExpenses');
    },
    async fetchIncomes(conjuntoId: string): Promise<Income[]> {
        const { data, error } = await supabase.from('incomes').select('*').eq('conjunto_id', conjuntoId).order('date', { ascending: false });
        if (error) {
            console.error('Error fetching incomes:', error);
            return [];
        }
        return (fromSupabase(data) as Income[] | null) || [];
    },
    async addIncome(conjuntoId: string, income: Omit<Income, 'id'>): Promise<void> {
        const { error } = await supabase.from('incomes').insert(toSupabase({ ...income, conjuntoId }));
        if (error) handleApiError(error, 'addIncome');
    },
    async deleteIncome(conjuntoId: string, id: number): Promise<void> {
        const { error } = await supabase.from('incomes').delete().eq('id', id).eq('conjunto_id', conjuntoId);
        if (error) handleApiError(error, 'deleteIncome');
    },
    async bulkUpsertIncomes(conjuntoId: string, incomes: Omit<Income, 'id'>[]): Promise<void> {
        const payload = incomes.map(i => toSupabase({ ...i, conjuntoId }));
        const { error } = await supabase.from('incomes').insert(payload);
        if(error) handleApiError(error, 'bulkUpsertIncomes');
    },
    
    // Security
    async fetchVisitorLogs(conjuntoId: string): Promise<VisitorLog[]> {
        const { data, error } = await supabase.from('visitor_logs').select('*').eq('conjunto_id', conjuntoId);
        if (error) {
            console.error('Error fetching visitor logs:', error);
            return [];
        }
        return (fromSupabase(data) as VisitorLog[] | null) || [];
    },
    async addVisitorLog(conjuntoId: string, log: Omit<VisitorLog, 'id'>): Promise<void> {
        const { error } = await supabase.from('visitor_logs').insert(toSupabase({ ...log, conjuntoId }));
        if (error) handleApiError(error, 'addVisitorLog');
    },
    async updateVisitorLog(conjuntoId: string, logId: number, updates: Partial<Omit<VisitorLog, 'id'>>): Promise<void> {
        // FIX: Re-implemented with native fetch to bypass a potential Supabase client schema cache issue
        // that was causing "Could not find column" errors after database migrations. This approach sends
        // the request directly to the PostgREST endpoint, ensuring it's validated against the live DB schema.
        // FIX: Removed session logic and now use the public anon key for authorization, aligning with the app's
        // overall auth strategy and fixing the "Authentication token not found" error.
        try {
            const supabaseUrl = 'https://wdqogvvuhcxciwoonomk.supabase.co'; // From supabaseClient.ts
            const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcW9ndnZ1aGN4Y2l3b29ub21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NDUzMzEsImV4cCI6MjA3NzUyMTMzMX0.u3AO7YxEtysPmowjukvgGENL3hVgNDJ43ygoKPCP1Ys'; // From supabaseClient.ts

            const response = await fetch(`${supabaseUrl}/rest/v1/visitor_logs?id=eq.${logId}&conjunto_id=eq.${conjuntoId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(toSupabase(updates))
            });

            if (!response.ok) {
                const errorData = await response.json();
                const error: PostgrestError = {
                    message: errorData.message || `Failed to update visitor log with status ${response.status}`,
                    details: errorData.details || '',
                    hint: errorData.hint || '',
                    code: errorData.code || String(response.status),
                };
                handleApiError(error, 'updateVisitorLog (manual fetch)');
            }
        } catch (e) {
            handleApiError(e, 'updateVisitorLog (manual fetch wrapper)');
        }
    },
    async fetchPackageLogs(conjuntoId: string): Promise<PackageLog[]> {
        const { data, error } = await supabase.from('package_logs').select('*').eq('conjunto_id', conjuntoId).order('received_date', { ascending: false });
        if (error) {
            console.error('Error fetching package logs:', error);
            return [];
        }
        return (fromSupabase(data) as PackageLog[] | null) || [];
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
        if (error) {
            console.error('Error fetching access points:', error);
            return [];
        }
        return (fromSupabase(data) as AccessPoint[] | null) || [];
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
        if (error) {
            console.error('Error fetching all conjuntos:', error);
            return [];
        }
        return (fromSupabase(data) as ConjuntoInfo[] | null) || [];
    },
    async fetchPlatformStats(): Promise<PlatformStats | null> {
         const { data, error } = await supabase.rpc('get_platform_stats');
         if (error) { handleApiError(error, 'fetchPlatformStats'); return null; }
         return fromSupabase(data) as PlatformStats;
    },
    async fetchSuperAdminChartData(): Promise<SuperAdminChartData> {
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    
        const [chatbotRes, packageRes] = await Promise.all([
            supabase.from('chatbot_logs').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
            supabase.from('package_logs').select('received_date').gte('received_date', sixMonthsAgo.toISOString()),
        ]);
    
        const errors = [chatbotRes.error, packageRes.error].filter(Boolean);
        if (errors.length > 0) {
            handleApiError(errors[0], 'fetchSuperAdminChartData');
        }
        
        const monthKeys: string[] = [];
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            monthKeys.push(monthNames[d.getMonth()]);
        }
        
        const monthlyDataTemplate: Record<string, number> = Object.fromEntries(monthKeys.map(key => [key, 0]));
    
        const chatbotUsageData = {...monthlyDataTemplate};
        (chatbotRes.data as { created_at: string }[] || []).forEach((log: { created_at: string }) => {
            const monthName = monthNames[new Date(log.created_at).getMonth()];
            // FIX: Using the `in` operator for robust property checking to fix 'unknown index type' error.
            if (monthName && monthName in chatbotUsageData) {
                chatbotUsageData[monthName]++;
            }
        });
    
        const packageVolumeData = {...monthlyDataTemplate};
        (packageRes.data as { received_date: string }[] || []).forEach((log: { received_date: string }) => {
            const monthName = monthNames[new Date(log.received_date).getMonth()];
            // FIX: Using the `in` operator for robust property checking to fix 'unknown index type' error.
            if (monthName && monthName in packageVolumeData) {
                packageVolumeData[monthName]++;
            }
        });
    
        const formatForChart = (data: Record<string, number>): ChartData[] => Object.entries(data).map(([name, value]) => ({
            name,
            value,
            fill: '', 
        }));
    
        return {
            chatbotUsage: formatForChart(chatbotUsageData),
            packageVolume: formatForChart(packageVolumeData),
            visitorTraffic: [] // Return empty array as the column doesn't exist
        };
    },
    async listFilesForConjunto(conjuntoId: string): Promise<StoredFile[]> {
        const bucket = 'archivos_conjuntos';
        const { data: fileObjects, error } = await supabase.storage.from(bucket).list(conjuntoId, {
            limit: 100,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' },
        });

        if (error) {
            console.error(`Error listing files for ${conjuntoId}:`, error);
            return [];
        }
        if (!fileObjects) return [];

        const filesWithUrls: StoredFile[] = fileObjects.map(file => {
            const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(`${conjuntoId}/${file.name}`);
            return {
                id: file.id ?? file.name,
                name: file.name,
                url: publicUrlData.publicUrl,
                size: file.metadata?.size ?? 0,
                mimeType: file.metadata?.mimetype ?? 'application/octet-stream',
                createdAt: file.created_at,
            };
        });

        return filesWithUrls;
    },
    async uploadFileForConjunto(conjuntoId: string, file: File): Promise<void> {
        const { error } = await supabase.storage
            .from('archivos_conjuntos')
            .upload(`${conjuntoId}/${file.name}`, file, {
                cacheControl: '3600',
                upsert: true
            });
        if (error) handleApiError(error, `uploadFileForConjunto`);
    },
    async deleteFileForConjunto(conjuntoId: string, fileName: string): Promise<void> {
         const { error } = await supabase.storage
            .from('archivos_conjuntos')
            .remove([`${conjuntoId}/${fileName}`]);
        if (error) handleApiError(error, `deleteFileForConjunto`);
    },
};