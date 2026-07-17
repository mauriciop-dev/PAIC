import { describe, it, expect } from 'vitest';
import { Tab, UserRole, ExpenseCategory, IncomeCategory } from '../types';

describe('Tab enum', () => {
    it('has expected keys and values', () => {
        expect(Tab.Dashboard).toBe('Centro de Control');
        expect(Tab.Database).toBe('Base de datos');
        expect(Tab.Finanzas).toBe('Finanzas');
        expect(Tab.DueDates).toBe('Vencimientos');
    });
});

describe('UserRole enum', () => {
    it('has expected values', () => {
        expect(UserRole.Trial).toBe('trial');
        expect(UserRole.Subscriber).toBe('subscriber');
        expect(UserRole.Admin).toBe('admin');
    });
});

describe('ExpenseCategory enum', () => {
    it('has expected values', () => {
        expect(ExpenseCategory.Servicios).toBe('Servicios');
        expect(ExpenseCategory.Mantenimiento).toBe('Mantenimiento');
        expect(ExpenseCategory.Nomina).toBe('Nómina');
    });
});

describe('IncomeCategory enum', () => {
    it('has expected values', () => {
        expect(IncomeCategory.CuotaAdmin).toBe('Cuota de Administración');
        expect(IncomeCategory.Multas).toBe('Multas');
    });
});
