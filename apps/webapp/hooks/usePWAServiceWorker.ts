// PAIC — Hook para registrar service worker y manejar push subscriptions
// Archivo: apps/webapp/hooks/usePWAServiceWorker.ts

import { useEffect, useState } from 'react';

// Helper para convertir la clave pública a Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
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

export function usePWAServiceWorker() {
  const [serviceWorker, setServiceWorker] = useState<ServiceWorker | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    // Registrar service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((sw) => {
          console.log('Service worker registrado:', sw);

          // Solicitar permisos de notificaciones
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              // Usa tu clave pública de VAPID de Google Cloud Console
              // Reemplaza esta clave con la real de tu proyecto
              const vapidPublicKey = 'BGyouNx4nHrquuFYl1yzEWNFy-I6wNkbWhVwuMrbvUX-NFDPW6qyfTzjSQr6KTNQFHbymqL2WYeIu-rf9gO7ZM';
              
              sw.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
              }).then((sub) => {
                setSubscription(sub);
                console.log('Push subscription establecido:', sub);
                
                // Aquí podrías enviar la subscription a tu backend para guardarla
                // Por ahora solo la guardamos en estado
              }).catch((err) => {
                console.error('Error al suscribirse a push:', err);
              });
            }
          });

          setServiceWorker(sw);
        })
        .catch((err) => console.error('Error al registrar service worker:', err));
    }
  }, []);

  return { serviceWorker, subscription };
}