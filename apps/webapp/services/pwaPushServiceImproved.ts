/**
 * Servicio de Push mejorado para PAIC
 * Maneja suscripciones y envío de notificaciones push
 */

import { supabase } from './supabaseClient';

export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
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
 * Suscribe el navegador a notificaciones push
 */
export async function subscribeToPushNotifications(userId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Verificar si ya está suscrito
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Suscribirse
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    if (subscription) {
      // Guardar en Supabase
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subscription: JSON.parse(JSON.stringify(subscription.toJSON()))
        })
      });

      return response.ok;
    }

    return false;
  } catch (error) {
    console.error('Error suscribiéndose a push:', error);
    return false;
  }
}

/**
 * Verifica el estado de suscripción
 */
export async function checkPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

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
  if (!('serviceWorker' in navigator)) {
    return false;
  }

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
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Envía notificación a través de Supabase Edge Function
 */
export async function sendPushNotificationToUsers(
  input: {
    conjuntoId: string;
    title: string;
    body: string;
    userIds?: string[];
    type?: string;
    url?: string;
  }
): Promise<{ sent: number; total: number }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-pwa-push', {
      body: input
    });

    if (error) {
      console.error('Error enviando notificación:', error);
      return { sent: 0, total: 0 };
    }

    return data || { sent: 0, total: 0 };
  } catch (error) {
    console.error('Error enviando notificación:', error);
    return { sent: 0, total: 0 };
  }
}

/**
 * Inicializa el servicio de push al cargar la app
 */
export async function initializePushService(userId: string): Promise<boolean> {
  const permission = await requestNotificationPermission();
  
  if (permission !== 'granted') {
    console.warn('Notificaciones denegadas');
    return false;
  }

  const subscribed = await subscribeToPushNotifications(userId);
  
  if (subscribed) {
    console.log('Push notifications inicializadas correctamente');
    // Actualizar badge a 0 al iniciar
    if ('setAppBadge' in navigator) {
      await navigator.setAppBadge(0);
    }
  }

  return subscribed;
}
