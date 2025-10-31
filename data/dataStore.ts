import { Resident, AccountStatus, Booking } from '../types';
import { 
    residentsData as initialResidents, 
    accountStatusDetailsData as initialAccountStatus,
    newResidentsData,
    newAccountStatusDetailsData
} from './mockData';

type Listener = () => void;
const listeners: Set<Listener> = new Set();

// This is a simple in-memory store to ensure both UI and services access the same data state.
let currentResidents: Resident[] = [...initialResidents];
let currentAccountStatus: AccountStatus[] = [...initialAccountStatus];
let currentBookings: Booking[] = [
    { day: 5, time: '12pm-4pm', event: 'BBQ', user: 'Apt 101' },
    { day: 12, time: '6pm-9pm', event: 'Salón Social', user: 'Apt 202' },
    { day: 18, time: '9am-10am', event: 'Gimnasio', user: 'Apt 301' },
    { day: 18, time: '5pm-7pm', event: 'BBQ', user: 'Apt 102' },
    { day: 25, time: 'Todo el día', event: 'Salón Social', user: 'Admin' },
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

    getBookings: (): Booking[] => {
        return [...currentBookings];
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