import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  outline: 'border border-gray-300 bg-transparent text-gray-700',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  dot = false,
}) => (
  <span
    className={`
      inline-flex items-center gap-1.5 font-medium rounded-full
      ${variantStyles[variant]} ${sizeStyles[size]} ${className}
    `}
  >
    {dot && (
      <span
        className={`
          w-1.5 h-1.5 rounded-full
          ${variant === 'success' ? 'bg-green-500' :
            variant === 'warning' ? 'bg-yellow-500' :
            variant === 'error' ? 'bg-red-500' :
            variant === 'info' ? 'bg-blue-500' : 'bg-gray-500'}
        `}
      />
    )}
    {children}
  </span>
);

export interface StatusBadgeProps {
  status: string;
  statusMap?: Record<string, BadgeVariant>;
  className?: string;
}

const defaultStatusMap: Record<string, BadgeVariant> = {
  pendiente: 'warning',
  pendiente_pago: 'warning',
  pagado: 'success',
  vencido: 'error',
  aprobado: 'success',
  rechazado: 'error',
  en_proceso: 'info',
  completado: 'success',
  cancelado: 'error',
  activo: 'success',
  inactivo: 'default',
  ingreso: 'success',
  salida: 'info',
  entregado: 'success',
  no_entregado: 'warning',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  statusMap = defaultStatusMap,
  className = '',
}) => {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  const variant = statusMap[normalized] || 'default';
  const label = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');

  return <Badge variant={variant} size="sm" className={className}>{label}</Badge>;
};
