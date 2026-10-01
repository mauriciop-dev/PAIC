import React from 'react';
import { Card, Badge, Button } from '@paic/ui';
import { Icon } from '@paic/ui';
import { useMetricasPlataforma, useAlertasBugs, useSuscripcionesProximas } from '../../hooks/useAdminData';
import { MetricasPlataforma } from '../../types';

export function AdminDashboard() {
  const { data: metricas, loading: loadingMetricas, error: errorMetricas, refetch: refetchMetricas } = useMetricasPlataforma();
  const { data: alertasBugs, loading: loadingAlertas } = useAlertasBugs();
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

  const alertasBugsCount = alertasBugs?.filter(a => a.severidad === 'critica' || a.severidad === 'alta').length || 0;
  const alertasSeguridadCount = 0; // TODO: query real

  const stats = [
    {
      label: 'Conjuntos Totales',
      value: m.totalConjuntos.toLocaleString(),
      icon: 'building',
      color: 'blue',
      trend: loadingMetricas ? 'Cargando...' : '+12% vs mes anterior',
      trendUp: true,
    },
    {
      label: 'Activos (Pro)',
      value: m.conjuntosPro.toLocaleString(),
      icon: 'check-circle',
      color: 'green',
      trend: '+5 esta semana',
      trendUp: true,
    },
    {
      label: 'En Prueba (Trial)',
      value: m.conjuntosTrial.toLocaleString(),
      icon: 'clock',
      color: 'amber',
      trend: `${m.conjuntosTrial > 0 ? m.conjuntosTrial : 0} activos`,
      trendUp: false,
    },
    {
      label: 'Usuarios Totales',
      value: m.totalUsuarios.toLocaleString(),
      icon: 'users',
      color: 'purple',
      trend: '+234 esta semana',
      trendUp: true,
    },
    {
      label: 'Activos Hoy',
      value: m.usuariosActivosHoy.toLocaleString(),
      icon: 'activity',
      color: 'indigo',
      trend: m.totalUsuarios > 0 ? `${Math.round((m.usuariosActivosHoy / m.totalUsuarios) * 1000) / 10}% penetración` : '—',
      trendUp: true,
    },
    {
      label: 'MRR',
      value: m.ingresosMRR > 0 ? `$${(m.ingresosMRR / 1000000).toFixed(1)}M` : '$0',
      icon: 'dollar-sign',
      color: 'emerald',
      trend: `Churn ${m.churnRate}%`,
      trendUp: m.churnRate < 5,
    },
  ];

  if (loadingMetricas && !metricas) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard de Plataforma</h1>
            <p className="text-gray-500 mt-1">Visión general del estado de PAIC</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-1/3 mt-2" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (errorMetricas) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-center gap-3">
          <Icon name="alert-triangle" className="w-6 h-6 text-red-600" />
          <div>
            <p className="font-medium text-red-800">Error cargando métricas</p>
            <p className="text-sm text-red-600">{errorMetricas}</p>
          </div>
          <Button variant="outline" onClick={refetchMetricas} className="ml-auto">
            Reintentar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Plataforma</h1>
          <p className="text-gray-500 mt-1">Visión general del estado de PAIC</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success" className="text-sm">Sistema Operativo</Badge>
          <Button variant="ghost" size="sm" onClick={refetchMetricas}>
            <Icon name="refresh-cw" className="w-4 h-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className={`mt-1 text-xs ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trend}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}>
                <Icon name={stat.icon} className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Alerts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Alertas Activas</h2>
            <Badge variant={(alertasBugsCount + alertasSeguridadCount) > 0 ? 'warning' : 'success'}>
              {alertasBugsCount + alertasSeguridadCount} activas
            </Badge>
          </div>
          <div className="space-y-3">
            {alertasBugsCount > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <Icon name="alert-triangle" className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-red-800">{alertasBugsCount} Bug{alertasBugsCount !== 1 ? 's' : ''} crítico{alertasBugsCount !== 1 ? 's' : ''}</p>
                  <p className="text-sm text-red-600">Revisar panel de logs para detalles</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/logs'}>Ver</Button>
              </div>
            )}
            {alertasSeguridadCount > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Icon name="shield" className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-amber-800">{alertasSeguridadCount} Alerta{alertasSeguridadCount !== 1 ? 's' : ''} de seguridad</p>
                  <p className="text-sm text-amber-600">Intentos de acceso sospechosos</p>
                </div>
                <Button variant="outline" size="sm">Ver</Button>
              </div>
            )}
            {(alertasBugsCount === 0 && alertasSeguridadCount === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Icon name="check-circle" className="w-12 h-12 text-green-400 mx-auto mb-2" />
                <p>No hay alertas activas</p>
              </div>
            )}
            {/* Suscripciones por vencer */}
            {subsProximas && subsProximas.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-medium text-gray-700 mb-3">Suscripciones por vencer (30 días)</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {subsProximas.slice(0, 5).map((sub, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                      <span className="font-medium text-gray-900 truncate pr-2">{sub.nombre}</span>
                      <Badge 
                        variant={sub.estado === 'vencido' ? 'danger' : sub.estado === 'urgente' ? 'danger' : sub.estado === 'trial' ? 'warning' : 'success'}
                        className="text-xs"
                      >
                        {sub.estado === 'vencido' ? 'Vencida' : sub.estado === 'urgente' ? `${sub.diasRestantes}d` : sub.estado === 'trial' ? 'Trial' : 'OK'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Conjuntos por Plan + Funnel Trial */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Plan</h2>
          <div className="space-y-4 mb-6">
            {[
              { label: 'Pro', value: m.conjuntosPro, total: m.conjuntosActivos, color: 'green' },
              { label: 'Trial', value: m.conjuntosTrial, total: m.conjuntosActivos, color: 'amber' },
              { label: 'Free/Expirados', value: m.totalConjuntos - m.conjuntosActivos, total: m.totalConjuntos, color: 'gray' },
            ].map((plan, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{plan.label}</span>
                  <span className="text-gray-500">{plan.value} / {plan.total}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-${plan.color}-500 transition-all duration-500`}
                    style={{ width: `${plan.total > 0 ? (plan.value / plan.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Funnel Trial 14 días - Resumen */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Funnel Trial 14 días (Últimos 30 días)</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-blue-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">{metricas?.totalUsuarios || 0 > 0 ? '—' : '—'}</p>
                <p className="text-xs text-gray-500">Visitantes Landing</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <p className="text-2xl font-bold text-purple-600">{m.conjuntosTrial}</p>
                <p className="text-xs text-gray-500">Trials Activados</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <p className="text-2xl font-bold text-green-600">{m.conjuntosPro}</p>
                <p className="text-xs text-gray-500">Convertidos a Pro</p>
              </div>
            </div>
            <div className="mt-3 text-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                Conversión Trial→Pro: {m.conjuntosTrial > 0 ? Math.round((m.conjuntosPro / m.conjuntosTrial) * 1000) / 10 : 0}%
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Nuevo Conjunto', icon: 'plus', href: '/conjuntos?new=1', color: 'blue' },
            { label: 'Revisar Logs', icon: 'file-text', href: '/logs', color: 'gray' },
            { label: 'Gestionar Usuarios', icon: 'users', href: '/usuarios', color: 'purple' },
            { label: 'Configurar Stripe', icon: 'settings', href: '/configuracion', color: 'indigo' },
          ].map((action, i) => (
            <a
              key={i}
              href={action.href}
              className={`flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-${action.color}-300 hover:bg-${action.color}-50 transition-colors`}
            >
              <div className={`w-10 h-10 rounded-lg bg-${action.color}-100 flex items-center justify-center`}>
                <Icon name={action.icon} className={`w-5 h-5 text-${action.color}-600`} />
              </div>
              <span className="font-medium text-gray-900">{action.label}</span>
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}