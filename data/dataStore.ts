import { Resident, AccountStatus, Booking, CommonArea, DueDate, Task, Provider, InternalStaff, Expense, VisitorLog, PackageLog, PlatformUser, UserRole, AccessPoint } from '../types';
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

const availableColors = [
    { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
    { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
    { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300' },
];

let lastColorIndex = -1;

const getNextColor = () => {
    lastColorIndex = (lastColorIndex + 1) % availableColors.length;
    return availableColors[lastColorIndex];
};


// This is a simple in-memory store to ensure both UI and services access the same data state.
let currentResidents: Resident[] = [...initialResidents];
let currentAccountStatus: AccountStatus[] = [...initialAccountStatus];
let currentProviders: Provider[] = [...initialProviders];
let currentInternalStaff: InternalStaff[] = [...initialInternalStaff];
let currentDueDates: DueDate[] = [...initialDueDates];
let currentTasks: Task[] = [...initialTasks];
let currentExpenses: Expense[] = [...initialExpenses];
let currentVisitorLogs: VisitorLog[] = [...initialVisitorLogs];
let currentPackageLogs: PackageLog[] = [...initialPackageLogs];
let currentBookings: Booking[] = [
    { day: 5, time: '12pm-4pm', event: 'BBQ', user: 'Apt 101' },
    { day: 12, time: '6pm-9pm', event: 'Salón Social', user: 'Apt 202' },
    { day: 18, time: '9am-10am', event: 'Gimnasio', user: 'Apt 301' },
    { day: 18, time: '5pm-7pm', event: 'BBQ', user: 'Apt 102' },
    { day: 25, time: 'Todo el día', event: 'Salón Social', user: 'Admin' },
];
let commonAreas: CommonArea[] = [
    { id: '1', name: 'BBQ', color: getNextColor() },
    { id: '2', name: 'Gimnasio', color: getNextColor() },
    { id: '3', name: 'Salón Social', color: getNextColor() },
];

// New data for User Management
let currentUsers: PlatformUser[] = [
    { id: 1, name: 'Admin Principal', email: 'admin@conjunto.com', role: UserRole.Admin },
    { id: 2, name: 'Carlos (Portería)', email: 'porteria1@conjunto.com', role: UserRole.Guard, password: '123' }
];
let currentAccessPoints: AccessPoint[] = [
    { id: 1, name: 'Portería Principal' },
    { id: 2, name: 'Portería Vehicular' }
];

const notifyListeners = () => {
    listeners.forEach(listener => listener());
};

export const dataStore = {
    subscribe: (listener: Listener): (() => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener); // Return an unsubscribe function
    },

    // --- User Management ---
    getUsers: (): PlatformUser[] => [...currentUsers],
    addUser: (user: Omit<PlatformUser, 'id'>): void => {
        const newUser = { ...user, id: Date.now() };
        currentUsers.push(newUser);
        notifyListeners();
    },
    updateUser: (updatedUser: PlatformUser): void => {
        currentUsers = currentUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
        notifyListeners();
    },
    deleteUser: (userId: number): void => {
        currentUsers = currentUsers.filter(u => u.id !== userId);
        notifyListeners();
    },
    authenticateUser: (email: string, pass: string): PlatformUser | null => {
        const user = currentUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
        return user || null;
    },

    // --- Access Point Management ---
    getAccessPoints: (): AccessPoint[] => [...currentAccessPoints],
    addAccessPoint: (name: string): void => {
        const newPoint = { id: Date.now(), name };
        currentAccessPoints.push(newPoint);
        notifyListeners();
    },
    deleteAccessPoint: (id: number): void => {
        currentAccessPoints = currentAccessPoints.filter(ap => ap.id !== id);
        notifyListeners();
    },

    getResidents: (): Resident[] => [...currentResidents],
    getAccountStatus: (): AccountStatus[] => [...currentAccountStatus],
    getProviders: (): Provider[] => [...currentProviders],
    getInternalStaff: (): InternalStaff[] => [...currentInternalStaff],
    
    getDueDates: (): DueDate[] => [...currentDueDates],
    
    addDueDate: (newDueDateData: Omit<DueDate, 'id' | 'status'>): void => {
        const newDueDate: DueDate = {
            ...newDueDateData,
            id: Date.now(),
            status: 'Pendiente',
        };
        currentDueDates.unshift(newDueDate); // Add to the beginning of the list
        notifyListeners();
    },

    updateDueDate: (updatedDueDate: DueDate): void => {
        currentDueDates = currentDueDates.map(d => 
            d.id === updatedDueDate.id ? updatedDueDate : d
        );
        notifyListeners();
    },
    
    deleteDueDate: (id: number): void => {
        currentDueDates = currentDueDates.filter(d => d.id !== id);
        notifyListeners();
    },

    updateDueDateStatus: (id: number, status: 'Pagado'): void => {
        currentDueDates = currentDueDates.map(d => 
            d.id === id ? { ...d, status } : d
        );
        notifyListeners();
    },

    getTasks: (): Task[] => [...currentTasks],

    addTask: (newTask: Omit<Task, 'id'>): void => {
        const taskWithId: Task = { ...newTask, id: Date.now() };
        currentTasks.unshift(taskWithId);
        notifyListeners();
    },

    updateTask: (updatedTask: Task): void => {
        currentTasks = currentTasks.map(t =>
            t.id === updatedTask.id ? updatedTask : t
        );
        notifyListeners();
    },

    deleteTask: (id: number): void => {
        currentTasks = currentTasks.filter(t => t.id !== id);
        notifyListeners();
    },

    getBookings: (): Booking[] => [...currentBookings],

    getCommonAreas: (): CommonArea[] => [...commonAreas],

    addCommonArea: (name: string): void => {
        const newArea: CommonArea = {
            id: Date.now().toString(),
            name,
            color: getNextColor(),
        };
        commonAreas.push(newArea);
        notifyListeners();
    },

    removeCommonArea: (id: string): void => {
        commonAreas = commonAreas.filter(area => area.id !== id);
        notifyListeners();
    },
    
    getExpenses: (): Expense[] => [...currentExpenses],
    
    addExpense: (newExpenseData: Omit<Expense, 'id'>): void => {
        const newExpense: Expense = {
            ...newExpenseData,
            id: Date.now(),
        };
        currentExpenses.unshift(newExpense);
        notifyListeners();
    },
    
    updateExpense: (updatedExpense: Expense): void => {
        currentExpenses = currentExpenses.map(e => 
            e.id === updatedExpense.id ? updatedExpense : e
        );
        notifyListeners();
    },
    
    deleteExpense: (id: number): void => {
        currentExpenses = currentExpenses.filter(e => e.id !== id);
        notifyListeners();
    },

    updateResident: (updatedResident: Resident): void => {
        currentResidents = currentResidents.map(r => 
            r.apartment === updatedResident.apartment ? updatedResident : r
        );
        notifyListeners();
    },
    
    addBooking: (booking: Booking): void => {
        currentBookings.push(booking);
        notifyListeners();
    },

    getVisitorLogs: (): VisitorLog[] => [...currentVisitorLogs],
    getPackageLogs: (): PackageLog[] => [...currentPackageLogs],


    // --- Simulation of data loading ---
    loadNewData: (dataType: 'Residents' | 'AccountStatus' | 'Providers' | 'InternalStaff'): void => {
        // In a real app, this would parse a file and update the store.
        // Here we just load new mock data.
        switch (dataType) {
            case 'Residents':
                currentResidents = initialResidents.slice(0, 3).concat([{ apartment: '501', name: 'Nuevo Residente', email: 'nuevo@email.com', phone: '3000000000'}]);
                break;
            case 'AccountStatus':
                 currentAccountStatus = initialAccountStatus.slice(0,2).concat([{ apartment: '501', lastPaymentDate: '2024-07-01', adminFeeValue: 150, pendingInstallments: 0, otherCharges: 0, outstandingBalance: 0 }]);
                break;
            case 'Providers':
                currentProviders = initialProviders.slice(0,1).concat([{ id: 99, company: 'Nuevo Proveedor', specialty: 'Jardinería', email: 'jardin@nuevo.com', phone: '3111111111' }]);
                break;
            case 'InternalStaff':
                currentInternalStaff = initialInternalStaff.slice(0,1).concat([{ id: 99, name: 'Nueva Persona', position: 'Recepcionista', email: 'recepcion@conjunto.com', phone: '3222222222'}]);
                break;
        }
        notifyListeners();
    }
};
