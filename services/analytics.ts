declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

const GA_ID = 'G-XHW9CWKTYY';

function gtag(...args: any[]) {
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
    window.gtag(...args);
  }
}

export const analytics = {
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
};
