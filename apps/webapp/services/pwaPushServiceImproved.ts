/**
 * Servicio de Push mejorado para PAIC - Versión robusta
 */

import { supabase } from './supabaseClient';

export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  if (!base64String) {
    throw new Error('VAPID_PUBLIC_KEY no configurada');
  }
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Verifica si el navegador soporta push
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Registra Service Worker con reintentos
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.error('Service Worker no soportado');
    return null;
  }

  try {
    // Unregister old SW first
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.unregister();
    }

    // Register new SW
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    console.log('✅ SW registrado:', registration.scope);
    return registration;
  } catch (error) {
    console.error('❌ Error registrando SW:', error);
    return null;
  }
}

/**
 * Suscribe el navegador a notificaciones push
 */
export async function subscribeToPushNotifications(userId: string, conjuntoId?: string): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported');
    return false;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error('❌ VAPID_PUBLIC_KEY no configurada en build');
    return false;
  }

  try {
    const registration = await registerServiceWorker();
    if (!registration) return false;

    // Wait for SW to be ready
    await navigator.serviceWorker.ready;

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Subscribe
      console.log('📡 Suscribiendo a push...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      console.log('✅ Suscripción creada');
    }

    if (subscription) {
      // Save to Supabase directly
      const { error } = await supabase
        .from('pwa_push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subscription.endpoint,
          subscription: subscription.toJSON(),
          conjunto_id: conjuntoId || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'endpoint'
        });

      if (error) {
        console.error('❌ Error guardando suscripción:', error);
        return false;
      }

      console.log('✅ Suscripción guardada en Supabase');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error en subscribeToPushNotifications:', error);
    return false;
  }
}

/**
 * Verifica el estado de suscripción
 */
export async function checkPushSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('Error verificando suscripción:', error);
    return false;
  }
}

/**
 * Cancela suscripción a notificaciones push
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error cancelando suscripción:', error);
    return false;
  }
}

/**
 * Solicita permisos de notificación
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';

  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Inicializa el servicio de push al cargar la app - VERSIÓN ROBUSTA
 */
export async function initializePushService(userId: string, conjuntoId?: string): Promise<boolean> {
  console.log('🚀 Inicializando push service para:', userId);
  
  const permission = await requestNotificationPermission();
  
  if (permission !== 'granted') {
    console.warn('⚠️ Permisos denegados:', permission);
    return false;
  }

  console.log('✅ Permisos concedidos');

  const subscribed = await subscribeToPushNotifications(userId, conjuntoId);
  
  if (subscribed) {
    console.log('✅ Push notifications inicializadas correctamente');
    // Actualizar badge a 0 al iniciar
    if ('setAppBadge' in navigator) {
      try {
        await navigator.setAppBadge(0);
      } catch (e) {
        console.warn('setAppBadge no soportado:', e);
      }
    }
  } else {
    console.error('❌ Falló suscripción push');
  }

  return subscribed;
}

/**
 * Envía notificación de prueba
 */
export async function sendTestNotification(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification('PAIC Test', {
    body: 'Las notificaciones funcionan correctamente',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png'
  });
}