// @paic/config - Configuración y constantes compartidas

// Dominios
export const DOMAINS = {
  webapp: 'app.paicai.com.co',
  marketing: 'paicai.com.co',
  usuarios: 'usuarios.paicai.com.co',
  docs: 'docs.paicai.com.co',
  seshat: 'seshat.paicai.com.co',
} as const;

// URLs base
export const BASE_URLS = {
  webapp: `https://${DOMAINS.webapp}`,
  marketing: `https://${DOMAINS.marketing}`,
  usuarios: `https://${DOMAINS.usuarios}`,
  docs: `https://${DOMAINS.docs}`,
  seshat: `https://${DOMAINS.seshat}`,
} as const;

// Rutas de la WebApp
export const WEBAPP_ROUTES = {
  home: '/',
  login: '/login',
  dashboard: '/dashboard',
  database: '/database',
  commonAreas: '/common-areas',
  finanzas: '/finanzas',
  comunicaciones: '/comunicaciones',
  archivos: '/archivos',
  seguridad: '/seguridad',
  dueDates: '/due-dates',
  pendingTasks: '/pending-tasks',
  settings: '/settings',
  onboarding: '/onboarding',
} as const;

// Configuración de la app
export const APP_CONFIG = {
  name: 'PAIC',
  fullName: 'Plataforma de Administración Inteligente de Copropiedades',
  version: '1.0.0',
  supportPhone: '3144897092',
  supportEmail: 'contacto@aiprodig.com',
  website: 'https://aiprodig.com',
} as const;

// Configuración de PWA
export const PWA_CONFIG = {
  name: 'PAIC',
  shortName: 'PAIC',
  themeColor: '#2563eb',
  backgroundColor: '#f4f6f9',
  display: 'standalone',
  orientation: 'portrait-primary',
} as const;

// Configuración de Mercado Pago
export const MP_CONFIG = {
  publicKeyEnv: 'VITE_MERCADO_PAGO_PUBLIC_KEY',
  plans: {
    Edificio: { monthly: 130000, annual: 1326000 },
    Copropiedad: { monthly: 240000, annual: 2448000 },
    Megaproyecto: { monthly: 380000, annual: 3876000 },
    Corporativo: { monthly: null, annual: null },
  },
} as const;

// Configuración de GA4
export const GA4_CONFIG = {
  measurementId: 'G-XHW9CWKTYY',
} as const;

// Configuración de Resend
export const RESEND_CONFIG = {
  fromName: 'Mauricio Pineda',
  fromEmail: 'contacto@aiprodig.com',
  replyTo: 'contacto@aiprodig.com',
} as const;

// Configuración de Seshat
export const SESHAT_CONFIG = {
  allowedEmails: ['hmauricio.pineda@gmail.com'],
  noindex: true,
} as const;

// Feature flags
export const FEATURE_FLAGS = {
  chatbot: true,
  reservations: true,
  pwa: true,
  analytics: true,
  emailDrip: false,
  agents: false,
} as const;

// Utilidades
export const isProduction = () => import.meta.env.PROD;
export const isDevelopment = () => import.meta.env.DEV;