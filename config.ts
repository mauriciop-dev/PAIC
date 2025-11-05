// This file centralizes the Google Client ID for the application.
// @ts-ignore
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!googleClientId) {
    console.error("La variable de entorno VITE_GOOGLE_CLIENT_ID para la autenticación de Google no está configurada.");
}

// Provide an empty string as a fallback to prevent the app from crashing if the ID is missing.
// This allows the UI to render, even if Google Auth will fail.
export const GOOGLE_CLIENT_ID = (googleClientId || '') as string;


// --- Mercado Pago Keys ---
// FIX: Switched from `process.env` to `import.meta.env` to correctly read client-side
// environment variables in a Vite project. This is the standard and secure way Vite
// exposes variables prefixed with `VITE_` to the frontend bundle.
// @ts-ignore
const mpPublicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;
// @ts-ignore
const mpAccessToken = import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN;


if (!mpPublicKey || !mpAccessToken) {
    console.error("Las claves de API de Mercado Pago (Pública y Access Token) no están configuradas en las variables de entorno VITE_...");
}

export const MERCADO_PAGO_PUBLIC_KEY = (mpPublicKey || '') as string;
export const MERCADO_PAGO_ACCESS_TOKEN = (mpAccessToken || '') as string;