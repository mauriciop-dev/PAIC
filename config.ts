// This file centralizes environment variables for the application.

// --- Mercado Pago Keys ---
let mpPublicKey: string | undefined;
let mpAccessToken: string | undefined;

if (typeof process !== 'undefined' && process.env) {
    // @ts-ignore
    mpPublicKey = process.env.VITE_MERCADO_PAGO_PUBLIC_KEY;
    // @ts-ignore
    mpAccessToken = process.env.VITE_MERCADO_PAGO_ACCESS_TOKEN;
}

if (!mpPublicKey || !mpAccessToken) {
     try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            mpPublicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;
            // @ts-ignore
            mpAccessToken = import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN;
        }
    } catch (e) {
        // Silently fail.
    }
}


if (!mpPublicKey || !mpAccessToken) {
    console.warn("Las claves de API de Mercado Pago (Pública y Access Token) no están configuradas en las variables de entorno VITE_... Las funciones de pago no estarán disponibles.");
}

export const MERCADO_PAGO_PUBLIC_KEY = (mpPublicKey || '') as string;
export const MERCADO_PAGO_ACCESS_TOKEN = (mpAccessToken || '') as string;