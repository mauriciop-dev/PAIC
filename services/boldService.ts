import { ConjuntoInfo } from '../types';

const PRICE_COP = 140000;
const CURRENCY = 'COP';

export const boldService = {
  redirectToCheckout: (conjuntoInfo: ConjuntoInfo) => {
    // En una aplicación real, esto haría una solicitud a un backend
    // para generar un enlace de pago seguro desde Bold.
    
    // Para esta simulación, asumimos que el usuario completó el pago
    // y es redirigido de vuelta a nuestra aplicación con un estado de éxito.
    
    const reference = `paic-${conjuntoInfo.id}-${Date.now()}`;
    
    // Esta es la URL a la que Bold redirigiría al usuario después de un pago exitoso.
    const redirectUrl = `${window.location.origin}${window.location.pathname}?payment_status=success&ref=${reference}`;

    console.log('Simulando flujo de pago...');
    console.log('En un entorno real, el usuario sería enviado a la pasarela de Bold.');
    console.log('Simulando retorno exitoso. Redirigiendo a:', redirectUrl);

    // Redirigimos directamente a la URL de éxito para completar el flujo simulado.
    window.location.href = redirectUrl;
  },
};
