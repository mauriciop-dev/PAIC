import React from 'react';
import { Card, ProgressRing } from '@paic/ui';
import { Icon } from '@paic/ui';

export function MetricasView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Métricas de Plataforma</h1>
        <p className="text-gray-500 mt-1">KPIs y salud del negocio en tiempo real</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Usuarios Activos (DAU)', value: '3,420', trend: '+5.2%', icon: 'activity', color: 'blue' },
          { label: 'Usuarios Activos (MAU)', value: '8,920', trend: '+12%', icon: 'users', color: 'green' },
          { label: 'Tasa Retención D30', value: '68%', trend: '+3pp', icon: 'refresh-cw', color: 'purple' },
          { label: 'NPS Promedio', value: '72', trend: '+4 pts', icon: 'star', color: 'amber' },
        ].map((stat, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="mt-1 text-sm text-green-600">{stat.trend} vs mes anterior</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}>
                <Icon name={stat.icon} className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Uso por Módulo (Últimos 30 días)</h2>
          <div className="space-y-3">
            {[
              { modulo: 'Seguridad', uso: 94, color: 'red' },
              { modulo: 'Áreas Comunes', uso: 87, color: 'blue' },
              { modulo: 'Comunicaciones', uso: 82, color: 'green' },
              { modulo: 'Finanzas', uso: 71, color: 'amber' },
              { modulo: 'Archivos', uso: 56, color: 'purple' },
              { modulo: 'Vencimientos', uso: 48, color: 'orange' },
              { modulo: 'Tareas', uso: 35, color: 'indigo' },
              { modulo: 'PWA Residentes', uso: 91, color: 'teal' },
            ].map((m, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{m.modulo}</span>
                  <span className="text-gray-500">{m.uso}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full bg-${m.color}-500`} style={{ width: `${m.uso}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Salud Técnica</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Uptime API', value: '99.97%', icon: 'check-circle', color: 'green' },
              { label: 'Latencia P95', value: '142ms', icon: 'zap', color: 'blue' },
              { label: 'Error Rate', value: '0.03%', icon: 'alert-triangle', color: 'red' },
              { label: 'Realtime Conn.', value: '1,234', icon: 'wifi', color: 'purple' },
            ].map((m, i) => (
              <Card key={i} className="p-4 text-center">
                <Icon name={m.icon} className={`w-8 h-8 text-${m.color}-600 mx-auto mb-2`} />
                <p className="text-2xl font-bold text-gray-900">{m.value}</p>
                <p className="text-sm text-gray-500">{m.label}</p>
              </Card>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Crecimiento Mensual</h2>
        <div className="h-64 flex items-end justify-around gap-2 px-4">
          {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((mes, i) => {
            const height = [45, 52, 48, 61, 67, 72, 69, 78, 82, 85, 88, 92][i];
            return (
              <div key={mes} className="flex-1 flex flex-col items-center">
                <div className={`w-full bg-blue-500 rounded-t transition-all duration-500`} style={{ height: `${height}%` }} />
                <span className="text-xs text-gray-500 mt-2">{mes}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}