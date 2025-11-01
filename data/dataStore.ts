
import { Resident, AccountStatus, Booking, CommonArea, DueDate, Task, Provider, InternalStaff, Expense, VisitorLog, PackageLog, PlatformUser, UserRole, AccessPoint, ConjuntoInfo, SuperAdminProfile } from '../types';
import { 
    residentsData as initialResidents, 
    accountStatusDetailsData as initialAccountStatus,
    providersData as initialProviders,
    internalStaffData as initialInternalStaff,
    dueDatesData as initialDueDates,
    tasksData as initialTasks,
    expensesData as initialExpenses,
    visitorLogsData as initialVisitorLogs,
    packageLogsData as initialPackageLogs,
} from './mockData';

type Listener = () => void;
const listeners: Set<Listener> = new Set();

const notifyListeners = () => {
    listeners.forEach(listener => listener());
};

const availableColors = [
    { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
];
let lastColorIndex = -1;
const getNextColor = () => {
    lastColorIndex = (lastColorIndex + 1) % availableColors.length;
    return availableColors[lastColorIndex];
};


// --- Multi-Tenant Database Structure ---
let db = {
    conjuntos: [
        { 
            id: 'conj-123',
            name: 'Altos de la Pradera',
            nit: '900.123.456-7',
            address: 'Calle Falsa 123',
            adminName: 'Admin Principal',
            adminEmail: 'admin@conjunto.com',
            adminPhone: '3009998877',
            subscriptionPlan: 'Paid' as 'Paid'
        }
    ] as ConjuntoInfo[],
    
    superAdmins: [
        { name: 'Mauricio Pineda', email: 'hmauricio.pineda@gmail.com', role: UserRole.SuperAdmin, password: 'super' }
    ],

    users: [
        { id: 1, name: 'Admin Principal', email: 'admin@conjunto.com', role: UserRole.Admin, conjuntoId: 'conj-123' },
        { id: 2, name: 'Carlos (Portería)', email: 'porteria1@conjunto.com', role: UserRole.Guard, password: '123', conjuntoId: 'conj-123' }
    ] as PlatformUser[],
    
    dataByConjunto: {
        'conj-123': {
            residents: [...initialResidents],
            accountStatus: [...initialAccountStatus],
            providers: [...initialProviders],
            internalStaff: [...initialInternalStaff],
            dueDates: [...initialDueDates],
            tasks: [...initialTasks],
            expenses: [...initialExpenses],
            visitorLogs: [...initialVisitorLogs],
            packageLogs: [...initialPackageLogs],
            bookings: [
                { day: 5, time: '12pm-4pm', event: 'BBQ', user: 'Apt 101' },
                { day: 12, time: '6pm-9pm', event: 'Salón Social', user: 'Apt 202' },
            ] as Booking[],
            commonAreas: [
                { id: '1', name: 'BBQ', color: getNextColor() },
                { id: '2', name: 'Salón Social', color: getNextColor() },
            ] as CommonArea[],
            accessPoints: [
                { id: 1, name: 'Portería Principal' },
                { id: 2, name: 'Portería Vehicular' }
            ] as AccessPoint[],
        }
    } as Record<string, any>
};

const getConjuntoData = (conjuntoId: string) => {
    if (!db.dataByConjunto[conjuntoId]) {
        // If a new conjunto is registered, initialize its data structure
        db.dataByConjunto[conjuntoId] = { residents: [], accountStatus: [], providers: [], internalStaff: [], dueDates: [], tasks: [], expenses: [], visitorLogs: [], packageLogs: [], bookings: [], commonAreas: [], accessPoints: [] };
    }
    return db.dataByConjunto[conjuntoId];
}


export const dataStore = {
    subscribe: (listener: Listener): (() => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },

    // --- Super Admin ---
    authenticateSuperAdmin: (email: string, pass: string): Omit<SuperAdminProfile, 'name'> | null => {
        const admin = db.superAdmins.find(a => a.email === email && a.password === pass);
        if (admin && admin.role === UserRole.SuperAdmin) {
            return { email: admin.email, role: admin.role };
        }
        return null;
    },
    getAllConjuntos: (): ConjuntoInfo[] => [...db.conjuntos],
    getConjuntoInfo: (id: string): ConjuntoInfo | null => db.conjuntos.find(c => c.id === id) || null,
    updateConjuntoInfo: (info: ConjuntoInfo): void => {
        const index = db.conjuntos.findIndex(c => c.id === info.id);
        if (index > -1) {
            db.conjuntos[index] = { ...db.conjuntos[index], ...info };
        } else {
            db.conjuntos.push(info);
        }
        notifyListeners();
    },
    
    // --- Auth ---
    authenticateUser: (email: string, pass: string): PlatformUser | null => {
        const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
        return user || null;
    },
    findUserByEmail: (email: string): PlatformUser | null => {
        return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    },

    // --- Tenant-aware data access ---
    getUsers: (conjuntoId: string): PlatformUser[] => db.users.filter(u => u.conjuntoId === conjuntoId),
    addUser: (conjuntoId: string, user: Omit<PlatformUser, 'id' | 'conjuntoId'>): void => {
        const newUser = { ...user, id: Date.now(), conjuntoId };
        db.users.push(newUser);
        notifyListeners();
    },
    updateUser: (updatedUser: PlatformUser): void => {
        db.users = db.users.map(u => u.id === updatedUser.id ? updatedUser : u);
        notifyListeners();
    },
    deleteUser: (userId: number): void => {
        db.users = db.users.filter(u => u.id !== userId);
        notifyListeners();
    },

    getAccessPoints: (conjuntoId: string): AccessPoint[] => [...getConjuntoData(conjuntoId).accessPoints],
    addAccessPoint: (conjuntoId: string, name: string): void => {
        const data = getConjuntoData(conjuntoId);
        const newPoint = { id: Date.now(), name };
        data.accessPoints.push(newPoint);
        notifyListeners();
    },
    deleteAccessPoint: (conjuntoId: string, id: number): void => {
        const data = getConjuntoData(conjuntoId);
        data.accessPoints = data.accessPoints.filter((ap: AccessPoint) => ap.id !== id);
        notifyListeners();
    },

    getResidents: (conjuntoId: string): Resident[] => [...getConjuntoData(conjuntoId).residents],
    getAccountStatus: (conjuntoId: string): AccountStatus[] => [...getConjuntoData(conjuntoId).accountStatus],
    getProviders: (conjuntoId: string): Provider[] => [...getConjuntoData(conjuntoId).providers],
    getInternalStaff: (conjuntoId: string): InternalStaff[] => [...getConjuntoData(conjuntoId).internalStaff],
    
    getDueDates: (conjuntoId: string): DueDate[] => [...getConjuntoData(conjuntoId).dueDates],
    addDueDate: (conjuntoId: string, newDueDateData: Omit<DueDate, 'id' | 'status'>): void => {
        const data = getConjuntoData(conjuntoId);
        const newDueDate = { ...newDueDateData, id: Date.now(), status: 'Pendiente' as 'Pendiente' };
        data.dueDates.unshift(newDueDate);
        notifyListeners();
    },
    updateDueDate: (conjuntoId: string, updatedDueDate: DueDate): void => {
        const data = getConjuntoData(conjuntoId);
        data.dueDates = data.dueDates.map((d: DueDate) => d.id === updatedDueDate.id ? updatedDueDate : d);
        notifyListeners();
    },
    deleteDueDate: (conjuntoId: string, id: number): void => {
        const data = getConjuntoData(conjuntoId);
        data.dueDates = data.dueDates.filter((d: DueDate) => d.id !== id);
        notifyListeners();
    },

    getTasks: (conjuntoId: string): Task[] => [...getConjuntoData(conjuntoId).tasks],
    addTask: (conjuntoId: string, newTask: Omit<Task, 'id'>): void => {
        const data = getConjuntoData(conjuntoId);
        const taskWithId = { ...newTask, id: Date.now() };
        data.tasks.unshift(taskWithId);
        notifyListeners();
    },
    updateTask: (conjuntoId: string, updatedTask: Task): void => {
        const data = getConjuntoData(conjuntoId);
        data.tasks = data.tasks.map((t: Task) => t.id === updatedTask.id ? updatedTask : t);
        notifyListeners();
    },
    deleteTask: (conjuntoId: string, id: number): void => {
        const data = getConjuntoData(conjuntoId);
        data.tasks = data.tasks.filter((t: Task) => t.id !== id);
        notifyListeners();
    },

    getBookings: (conjuntoId: string): Booking[] => [...getConjuntoData(conjuntoId).bookings],
    addBooking: (conjuntoId: string, booking: Booking): void => {
        getConjuntoData(conjuntoId).bookings.push(booking);
        notifyListeners();
    },
    getCommonAreas: (conjuntoId: string): CommonArea[] => [...getConjuntoData(conjuntoId).commonAreas],
    addCommonArea: (conjuntoId: string, name: string): void => {
        const data = getConjuntoData(conjuntoId);
        const newArea = { id: Date.now().toString(), name, color: getNextColor() };
        data.commonAreas.push(newArea);
        notifyListeners();
    },
    removeCommonArea: (conjuntoId: string, id: string): void => {
        const data = getConjuntoData(conjuntoId);
        data.commonAreas = data.commonAreas.filter((area: CommonArea) => area.id !== id);
        notifyListeners();
    },
    
    getExpenses: (conjuntoId: string): Expense[] => [...getConjuntoData(conjuntoId).expenses],
    addExpense: (conjuntoId: string, newExpenseData: Omit<Expense, 'id'>): void => {
        const data = getConjuntoData(conjuntoId);
        const newExpense = { ...newExpenseData, id: Date.now() };
        data.expenses.unshift(newExpense);
        notifyListeners();
    },
    updateExpense: (conjuntoId: string, updatedExpense: Expense): void => {
        const data = getConjuntoData(conjuntoId);
        data.expenses = data.expenses.map((e: Expense) => e.id === updatedExpense.id ? updatedExpense : e);
        notifyListeners();
    },
    deleteExpense: (conjuntoId: string, id: number): void => {
        const data = getConjuntoData(conjuntoId);
        data.expenses = data.expenses.filter((e: Expense) => e.id !== id);
        notifyListeners();
    },

    updateResident: (conjuntoId: string, updatedResident: Resident): void => {
        const data = getConjuntoData(conjuntoId);
        data.residents = data.residents.map((r: Resident) => r.apartment === updatedResident.apartment ? updatedResident : r);
        notifyListeners();
    },
    deleteResident: (conjuntoId: string, apartment: string): void => {
        const data = getConjuntoData(conjuntoId);
        data.residents = data.residents.filter((r: Resident) => r.apartment !== apartment);
        notifyListeners();
    },

    getVisitorLogs: (conjuntoId: string): VisitorLog[] => [...getConjuntoData(conjuntoId).visitorLogs],
    getPackageLogs: (conjuntoId: string): PackageLog[] => [...getConjuntoData(conjuntoId).packageLogs],
};
