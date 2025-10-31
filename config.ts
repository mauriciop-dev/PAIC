// This file centralizes the Google Client ID for the application.
// It reads the client ID from Vite's environment variables.
// FIX: Use process.env to avoid TypeScript errors with import.meta.env.
export const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;