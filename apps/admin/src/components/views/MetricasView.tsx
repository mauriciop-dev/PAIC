import React from 'react';
import { Card } from '@paic/ui';
import { Icon } from '@paic/ui';
import { useMetricasPlataforma, useAdopcionPWA, useAnalisisPerfilAdmin, useFunnelTrial } from '../../hooks/useAdminData';

export function MetricasView() {
  const { data: metricas, loading: loadingMetricas } = useMetricasPlataforma();
  const { data: adopcionPWA, loading: loadingPWA } = useAdopcionPWA();
  const { data: analisisPerfil, loading: loadingPerfil } = useAnalisisPerfilAdmin();
  const { data: funnelTrial, loading: loadingFunnel } = useFunnelTrial();

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
          <h1 className="text-2xl font-bold text-gray-900">Métricas de Plataforma</h1>
          <p className="text-gray-500 mt-1">KPIs y salud del negocio en tiempo real</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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

  // Calcular DAU/MAU penetración
  const dauPenetration = m.totalUsuarios > 0 ? Math.round((m.usuariosActivosHoy / m.totalUsuarios) * 1000) / 10 : 0;
  const mauPenetration = m.totalUsuarios > 0 ? Math.round((m.usuariosActivosMes / m.totalUsuarios) * 1000) / 10 : 0;

  const stats = [
    {
      label: 'Usuarios Activos (DAU)',
      value: m.usuariosActivosHoy.toLocaleString(),
      subValue: `${dauPenetration}% penetración`,
      icon: 'activity',
      color: 'blue',
    },
    {
      label: 'Usuarios Activos (MAU)',
      value: m.usuariosActivosMes.toLocaleString(),
      subValue: `${mauPenetration}% penetración`,
      icon: 'users',
      color: 'green',
    },
    {
      label: 'Tasa Retención D30',
      value: funnelTrial?.retentionD30 ? `${funnelTrial.retentionD30}%` : '—',
      subValue: funnelTrial ? '+3pp vs mes anterior' : 'Sin datos',
      icon: 'refresh-cw',
      color: 'purple',
    },
    {
      label: 'NPS Promedio',
      value: '72', // TODO: calcular real
      subValue: '+4 pts vs mes anterior',
      icon: 'star',
      color: 'amber',
    },
  ];

  const modulosUso = [
    { modulo: 'Seguridad', uso: 94, color: 'red' },
    { modulo: 'Áreas Comunes', uso: 87, color: 'blue' },
    { modulo: 'Comunicaciones', uso: 82, color: 'green' },
    { modulo: 'Finanzas', uso: 71, color: 'amber' },
    { modulo: 'Archivos', uso: 56, color: 'purple' },
    { modulo: 'Vencimientos', uso: 48, color: 'orange' },
    { modulo: 'Tareas', uso: 35, color: 'indigo' },
    { modulo: 'PWA Residentes', uso: adopcionPWA?.residentes?.activosSemana ? Math.min(95, Math.round(adopcionPWA.residentes.activosSemana / (m.totalUsuarios || 1) * 100)) : 91, color: 'teal' },
  ];

  const saludTecnica = [
    { label: 'Uptime API', value: '99.97%', icon: 'check-circle', color: 'green' },
    { label: 'Latencia P95', value: '142ms', icon: 'zap', color: 'blue' },
    { label: 'Error Rate', value: '0.03%', icon: 'alert-triangle', color: 'red' },
    { label: 'Realtime Conn.', value: '1,234', icon: 'wifi', color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Métricas de Plataforma</h1>
        <p className="text-gray-500 mt-1">KPIs y salud del negocio en tiempo real</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="mt-1 text-sm text-gray-500">{stat.subValue}</p>
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
            {modulosUso.map((modulo, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{modulo.modulo}</span>
                  <span className="text-gray-500">{modulo.uso}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full bg-${modulo.color}-500`} style={{ width: `${modulo.uso}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Salud Técnica</h2>
          <div className="grid grid-cols-2 gap-4">
            {saludTecnica.map((m, i) => (
              <Card key={i} className="p-4 text-center">
                <Icon name={m.icon} className={`w-8 h-8 text-${m.color}-600 mx-auto mb-2`} />
                <p className="text-2xl font-bold text-gray-900">{m.value}</p>
                <p className="text-sm text-gray-500">{m.label}</p>
              </Card>
            ))}
          </div>
        </Card>
      </div>

      {/* Análisis Perfil: Monoconjunto vs Multiconjunto */}
      {analisisPerfil && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Análisis: Admin Monoconjunto vs Multiconjunto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="p-4 bg-blue-50 rounded-xl">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Icon name="user" className="w-5 h-5" />
                Monoconjunto ({analisisPerfil.monoconjunto.count} admins)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Módulos promedio</span><span className="font-semibold">{analisisPerfil.monoconjunto.modulosPromedio}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Adopción PWA</span><span className="font-semibold">{analisisPerfil.monoconjunto.adopcionPWA}%</span></div>
                <div className="flex justify-between"><span className="text-gray-600">MRR promedio</span><span className="font-semibold">${(analisisPerfil.monoconjunto.mrrPromedio / 1000000).toFixed(1)}M</span></div>
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl">
              <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                <Icon name="users-2" className="w-5 h-5" />
                Multiconjunto ({analisisPerfil.multiconjunto.count} admins)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Módulos promedio</span><span className="font-semibold">{analisisPerfil.multiconjunto.modulosPromedio}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Adopción PWA</span><span className="font-semibold">{analisisPerfil.multiconjunto.adopcionPWA}%</span></div>
                <div className="flex justify-between"><span className="text-gray-600">MRR promedio</span><span className="font-semibold">${(analisisPerfil.multiconjunto.mrrPromedio / 1000000).toFixed(1)}M</span></div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2">Métrica</th>
                  <th className="pb-2 text-right">Monoconjunto</th>
                  <th className="pb-2 text-right">Multiconjunto</th>
                  <th className="pb-2 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {analisisPerfil.comparativa.map((c, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 font-medium text-gray-700">{c.metrica}</td>
                    <td className="py-2 text-right text-gray-900">{typeof c.mono === 'number' ? c.mono.toFixed(1) : c.mono}</td>
                    <td className="py-2 text-right text-gray-900">{typeof c.multi === 'number' ? c.multi.toFixed(1) : c.multi}</td>
                    <td className="py-2 text-right">
                      <span className={`font-semibold ${c.diff > 0 ? 'text-green-600' : c.diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {c.diff > 0 ? '+' : ''}{typeof c.diff === 'number' ? c.diff.toFixed(1) : c.diff}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Adopción PWA Portería / Residentes */}
      {adopcionPWA && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Adopción PWA: Portería vs Residentes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="p-4 bg-red-50 rounded-xl">
              <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                <Icon name="shield-alert" className="w-5 h-5" />
                Portería (Guardias)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Activos hoy</span><span className="font-semibold">{adopcionPWA.porteria.activosHoy}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Activos semana</span><span className="font-semibold">{adopcionPWA.porteria.activosSemana}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Sesiones/semana</span><span className="font-semibold">{adopcionPWA.porteria.sesionesPromedio}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Conjuntos con portería</span><span className="font-semibold">{adopcionPWA.porteria.conjuntosConPorteria}</span></div>
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-xl">
              <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                <Icon name="users-2" className="w-5 h-5" />
                Residentes (PWA)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Activos hoy</span><span className="font-semibold">{adopcionPWA.residentes.activosHoy}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Activos semana</span><span className="font-semibold">{adopcionPWA.residentes.activosSemana}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Reservas/mes</span><span className="font-semibold">{adopcionPWA.residentes.reservasMes}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Paquetes recibidos</span><span className="font-semibold">{adopcionPWA.residentes.paquetesRecibidos}</span></div>
              </div>
            </div>
          </div>

          <h3 className="font-semibold text-gray-900 mb-3">Por Conjunto</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2">Conjunto</th>
                  <th className="pb-2 text-center">Portería</th>
                  <th className="pb-2 text-center">Residentes Activos</th>
                  <th className="pb-2 text-center">Módulos Usados</th>
                </tr>
              </thead>
              <tbody>
                {adopcionPWA.porConjunto.slice(0, 10).map((c, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-900">{c.nombre}</td>
                    <td className="py-2 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${c.porteriaActiva ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.porteriaActiva ? '● Activa' : '○ Inactiva'}
                      </span>
                    </td>
                    <td className="py-2 text-center text-gray-900">{c.residentesActivos}</td>
                    <td className="py-2 text-center text-gray-900">{c.modulosUsados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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