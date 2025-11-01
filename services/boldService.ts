
import { ConjuntoInfo } from '../types';

const PRICE_COP = 140000;
const CURRENCY = 'COP';

export const boldService = {
  redirectToCheckout: (conjuntoInfo: ConjuntoInfo) => {
    // En una aplicación real, esto haría una solicitud a nuestro backend
    // para generar un enlace de pago seguro y de un solo uso desde Bold.
    // Para esta simulación, construiremos una URL de redirección verosímil.

    const reference = `paic-${conjuntoInfo.id}-${Date.now()}`;
    
    // La URL a la que Bold redirigirá al usuario después del pago.
    const redirectUrl = `${window.location.origin}${window.location.pathname}?payment_status=success&ref=${reference}`;

    // Construyendo una URL de pago simulada de Bold.
    // NOTA: Esta NO es una estructura de URL real de Bold. Es para demostración.
    const boldCheckoutUrl = new URL('https://pagos.bold.co/');
    boldCheckoutUrl.searchParams.set('referencia', reference);
    boldCheckoutUrl.searchParams.set('monto', PRICE_COP.toString());
    boldCheckoutUrl.searchParams.set('moneda', CURRENCY);
    boldCheckoutUrl.searchParams.set('email_comercio', conjuntoInfo.adminEmail);
    boldCheckoutUrl.searchParams.set('descripcion', `Suscripción Plan Pro - ${conjuntoInfo.name}`);
    boldCheckoutUrl.searchParams.set('url_redirect', redirectUrl);
    boldCheckoutUrl.searchParams.set('metodos_pago', 'NEQUI,DAVIPLATA,PSE,TARJETA_CREDITO,EFECTY');


    // Redirigir al usuario a la página de pago.
    window.location.href = boldCheckoutUrl.toString();
  },
};
