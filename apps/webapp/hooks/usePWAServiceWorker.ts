// PAIC — Hook para registrar service worker y manejar su ciclo de vida
// Archivo: apps/webapp/hooks/usePWAServiceWorker.ts

import { useEffect, useState } from 'react';

export function usePWAServiceWorker() {
  const [serviceWorker, setServiceWorker] = useState<ServiceWorker | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Registrar service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((sw) => {
          console.log('Service worker registrado:', sw);
          setServiceWorker(sw);
          setError(null);
        })
        .catch((err) => {
          console.error('Error al registrar service worker:', err);
          setError('Failed to register service worker');
          setServiceWorker(null);
        });
    }
  }, []);

  return { serviceWorker, error };
}