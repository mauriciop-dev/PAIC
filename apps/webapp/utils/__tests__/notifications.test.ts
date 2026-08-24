import { describe, it, expect } from 'vitest';
import { humanizeDueDateLabel } from '../notifications';

describe('humanizeDueDateLabel', () => {
    it('converts "Pago X" to "Cuota de X Pendiente" for a far pending item', () => {
        expect(humanizeDueDateLabel('Pago Vigilancia', { overdue: false, dueSoon: false })).toBe('Cuota de Vigilancia Pendiente');
    });

    it('prepends "Recordatorio:" for items due soon', () => {
        expect(humanizeDueDateLabel('Pago Aseadoras', { overdue: false, dueSoon: true })).toBe('Recordatorio: Cuota de Aseadoras');
    });

    it('prepends "Vencido:" for overdue items', () => {
        expect(humanizeDueDateLabel('Pago Vigilancia', { overdue: true, dueSoon: false })).toBe('Vencido: Cuota de Vigilancia');
    });

    it('appends " Pendiente" to non-pago labels', () => {
        expect(humanizeDueDateLabel('Impuesto Predial', { overdue: false, dueSoon: false })).toBe('Impuesto Predial Pendiente');
    });

    it('keeps non-pago labels on overdue/due soon prefixes', () => {
        expect(humanizeDueDateLabel('Impuesto Predial', { overdue: true, dueSoon: false })).toBe('Vencido: Impuesto Predial');
        expect(humanizeDueDateLabel('Impuesto Predial', { overdue: false, dueSoon: true })).toBe('Recordatorio: Impuesto Predial');
    });

    it('handles empty input gracefully', () => {
        expect(humanizeDueDateLabel('', { overdue: false, dueSoon: false })).toBe('Pendiente');
        expect(humanizeDueDateLabel('', { overdue: true, dueSoon: false })).toBe('Vencido: Pago');
    });
});
