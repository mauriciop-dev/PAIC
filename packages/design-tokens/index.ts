export const designTokens = {
  colors: {
    primary: {
      DEFAULT: '#2563EB', // Blue 600
      hover: '#1D4ED8',   // Blue 700
      light: '#EFF6FF',   // Blue 50
      dark: '#1E40AF',    // Blue 800
    },
    secondary: {
      DEFAULT: '#475569', // Slate 600
      light: '#F8FAFC',   // Slate 50
    },
    surface: {
      canvas: '#F9FAFB',  // Gray 50
      card: '#FFFFFF',
      subtle: '#F3F4F6',  // Gray 100
      border: '#E5E7EB',  // Gray 200
      borderHover: '#D1D5DB', // Gray 300
    },
    text: {
      primary: '#111827',   // Gray 900
      secondary: '#4B5563', // Gray 600
      muted: '#9CA3AF',     // Gray 400
      inverted: '#FFFFFF',
    },
    status: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
  },
  borderRadius: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem', // 24px (Bento clean enterprise cards)
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    bento: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
    hover: '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
    elevated: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
  },
} as const;

export type DesignTokens = typeof designTokens;
