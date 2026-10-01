import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { AdminLogin } from './components/views/AdminLogin';
import { AdminDashboard } from './components/views/AdminDashboard';
import { AgentesView } from './components/views/AgentesView';
import { ConjuntosView } from './components/views/ConjuntosView';
import { UsuariosView } from './components/views/UsuariosView';
import { SuscripcionesView } from './components/views/SuscripcionesView';
import { LogsView } from './components/views/LogsView';
import { MetricasView } from './components/views/MetricasView';
import { ConfiguracionView } from './components/views/ConfiguracionView';
import { AdminAuthProvider, useAdminAuth } from './hooks/useAdminAuth';
import { SuperAdminProfile } from './types';

function AdminRoutes() {
  const { isAuthenticated, isLoading, user } = useAdminAuth();
  const isSuperAdmin = user?.rol === 'superadmin';

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Cargando PAIC Admin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white shadow-lg rounded-xl max-w-md mx-4">
          <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6M12 15l-4-4 4-4M8 9l4 4-4 4" />
          </svg>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Acceso Restringido</h2>
          <p className="text-gray-500">Solo superadministradores pueden acceder a esta consola.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/agentes" element={<AgentesView />} />
        <Route path="/conjuntos" element={<ConjuntosView />} />
        <Route path="/usuarios" element={<UsuariosView />} />
        <Route path="/suscripciones" element={<SuscripcionesView />} />
        <Route path="/logs" element={<LogsView />} />
        <Route path="/metricas" element={<MetricasView />} />
        <Route path="/configuracion" element={<ConfiguracionView />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AdminLayout>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <AdminRoutes />
    </AdminAuthProvider>
  );
}