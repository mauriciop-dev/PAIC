// This file centralizes the Google Client ID for the application.
let googleClientId: string | undefined;

// Prioritize reading from `process.env` which seems to be how the platform provides variables.
if (typeof process !== 'undefined' && process.env) {
    // @ts-ignore
    googleClientId = process.env.VITE_GOOGLE_CLIENT_ID;
}

// Fallback to Vite's standard `import.meta.env`.
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