import React, { useState } from 'react';
import { Card, Badge, Input, Button, Select } from '@paic/ui';
import { Icon } from '@paic/ui';
import { ConjuntoAdmin } from '../../types';
import { useConjuntos } from '../../hooks/useAdminData';

export function ConjuntosView() {
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');
  const [pagina, setPagina] = useState(1);

  const { data, loading, error, refetch } = useConjuntos({
    busqueda: search,
    plan: filterPlan,
    estado: filterEstado,
    pagina,
    porPagina: 20,
  });

  const getEstadoBadge = (estado: ConjuntoAdmin['estado']) => {
    switch (estado) {
      case 'activo': return { variant: 'success' as const, label: 'Activo' };
      case 'suspendido': return { variant: 'danger' as const, label: 'Suspendido' };
      case 'pendiente': return { variant: 'warning' as const, label: 'Pendiente' };
      case 'expirado': return { variant: 'default' as const, label: 'Expirado' };
    }
  };

  const getPlanBadge = (plan: ConjuntoAdmin['plan']) => {
    switch (plan) {
      case 'Pro': return { variant: 'success' as const, label: 'Pro' };
      case 'Trial': return { variant: 'warning' as const, label: 'Trial' };
      case 'Enterprise': return { variant: 'default' as const, label: 'Enterprise' };
      default: return { variant: 'default' as const, label: 'Free' };
    }
  };

  const totalPaginas = Math.ceil((data?.total || 0) / 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Conjuntos</h1>
          <p className="text-gray-500 mt-1">{data?.total || 0} conjuntos registrados en la plataforma</p>
        </div>
        <Button variant="primary" className="whitespace-nowrap" onClick={() => window.location.href = '/conjuntos?new=1'}>
          <Icon name="plus" className="w-4 h-4" /> Nuevo Conjunto
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nombre, slug o admin..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPagina(1); }}
              leftIcon={<Icon name="search" className="w-4 h-4 text-gray-400" />}
            />
          </div>
          <Select
            value={filterPlan}
            onChange={(e) => { setFilterPlan(e.target.value); setPagina(1); }}
            className="w-full sm:w-40"
          >
            <option value="all">Todos los planes</option>
            <option value="Pro">Pro</option>
            <option value="Trial">Trial</option>
            <option value="Free">Free</option>
            <option value="Enterprise">Enterprise</option>
          </Select>
          <Select
            value={filterEstado}
            onChange={(e) => { setFilterEstado(e.target.value); setPagina(1); }}
            className="w-full sm:w-40"
          >
            <option value="all">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="suspendido">Suspendido</option>
            <option value="pendiente">Pendiente</option>
            <option value="expirado">Expirado</option>
          </Select>
        </div>
      </Card>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="alert-triangle" className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Error cargando conjuntos</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>Reintentar</Button>
          </div>
        </Card>
      )}

      {/* Tabla */}
      <Card className="overflow-hidden">
        {loading && !data?.data?.length && (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-gray-500">Cargando conjuntos...</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Conjunto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuarios / Unidades</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vence</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.data?.map((conjunto) => {
                const estado = getEstadoBadge(conjunto.estado);
                const plan = getPlanBadge(conjunto.plan);
                return (
                  <tr key={conjunto.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{conjunto.nombre}</p>
                        <p className="text-sm text-gray-500">{conjunto.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={plan.variant}>{plan.label}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={estado.variant}>{estado.label}</Badge>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {conjunto.usuariosCount.toLocaleString()} / {conjunto.unidadesCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{conjunto.adminName}</p>
                        <p className="text-sm text-gray-500">{conjunto.adminEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {conjunto.expiresAt ? new Date(conjunto.expiresAt).toLocaleDateString('es-CO') : '—'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm">Ver</Button>
                        <Button variant="ghost" size="sm">Editar</Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">
                          <Icon name="more-vertical" className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(data?.data?.length === 0 && !loading) && (
          <div className="p-8 text-center text-gray-500">
            <Icon name="search" className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p>No se encontraron conjuntos</p>
          </div>
        )}

        {/* Paginación */}
        {data && data.total > 20 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Mostrando {(pagina - 1) * 20 + 1} a {Math.min(pagina * 20, data.total)} de {data.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={pagina === 1}
                onClick={() => setPagina(p => Math.max(1, p - 1))}
              >
                <Icon name="chevron-left" className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              >
                <Icon name="chevron-right" className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function getEstadoBadge(estado: ConjuntoAdmin['estado']) {
  switch (estado) {
    case 'activo': return { variant: 'success' as const, label: 'Activo' };
    case 'suspendido': return { variant: 'danger' as const, label: 'Suspendido' };
    case 'pendiente': return { variant: 'warning' as const, label: 'Pendiente' };
    case 'expirado': return { variant: 'default' as const, label: 'Expirado' };
  }
}

function getPlanBadge(plan: ConjuntoAdmin['plan']) {
  switch (plan) {
    case 'Pro': return { variant: 'success' as const, label: 'Pro' };
    case 'Trial': return { variant: 'warning' as const, label: 'Trial' };
    case 'Enterprise': return { variant: 'default' as const, label: 'Enterprise' };
    default: return { variant: 'default' as const, label: 'Free' };
  }
}