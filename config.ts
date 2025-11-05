// This file centralizes the Google Client ID for the application.
let googleClientId: string | undefined;

// Prioritize reading from `process.env` which seems to be how the platform provides variables.
// Check for both the Vite-prefixed name and the plain name.
if (typeof process !== 'undefined' && process.env) {
    // @ts-ignore
    googleClientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
}

// Fallback to Vite's standard `import.meta.env` if not found in process.env.
if (!googleClientId) {
    try {
        // @ts-ignore
        if (import.meta.env && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
            // @ts-ignore
            googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        }
    } catch (e) {
        // Silently fail if import.meta.env is not available.
    }
}

if (!googleClientId) {
    console.error("La variable de entorno VITE_GOOGLE_CLIENT_ID para la autenticación de Google no está configurada.");
}

// Provide an empty string as a fallback to prevent the app from crashing if the ID is missing.
// This allows the UI to render, even if Google Auth will fail.
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
    console.error("Las claves de API de Mercado Pago (Pública y Access Token) no están configuradas.");
}

export const MERCADO_PAGO_PUBLIC_KEY = (mpPublicKey || '') as string;
export const MERCADO_PAGO_ACCESS_TOKEN = (mpAccessToken || '') as string;
