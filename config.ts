// This file centralizes the Google Client ID for the application.
// IMPORTANT: For Vercel, this value is managed as an environment variable (`VITE_GOOGLE_CLIENT_ID`).
// For local development in AI Studio, you MUST replace the placeholder below with your actual Client ID.

// FIX: Switched to process.env to ensure compatibility with the execution environment,
// resolving the critical application loading failure.
// @ts-ignore - Assuming process.env is available in the execution environment.
export const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || '455424573082-up66nitqpmmogj54abql5cprhn2mfjfi.apps.googleusercontent.com';