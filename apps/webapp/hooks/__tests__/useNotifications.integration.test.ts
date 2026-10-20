/**
 * Pruebas de integración para el hook useNotifications
 * Valida la suscripción a Realtime, contadores de badge y marcación como leída
 * Usa mocks de Supabase canal y consultas
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotifications } from '../useNotifications';

// Mock simple de Supabase
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

import { supabase } from '../../services/supabaseClient';

const mockFrom = vi.mocked(supabase.from);
const mockChannel = vi.mocked(supabase.channel);
const mockRemoveChannel = vi.mocked(supabase.removeChannel);

/**
 * Crea un mock chain encadenable para consultas Supabase:
 * from().select().eq().eq().order().limit() -> Promise.resolve({ data, error })
 */
function createQueryMock(data: any[] = [], count = 0) {
  const chain: any = {
    select: function () { return chain; },
    eq: function () { return chain; },
    or: function () { return chain; },
    order: function () { return chain; },
    limit: function () { return Promise.resolve({ data, error: null, count }); },
  };
  mockFrom.mockReturnValue(chain as any);
  return chain;
}

/**
 * Crea un mock para canal Realtime:
 * channel().on().on().subscribe()
 */
function createChannelMock() {
  const channelObj: any = {
    on: function () { return channelObj; },
    send: vi.fn(),
    subscribe: vi.fn(),
  };
  mockChannel.mockReturnValue(channelObj as any);
  return channelObj;
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('debe cargar notificaciones iniciales y contar por tipo', () => {
    const notifications = [
      { id: 'n1', conjunto_id: 'c1', user_id: null, tipo: 'comunicado', titulo: 'Com1', cuerpo: 'C1', leido: false, creado_at: '2026-01-01' },
      { id: 'n2', conjunto_id: 'c1', user_id: null, tipo: 'comunicado', titulo: 'Com2', cuerpo: 'C2', leido: false, creado_at: '2026-01-02' },
      { id: 'n3', conjunto_id: 'c1', user_id: null, tipo: 'pqr', titulo: 'PQR1', cuerpo: 'P1', leido: false, creado_at: '2026-01-03' },
    ];
    createQueryMock(notifications, notifications.length);
    createChannelMock();

    const { result } = renderHook(() => useNotifications('c1'));

    expect(result.current.loading).toBe(false);
    expect(result.current.notifications).toHaveLength(3);
    expect(result.current.unreadCounts.comunicado).toBe(2);
    expect(result.current.unreadCounts.pqr).toBe(1);
    expect(result.current.getCountForType('comunicado')).toBe(2);
  });

  it('debe filtrar notificaciones por userId cuando se proporciona', () => {
    const notifications = [
      { id: 'n1', conjunto_id: 'c1', user_id: null, tipo: 'comunicado', titulo: 'Masiva', cuerpo: '', leido: false, creado_at: '2026-01-01' },
      { id: 'n2', conjunto_id: 'c1', user_id: 'usuario-001', tipo: 'pqr', titulo: 'Personal', cuerpo: '', leido: false, creado_at: '2026-01-02' },
      { id: 'n3', conjunto_id: 'c1', user_id: 'usuario-002', tipo: 'pqr', titulo: 'Otro usuario', cuerpo: '', leido: false, creado_at: '2026-01-03' },
    ];
    createQueryMock(notifications, notifications.length);
    createChannelMock();

    const { result } = renderHook(() => useNotifications('c1', 'usuario-001'));

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.getCountForType('comunicado')).toBe(1);
    expect(result.current.getCountForType('pqr')).toBe(1);
  });

  it('debe suscribirse al canal de Realtime del conjunto', () => {
    createChannelMock();
    createQueryMock([], 0);

    renderHook(() => useNotifications('c1'));

    expect(mockChannel).toHaveBeenCalledWith('notifications:c1');
    expect(mockFrom).toHaveBeenCalled();
  });

  it('debe limpiar el canal al desmontar', () => {
    createChannelMock();
    createQueryMock([], 0);

    const { unmount } = renderHook(() => useNotifications('c1'));
    unmount();

    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('debe actualizar contadores al recibir nueva notificación por Realtime', () => {
    const channelObj = createChannelMock();
    createQueryMock([], 0);

    const { result } = renderHook(() => useNotifications('c1'));

    // Obtener el handler de INSERT registrado en mockOn
    const insertHandler = channelObj.on.mock.calls.find(
      (call: any) => call?.[0]?.event === 'INSERT'
    )?.[1];

    const insertPayload = {
      eventType: 'INSERT',
      new: {
        id: 'n-nuevo',
        conjunto_id: 'c1',
        user_id: null,
        tipo: 'reserva',
        titulo: 'Nueva reserva',
        cuerpo: 'Reserva de salón',
        leido: false,
        creado_at: '2026-01-05',
        url: '/reservas/nuevo',
      },
    };

    act(() => {
      insertHandler(insertPayload);
    });

    expect(result.current.getCountForType('reserva')).toBe(1);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].id).toBe('n-nuevo');
  });

  it('debe decrementar contador al marcar como leída', async () => {
    const notifications = [
      { id: 'n1', conjunto_id: 'c1', user_id: null, tipo: 'comunicado', titulo: 'Com1', cuerpo: '', leido: false, creado_at: '2026-01-01' },
    ];
    createQueryMock(notifications, 1);
    createChannelMock();

    const { result } = renderHook(() => useNotifications('c1'));
    expect(result.current.getCountForType('comunicado')).toBe(1);

    await act(async () => {
      await result.current.markAsRead('n1');
    });

    expect(result.current.getCountForType('comunicado')).toBe(0);
  });
});
