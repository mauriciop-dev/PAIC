import { supabase } from '@paic/supabase';
import { MetricasPlataforma, ConjuntoAdmin, UsuarioPlataforma, LogEntry, AlertaBug } from '../types';

class AdminApiService {
  // ============================================
  // MÉTRICAS GLOBALES (Dashboard Principal)
  // ============================================
  async getMetricasPlataforma(): Promise<MetricasPlataforma> {
    const [
      { count: totalConjuntos },
      { count: conjuntosActivos },
      { count: conjuntosTrial },
      { count: conjuntosPro },
      { count: totalUsuarios },
      { data: usuariosHoy },
      { data: usuariosMes },
      { data: pagosRecientes },
      { count: alertasBugs },
      { count: alertasSeguridad },
    ] = await Promise.all([
      supabase.from('conjuntos').select('*', { count: 'exact', head: true }),
      supabase.from('conjuntos').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
      supabase.from('conjuntos').select('*', { count: 'exact', head: true }).eq('plan', 'Trial'),
      supabase.from('conjuntos').select('*', { count: 'exact', head: true }).eq('plan', 'Pro'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.rpc('get_usuarios_activos_hoy'),
      supabase.rpc('get_usuarios_activos_mes'),
      supabase.from('pagos').select('monto').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('alertas_bugs').select('*', { count: 'exact', head: true }).in('estado', ['abierta', 'en_progreso']),
      supabase.from('logs_auditoria').select('*', { count: 'exact', head: true }).eq('source', 'auth').eq('level', 'warn').gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const mrr = pagosRecientes?.reduce((sum, p) => sum + (p.monto || 0), 0) || 0;
    const churnRate = totalConjuntos && totalConjuntos > 0 
      ? ((totalConjuntos - (conjuntosActivos || 0)) / totalConjuntos) * 100 
      : 0;

    return {
      totalConjuntos: totalConjuntos || 0,
      conjuntosActivos: conjuntosActivos || 0,
      conjuntosTrial: conjuntosTrial || 0,
      conjuntosPro: conjuntosPro || 0,
      totalUsuarios: totalUsuarios || 0,
      usuariosActivosHoy: usuariosHoy?.[0]?.count || 0,
      usuariosActivosMes: usuariosMes?.[0]?.count || 0,
      ingresosMRR: mrr,
      churnRate: Math.round(churnRate * 10) / 10,
      alertasBugs: alertasBugs || 0,
      alertasSeguridad: alertasSeguridad || 0,
    };
  }

  // ============================================
  // FUNNEL TRIAL 14 DÍAS
  // ============================================
  async getFunnelTrial(): Promise<{
    visitantesLanding: number;
    registrosIniciados: number;
    registrosCompletados: number;
    trialsActivados: number;
    trialsConvertidos: number;
    trialsExpirados: number;
    conversionRate: number;
    retentionD7: number;
    retentionD30: number;
    cohortes: Array<{
      mes: string;
      nuevos: number;
      activosD7: number;
      activosD30: number;
      convertidos: number;
    }>;
  }> {
    const treintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const catorceDiasAtras = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: visitantes },
      { data: registros },
      { data: trials },
      { data: pagos },
      { data: cohortesData },
    ] = await Promise.all([
      supabase.from('analytics_eventos').select('*', { count: 'exact', head: true }).eq('evento', 'landing_visit').gte('timestamp', treintaDiasAtras),
      supabase.from('auth.users').select('id', { count: 'exact' }).gte('created_at', treintaDiasAtras),
      supabase.from('conjuntos').select('id, plan, created_at, plan_expires_at').gte('created_at', treintaDiasAtras).in('plan', ['Trial', 'Pro']),
      supabase.from('pagos').select('conjunto_id, monto, created_at').gte('created_at', catorceDiasAtras).eq('estado', 'completado'),
      supabase.rpc('get_cohortes_trial_30dias'),
    ]);

    const trialsActivados = trials?.filter(t => t.plan === 'Trial').length || 0;
    const trialsConvertidos = trials?.filter(t => t.plan === 'Pro').length || 0;
    const trialsExpirados = trials?.filter(t => t.plan === 'Trial' && t.plan_expires_at && new Date(t.plan_expires_at) < new Date()).length || 0;

    return {
      visitantesLanding: visitantes?.count || 0,
      registrosIniciados: registros?.count || 0,
      registrosCompletados: Math.floor((registros?.count || 0) * 0.7), // estimado
      trialsActivados,
      trialsConvertidos,
      trialsExpirados,
      conversionRate: trialsActivados > 0 ? Math.round((trialsConvertidos / trialsActivados) * 1000) / 10 : 0,
      retentionD7: 68, // TODO: calcular real
      retentionD30: 45, // TODO: calcular real
      cohortes: cohortesData || [],
    };
  }

  // ============================================
  // COHORTES: MONOCONJUNTO vs MULTICONJUNTO
  // ============================================
  async getAnalisisPerfilAdmin(): Promise<{
    monoconjunto: { count: number; modulosPromedio: number; adopcionPWA: number; mrrPromedio: number };
    multiconjunto: { count: number; modulosPromedio: number; adopcionPWA: number; mrrPromedio: number };
    comparativa: Array<{ metrica: string; mono: number; multi: number; diff: number }>;
  }> {
    const { data: admins } = await supabase
      .from('conjuntos')
      .select('id, admin_id, plan, created_at')
      .eq('estado', 'activo');

    const adminConConjuntos = admins?.reduce((acc, c) => {
      acc[c.admin_id] = (acc[c.admin_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const multiconjuntoIds = Object.entries(adminConConjuntos).filter(([, count]) => count > 1).map(([id]) => id);
    const monoconjuntoIds = Object.entries(adminConConjuntos).filter(([, count]) => count === 1).map(([id]) => id);

    const [monoData, multiData] = await Promise.all([
      this.getMetricasPorAdmins(monoconjuntoIds),
      this.getMetricasPorAdmins(multiconjuntoIds),
    ]);

    return {
      monoconjunto: monoData,
      multiconjunto: multiData,
      comparativa: [
        { metrica: 'Conjuntos por admin', mono: 1, multi: Object.values(adminConConjuntos).filter(c => c > 1).reduce((a, b) => a + b, 0) / (multiconjuntoIds.length || 1), diff: 0 },
        { metrica: 'Módulos activos', mono: monoData.modulosPromedio, multi: multiData.modulosPromedio, diff: multiData.modulosPromedio - monoData.modulosPromedio },
        { metrica: 'Adopción PWA %', mono: monoData.adopcionPWA, multi: multiData.adopcionPWA, diff: multiData.adopcionPWA - monoData.adopcionPWA },
        { metrica: 'MRR promedio', mono: monoData.mrrPromedio, multi: multiData.mrrPromedio, diff: multiData.mrrPromedio - monoData.mrrPromedio },
      ],
    };
  }

  private async getMetricasPorAdmins(adminIds: string[]) {
    if (!adminIds.length) return { count: 0, modulosPromedio: 0, adopcionPWA: 0, mrrPromedio: 0 };

    const { data: conjuntos } = await supabase
      .from('conjuntos')
      .select('id, plan, admin_id')
      .in('admin_id', adminIds)
      .eq('estado', 'activo');

    const conjuntoIds = conjuntos?.map(c => c.id) || [];
    
    const [{ count: modulosActivos }, { data: pwaUsage }, { data: pagos }] = await Promise.all([
      supabase.from('modulo_uso').select('*', { count: 'exact', head: true }).in('conjunto_id', conjuntoIds).gte('ultimo_uso', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('pwa_sesiones').select('conjunto_id').in('conjunto_id', conjuntoIds).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('pagos').select('monto, conjunto_id').in('conjunto_id', conjuntoIds).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const mrr = pagos?.reduce((sum, p) => sum + (p.monto || 0), 0) || 0;
    const conjuntosUnicos = new Set(pwaUsage?.map(u => u.conjunto_id) || []).size;

    return {
      count: adminIds.length,
      modulosPromedio: Math.round((modulosActivos || 0) / (conjuntoIds.length || 1)),
      adopcionPWA: conjuntoIds.length > 0 ? Math.round((conjuntosUnicos / conjuntoIds.length) * 100) : 0,
      mrrPromedio: adminIds.length > 0 ? Math.round(mrr / adminIds.length) : 0,
    };
  }

  // ============================================
  // ADOPCIÓN PWA PORTERÍA / RESIDENTES
  // ============================================
  async getAdopcionPWA(): Promise<{
    porteria: { activosHoy: number; activosSemana: number; sesionesPromedio: number; conjuntosConPorteria: number };
    residentes: { activosHoy: number; activosSemana: number; reservasMes: number; paquetesRecibidos: number };
    porConjunto: Array<{ conjuntoId: string; nombre: string; porteriaActiva: boolean; residentesActivos: number; modulosUsados: number }>;
  }> {
    const [porteriaData, residentesData, conjuntosData] = await Promise.all([
      supabase.from('porteria_sesiones').select('conjunto_id, created_at').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('pwa_sesiones').select('conjunto_id, created_at').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('conjuntos').select('id, nombre, estado').eq('estado', 'activo'),
    ]);

    const porteriaUnicos = new Set(porteriaData?.data?.map(s => s.conjunto_id) || []).size;
    const residentesUnicos = new Set(residentesData?.data?.map(s => s.conjunto_id) || []).size;

    const porConjunto = (conjuntosData?.data || []).map(c => ({
      conjuntoId: c.id,
      nombre: c.nombre,
      porteriaActiva: porteriaUnicos.has(c.id),
      residentesActivos: (residentesData?.data?.filter(r => r.conjunto_id === c.id).length || 0),
      modulosUsados: 0, // TODO: calcular
    }));

    return {
      porteria: {
        activosHoy: porteriaData?.data?.filter(s => new Date(s.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length || 0,
        activosSemana: porteriaUnicos,
        sesionesPromedio: porteriaData?.data?.length || 0,
        conjuntosConPorteria: porteriaUnicos,
      },
      residentes: {
        activosHoy: residentesData?.data?.filter(s => new Date(s.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length || 0,
        activosSemana: residentesUnicos,
        reservasMes: 0, // TODO
        paquetesRecibidos: 0, // TODO
      },
      porConjunto,
    };
  }

  // ============================================
  // CONJUNTOS Y USUARIOS (con filtros reales)
  // ============================================
  async getConjuntos(filtros: { busqueda?: string; plan?: string; estado?: string; pagina?: number; porPagina?: number } = {}): Promise<{ data: ConjuntoAdmin[]; total: number }> {
    let query = supabase.from('conjuntos').select(`
      id, nombre, slug, plan, estado, created_at, plan_expires_at,
      admin:profiles!conjuntos_admin_id_fkey(email, full_name),
      usuarios_count:usuarios(count),
      unidades_count:unidades(count)
    `, { count: 'exact' });

    if (filtros.busqueda) {
      query = query.or(`nombre.ilike.%${filtros.busqueda}%,slug.ilike.%${filtros.busqueda}%`);
    }
    if (filtros.plan && filtros.plan !== 'all') query = query.eq('plan', filtros.plan);
    if (filtros.estado && filtros.estado !== 'all') query = query.eq('estado', filtros.estado);

    const pagina = filtros.pagina || 1;
    const porPagina = filtros.porPagina || 20;
    query = query.range((pagina - 1) * porPagina, pagina * porPagina - 1).order('created_at', { ascending: false });

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []).map(c => ({
        id: c.id,
        nombre: c.nombre,
        slug: c.slug,
        plan: c.plan,
        estado: c.estado,
        usuariosCount: c.usuarios_count?.[0]?.count || 0,
        unidadesCount: c.unidades_count?.[0]?.count || 0,
        createdAt: c.created_at,
        expiresAt: c.plan_expires_at,
        adminEmail: c.admin?.email || '',
        adminName: c.admin?.full_name || '',
      })),
      total: count || 0,
    };
  }

  async getUsuarios(filtros: { busqueda?: string; rol?: string; estado?: string; pagina?: number; porPagina?: number } = {}): Promise<{ data: UsuarioPlataforma[]; total: number }> {
    let query = supabase.from('profiles').select(`
      id, email, full_name, rol, estado, created_at, ultimo_acceso,
      membresias:membresias(conjunto_id)
    `, { count: 'exact' });

    if (filtros.busqueda) {
      query = query.or(`full_name.ilike.%${filtros.busqueda}%,email.ilike.%${filtros.busqueda}%`);
    }
    if (filtros.rol && filtros.rol !== 'all') query = query.eq('rol', filtros.rol);
    if (filtros.estado && filtros.estado !== 'all') query = query.eq('estado', filtros.estado);

    const pagina = filtros.pagina || 1;
    const porPagina = filtros.porPagina || 20;
    query = query.range((pagina - 1) * porPagina, pagina * porPagina - 1).order('created_at', { ascending: false });

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []).map(u => ({
        id: u.id,
        email: u.email,
        nombre: u.full_name,
        rol: u.rol,
        conjuntos: u.membresias?.map((m: any) => m.conjunto_id) || [],
        ultimoAcceso: u.ultimo_acceso || u.created_at,
        estado: u.estado,
        createdAt: u.created_at,
      })),
      total: count || 0,
    };
  }

  // ============================================
  // LOGS EN TIEMPO REAL (Supabase Realtime)
  // ============================================
  suscribirLogs(callback: (log: LogEntry) => void, filtros?: { source?: string; level?: string }) {
    let channel = supabase.channel('admin-logs-realtime');

    channel = channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'logs_auditoria',
        filter: filtros?.source ? `source=eq.${filtros.source}` : undefined,
      },
      (payload) => {
        callback(payload.new as LogEntry);
      }
    );

    if (filtros?.level) {
      channel = channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'logs_auditoria',
          filter: `level=eq.${filtros.level}`,
        },
        (payload) => {
          callback(payload.new as LogEntry);
        }
      );
    }

    channel.subscribe();
    return () => supabase.removeChannel(channel);
  }

  async getLogsHistoricos(filtros: { source?: string; level?: string; conjuntoId?: string; desde?: string; hasta?: string; limite?: number } = {}): Promise<LogEntry[]> {
    let query = supabase.from('logs_auditoria').select('*').order('timestamp', { ascending: false }).limit(filtros.limite || 100);

    if (filtros.source) query = query.eq('source', filtros.source);
    if (filtros.level) query = query.eq('level', filtros.level);
    if (filtros.conjuntoId) query = query.eq('conjunto_id', filtros.conjuntoId);
    if (filtros.desde) query = query.gte('timestamp', filtros.desde);
    if (filtros.hasta) query = query.lte('timestamp', filtros.hasta);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // ============================================
  // SUSCRIPCIONES Y FINANZAS
  // ============================================
  async getSuscripcionesProximasVencer(dias: number = 30): Promise<Array<{
    conjuntoId: string;
    nombre: string;
    plan: string;
    vence: string;
    monto: number;
    estado: 'ok' | 'urgente' | 'trial' | 'vencido';
  }>> {
    const fechaLimite = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('conjuntos')
      .select('id, nombre, plan, plan_expires_at')
      .eq('estado', 'activo')
      .not('plan_expires_at', 'is', null)
      .lte('plan_expires_at', fechaLimite)
      .order('plan_expires_at', { ascending: true });

    if (error) throw error;

    const { data: pagos } = await supabase
      .from('pagos')
      .select('conjunto_id, monto')
      .in('conjunto_id', data?.map(d => d.id) || [])
      .eq('estado', 'completado')
      .order('created_at', { ascending: false });

    const ultPagoPorConjunto = new Map(pagos?.map(p => [p.conjunto_id, p.monto]) || []);

    return (data || []).map(c => {
      const diasRestantes = Math.ceil((new Date(c.plan_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      let estado: 'ok' | 'urgente' | 'trial' | 'vencido' = 'ok';
      if (diasRestantes <= 0) estado = 'vencido';
      else if (diasRestantes <= 7) estado = 'urgente';
      else if (c.plan === 'Trial') estado = 'trial';

      return {
        conjuntoId: c.id,
        nombre: c.nombre,
        plan: c.plan,
        vence: c.plan_expires_at,
        monto: ultPagoPorConjunto.get(c.id) || 0,
        estado,
      };
    });
  }

  // ============================================
  // ALERTAS DE BUGS
  // ============================================
  async getAlertasBugs(): Promise<AlertaBug[]> {
    const { data, error } = await supabase
      .from('alertas_bugs')
      .select('*')
      .in('estado', ['abierta', 'en_progreso'])
      .order('severidad', { ascending: false })
      .order('creado_en', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ============================================
  // EDGE FUNCTIONS: AGENT ACTIONS
  // ============================================
  async executeAgentAction(action: string, payload: Record<string, unknown>): Promise<{ success: boolean; data?: any; error?: string }> {
    const { data, error } = await supabase.functions.invoke('agent-actions/execute-action', {
      body: { action, payload },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true, data: data?.data };
  }

  // Convenience methods for each action
  async blockIp(payload: { ip: string; duration?: string; reason?: string; informeId?: string }) {
    return this.executeAgentAction('block_ip', payload);
  }

  async createPrFix(payload: { informeId: string; archivo: string; linea: number; errorMessage: string; stackTrace?: string; suggestedFix?: string }) {
    return this.executeAgentAction('create_pr_fix', payload);
  }

  async simplifyForm(payload: { informeId: string; campo: string; accion: string; valorNuevo?: string; razon: string }) {
    return this.executeAgentAction('simplify_form', payload);
  }
}

export const adminApi = new AdminApiService();