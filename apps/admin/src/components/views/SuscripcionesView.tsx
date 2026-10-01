import React from 'react';
import { Card, Badge, ProgressRing } from '@paic/ui';
import { Icon } from '@paic/ui';

export function SuscripcionesView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suscripciones y Facturación</h1>
        <p className="text-gray-500 mt-1">Gestión de planes, pagos y ciclos de facturación</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'MRR Actual', value: '$45.67M', icon: 'dollar-sign', color: 'green' },
          { label: 'ARR Proyectado', value: '$548M', icon: 'trending-up', color: 'blue' },
          { label: 'Churn Rate', value: '2.3%', icon: 'alert-triangle', color: 'red' },
          { label: 'LTV Promedio', value: '$1.2M', icon: 'users', color: 'purple' },
        ].map((stat, i) => (
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
          {[
            { label: 'Activas (Pro)', count: 83, color: 'green', progress: 65 },
            { label: 'En Trial', count: 15, color: 'amber', progress: 12 },
            { label: 'Por Renovar (30 días)', count: 8, color: 'orange', progress: 6 },
            { label: 'Expiradas / Free', count: 21, color: 'gray', progress: 17 },
          ].map((item, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{item.label}</span>
                <span className="text-gray-500">{item.count} conjuntos</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full bg-${item.color}-500`} style={{ width: `${item.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Próximos Vencimientos</h2>
        <div className="space-y-3">
          {[
            { nombre: 'Residencial El Prado', plan: 'Pro', vence: '2025-01-15', monto: '$1.2M/mes', estado: 'ok' },
            { nombre: 'Torres del Norte', plan: 'Pro', vence: '2024-11-20', monto: '$2.5M/mes', estado: 'urgente' },
            { nombre: 'Condominio Las Flores', plan: 'Trial', vence: '2025-01-01', monto: 'Trial', estado: 'trial' },
          ].map((sub, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900">{sub.nombre}</p>
                <p className="text-sm text-gray-500">{sub.plan} • Vence: {new Date(sub.vence).toLocaleDateString('es-CO')}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{sub.monto}</p>
                <Badge variant={sub.estado === 'urgente' ? 'danger' : sub.estado === 'trial' ? 'warning' : 'success'}>
                  {sub.estado === 'urgente' ? 'Por Renovar' : sub.estado === 'trial' ? 'En Trial' : 'Al Día'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}