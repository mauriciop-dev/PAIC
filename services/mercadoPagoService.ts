import { ConjuntoInfo } from '../types';
import { supabase } from './supabaseClient';

const EDGE_FUNCTION_URL = 'https://vgmwlzhlpehuvfkgqzja.supabase.co/functions/v1/create-mp-preference';

interface PreferenceResponse {
    init_point: string;
}

export const mercadoPagoService = {
  async createPreference(conjuntoInfo: ConjuntoInfo): Promise<string | null> {

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No hay sesión activa. Inicia sesión nuevamente.');
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ conjuntoInfo }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error creating Mercado Pago preference:', errorData);
        throw new Error(`Error con la pasarela de pagos: ${errorData.error || 'No se pudo iniciar el proceso.'}`);
      }

      const data: PreferenceResponse = await response.json();
      return data.init_point;

    } catch (error) {
      console.error('Failed to create payment preference:', error);
      if (error instanceof Error) {
          throw error;
      }
      throw new Error('Ocurrió un error inesperado al contactar la pasarela de pagos.');
    }
  },
};
