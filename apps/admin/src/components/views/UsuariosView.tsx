import React, { useState } from 'react';
import { Card, Badge, Input, Select } from '@paic/ui';
import { Icon } from '@paic/ui';
import { UsuarioPlataforma } from '../../types';

const mockUsuarios: UsuarioPlataforma[] = [
  { id: '1', email: 'super@paicai.com.co', nombre: 'Super Admin PAIC', rol: 'superadmin', conjuntos: ['all'], ultimoAcceso: '2024-12-19T10:30:00Z', estado: 'activo', createdAt: '2023-01-15' },
  { id: '2', email: 'admin@elprado.com', nombre: 'Carlos Mendoza', rol: 'admin_conjunto', conjuntos: ['el-prado'], ultimoAcceso: '2024-12-19T09:15:00Z', estado: 'activo', createdAt: '2024-01-15' },
  { id: '3', email: 'gerencia@torresnorte.com', nombre: 'Ana Torres', rol: 'admin_conjunto', conjuntos: ['torres-norte'], ultimoAcceso: '2024-12-18T16:45:00Z', estado: 'activo', createdAt: '2023-11-20' },
  { id: '4', email: 'residente@ejemplo.com', nombre: 'Juan Pérez', rol: 'residente', conjuntos: ['el-prado'], ultimoAcceso: '2024-12-19T08:00:00Z', estado: 'activo', createdAt: '2024-02-10' },
  { id: '5', email: 'guardia@torresnorte.com', nombre: 'Luis Guardia', rol: 'guardia', conjuntos: ['torres-norte'], ultimoAcceso: '2024-12-19T06:30:00Z', estado: 'activo', createdAt: '2024-01-20' },
  { id: '6', email: 'contador@lasflores.com', nombre: 'María Contadora', rol: 'contador', conjuntos: ['las-flores'], ultimoAcceso: '2024-12-18T14:20:00Z', estado: 'inactivo', createdAt: '2024-12-01' },
];

export function UsuariosView() {
  const [search, setSearch] = useState('');
  const [filterRol, setFilterRol] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');

  const filtered = mockUsuarios.filter(u => {
    const matchesSearch = u.nombre.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRol = filterRol === 'all' || u.rol === filterRol;
    const matchesEstado = filterEstado === 'all' || u.estado === filterEstado;
    return matchesSearch && matchesRol && matchesEstado;
  });

  const getRolBadge = (rol: UsuarioPlataforma['rol']) => {
    switch (rol) {
      case 'superadmin': return { variant: 'danger' as const, label: 'Superadmin', color: 'bg-red-100 text-red-700' };
      case 'admin_conjunto': return { variant: 'success' as const, label: 'Admin Conjunto', color: 'bg-blue-100 text-blue-700' };
      case 'contador': return { variant: 'default' as const, label: 'Contador', color: 'bg-purple-100 text-purple-700' };
      case 'guardia': return { variant: 'warning' as const, label: 'Guardia', color: 'bg-amber-100 text-amber-700' };
      default: return { variant: 'default' as const, label: 'Residente', color: 'bg-gray-100 text-gray-700' };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios de la Plataforma</h1>
        <p className="text-gray-500 mt-1">{mockUsuarios.length} usuarios registrados</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Icon name="search" className="w-4 h-4 text-gray-400" />}
            />
          </div>
          <Select value={filterRol} onChange={(e) => setFilterRol(e.target.value)} className="w-full sm:w-48">
            <option value="all">Todos los roles</option>
            <option value="superadmin">Superadmin</option>
            <option value="admin_conjunto">Admin Conjunto</option>
            <option value="residente">Residente</option>
            <option value="guardia">Guardia</option>
            <option value="contador">Contador</option>
          </Select>
          <Select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="w-full sm:w-40">
            <option value="all">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="bloqueado">Bloqueado</option>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Conjuntos</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Último Acceso</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((usuario) => {
                const rol = getRolBadge(usuario.rol);
                const estadoColor = usuario.estado === 'activo' ? 'text-green-600' : usuario.estado === 'inactivo' ? 'text-gray-500' : 'text-red-600';
                return (
                  <tr key={usuario.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{usuario.nombre}</p>
                        <p className="text-sm text-gray-500">{usuario.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rol.color}`}>
                        {rol.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {usuario.conjuntos.length === 1 && usuario.conjuntos[0] === 'all' ? 'Todos (Plataforma)' : usuario.conjuntos.join(', ')}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-sm ${estadoColor}`}>
                        <span className={`w-2 h-2 rounded-full ${usuario.estado === 'activo' ? 'bg-green-500' : usuario.estado === 'inactivo' ? 'bg-gray-400' : 'bg-red-500'}`} />
                        {usuario.estado.charAt(0).toUpperCase() + usuario.estado.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {new Date(usuario.ultimoAcceso).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button variant="ghost" size="sm">Ver</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}