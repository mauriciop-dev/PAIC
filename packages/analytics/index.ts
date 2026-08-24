// @paic/analytics - Analytics y tracking compartido (GA4)

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

const GA_ID = 'G-XHW9CWKTYY';

function gtag(...args: any[]) {
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
    window.gtag(...args);
  }
}

function initGA() {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
}

export const analytics = {
  init: initGA,

  setUserId(userId: string | null) {
    if (userId) {
      gtag('config', GA_ID, { user_id: userId });
    } else {
      gtag('config', GA_ID, { user_id: undefined });
    }
  },

  trackPageView(pageTitle: string) {
    gtag('event', 'page_view', {
      page_title: pageTitle,
      page_location: window.location.href,
    });
  },

  trackLogin(method: 'google' | 'demo' | 'internal', userType: 'demo' | 'trial' | 'subscriber' | 'admin' | 'internal') {
    gtag('event', 'login', { method, user_type: userType });
  },

  trackSignUp(method: 'google' | 'demo', userType: 'demo' | 'trial') {
    gtag('event', 'sign_up', { method, user_type: userType });
  },

  trackSectionView(section: string, userRole: string) {
    gtag('event', 'section_view', { section, user_role: userRole });
  },

  trackFeature(feature: string, action: string, label?: string) {
    gtag('event', 'feature_usage', { feature, action, label });
  },

  trackSubscription(from: string, to: string) {
    gtag('event', 'subscription_change', { from, to });
  },

  trackOnboarding(action: 'started' | 'completed' | 'skipped') {
    gtag('event', 'onboarding', { action });
  },

  trackError(errorType: string, description: string) {
    gtag('event', 'app_error', { error_type: errorType, description });
  },

  trackUTM() {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source') || params.get('source');
    if (utmSource) {
      gtag('event', 'traffic_source', {
        source: utmSource,
        medium: params.get('utm_medium') || 'direct',
        campaign: params.get('utm_campaign') || '',
      });
    }
  },

  // Eventos específicos de PAIC
  trackPWAInstall() {
    gtag('event', 'pwa_install');
  },

  trackDemoUse(module: string) {
    gtag('event', 'demo_use', { module });
  },

  trackChatbotMessage(action: 'sent' | 'received', module?: string) {
    gtag('event', 'chatbot_interaction', { action, module });
  },

  trackReservation(action: 'created' | 'cancelled' | 'modified', area?: string) {
    gtag('event', 'reservation', { action, area });
  },

  trackPayment(action: 'initiated' | 'completed' | 'failed', plan?: string, amount?: number) {
    gtag('event', 'payment', { action, plan, amount });
  },
};
