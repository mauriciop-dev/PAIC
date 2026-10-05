import { supabase } from './pwaAuth';

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type PushSubscriptionState =
  | 'unsupported'
  | 'missing-vapid-key'
  | 'permission-default'
  | 'permission-denied'
  | 'subscribed'
  | 'not-subscribed';

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isRunningAsInstalledPwa(): boolean {
  if (typeof window === 'undefined') return false;
  const standaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(standaloneMedia || iosStandalone);
}

export function isLikelyIos(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function buildNotificationPayload(input: { title: string; body?: string; url?: string; icon?: string; badge?: string }) {
  return {
    title: input.title || 'PAIC Residentes',
    body: input.body || '',
    url: input.url || '/',
    icon: input.icon || '/logo-paic.png',
    badge: input.badge || '/logo-paic.png',
  };
}

function decodeKey(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) throw new Error('Este navegador no tiene service workers disponibles.');
  return navigator.serviceWorker.ready;
}

export async function getPushSubscriptionState(): Promise<PushSubscriptionState> {
  if (!isPushSupported()) return 'unsupported';
  if (!vapidPublicKey) return 'missing-vapid-key';
  if (Notification.permission === 'denied') return 'permission-denied';
  if (Notification.permission === 'default') return 'permission-default';
  const registration = await getServiceWorkerRegistration();
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? 'subscribed' : 'not-subscribed';
}

export async function subscribeToPush(userId: string) {
  if (!supabase || !vapidPublicKey || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Las notificaciones Push no están configuradas en este entorno.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('El permiso de notificaciones fue rechazado.');
  const registration = await getServiceWorkerRegistration();
  const subscription = await registration.pushManager.getSubscription()
    || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(vapidPublicKey) });
  const json = subscription.toJSON();
  const { error } = await supabase.from('pwa_push_subscriptions').upsert({ user_id: userId, endpoint: json.endpoint, subscription: json, updated_at: new Date().toISOString() }, { onConflict: 'endpoint' });
  if (error) throw error;
  return json;
}

export async function unsubscribeFromPush(userId: string) {
  if (!supabase || !('serviceWorker' in navigator)) return;
  const registration = await getServiceWorkerRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await supabase.from('pwa_push_subscriptions').delete().eq('user_id', userId).eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe();
}
