import React, { useState } from 'react';
import { Card, Badge, Input, Button, Select } from '@paic/ui';
import { Icon } from '@paic/ui';
import { ConjuntoAdmin } from '../../types';

const mockConjuntos: ConjuntoAdmin[] = [
  { id: '1', nombre: 'Residencial El Prado', slug: 'el-prado', plan: 'Pro', estado: 'activo', usuariosCount: 245, unidadesCount: 180, createdAt: '2024-01-15', expiresAt: '2025-01-15', adminEmail: 'admin@elprado.com', adminName: 'Carlos Mendoza' },
  { id: '2', nombre: 'Torres del Norte', slug: 'torres-norte', plan: 'Pro', estado: 'activo', usuariosCount: 512, unidadesCount: 380, createdAt: '2023-11-20', expiresAt: '2024-11-20', adminEmail: 'gerencia@torresnorte.com', adminName: 'Ana Torres' },
  { id: '3', nombre: 'Condominio Las Flores', slug: 'las-flores', plan: 'Trial', estado: 'activo', usuariosCount: 89, unidadesCount: 65, createdAt: '2024-12-01', expiresAt: '2025-01-01', adminEmail: 'admin@lasflores.com', adminName: 'Roberto Flores' },
  { id: '4', nombre: 'Urbanización San Miguel', slug: 'san-miguel', plan: 'Free', estado: 'suspendido', usuariosCount: 0, unidadesCount: 120, createdAt: '2023-08-10', adminEmail: 'contacto@sanmiguel.com', adminName: 'María González' },
  { id: '5', nombre: 'Parque Residencial', slug: 'parque-residencial', plan: 'Pro', estado: 'activo', usuariosCount: 334, unidadesCount: 250, createdAt: '2024-03-22', expiresAt: '2025-03-22', adminEmail: 'admin@parqueres.com', adminName: 'Jorge Ramírez' },
];

export function ConjuntosView() {
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');

  const filtered = mockConjuntos.filter(c => {
    const matchesSearch = c.nombre.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = filterPlan === 'all' || c.plan === filterPlan;
    const matchesEstado = filterEstado === 'all' || c.estado === filterEstado;
    return matchesSearch && matchesPlan && matchesEstado;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Conjuntos</h1>
          <p className="text-gray-500 mt-1">{mockConjuntos.length} conjuntos registrados en la plataforma</p>
        </div>
        <Button variant="primary" className="whitespace-nowrap">
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
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Icon name="search" className="w-4 h-4 text-gray-400" />}
            />
          </div>
          <Select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
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
            onChange={(e) => setFilterEstado(e.target.value)}
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

      {/* Tabla */}
      <Card className="overflow-hidden">
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
              {filtered.map((conjunto) => {
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
        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Icon name="search" className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p>No se encontraron conjuntos</p>
          </div>
        )}
      </Card>
    </div>
  );
}