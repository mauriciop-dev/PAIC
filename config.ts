// This file centralizes the Google Client ID for the application.
// IMPORTANT: For Vercel, this value is managed as an environment variable (`VITE_GOOGLE_CLIENT_ID`).
// For local development in AI Studio, you MUST replace the placeholder below with your actual Client ID.

// FIX: Made environment variable access more robust by using `import.meta?.env?.` to prevent crashes
// when `import.meta` or its `env` property are not defined. This ensures the app loads reliably.
export const GOOGLE_CLIENT_ID = import.meta?.env?.VITE_GOOGLE_CLIENT_ID || '455424573082-up66nitqpmmogj54abql5cprhn2mfjfi.apps.googleusercontent.com';