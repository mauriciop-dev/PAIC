import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mercadoPagoService } from '../mercadoPagoService';

const mockSession = { session: { access_token: 'test-token' } };

vi.mock('../supabaseClient', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(() => Promise.resolve({ data: mockSession })),
        },
    },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('mercadoPagoService', () => {
    const conjuntoInfo = {
        id: '123',
        name: 'Test Conjunto',
        nit: '123456789',
        address: 'Calle 123',
        adminName: 'Admin',
        adminEmail: 'admin@test.com',
        adminPhone: '1234567890',
        subscriptionPlan: 'Paid' as const,
        planPrice: 50000,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns init_point on successful preference creation', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ init_point: 'https://mp.com/pay/ABC' }),
        });

        const result = await mercadoPagoService.createPreference(conjuntoInfo);
        expect(result).toBe('https://mp.com/pay/ABC');
    });

    it('sends the request with correct headers and body', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ init_point: 'https://mp.com/pay/ABC' }),
        });

        await mercadoPagoService.createPreference(conjuntoInfo);

        expect(mockFetch).toHaveBeenCalledWith(
            'https://vgmwlzhlpehuvfkgqzja.supabase.co/functions/v1/create-mp-preference',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token',
                },
                body: JSON.stringify({ conjuntoInfo }),
            }
        );
    });

    it('throws error when response is not ok', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Invalid request' }),
        });

        await expect(mercadoPagoService.createPreference(conjuntoInfo)).rejects.toThrow(
            'Error con la pasarela de pagos: Invalid request'
        );
    });

    it('throws error when no active session', async () => {
        const { supabase } = await import('../supabaseClient');
        (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: { session: null },
        });

        await expect(mercadoPagoService.createPreference(conjuntoInfo)).rejects.toThrow(
            'No hay sesión activa'
        );
    });
});
