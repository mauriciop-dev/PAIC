// PAIC — Agregar servicio de notificaciones push a PWA del administrador
// Agregar este código en apps/webapp/App.tsx en el useEffect de inicialización

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

function usePWAServiceWorker() {
  const [serviceWorker, setServiceWorker] = useState<ServiceWorker | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Registrar service worker
    if ('serviceWorker' in navigator) {
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        const msg = 'VITE_VAPID_PUBLIC_KEY no está configurada en variables de entorno';
        console.error(msg);
        setError(msg);
        return;
      }

      navigator.serviceWorker.register('/sw.js')
        .then((sw) => {
          console.log('Service worker registrado:', sw);

          // Solicitar permisos de notificaciones
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              sw.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
              }).then((sub) => {
                setSubscription(sub);
                console.log('Push subscription establecido:', sub);
              }).catch((err) => {
                console.error('Error al suscribirse a push:', err);
                setError(err.message);
              });
            } else {
              console.warn('Permiso de notificaciones denegado');
            }
          });

          setServiceWorker(sw);
        })
        .catch((err) => {
          console.error('Error al registrar service worker:', err);
          setError(err.message);
        });
    }
  }, []);

  return { serviceWorker, subscription, error };
}

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

export default usePWAServiceWorker;