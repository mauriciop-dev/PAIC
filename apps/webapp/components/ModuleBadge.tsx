// PAIC — Componente de badge modular
// Archivo: apps/webapp/components/ModuleBadge.tsx

import React from 'react';
import { getUnreadCount } from '../utils/notifications';

interface ModuleBadgeProps {
  tipo: 'comunicado' | 'reserva' | 'pqr' | 'documento' | 'votacion' | 'directorio' | 'porteria' | 'visitante';
  conjuntoId: string;
  label?: string;
}

export function ModuleBadge({ tipo, conjuntoId, label }: ModuleBadgeProps) {
  const [count, setCount] = React.useState<number>(0);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Actualizar cada 30 segundos para detectar nuevas notificaciones
    const interval = setInterval(async () => {
      const unread = await getUnreadCount(conjuntoId, tipo);
      setCount(unread);
    }, 30000);
    return () => clearInterval(interval);
  }, [conjuntoId, tipo]);

  // Si no está montado, no mostrar badge
  if (!mounted) return <span>{label}</span>;

  return (
    <div className="inline-flex items-center">
      {label && <span className="mr-1">{label}</span>}
      {count > 0 && (
        <span className="text-xs bg-red-600 text-white rounded-full px-2 py-0.5 ml-1">
          {count}
        </span>
      )}
    </div>
  );
}