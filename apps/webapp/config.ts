let mpPublicKey: string | undefined;

try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        mpPublicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;
    }
} catch (e) {
}

if (!mpPublicKey) {
    console.warn("La clave pública de Mercado Pago no está configurada en VITE_MERCADO_PAGO_PUBLIC_KEY.");
}

export const MERCADO_PAGO_PUBLIC_KEY = (mpPublicKey || '') as string;
