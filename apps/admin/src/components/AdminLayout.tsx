import React, { useState, useMemo } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { AdminTab, SuperAdminProfile } from '../types';
import { Icon } from '@paic/ui';
import { useAdminAuth } from '../hooks/useAdminAuth';

const adminTabs: { id: AdminTab; label: string; icon: string }[] = [
  { id: 'Dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'Agentes', label: 'Agentes IA', icon: 'cpu' },
  { id: 'Conjuntos', label: 'Conjuntos', icon: 'building' },
  { id: 'Usuarios', label: 'Usuarios', icon: 'users' },
  { id: 'Suscripciones', label: 'Suscripciones', icon: 'credit-card' },
  { id: 'Metricas', label: 'Métricas', icon: 'trending-up' },
  { id: 'Logs', label: 'Logs', icon: 'file-text' },
  { id: 'Configuracion', label: 'Configuración', icon: 'settings' },
];

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAdminAuth();

  const activeTab = useMemo(() => {
    const path = location.pathname.replace('/', '');
    return (adminTabs.find(t => t.id.toLowerCase() === path.toLowerCase())?.id) || 'Dashboard';
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200/80 transition-all duration-300 shrink-0 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 flex-shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                A
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-slate-800 tracking-tight block truncate">PAIC Admin</span>
                <span className="text-[11px] font-medium text-slate-400 block truncate">Consola de Superadmin</span>
              </div>
            </div>
          )}

          {collapsed && (
            <div className="w-8 h-8 mx-auto rounded-xl bg-red-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              A
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ${
              collapsed ? 'hidden' : 'block'
            }`}
          >
            <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} className="w-4 h-4" />
          </button>
        </div>

        {collapsed && (
          <div className="pt-2 flex justify-center flex-shrink-0">
            <button
              onClick={() => setCollapsed(false)}
              aria-label="Expandir barra lateral"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Icon name="chevron-left" className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 min-h-0">
          {!collapsed && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 flex-shrink-0">
              Consola de Administración
            </p>
          )}

          {adminTabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <NavLink
                key={tab.id}
                to={`/${tab.id.toLowerCase()}`}
                className={({ isActive: active }) => `
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-red-50 text-red-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  } ${collapsed ? 'justify-center px-0' : ''}
                `}
                title={collapsed ? tab.label : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={`shrink-0 ${isActive ? 'text-red-600' : 'text-slate-400'}`}>
                  <Icon name={tab.icon} className="w-5 h-5" />
                </div>
                {!collapsed && <span className="truncate">{tab.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer - User & Logout */}
        <div className="sticky bottom-0 p-3 border-t border-slate-100 bg-white/95 backdrop-blur-sm flex-shrink-0">
          {!collapsed && user && (
            <div className="mb-3 p-2.5 bg-slate-50 rounded-xl">
              <p className="text-xs font-semibold text-slate-700 truncate">{user.nombre}</p>
              <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded-full">
                Superadmin
              </span>
            </div>
          )}

          <button
            onClick={signOut}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors ${collapsed ? 'justify-center px-0' : ''}`}
            title={collapsed ? 'Cerrar sesión' : undefined}
          >
            <Icon name="log-in" className="w-5 h-5 text-slate-400" />
            {!collapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ease-in-out min-w-0 ${collapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-screen-2xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}