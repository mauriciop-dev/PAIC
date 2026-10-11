// PAIC — Agregar servicio de notificaciones push a PWA del administrador
// Agregar este código en apps/webapp/App.tsx en el useEffect de inicialización

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

function usePWAServiceWorker() {
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
              sw.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                  'BJqgBW6Wt9mXQJr3kD5G6H7I8J9K0L1M2N3O4P5Q6R7S8T9U0V1W2X3Y4Z5'
                ),
              }).then((sub) => {
                setSubscription(sub);
                console.log('Push subscription establecido:', sub);
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