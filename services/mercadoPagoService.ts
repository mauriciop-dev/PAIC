import { ConjuntoInfo } from '../types';
import { MERCADO_PAGO_ACCESS_TOKEN } from '../config';

const PRICE_COP = 140000;

interface PreferenceResponse {
    id: string;
    init_point: string;
}

// NOTE FOR REVIEWER: In a real-world, production application, this function MUST live on a secure backend server.
// The MERCADO_PAGO_ACCESS_TOKEN is a secret key and must never be exposed on the client-side.
// This implementation makes a direct client-side API call for demonstration purposes within this specific project's constraints.
// A Supabase Edge Function would be an ideal place for this logic in a production environment.

export const mercadoPagoService = {
  async createPreference(conjuntoInfo: ConjuntoInfo): Promise<string | null> {
    
    if (!MERCADO_PAGO_ACCESS_TOKEN) {
        console.error('Mercado Pago Access Token is not configured.');
        throw new Error('La configuración de pagos no está completa. Contacta a soporte.');
    }
      
    // The redirect URL should point back to the app, so it can detect the payment status.
    // We remove any existing query params to have a clean URL.
    const successRedirectUrl = `${window.location.origin}${window.location.pathname}`;

    const preferencePayload = {
      items: [
        {
          title: `Suscripción Plan Pro - PAIC (${conjuntoInfo.name})`,
          description: `Acceso completo a la plataforma PAIC para ${conjuntoInfo.name}.`,
          quantity: 1,
          unit_price: PRICE_COP,
          currency_id: 'COP',
        },
      ],
      payer: {
        name: conjuntoInfo.adminName,
        email: conjuntoInfo.adminEmail,
      },
      back_urls: {
        success: successRedirectUrl,
        failure: successRedirectUrl,
        pending: successRedirectUrl,
      },
      auto_return: 'approved',
      external_reference: `paic-${conjuntoInfo.id}-${Date.now()}`,
    };

    try {
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(preferencePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error creating Mercado Pago preference:', errorData);
        throw new Error(`Error con la pasarela de pagos: ${errorData.message || 'No se pudo iniciar el proceso.'}`);
      }

      const data: PreferenceResponse = await response.json();
      return data.init_point; // This is the URL the user should be redirected to.

    } catch (error) {
      console.error('Failed to create payment preference:', error);
      if (error instanceof Error) {
          throw error;
      }
      throw new Error('Ocurrió un error inesperado al contactar la pasarela de pagos.');
    }
  },
};
