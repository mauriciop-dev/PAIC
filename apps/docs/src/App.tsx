import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Outlet, NavLink } from 'react-router-dom';
import { Card, Badge, Icon, Button } from '@paic/ui';
import { Header } from './components/Header';
import { analytics } from '@paic/analytics';
import './App.css';

const modulesList = [
  { icon: 'dashboard', title: 'Dashboard', desc: 'Vista general con KPIs y alertas', href: '/modulos/dashboard' },
  { icon: 'database', title: 'Base de Datos', desc: 'Residentes, proveedores, personal', href: '/modulos/base-datos' },
  { icon: 'calendar', title: 'Áreas Comunes', desc: 'Reservas y disponibilidad', href: '/modulos/areas-comunes' },
  { icon: 'dollarSign', title: 'Finanzas', desc: 'Ingresos, gastos, reportes', href: '/modulos/finanzas' },
  { icon: 'mail', title: 'Comunicaciones', desc: 'Correos masivos y plantillas', href: '/modulos/comunicaciones' },
  { icon: 'file-text', title: 'Archivos', desc: 'Repositorio documental', href: '/modulos/archivos' },
  { icon: 'shield', title: 'Seguridad', desc: 'Visitantes, paquetes, accesos', href: '/modulos/seguridad' },
  { icon: 'clock', title: 'Vencimientos', desc: 'Alertas de pagos y obligaciones', href: '/modulos/vencimientos' },
  { icon: 'checkSquare', title: 'Tareas', desc: 'Gestión de pendientes', href: '/modulos/tareas' },
];

const navSections = [
  {
    title: 'Primeros Pasos',
    items: [
      { path: '/', label: 'Introducción' },
      { path: '/instalacion', label: 'Instalación' },
      { path: '/configuracion-inicial', label: 'Configuración Inicial' },
    ],
  },
  {
    title: 'Módulos',
    items: [
      { path: '/modulos/dashboard', label: 'Dashboard' },
      { path: '/modulos/base-datos', label: 'Base de Datos' },
      { path: '/modulos/areas-comunes', label: 'Áreas Comunes' },
      { path: '/modulos/finanzas', label: 'Finanzas' },
      { path: '/modulos/comunicaciones', label: 'Comunicaciones' },
      { path: '/modulos/archivos', label: 'Archivos' },
      { path: '/modulos/seguridad', label: 'Seguridad' },
      { path: '/modulos/vencimientos', label: 'Vencimientos' },
      { path: '/modulos/tareas', label: 'Tareas' },
    ],
  },
  {
    title: 'Funciones Avanzadas',
    items: [
      { path: '/chatbot', label: 'Asistente IA' },
      { path: '/pwa', label: 'PWA / App Móvil' },
      { path: '/notificaciones', label: 'Notificaciones' },
    ],
  },
  {
    title: 'Administración',
    items: [
      { path: '/admin/usuarios', label: 'Gestión de Usuarios' },
      { path: '/admin/roles', label: 'Roles y Permisos' },
      { path: '/admin/suscripcion', label: 'Suscripción y Planes' },
      { path: '/admin/puntos-acceso', label: 'Puntos de Acceso' },
    ],
  },
  {
    title: 'Referencia',
    items: [
      { path: '/api', label: 'API Reference' },
      { path: '/webhooks', label: 'Webhooks' },
      { path: '/troubleshooting', label: 'Solución de Problemas' },
      { path: '/changelog', label: 'Changelog' },
    ],
  },
];

function DocsLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header
        onHelpClick={() => setSidebarOpen(true)}
        onStartTour={() => {}}
        userProfile={null}
        conjuntoInfo={null}
        onLogout={() => {}}
        onSettingsClick={() => {}}
        activeTabName="Documentación"
      />

      <div className="flex">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Navegación de documentación"
        >
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100">
              <Link to="/" className="flex items-center gap-2 font-bold text-blue-900 text-lg">
                <Icon name="file-text" className="w-6 h-6 text-blue-600" />
                PAIC Docs
              </Link>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin" aria-label="Menú de documentación">
              {navSections.map((section) => (
                <div key={section.title} className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          className={({ isActive }) =>
                            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`
                          }
                        >
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="p-4 border-t border-gray-100">
              <Link
                to="https://app.paicai.com.co"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <Icon name="send" className="w-4 h-4" />
                Ir a la App
              </Link>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <main className="flex-1 lg:ml-72 min-h-screen">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {sidebarOpen && (
        <button
          className="lg:hidden fixed bottom-6 right-6 z-40 p-3 rounded-full bg-blue-600 text-white shadow-lg"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú"
        >
          <Icon name="x" className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

function HomePage() {
  return (
    <div className="prose prose-blue max-w-none">
      <h1>Documentación PAIC</h1>
      <p className="lead text-gray-600">
        Bienvenido a la documentación oficial de <strong>PAIC</strong> — Plataforma de Administración Inteligente de Copropiedades.
        Aquí encontrarás guías, referencias y mejores prácticas para aprovechar al máximo la plataforma.
      </p>

      <div className="grid md:grid-cols-3 gap-6 my-8">
        {[
          { title: '🚀 Inicio Rápido', desc: 'Configura tu copropiedad en minutos', href: '/instalacion' },
          { title: '📚 Guías de Módulos', desc: 'Aprende a usar cada funcionalidad', href: '/modulos/dashboard' },
          { title: '🔧 Administración', desc: 'Gestiona usuarios, roles y planes', href: '/admin/usuarios' },
        ].map((item) => (
          <Card key={item.title} className="p-6 hover:shadow-lg transition-shadow h-full" padding="none">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-600 mb-4">{item.desc}</p>
              <Link to={item.href} className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
                Leer más <Icon name="chevron-right" className="w-4 h-4" />
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Módulos Principales</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modulesList.map((mod) => (
            <Link key={mod.title} to={mod.href} className="block">
              <Card className="p-5 hover:shadow-md transition-shadow h-full" padding="none">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <Icon name={mod.icon} className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{mod.title}</h3>
                    <p className="text-sm text-gray-600">{mod.desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 p-6 bg-blue-50 rounded-xl">
        <h2 className="text-xl font-bold text-gray-900 mb-3">¿Necesitas ayuda?</h2>
        <p className="text-gray-600 mb-4">
          Consulta nuestras <Link to="/troubleshooting" className="text-blue-600 hover:underline">preguntas frecuentes</Link>,
          revisa el <Link to="/changelog" className="text-blue-600 hover:underline">changelog</Link>
          o contacta a soporte en <a href="mailto:contacto@aiprodig.com" className="text-blue-600 hover:underline">contacto@aiprodig.com</a>.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => window.open('https://app.paicai.com.co', '_blank')}>
            <Icon name="send" className="w-4 h-4" /> Abrir PAIC
          </Button>
          <Button variant="outline" onClick={() => window.open('https://wa.me/573144897092', '_blank')}>
            <Icon name="phone" className="w-4 h-4" /> WhatsApp Soporte
          </Button>
        </div>
      </section>
    </div>
  );
}

function GenericPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="prose prose-blue max-w-none">
      <h1>{title}</h1>
      <div className="mt-6">{children}</div>
      <hr className="my-8 border-gray-200" />
      <p className="text-sm text-gray-500">
        ¿Esta página necesita mejoras? <a href="https://github.com/mauriciop-dev/PAIC/issues/new" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Reportar en GitHub</a>
      </p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="text-center py-16">
      <Icon name="alert-triangle" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Página no encontrada</h1>
      <p className="text-gray-600 mb-6">La documentación que buscas no existe o se ha movido.</p>
      <Link to="/" className="text-blue-600 hover:underline font-medium">Volver al inicio</Link>
    </div>
  );
}

function DocsApp() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header
        onHelpClick={() => setSidebarOpen(true)}
        onStartTour={() => {}}
        userProfile={null}
        conjuntoInfo={null}
        onLogout={() => {}}
        onSettingsClick={() => {}}
        activeTabName="Documentación"
      />

      <div className="flex">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          aria-label="Navegación de documentación"
        >
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100">
              <Link to="/" className="flex items-center gap-2 font-bold text-blue-900 text-lg">
                <Icon name="file-text" className="w-6 h-6 text-blue-600" />
                PAIC Docs
              </Link>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin" aria-label="Menú de documentación">
              {navSections.map((section) => (
                <div key={section.title} className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          className={({ isActive }) =>
                            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`
                          }
                        >
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="p-4 border-t border-gray-100">
              <Link
                to="https://app.paicai.com.co"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <Icon name="send" className="w-4 h-4" />
                Ir a la App
              </Link>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <main className="flex-1 lg:ml-72 min-h-screen">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="instalacion" element={<GenericPage title="Instalación"><p>Guía de instalación próximamente.</p></GenericPage>} />
              <Route path="configuracion-inicial" element={<GenericPage title="Configuración Inicial"><p>Guía de configuración inicial próximamente.</p></GenericPage>} />
              <Route path="modulos/dashboard" element={<GenericPage title="Dashboard"><p>Documentación del Dashboard próximamente.</p></GenericPage>} />
              <Route path="modulos/base-datos" element={<GenericPage title="Base de Datos"><p>Documentación de Base de Datos próximamente.</p></GenericPage>} />
              <Route path="modulos/areas-comunes" element={<GenericPage title="Áreas Comunes"><p>Documentación de Áreas Comunes próximamente.</p></GenericPage>} />
              <Route path="modulos/finanzas" element={<GenericPage title="Finanzas"><p>Documentación de Finanzas próximamente.</p></GenericPage>} />
              <Route path="modulos/comunicaciones" element={<GenericPage title="Comunicaciones"><p>Documentación de Comunicaciones próximamente.</p></GenericPage>} />
              <Route path="modulos/archivos" element={<GenericPage title="Archivos"><p>Documentación de Archivos próximamente.</p></GenericPage>} />
              <Route path="modulos/seguridad" element={<GenericPage title="Seguridad"><p>Documentación de Seguridad próximamente.</p></GenericPage>} />
              <Route path="modulos/vencimientos" element={<GenericPage title="Vencimientos"><p>Documentación de Vencimientos próximamente.</p></GenericPage>} />
              <Route path="modulos/tareas" element={<GenericPage title="Tareas"><p>Documentación de Tareas próximamente.</p></GenericPage>} />
              <Route path="chatbot" element={<GenericPage title="Asistente IA"><p>Documentación del Chatbot próximamente.</p></GenericPage>} />
              <Route path="pwa" element={<GenericPage title="PWA / App Móvil"><p>Guía de instalación PWA próximamente.</p></GenericPage>} />
              <Route path="notificaciones" element={<GenericPage title="Notificaciones"><p>Sistema de notificaciones próximamente.</p></GenericPage>} />
              <Route path="admin/usuarios" element={<GenericPage title="Gestión de Usuarios"><p>Admin de usuarios próximamente.</p></GenericPage>} />
              <Route path="admin/roles" element={<GenericPage title="Roles y Permisos"><p>Sistema de roles próximamente.</p></GenericPage>} />
              <Route path="admin/suscripcion" element={<GenericPage title="Suscripción y Planes"><p>Gestión de planes próximamente.</p></GenericPage>} />
              <Route path="admin/puntos-acceso" element={<GenericPage title="Puntos de Acceso"><p>Configuración de accesos próximamente.</p></GenericPage>} />
              <Route path="api" element={<GenericPage title="API Reference"><p>Referencia de API próximamente.</p></GenericPage>} />
              <Route path="webhooks" element={<GenericPage title="Webhooks"><p>Configuración de webhooks próximamente.</p></GenericPage>} />
              <Route path="troubleshooting" element={<GenericPage title="Solución de Problemas"><p>FAQ y troubleshooting próximamente.</p></GenericPage>} />
              <Route path="changelog" element={<GenericPage title="Changelog"><p>Historial de versiones próximamente.</p></GenericPage>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </main>
      </div>

      {sidebarOpen && (
        <button
          className="lg:hidden fixed bottom-6 right-6 z-40 p-3 rounded-full bg-blue-600 text-white shadow-lg"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú"
        >
          <Icon name="x" className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

export default DocsApp;