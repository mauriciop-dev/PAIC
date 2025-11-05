// This file centralizes environment variables for the application.

let googleClientId: string | undefined;

// Attempt to read from process.env first, which is common in Node-like environments and some bundlers.
// Check for multiple common names.
if (typeof process !== 'undefined' && process.env) {
    // @ts-ignore
    googleClientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
}

// Fallback to Vite's standard `import.meta.env` if not found in process.env.
if (!googleClientId) {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        }
    } catch (e) {
        // Silently fail if import.meta.env is not available.
    }
}


if (!googleClientId) {
    console.warn("La variable de entorno VITE_GOOGLE_CLIENT_ID para la autenticación de Google no está configurada. El inicio de sesión de administrador no funcionará.");
}

// Provide an empty string as a fallback to prevent the app from crashing if the ID is missing.
export const GOOGLE_CLIENT_ID = (googleClientId || '') as string;


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
