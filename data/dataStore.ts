import { Resident, AccountStatus, Booking, CommonArea, DueDate } from '../types';
import { 
    residentsData as initialResidents, 
    accountStatusDetailsData as initialAccountStatus,
    newResidentsData,
    newAccountStatusDetailsData,
    dueDatesData as initialDueDates,
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
let currentDueDates: DueDate[] = [...initialDueDates];
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

const notifyListeners = () => {
    listeners.forEach(listener => listener());
};

export const dataStore = {
    subscribe: (listener: Listener): (() => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener); // Return an unsubscribe function
    },

    getResidents: (): Resident[] => {
        return [...currentResidents]; // Return a copy to prevent direct mutation
    },

    getAccountStatus: (): AccountStatus[] => {
        return [...currentAccountStatus]; // Return a copy
    },
    
    getDueDates: (): DueDate[] => {
        return [...currentDueDates];
    },
    
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

    getBookings: (): Booking[] => {
        return [...currentBookings];
    },

    getCommonAreas: (): CommonArea[] => {
        return [...commonAreas];
    },

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

    // This function simulates the file upload by loading new data
    loadNewResidentData: (): void => {
        currentResidents = [...newResidentsData];
        notifyListeners();
    },

    loadNewAccountStatusData: (): void => {
        currentAccountStatus = [...newAccountStatusDetailsData];
        notifyListeners();
    }
};