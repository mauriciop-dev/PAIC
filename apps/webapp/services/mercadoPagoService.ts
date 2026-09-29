import { ConjuntoInfo } from '../types';
import { supabase } from './supabaseClient';

const EDGE_FUNCTION_URL = 'https://vgmwlzhlpehuvfkgqzja.supabase.co/functions/v1/create-mp-preference';
const SUBSCRIPTION_FUNCTION_URL = 'https://vgmwlzhlpehuvfkgqzja.supabase.co/functions/v1/create-mp-subscription';

interface PreferenceResponse {
    init_point: string;
}

const getToken = async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
        throw new Error('No hay sesión activa. Inicia sesión nuevamente.');
    }
    return token;
};

const postEdgeFunction = async (url: string, body: unknown): Promise<any> => {
    const token = await getToken();
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Edge function error:', url, errorData);
        throw new Error(`Error con la pasarela de pagos: ${errorData.error || 'No se pudo iniciar el proceso.'}`);
    }

    return response.json();
};

export const mercadoPagoService = {
  async createSubscription(
    conjuntoInfo: ConjuntoInfo,
    planName: string,
    billing: 'monthly' | 'annual'
  ): Promise<PreferenceResponse | null> {
    try {
      return await postEdgeFunction(SUBSCRIPTION_FUNCTION_URL, {
        conjuntoId: conjuntoInfo.id,
        planName,
        billing,
      });
    } catch (error) {
      console.error('Failed to create subscription:', error);
      if (error instanceof Error) {
          throw error;
      }
      throw new Error('Ocurrió un error inesperado al contactar la pasarela de pagos.');
    }
  },

  async createPreference(conjuntoInfo: ConjuntoInfo, planName?: string, planPrice?: number, billing?: 'monthly' | 'annual'): Promise<string | null> {

    try {
      const data = await postEdgeFunction(EDGE_FUNCTION_URL, { conjuntoInfo, planName, planPrice, billing });
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
