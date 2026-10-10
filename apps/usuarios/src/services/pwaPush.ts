import { supabase } from './pwaAuth';

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
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

export async function subscribeToPush(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Este dispositivo no soporta notificaciones Push.');
  }
  if (!vapidPublicKey) {
    throw new Error('Falta configurar la variable VITE_VAPID_PUBLIC_KEY en Vercel.');
  }
  if (!supabase) {
    throw new Error('Supabase no está configurado.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('El permiso de notificaciones fue denegado en el navegador.');
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeKey(vapidPublicKey)
  });

  const json = subscription.toJSON();
  const pushData = {
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh || '',
    auth: json.keys?.auth || '',
    subscription: json,
    updated_at: new Date().toISOString()
  };

  // Upsert into push_subscriptions (user's Supabase table) with fallback to pwa_push_subscriptions
  let { error } = await supabase.from('push_subscriptions').upsert(pushData, { onConflict: 'endpoint' });
  if (error) {
    const res = await supabase.from('pwa_push_subscriptions').upsert(pushData, { onConflict: 'endpoint' });
    error = res.error;
  }
  if (error) throw error;
}

export async function unsubscribeFromPush(userId: string) {
  if (!supabase || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', subscription.endpoint);
  await supabase.from('pwa_push_subscriptions').delete().eq('user_id', userId).eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe();
}
