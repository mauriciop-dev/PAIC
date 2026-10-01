import React from 'react';
import { Card, Badge } from '@paic/ui';
import { Icon } from '@paic/ui';
import { useMetricasPlataforma, useSuscripcionesProximas } from '../../hooks/useAdminData';

export function SuscripcionesView() {
  const { data: metricas, loading: loadingMetricas } = useMetricasPlataforma();
  const { data: subsProximas, loading: loadingSubs } = useSuscripcionesProximas(30);

  const m = metricas || {
    totalConjuntos: 0,
    conjuntosActivos: 0,
    conjuntosTrial: 0,
    conjuntosPro: 0,
    totalUsuarios: 0,
    usuariosActivosHoy: 0,
    usuariosActivosMes: 0,
    ingresosMRR: 0,
    churnRate: 0,
    alertasBugs: 0,
    alertasSeguridad: 0,
  };

  if (loadingMetricas && !metricas) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suscripciones y Facturación</h1>
          <p className="text-gray-500 mt-1">Gestión de planes, pagos y ciclos de facturación</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const arr = m.ingresosMRR * 12;

  const stats = [
    {
      label: 'MRR Actual',
      value: m.ingresosMRR > 0 ? `$${(m.ingresosMRR / 1000000).toFixed(1)}M` : '$0',
      icon: 'dollar-sign',
      color: 'green',
    },
    {
      label: 'ARR Proyectado',
      value: arr > 0 ? `$${(arr / 1000000).toFixed(1)}M` : '$0',
      icon: 'trending-up',
      color: 'blue',
    },
    {
      label: 'Churn Rate',
      value: `${m.churnRate.toFixed(1)}%`,
      icon: 'alert-triangle',
      color: m.churnRate > 5 ? 'red' : 'amber',
    },
    {
      label: 'LTV Promedio',
      value: m.totalUsuarios > 0 && m.churnRate > 0 
        ? `$${Math.round((m.ingresosMRR / m.totalUsuarios) * (12 / (m.churnRate / 100)) / 1000000 * 10) / 10}M`
        : '$0',
      icon: 'users',
      color: 'purple',
    },
  ];

  const estadosSuscripcion = [
    { label: 'Activas (Pro)', count: m.conjuntosPro, color: 'green', total: m.conjuntosActivos },
    { label: 'En Trial', count: m.conjuntosTrial, color: 'amber', total: m.conjuntosActivos },
    { label: 'Por Renovar (30 días)', count: subsProximas?.filter(s => s.estado === 'urgente' || s.estado === 'vencido').length || 0, color: 'orange', total: m.conjuntosActivos },
    { label: 'Expiradas / Free', count: m.totalConjuntos - m.conjuntosActivos, color: 'gray', total: m.totalConjuntos },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suscripciones y Facturación</h1>
        <p className="text-gray-500 mt-1">Gestión de planes, pagos y ciclos de facturación</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}>
                <Icon name={stat.icon} className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Conjuntos por Estado de Suscripción</h2>
        <div className="space-y-4">
          {estadosSuscripcion.map((item, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{item.label}</span>
                <span className="text-gray-500">{item.count} conjuntos</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full bg-${item.color}-500`} style={{ width: `${item.total > 0 ? (item.count / item.total) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Próximos Vencimientos (30 días)</h2>
        {loadingSubs ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : subsProximas && subsProximas.length > 0 ? (
          <div className="space-y-3">
            {subsProximas.map((sub, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">{sub.nombre}</p>
                  <p className="text-sm text-gray-500">{sub.plan} • Vence: {new Date(sub.vence).toLocaleDateString('es-CO')}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${sub.monto > 0 ? (sub.monto / 1000000).toFixed(1) + 'M/mes' : 'Trial'}</p>
                  <Badge variant={sub.estado === 'vencido' ? 'danger' : sub.estado === 'urgente' ? 'danger' : sub.estado === 'trial' ? 'warning' : 'success'}>
                    {sub.estado === 'vencido' ? 'Vencida' : sub.estado === 'urgente' ? `${sub.diasRestantes}d` : sub.estado === 'trial' ? 'Trial' : 'Al Día'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Icon name="calendar" className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>No hay suscripciones por vencer en los próximos 30 días</p>
          </div>
        )}
      </Card>
    </div>
  );
}