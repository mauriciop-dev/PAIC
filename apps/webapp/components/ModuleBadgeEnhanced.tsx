/**
 * Componente ModuleBadge mejorado con tiempo real y badges de app
 */

import React, { useEffect, useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';

interface ModuleBadgeProps {
  tipo: 'comunicado' | 'reserva' | 'pqr' | 'documento' | 'votacion' | 'directorio' | 'porteria' | 'visitante' | 'paquete';
  conjuntoId: string;
  userId?: string | null;
  label?: string;
  showBadge?: boolean;
  className?: string;
}

export function ModuleBadgeEnhanced({
  tipo,
  conjuntoId,
  userId,
  label,
  showBadge = true,
  className = ''
}: ModuleBadgeProps) {
  const { getCountForType } = useNotifications(conjuntoId, userId);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(getCountForType(tipo));
  }, [tipo, conjuntoId, userId, getCountForType]);

  // Actualizar badge de la app cuando cambie el contador
  useEffect(() => {
    if ('setAppBadge' in navigator && count > 0) {
      navigator.setAppBadge(count);
    } else if ('setAppBadge' in navigator) {
      navigator.setAppBadge(0);
    }
  }, [count]);

  if (!showBadge) {
    return label ? <span className={className}>{label}</span> : null;
  }

  return (
    <div className={`inline-flex items-center ${className}`}>
      {label && <span>{label}</span>}
      <span
        data-testid={`badge-${tipo}`}
        className={`ml-2 text-[10px] bg-red-600 text-white rounded-full px-2 py-0.5 font-medium min-w-[20px] text-center ${count === 0 ? 'hidden' : ''}`}
      >
        {count > 99 ? '99+' : count}
      </span>
    </div>
  );
}

/**
 * Hook para usar badges en módulos sin necesidad de mostrar el componente
 */
export function useModuleBadge(tipo: ModuleBadgeProps['tipo'], conjuntoId: string, userId?: string | null) {
  const { getCountForType, markAllAsRead } = useNotifications(conjuntoId, userId);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(getCountForType(tipo));
  }, [tipo, conjuntoId, userId, getCountForType]);

  const markAsRead = () => markAllAsRead(tipo);

  return { count, markAsRead };
}
