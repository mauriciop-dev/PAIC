import React from 'react';
import { Card, Badge, ProgressRing } from '@paic/ui';
import { Icon } from '@paic/ui';
import { MetricasPlataforma } from '../../types';

interface AdminDashboardProps {
  metricas?: MetricasPlataforma;
}

export function AdminDashboard({ metricas }: AdminDashboardProps) {
  const m = metricas || {
    totalConjuntos: 127,
    conjuntosActivos: 98,
    conjuntosTrial: 15,
    conjuntosPro: 83,
    totalUsuarios: 12450,
    usuariosActivosHoy: 3420,
    usuariosActivosMes: 8920,
    ingresosMRR: 45670000,
    churnRate: 2.3,
    alertasBugs: 3,
    alertasSeguridad: 1,
  };

  const stats = [
    {
      label: 'Conjuntos Totales',
      value: m.totalConjuntos.toLocaleString(),
      icon: 'building',
      color: 'blue',
      trend: '+12% vs mes anterior',
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
      trend: '3 por expirar',
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
      trend: '27.5% de penetración',
      trendUp: true,
    },
    {
      label: 'MRR',
      value: `$${(m.ingresosMRR / 1000000).toFixed(1)}M`,
      icon: 'dollar-sign',
      color: 'emerald',
      trend: `Churn ${m.churnRate}%`,
      trendUp: m.churnRate < 5,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Plataforma</h1>
          <p className="text-gray-500 mt-1">Visión general del estado de PAIC</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success" className="text-sm">Sistema Operativo</Badge>
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
            <Badge variant={m.alertasBugs > 0 ? 'warning' : 'success'}>
              {m.alertasBugs + m.alertasSeguridad} activas
            </Badge>
          </div>
          <div className="space-y-3">
            {m.alertasBugs > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <Icon name="alert-triangle" className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-red-800">{m.alertasBugs} Bug{m.alertasBugs !== 1 ? 's' : ''} reportado{m.alertasBugs !== 1 ? 's' : ''}</p>
                  <p className="text-sm text-red-600">Revisar panel de logs para detalles</p>
                </div>
                <Button variant="outline" size="sm">Ver</Button>
              </div>
            )}
            {m.alertasSeguridad > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Icon name="shield" className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-amber-800">{m.alertasSeguridad} Alerta{m.alertasSeguridad !== 1 ? 's' : ''} de seguridad</p>
                  <p className="text-sm text-amber-600">Intentos de acceso sospechosos</p>
                </div>
                <Button variant="outline" size="sm">Ver</Button>
              </div>
            )}
            {m.alertasBugs === 0 && m.alertasSeguridad === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Icon name="check-circle" className="w-12 h-12 text-green-400 mx-auto mb-2" />
                <p>No hay alertas activas</p>
              </div>
            )}
          </div>
        </Card>

        {/* Conjuntos por Plan */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Plan</h2>
          <div className="space-y-4">
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