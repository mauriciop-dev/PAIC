/**
 * Pruebas unitarias del servicio de notificaciones PAIC
 * Valida la lógica de sendNotification, getUnreadCount, markAsRead, subscribePush
 * Sin depender de Supabase real (usa mocks de vitest)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock simple de Supabase - las implementaciones se configuran en cada test
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

import { supabase } from '../supabaseClient';
import {
  sendNotification,
  getUnreadCount,
  markAsRead,
  subscribePush,
  type NotificationData,
  type NotificationType,
} from '../notificationService';

const mockFrom = vi.mocked(supabase.from);
const mockChannel = vi.mocked(supabase.channel);
const mockRemoveChannel = vi.mocked(supabase.removeChannel);

const validData: NotificationData = {
  conjuntoId: 'conjunto-001',
  tipo: 'comunicado',
  titulo: 'Nuevo comunicado',
  cuerpo: 'Cuerpo de prueba',
  userId: null,
  referenciaRecurso: null,
  tipoRecurso: null,
  url: '/comunicados/001',
};

/**
 * Crea mock para sendNotification: from().insert().select().single() -> Promise
 */
function createSendMock(finalValue: any) {
  const mockSingle = vi.fn().mockResolvedValue(finalValue);
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
  mockFrom.mockReturnValue({ insert: mockInsert } as any);
  return { mockInsert, mockSelect, mockSingle };
}

/**
 * Crea mock chain para getUnreadCount:
 * from().select().eq().eq() -> Promise.resolve({ count, error })
 * Usa un objeto encadenable con then() para ser awaitable
 */
function createCountMock(countValue: number, error: any = null) {
  const chain: any = {
    select: function () { return chain; },
    eq: function () { return chain; },
    or: function () { return chain; },
    then: function (resolve: any) { resolve({ count: countValue, error }); },
  };
  mockFrom.mockReturnValue(chain as any);
  return chain;
}

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('sendNotification', () => {
    it('debe insertar una notificación y retornar success: true', async () => {
      const mockSend = vi.fn().mockResolvedValue(undefined);
      mockChannel.mockReturnValue({ on: vi.fn(), send: mockSend, subscribe: vi.fn() } as any);
      createSendMock({ data: { id: 'notif-001' }, error: null });

      const result = await sendNotification(validData);

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'new-notification',
        payload: expect.objectContaining({
          tipo: 'comunicado',
          titulo: 'Nuevo comunicado',
          conjuntoId: 'conjunto-001',
          id: 'notif-001',
        }),
      });
    });

    it('debe retornar success: false cuando falla la inserción', async () => {
      createSendMock({ data: null, error: { message: 'RLS violation' } });

      const result = await sendNotification(validData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('RLS violation');
    });

    it('debe publicar en canal realtime tras insertar', async () => {
      const mockSend = vi.fn().mockResolvedValue(undefined);
      mockChannel.mockReturnValue({ on: vi.fn(), send: mockSend, subscribe: vi.fn() } as any);
      createSendMock({ data: { id: 'notif-001' }, error: null });

      await sendNotification(validData);

      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'new-notification',
        payload: expect.objectContaining({
          tipo: 'comunicado',
          titulo: 'Nuevo comunicado',
          conjuntoId: 'conjunto-001',
          id: 'notif-001',
        }),
      });
    });

    it('debe manejar error de red y retornar success: false', async () => {
      const mockSingle = vi.fn().mockRejectedValue(new Error('Network error'));
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      mockFrom.mockReturnValue({ insert: mockInsert } as any);

      const result = await sendNotification(validData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('debe usar userId cuando se especifica destinatario específico', async () => {
      createSendMock({ data: { id: 'notif-002' }, error: null });

      await sendNotification({ ...validData, userId: 'usuario-002' });

      const insertCalls = mockFrom.mock.results[0]?.value?.insert?.mock.calls || [];
      expect(insertCalls[0]?.[0]?.user_id).toBe('usuario-002');
    });
  });

  describe('getUnreadCount', () => {
    it('debe retornar el contador de no leídas por conjunto y tipo', async () => {
      createCountMock(5, null);

      const count = await getUnreadCount('conjunto-001', 'comunicado');

      expect(count).toBe(5);
    });

    it('debe filtrar por userId cuando se proporciona', async () => {
      createCountMock(2, null);

      const count = await getUnreadCount('conjunto-001', 'pqr', 'usuario-002');

      expect(count).toBe(2);
    });

    it('debe retornar 0 cuando hay error', async () => {
      createCountMock(0, { message: 'Error' });

      const count = await getUnreadCount('conjunto-001', 'comunicado');

      expect(count).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('debe marcar notificaciones como leídas por IDs', async () => {
      const mockIn = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ in: mockIn });
      mockFrom.mockReturnValue({ update: mockUpdate } as any);

      await markAsRead(['notif-001', 'notif-002']);

      expect(mockUpdate).toHaveBeenCalledWith({ leido: true });
      expect(mockIn).toHaveBeenCalledWith('id', ['notif-001', 'notif-002']);
    });

    it('debe manejar error silenciosamente', async () => {
      const mockIn = vi.fn().mockResolvedValue({ error: { message: 'DB error' } });
      const mockUpdate = vi.fn().mockReturnValue({ in: mockIn });
      mockFrom.mockReturnValue({ update: mockUpdate } as any);

      await expect(markAsRead(['notif-001'])).resolves.toBeUndefined();
    });
  });

  describe('subscribePush', () => {
    it('debe guardar suscripción push en BD', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ upsert: mockUpsert } as any);

      const result = await subscribePush('usuario-001', {
        endpoint: 'https://push.example.com/sub',
        keys: { p256dh: 'key1', auth: 'key2' },
      });

      expect(result).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: 'usuario-001',
          endpoint: 'https://push.example.com/sub',
          subscription: {
            endpoint: 'https://push.example.com/sub',
            keys: { p256dh: 'key1', auth: 'key2' },
          },
          updated_at: expect.any(String),
        },
        { onConflict: 'endpoint' }
      );
    });

    it('debe retornar false cuando falla el guardado', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: { message: 'Constraint violation' } });
      mockFrom.mockReturnValue({ upsert: mockUpsert } as any);

      const result = await subscribePush('usuario-001', {
        endpoint: 'https://push.example.com/sub',
        keys: { p256dh: 'key1', auth: 'key2' },
      });

      expect(result).toBe(false);
    });
  });
});
