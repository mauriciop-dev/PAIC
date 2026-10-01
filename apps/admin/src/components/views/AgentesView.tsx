import React, { useState, useMemo, useEffect } from 'react';
import { Card, Badge, Button, Input, Select, ProgressRing, Switch, Toast, useToast } from '@paic/ui';
import { Icon } from '@paic/ui';
import { Agente, InformeAgente, AccionAgente, Severidad, ChatMensaje } from '../../types/admin';
import { adminApi } from '../../services/adminApi';

// ============================================
// MOCK DATA - En producción vendrá de Supabase Realtime
// ============================================
const AGENTES_CONFIG: Agente[] = [
  {
    id: 'sentinel',
    nombre: 'Sentinel',
    icono: 'shield-alert',
    color: 'red',
    descripcion: 'Seguridad, accesos fallidos, tokens OAuth2, cumplimiento legal',
    estado: 'activo',
    ultimaEjecucion: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    proximaEjecucion: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    metricas: { alertasHoy: 3, accesosBloqueados: 12, tokensRevisados: 45 },
  },
  {
    id: 'debug',
    nombre: 'Debug & Patch',
    icono: 'bug',
    color: 'orange',
    descripcion: 'Análisis de excepciones, generación de parches, PRs automáticos',
    estado: 'activo',
    ultimaEjecucion: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    proximaEjecucion: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    metricas: { excepcionesCapturadas: 7, parchesGenerados: 2, prsAbiertos: 1 },
  },
  {
    id: 'wald',
    nombre: 'Wald (Análisis Inverso)',
    icono: 'plane',
    color: 'blue',
    descripcion: 'Módulos no usados, flujos truncados, churn silencioso, sesgo del superviviente',
    estado: 'activo',
    ultimaEjecucion: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    proximaEjecucion: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    metricas: { modulosInactivos: 4, flujosTruncados: 12, conjuntosEnRiesgo: 3 },
  },
  {
    id: 'behavioral',
    nombre: 'Behavioral & Growth',
    icono: 'bar-chart',
    color: 'green',
    descripcion: 'Patrones admin mono vs multi, adopción PWA portería/residentes, UX optimization',
    estado: 'activo',
    ultimaEjecucion: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    proximaEjecucion: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    metricas: { patronesDetectados: 8, recomendacionesUX: 5, adopcionPWA: 72 },
  },
];

const INFORMES_MOCK: InformeAgente[] = [
  {
    id: 'inf-001',
    agenteId: 'sentinel',
    titulo: 'Múltiples intentos de fuerza bruta detectados',
    descripcion: 'IP 190.12.45.67 realizó 47 intentos de login en 10 min. Patrón de diccionario.',
    severidad: 'critica',
    categoria: 'seguridad',
    estado: 'pendiente',
    creadoEn: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    metadata: { ip: '190.12.45.67', intentos: 47, pais: 'CO', userAgent: 'bot/1.0' },
    accionSugerida: { tipo: 'bloquear_ip', descripcion: 'Bloquear IP en WAF y registrar en lista negra', payload: { ip: '190.12.45.67', duracion: '24h' } },
  },
  {
    id: 'inf-002',
    agenteId: 'debug',
    titulo: 'Excepción no manejada en CommonAreasView: calendarEvents.filter',
    descripcion: 'TypeError: Cannot read property "filter" of undefined en línea 187. Ocurre al cambiar de mes sin datos.',
    severidad: 'alta',
    categoria: 'excepcion_frontend',
    estado: 'pendiente',
    creadoEn: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    metadata: { archivo: 'CommonAreasView.tsx', linea: 187, stack: '...', ocurrencias: 3 },
    accionSugerida: { tipo: 'crear_pr', descripcion: 'Añadir guard clause && calendarEvents?.filter', payload: { repo: 'paic-webapp', branch: 'fix/calendar-filter-guard' } },
  },
  {
    id: 'inf-003',
    agenteId: 'wald',
    titulo: 'Módulo "Vencimientos" sin uso en 15 conjuntos activos',
    descripcion: 'Análisis de 30 días: 0 interacciones en Vencimientos. Posible churn silencioso o feature desconocida.',
    severidad: 'media',
    categoria: 'churn_silencioso',
    estado: 'pendiente',
    creadoEn: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    metadata: { conjuntosAfectados: 15, diasSinUso: 30, modulo: 'Vencimientos' },
    accionSugerida: { tipo: 'notificar_admin', descripcion: 'Enviar guía de uso + encuesta de valor', payload: { template: 'vencimientos-onboarding' } },
  },
  {
    id: 'inf-004',
    agenteId: 'behavioral',
    titulo: 'Admins multiconjunto usan 3.2x más módulos que monoconjunto',
    descripcion: 'Patrón detectado: admins de >1 conjunto activan Portería, Archivos, Comunicaciones. Monoconjunto solo Dashboard + Reservas.',
    severidad: 'baja',
    categoria: 'patron_uso',
    estado: 'aprobado',
    creadoEn: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    metadata: { ratio: 3.2, modulosDiferenciales: ['Portería', 'Archivos', 'Comunicaciones'], muestra: 89 },
    accionSugerida: { tipo: 'crear_onboarding', descripcion: 'Diseñar onboarding diferenciado por perfil', payload: { target: 'monoconjunto', modulos: ['Portería', 'Archivos'] } },
  },
  {
    id: 'inf-005',
    agenteId: 'wald',
    titulo: 'Flujo de reserva truncado: 23% abandona en comprobante de pago',
    descripcion: 'Usuarios llegan a paso 3/4 (selección de área/fecha) pero no suben comprobante. 23% drop-off.',
    severidad: 'alta',
    categoria: 'flujo_truncado',
    estado: 'en_progreso',
    creadoEn: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    metadata: { paso: 3, dropOff: 0.23, usuariosAfectados: 34, areasTop: ['Salón Social', 'BBQ'] },
    accionSugerida: { tipo: 'simplificar_formulario', descripcion: 'Permitir reserva sin comprobante (validar después)', payload: { campo: 'paymentProofPath', opcional: true } },
  },
  {
    id: 'inf-006',
    agenteId: 'debug',
    titulo: 'Memory leak en WebSocket de paquetes (realtime)',
    descripcion: 'Conexiones no cerradas al navegar fuera de SeguridadView. 2.3MB/hora de crecimiento.',
    severidad: 'critica',
    categoria: 'memory_leak',
    estado: 'pendiente',
    creadoEn: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    metadata: { componente: 'SeguridadView', leakRate: '2.3MB/h', conexionesFantasma: 12 },
    accionSugerida: { tipo: 'crear_pr', descripcion: 'Añadir cleanup en useEffect return + supabase.removeChannel', payload: { archivo: 'SeguridadView.tsx' } },
  },
];

const ACCIONES_DISPONIBLES: Record<string, AccionAgente[]> = {
  sentinel: [
    { id: 'bloquear_ip', label: 'Bloquear IP en WAF', icono: 'shield-alert', color: 'red', requiereConfirmacion: true },
    { id: 'revocar_token', label: 'Revocar tokens OAuth2', icono: 'key', color: 'orange', requiereConfirmacion: true },
    { id: 'auditar_accesos', label: 'Auditar accesos recientes', icono: 'file-text', color: 'blue' },
  ],
  debug: [
    { id: 'crear_pr', label: 'Crear PR con fix', icono: 'github', color: 'green', requiereConfirmacion: false },
    { id: 'reintentar_webhook', label: 'Reintentar webhook fallido', icono: 'refresh-cw', color: 'blue' },
    { id: 'limpiar_cache', label: 'Limpiar cache Redis', icono: 'database', color: 'orange', requiereConfirmacion: true },
  ],
  wald: [
    { id: 'notificar_admin', label: 'Notificar a administradores', icono: 'mail', color: 'blue' },
    { id: 'simplificar_formulario', label: 'Simplificar formulario', icono: 'edit', color: 'green', requiereConfirmacion: true },
    { id: 'crear_onboarding', label: 'Crear onboarding guiado', icono: 'book-open', color: 'purple' },
  ],
  behavioral: [
    { id: 'crear_onboarding', label: 'Crear onboarding diferenciado', icono: 'book-open', color: 'purple' },
    { id: 'activar_modulo', label: 'Activar módulo sugerido', icono: 'plus-circle', color: 'green' },
    { id: 'enviar_encuesta', label: 'Enviar encuesta de valor', icono: 'message-circle', color: 'blue' },
  ],
};

export function AgentesView() {
  // Estado global
  const [agenteActivo, setAgenteActivo] = useState<Agente['id']>('sentinel');
  const [filtroSeveridad, setFiltroSeveridad] = useState<Severidad | 'todas'>('todas');
  const [filtroEstado, setFiltroEstado] = useState<InformeAgente['estado'] | 'todos'>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [chatAbierto, setChatAbierto] = useState<Agente['id'] | null>(null);
  const [mensajesChat, setMensajesChat] = useState<ChatMensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [ejecutandoAccion, setEjecutandoAccion] = useState<string | null>(null);
  const { addToast } = useToast();

  // Datos derivados
  const agente = useMemo(() => AGENTES_CONFIG.find(a => a.id === agenteActivo)!, [agenteActivo]);
  const accionesAgente = ACCIONES_DISPONIBLES[agenteActivo] || [];

  const informesFiltrados = useMemo(() => {
    return INFORMES_MOCK.filter(inf => {
      const matchAgente = inf.agenteId === agenteActivo;
      const matchSeveridad = filtroSeveridad === 'todas' || inf.severidad === filtroSeveridad;
      const matchEstado = filtroEstado === 'todos' || inf.estado === filtroEstado;
      const matchBusqueda = inf.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
                           inf.descripcion.toLowerCase().includes(busqueda.toLowerCase());
      return matchAgente && matchSeveridad && matchEstado && matchBusqueda;
    });
  }, [agenteActivo, filtroSeveridad, filtroEstado, busqueda]);

  // Simular auto-refresh de estado de agentes
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      // En producción: suscripción a Supabase Realtime
      console.log('[AgentesView] Auto-refresh tick');
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Helpers
  const getSeveridadBadge = (s: Severidad) => ({
    critica: { variant: 'danger' as const, label: 'Crítica', icon: 'alert-triangle' },
    alta: { variant: 'warning' as const, label: 'Alta', icon: 'alert-triangle' },
    media: { variant: 'info' as const, label: 'Media', icon: 'info' },
    baja: { variant: 'success' as const, label: 'Baja', icon: 'check-circle' },
  }[s]);

  const getEstadoBadge = (e: InformeAgente['estado']) => ({
    pendiente: { variant: 'warning' as const, label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
    en_progreso: { variant: 'info' as const, label: 'En Progreso', color: 'bg-blue-100 text-blue-700' },
    aprobado: { variant: 'success' as const, label: 'Aprobado', color: 'bg-green-100 text-green-700' },
    descartado: { variant: 'default' as const, label: 'Descartado', color: 'bg-gray-100 text-gray-600' },
    resuelto: { variant: 'success' as const, label: 'Resuelto', color: 'bg-emerald-100 text-emerald-700' },
  }[e]);

  const handleEjecutarAccion = async (accion: AccionAgente, informe?: InformeAgente) => {
    if (accion.requiereConfirmacion) {
      const confirmado = window.confirm(`¿Ejecutar "${accion.label}"?${informe ? `\nInforme: ${informe.titulo}` : ''}`);
      if (!confirmado) return;
    }

    setEjecutandoAccion(accion.id);

    try {
      // Mapear acción a payload según el tipo
      const payload = buildPayload(accion, informe);

      const result = await adminApi.executeAgentAction(accion.id, payload);

      if (result.success) {
        addToast(`Acción "${accion.label}" ejecutada correctamente`, 'success');
        // Actualizar estado del informe si existe
        if (informe && result.data) {
          // En producción: refrescar datos desde Supabase
          console.log('[AgentesView] Acción completada:', result.data);
        }
      } else {
        addToast(`Error: ${result.error || 'Error desconocido'}`, 'error');
      }
    } catch (error) {
      addToast(`Error ejecutando acción: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
    } finally {
      setEjecutandoAccion(null);
    }
  };

  const buildPayload = (accion: AccionAgente, informe?: InformeAgente): Record<string, unknown> => {
    const basePayload: Record<string, unknown> = {
      informeId: informe?.id,
    };

    // Mapear según el tipo de acción
    switch (accion.id) {
      case 'block_ip':
        return { ...basePayload, ip: '190.12.45.67', duration: '24h', reason: 'Bloqueo por agente Sentinel' };
      case 'create_pr_fix':
        return { ...basePayload, archivo: 'src/components/CommonAreasView.tsx', linea: 187, errorMessage: 'TypeError: Cannot read property filter of undefined' };
      case 'simplify_form':
        return { ...basePayload, campo: 'paymentProofPath', accion: 'hacer_opcional', razon: 'Reducir fricción en flujo de reserva' };
      case 'revoke_sessions':
        return { ...basePayload, reason: 'Revocación por incidente de seguridad' };
      case 'notify_admin':
        return { ...basePayload, canales: ['email', 'push'], prioridad: 'inmediata' };
      default:
        return basePayload;
    }
  };

  const handleEnviarChat = () => {
    if (!nuevoMensaje.trim()) return;
    const msg: ChatMensaje = {
      id: `msg-${Date.now()}`,
      agenteId: chatAbierto!,
      remitente: 'superadmin',
      contenido: nuevoMensaje,
      timestamp: new Date().toISOString(),
    };
    setMensajesChat(prev => [...prev, msg]);
    setNuevoMensaje('');
    
    // Simular respuesta del agente
    setTimeout(() => {
      const respuesta: ChatMensaje = {
        id: `msg-${Date.now() + 1}`,
        agenteId: chatAbierto!,
        remitente: 'agente',
        contenido: `Entendido. Procesando: "${nuevoMensaje}". Te aviso cuando termine.`,
        timestamp: new Date().toISOString(),
      };
      setMensajesChat(prev => [...prev, respuesta]);
    }, 1500);
  };

  const abrirChat = (agenteId: Agente['id']) => {
    setChatAbierto(agenteId);
    setMensajesChat([
      {
        id: 'welcome',
        agenteId,
        remitente: 'agente',
        contenido: `👋 Hola, soy **${AGENTES_CONFIG.find(a => a.id === agenteId)?.nombre}**. ¿En qué te ayudo?`,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* ============================================
          HEADER: Status Feed en Tiempo Real (4 Agentes)
          ============================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {AGENTES_CONFIG.map(a => (
          <Card
            key={a.id}
            className={`p-4 transition-all duration-200 ${
              agenteActivo === a.id ? 'ring-2 ring-red-500 bg-red-50' : 'hover:shadow-md'
            }`}
            onClick={() => setAgenteActivo(a.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-${a.color}-100 flex items-center justify-center`}>
                  <Icon name={a.icono} className={`w-6 h-6 text-${a.color}-600`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{a.nombre}</h3>
                    <Badge variant={a.estado === 'activo' ? 'success' : 'default'} size="sm">
                      {a.estado === 'activo' ? '● Activo' : 'Pausado'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{a.descripcion}</p>
                </div>
              </div>
              <div className="text-right text-xs text-gray-500 hidden sm:block">
                <p>Última: {new Date(a.ultimaEjecucion).toLocaleTimeString('es-CO', { hour12: false })}</p>
                <p>Próx: {new Date(a.proximaEjecucion).toLocaleTimeString('es-CO', { hour12: false })}</p>
              </div>
            </div>

            {/* Mini métricas */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {Object.entries(a.metricas).map(([key, val]) => (
                <div key={key} className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{val}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* ============================================
          CUERPO PRINCIPAL: 2 Paneles (Informes + Acciones/Chat)
          ============================================ */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Panel Izquierdo: Informes y Hallazgos */}
        <div className="flex-1 flex flex-col min-w-0">
          <Card className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Icon name={agente.icono} className={`w-5 h-5 text-${agente.color}-600`} />
                <h2 className="font-semibold text-gray-900">Informes - {agente.nombre}</h2>
                <Badge variant="info" size="sm">{informesFiltrados.length}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Input
                  placeholder="Buscar en informes..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  leftIcon={<Icon name="search" className="w-4 h-4 text-gray-400" />}
                  className="w-full sm:w-64"
                />
                <Select value={filtroSeveridad} onChange={e => setFiltroSeveridad(e.target.value as any)} className="w-full sm:w-36">
                  <option value="todas">Todas las severidades</option>
                  <option value="critica">Crítica</option>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </Select>
                <Select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as any)} className="w-full sm:w-36">
                  <option value="todos">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_progreso">En Progreso</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="resuelto">Resuelto</option>
                  <option value="descartado">Descartado</option>
                </Select>
                <Switch checked={autoRefresh} onChange={setAutoRefresh} size="sm" />
                <span className="text-xs text-gray-500 hidden sm:inline">Auto-refresh</span>
              </div>
            </div>

            {/* Lista de Informes */}
            <div className="flex-1 overflow-y-auto">
              {informesFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-gray-500">
                  <Icon name="inbox" className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="font-medium">No hay informes</p>
                  <p className="text-sm">Ajusta los filtros o espera nueva actividad</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {informesFiltrados.map(inf => {
                    const sev = getSeveridadBadge(inf.severidad);
                    const est = getEstadoBadge(inf.estado);
                    return (
                      <div
                        key={inf.id}
                        className={`p-4 hover:bg-gray-50 transition-colors ${
                          inf.severidad === 'critica' ? 'bg-red-50 border-l-4 border-red-500' : ''
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={sev.variant} className="flex items-center gap-1">
                                <Icon name={sev.icon} className="w-3 h-3" />
                                {sev.label}
                              </Badge>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${est.color}`}>
                                {est.label}
                              </span>
                              <span className="text-xs text-gray-500">{new Date(inf.creadoEn).toLocaleString('es-CO')}</span>
                            </div>
                            <h3 className="mt-2 font-medium text-gray-900">{inf.titulo}</h3>
                            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{inf.descripcion}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {Object.entries(inf.metadata).slice(0, 4).map(([k, v]) => (
                                <span key={k} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] rounded">
                                  {k}: {String(v).slice(0, 30)}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Acciones rápidas por informe */}
                          <div className="flex items-center gap-2 sm:ml-4 shrink-0">
                            {inf.accionSugerida && (
                              <Button
                                variant={inf.severidad === 'critica' ? 'danger' : 'primary'}
                                size="sm"
                                className="whitespace-nowrap"
                                onClick={() => handleEjecutarAccion({
                                  id: inf.accionSugerida.tipo,
                                  label: inf.accionSugerida.descripcion,
                                  icono: 'arrow-right',
                                  color: inf.severidad === 'critica' ? 'red' : 'blue',
                                  requiereConfirmacion: true,
                                }, inf)}
                              >
                                <Icon name="arrow-right" className="w-3 h-3" />
                                {inf.severidad === 'critica' ? 'Ejecutar Ya' : 'Aprobar'}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirChat(inf.agenteId)}
                              className="whitespace-nowrap"
                            >
                              <Icon name="message-circle" className="w-4 h-4" />
                              <span className="hidden sm:inline">Chat</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Panel Derecho: Acciones 1-Clic + Chat Drawer */}
        <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
          {/* Matriz de Acciones 1-Clic */}
          <Card className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Icon name="zap" className="w-5 h-5 text-red-600" />
                Acciones 1-Clic
              </h3>
              <p className="text-xs text-gray-500 mt-1">Disponibles para {agente.nombre}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {accionesAgente.map(acc => (
                <Button
                  key={acc.id}
                  variant={acc.color === 'red' ? 'danger' : acc.color === 'green' ? 'success' : acc.color === 'orange' ? 'warning' : 'primary'}
                  className="w-full justify-start gap-3"
                  onClick={() => handleEjecutarAccion(acc)}
                >
                  <Icon name={acc.icono} className="w-5 h-5" />
                  <span className="text-left">{acc.label}</span>
                  {acc.requiereConfirmacion && <Icon name="alert-triangle" className="w-4 h-4 text-amber-500" />}
                </Button>
              ))}
            </div>
          </Card>

          {/* Chat Directo con Agente (Drawer/Modal) */}
          {chatAbierto && (
            <div className="fixed inset-0 z-50 lg:relative lg:static">
              <div className="fixed inset-0 bg-black/50 lg:hidden" onClick={() => setChatAbierto(null)} />
              <div className={`fixed bottom-0 right-0 lg:static lg:relative w-full lg:w-96 h-[500px] lg:h-full bg-white shadow-2xl rounded-t-3xl lg:rounded-xl flex flex-col z-50 animate-slide-up`}>
                {/* Header Chat */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl lg:rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-${agente.color}-100 flex items-center justify-center`}>
                      <Icon name={agente.icono} className={`w-5 h-5 text-${agente.color}-600`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{agente.nombre}</p>
                      <p className="text-xs text-gray-500">Chat directo con agente</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setChatAbierto(null)}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  >
                    <Icon name="x" className="w-5 h-5" />
                  </button>
                </div>

                {/* Mensajes */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {mensajesChat.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.remitente === 'superadmin' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.remitente === 'superadmin' ? 'bg-blue-100' : `bg-${agente.color}-100`
                      }`}>
                        <Icon
                          name={msg.remitente === 'superadmin' ? 'user' : agente.icono}
                          className={`w-4 h-4 ${msg.remitente === 'superadmin' ? 'text-blue-600' : `text-${agente.color}-600`}`}
                        />
                      </div>
                      <div className={`max-w-[70%] ${msg.remitente === 'superadmin' ? 'text-right' : ''}`}>
                        <p className={`px-3 py-2 rounded-2xl text-sm ${
                          msg.remitente === 'superadmin'
                            ? 'bg-blue-100 text-blue-900 rounded-tr-none'
                            : `bg-${agente.color}-100 text-${agente.color}-900 rounded-tl-none`
                        }`}>
                          {msg.contenido}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1 px-1">
                          {new Date(msg.timestamp).toLocaleTimeString('es-CO', { hour12: false })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-100 bg-white rounded-b-3xl lg:rounded-xl">
                  <div className="flex gap-2">
                    <Input
                      value={nuevoMensaje}
                      onChange={e => setNuevoMensaje(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEnviarChat()}
                      placeholder="Pregunta al agente..."
                      className="flex-1"
                    />
                    <Button
                      onClick={handleEnviarChat}
                      disabled={!nuevoMensaje.trim()}
                      className="whitespace-nowrap"
                    >
                      <Icon name="send" className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}