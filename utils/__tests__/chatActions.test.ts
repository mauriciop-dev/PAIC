import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadOptionsForKey, loadListForKey, executeAction } from '../chatActions';

const { apiServiceMock } = vi.hoisted(() => ({
  apiServiceMock: {
    fetchResidents: vi.fn(),
    fetchProviders: vi.fn(),
    fetchCommonAreas: vi.fn(),
    fetchDebtors: vi.fn(),
    addResident: vi.fn().mockResolvedValue(undefined),
    deleteResident: vi.fn().mockResolvedValue(undefined),
    createReservationFromChat: vi.fn().mockResolvedValue(undefined),
    updateReservation: vi.fn().mockResolvedValue(undefined),
    deleteReservation: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/apiService', () => ({
  apiService: apiServiceMock,
}));

describe('chatActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads residents as record options keyed by apartment', async () => {
    apiServiceMock.fetchResidents.mockResolvedValue([
      { apartment: '101', name: 'Ana', email: 'a@x.com', phone: '1' },
      { apartment: '102', name: 'Luis', email: 'l@x.com', phone: '2' },
    ]);
    const options = await loadOptionsForKey('c1', 'residents');
    expect(options).toHaveLength(2);
    expect(options[0].value).toBe('101');
    expect(options[0].label).toContain('Apto 101');
    expect(options[0].record.name).toBe('Ana');
  });

  it('loads areas by name for the reservation add form', async () => {
    apiServiceMock.fetchCommonAreas.mockResolvedValue([
      { id: 'a1', name: 'Salón Social', color: {} },
    ]);
    const options = await loadOptionsForKey('c1', 'areas-name');
    expect(options[0].value).toBe('Salón Social');
    expect(options[0].label).toBe('Salón Social');
  });

  it('returns empty options for unknown load keys', async () => {
    expect(await loadOptionsForKey('c1', 'nope')).toEqual([]);
  });

  it('executes resident-add via apiService', async () => {
    const msg = await executeAction('c1', 'resident-add', { apartment: '103', name: 'Ana' });
    expect(apiServiceMock.addResident).toHaveBeenCalledWith('c1', { apartment: '103', name: 'Ana', email: undefined, phone: undefined });
    expect(msg).toContain('Residente agregado');
  });

  it('executes resident-delete using the selected record', async () => {
    const record = { value: '101', label: 'Apto 101', record: { apartment: '101', name: 'Ana' } };
    const msg = await executeAction('c1', 'resident-delete', {}, record);
    expect(apiServiceMock.deleteResident).toHaveBeenCalledWith('c1', '101');
    expect(msg).toContain('eliminado');
  });

  it('executes reservation-add via createReservationFromChat', async () => {
    await executeAction('c1', 'reservation-add', { commonAreaName: 'Salón', apartment: '101', date: '2026-01-01', startTime: '10:00', endTime: '12:00' });
    expect(apiServiceMock.createReservationFromChat).toHaveBeenCalledWith('c1', {
      commonAreaName: 'Salón', apartment: '101', date: '2026-01-01', startTime: '10:00', endTime: '12:00',
    });
  });

  it('executes reservation-edit merging the selected record', async () => {
    const record = { value: 5, label: 'x', record: { id: 5, commonAreaId: 'a1', apartment: '101', date: '2026-01-01', startTime: '10:00', endTime: '12:00' } };
    await executeAction('c1', 'reservation-edit', { commonAreaId: 'a2', apartment: '101', date: '2026-02-01', startTime: '09:00', endTime: '11:00' }, record);
    expect(apiServiceMock.updateReservation).toHaveBeenCalledWith('c1', {
      id: 5, commonAreaId: 'a2', apartment: '101', date: '2026-02-01', startTime: '09:00', endTime: '11:00',
    });
  });

  it('executes reservation-delete using the record id', async () => {
    const record = { value: 7, label: 'x', record: { id: 7 } };
    await executeAction('c1', 'reservation-delete', {}, record);
    expect(apiServiceMock.deleteReservation).toHaveBeenCalledWith('c1', 7);
  });

  it('rejects unknown submit keys', async () => {
    await expect(executeAction('c1', 'nope', {})).rejects.toThrow('Acción no reconocida');
  });

  it('loads a debtor list payload', async () => {
    apiServiceMock.fetchDebtors.mockResolvedValue([{ apartment: '101', name: 'Ana', balance: 100000 }]);
    const payload = await loadListForKey('c1', 'debtors');
    expect(payload.columns).toEqual(['Apto', 'Nombre', 'Saldo']);
    expect(payload.rows[0][0]).toBe('101');
  });

  it('returns empty list payload for unknown list keys', async () => {
    expect(await loadListForKey('c1', 'nope')).toEqual({ columns: [], rows: [] });
  });
});
