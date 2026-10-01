import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../agent-actions/shared/supabase.ts';

interface ReportData {
  period: { start: string; end: string };
  metricas: {
    totalConjuntos: number;
    conjuntosActivos: number;
    conjuntosTrial: number;
    conjuntosPro: number;
    totalUsuarios: number;
    usuariosActivosHoy: number;
    usuariosActivosMes: number;
    ingresosMRR: number;
    churnRate: number;
    alertasBugs: number;
    alertasSeguridad: number;
  };
  funnelTrial: {
    visitantesLanding: number;
    registrosIniciados: number;
    trialsActivados: number;
    trialsConvertidos: number;
    conversionRate: number;
  };
  topConjuntos: Array<{ nombre: string; usuarios: number; mrr: number; plan: string }>;
  alertasCriticas: Array<{ titulo: string; severidad: string; creadoEn: string }>;
  actividadAgentes: {
    sentinel: { alertasHoy: number; ipsBloqueadas: number };
    debug: { excepciones: number; prsCreados: number };
    wald: { flujosTruncados: number; conjuntosEnRiesgo: number };
    behavioral: { patrones: number; recomendaciones: number };
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-CO').format(num);
}

function generateHTMLReport(data: ReportData): string {
  const { period, metricas, funnelTrial, topConjuntos, alertasCriticas, actividadAgentes } = data;
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte Semanal PAIC Admin</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 20px; background: #f9fafb; }
    .container { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 24px; margin-bottom: 32px; }
    .logo { width: 64px; height: 64px; background: #dc2626; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; margin-bottom: 16px; }
    h1 { color: #111827; margin: 0 0 8px; font-size: 28px; }
    .period { color: #6b7280; font-size: 16px; }
    .section { margin-bottom: 32px; }
    .section h2 { color: #1f2937; font-size: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .icon { width: 24px; height: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
    .card { background: #f9fafb; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #e5e7eb; }
    .card-value { font-size: 28px; font-weight: bold; color: #111827; }
    .card-label { font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
    .card.green .card-value { color: #059669; }
    .card.red .card-value { color: #dc2626; }
    .card.blue .card-value { color: #2563eb; }
    .card.amber .card-value { color: #d97706; }
    .alert-list { display: flex; flex-direction: column; gap: 12px; }
    .alert-item { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; }
    .alert-item.high { border-left: 4px solid #dc2626; }
    .alert-item.medium { border-left: 4px solid #f59e0b; }
    .alert-item.low { border-left: 4px solid #3b82f6; }
    .alert-title { font-weight: 600; color: #991b1b; margin-bottom: 4px; }
    .alert-meta { font-size: 13px; color: #6b7280; }
    .activity-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .agent-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
    .agent-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .agent-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; }
    .agent-name { font-weight: 600; font-size: 16px; }
    .metric-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .metric-row:last-child { border-bottom: none; }
    .metric-label { color: #6b7280; font-size: 14px; }
    .metric-value { font-weight: 600; color: #111827; }
    .footer { text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 13px; }
    @media (max-width: 600px) {
      .container { padding: 20px; }
      .grid { grid-template-columns: 1fr; }
      .activity-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">PA</div>
      <h1>Reporte Semanal PAIC Admin</h1>
      <div class="period">${data.period.start} - ${data.period.end}</div>
    </div>

    <!-- KPIs Principales -->
    <div class="section">
      <h2><svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> KPIs Principales</h2>
      <div class="grid">
        <div class="card blue"><div class="card-value">${formatNumber(metricas.totalConjuntos)}</div><div class="card-label">Conjuntos Totales</div></div>
        <div class="card green"><div class="card-value">${formatNumber(metricas.conjuntosPro)}</div><div class="card-label">Activos (Pro)</div></div>
        <div class="card amber"><div class="card-value">${formatNumber(metricas.conjuntosTrial)}</div><div class="card-label">En Trial</div></div>
        <div class="card blue"><div class="card-value">${formatNumber(metricas.totalUsuarios)}</div><div class="card-label">Usuarios Totales</div></div>
        <div class="card green"><div class="card-value">${formatNumber(metricas.usuariosActivosHoy)}</div><div class="card-label">Activos Hoy</div></div>
        <div class="card blue"><div class="card-value">${formatNumber(metricas.usuariosActivosMes)}</div><div class="card-label">Activos Mes</div></div>
        <div class="card green"><div class="card-value">${formatCurrency(metricas.ingresosMRR)}</div><div class="card-label">MRR</div></div>
        <div class="card ${metricas.churnRate > 5 ? 'red' : 'green'}"><div class="card-value">${metricas.churnRate.toFixed(1)}%</div><div class="card-label">Churn Rate</div></div>
      </div>
    </div>

    <!-- Funnel Trial -->
    <div class="section">
      <h2><svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Funnel Trial 14 Días</h2>
      <div class="grid">
        <div class="card blue"><div class="card-value">${formatNumber(funnelTrial.visitantesLanding)}</div><div class="card-label">Visitantes Landing</div></div>
        <div class="card purple"><div class="card-value">${formatNumber(funnelTrial.registrosIniciados)}</div><div class="card-label">Registros Iniciados</div></div>
        <div class="card blue"><div class="card-value">${formatNumber(funnelTrial.trialsActivados)}</div><div class="card-label">Trials Activados</div></div>
        <div class="card green"><div class="card-value">${formatNumber(funnelTrial.trialsConvertidos)}</div><div class="card-label">Convertidos a Pro</div></div>
        <div class="card green"><div class="card-value">${funnelTrial.conversionRate.toFixed(1)}%</div><div class="card-label">Conversión Trial→Pro</div></div>
      </div>
    </div>

    <!-- Top Conjuntos -->
    <div class="section">
      <h2><svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg> Top Conjuntos por MRR</h2>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #f9fafb; text-align: left;">
              <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; text-align: left;">Conjunto</th>
              <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; text-align: right;">Usuarios</th>
              <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; text-align: right;">MRR</th>
              <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; text-align: center;">Plan</th>
            </tr>
          </thead>
          <tbody>
            ${topConjuntos.map(c => `
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 12px; font-weight: 500;">${c.nombre}</td>
                <td style="padding: 12px; text-align: right;">${formatNumber(c.usuarios)}</td>
                <td style="padding: 12px; text-align: right; font-weight: 500;">${formatCurrency(c.mrr)}</td>
                <td style="padding: 12px; text-align: center;"><span style="background: ${c.plan === 'Pro' ? '#dcfce7' : c.plan === 'Trial' ? '#fef3c7' : '#f3f4f6'}; color: ${c.plan === 'Pro' ? '#166534' : c.plan === 'Trial' ? '#92400e' : '#6b7280'}; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500;">${c.plan}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Alertas Críticas -->
    <div class="section">
      <h2><svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> Alertas Críticas (${alertasCriticas.length})</h2>
      <div class="alert-list">
        ${alertasCriticas.length > 0 ? alertasCriticas.map(a => `
          <div class="alert-item ${a.severidad === 'critica' ? 'high' : a.severidad === 'alta' ? 'medium' : 'low'}">
            <div class="alert-title">${a.titulo}</div>
            <div class="alert-meta">Severidad: ${a.severidad} | ${new Date(a.creadoEn).toLocaleString('es-CO')}</div>
          </div>
        `).join('') : '<p style="color: #6b7280; text-align: center; padding: 24px;">✅ No hay alertas críticas esta semana</p>'}
      </div>
    </div>

    <!-- Actividad Agentes -->
    <div class="section">
      <h2><svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg> Actividad de Agentes</h2>
      <div class="activity-grid">
        <div class="agent-card">
          <div class="agent-header"><div class="agent-icon" style="background: #dc2626;">🛡️</div><div class="agent-name">Sentinel</div></div>
          <div class="metric-row"><span class="metric-label">Alertas hoy</span><span class="metric-value">${actividadAgentes.sentinel.alertasHoy}</span></div>
          <div class="metric-row"><span class="metric-label">IPs bloqueadas</span><span class="metric-value">${actividadAgentes.sentinel.ipsBloqueadas}</span></div>
        </div>
        <div class="agent-card">
          <div class="agent-header"><div class="agent-icon" style="background: #f97316;">🐞</div><div class="agent-name">Debug & Patch</div></div>
          <div class="metric-row"><span class="metric-label">Excepciones capturadas</span><span class="metric-value">${actividadAgentes.debug.excepciones}</span></div>
          <div class="metric-row"><span class="metric-label">PRs creados</span><span class="metric-value">${actividadAgentes.debug.prsCreados}</span></div>
        </div>
        <div class="agent-card">
          <div class="agent-header"><div class="agent-icon" style="background: #3b82f6;">✈️</div><div class="agent-name">Wald</div></div>
          <div class="metric-row"><span class="metric-label">Flujos truncados</span><span class="metric-value">${actividadAgentes.wald.flujosTruncados}</span></div>
          <div class="metric-row"><span class="metric-label">Conjuntos en riesgo</span><span class="metric-value">${actividadAgentes.wald.conjuntosEnRiesgo}</span></div>
        </div>
        <div class="agent-card">
          <div class="agent-header"><div class="agent-icon" style="background: #22c55e;">📊</div><div class="agent-name">Behavioral</div></div>
          <div class="metric-row"><span class="metric-label">Patrones detectados</span><span class="metric-value">${actividadAgentes.behavioral.patrones}</span></div>
          <div class="metric-row"><span class="metric-label">Recomendaciones UX</span><span class="metric-value">${actividadAgentes.behavioral.recomendaciones}</span></div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Reporte generado automáticamente por PAIC Agent Command Center</p>
      <p>${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
      <p>PAIC - Plataforma de Administración Inteligente de Copropiedades</p>
    </div>
  </div>
</body>
</html>
  `;
}

serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  const origin = req.headers.get('origin');
  const headers = {
    ...corsHeaders(origin),
    'Content-Type': 'application/json',
  };

  // Verificar que sea una petición programada (cron) o manual autorizada
  const authHeader = req.headers.get('Authorization');
  const cronSecret = req.headers.get('x-cron-secret');
  
  const isCron = cronSecret === Deno.env.get('CRON_SECRET');
  const isManual = authHeader && authHeader.startsWith('Bearer ');
  
  if (!isCron && !isManual) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Calcular período (última semana)
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const period = {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };

    // Obtener métricas principales
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
      supabase.from('pagos').select('monto').gte('created_at', start.toISOString()),
      supabase.from('alertas_bugs').select('*', { count: 'exact', head: true }).in('estado', ['abierta', 'en_progreso']).eq('severidad', 'critica'),
      supabase.from('logs_auditoria').select('*', { count: 'exact', head: true }).eq('source', 'auth').eq('level', 'warn').gte('timestamp', start.toISOString()),
    ]);

    const mrr = pagosRecientes?.reduce((sum, p) => sum + (p.monto || 0), 0) || 0;
    const churnRate = totalConjuntos && totalConjuntos > 0 ? ((totalConjuntos - (conjuntosActivos || 0)) / totalConjuntos) * 100 : 0;

    // Funnel trial
    const [funnelData] = await Promise.all([
      supabase.rpc('get_funnel_trial_7dias'),
    ]);

    // Top conjuntos por MRR
    const { data: topConjuntos } = await supabase
      .from('conjuntos')
      .select('id, nombre, plan, plan_expires_at')
      .eq('estado', 'activo')
      .not('plan_expires_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    // Obtener MRR por conjunto
    const { data: pagosConjuntos } = await supabase
      .from('pagos')
      .select('conjunto_id, monto')
      .eq('estado', 'completado')
      .gte('created_at', start.toISOString());

    const mrrPorConjunto = new Map(pagosConjuntos?.map(p => [p.conjunto_id, p.monto]) || []);

    const topConjuntosFormatted = (topConjuntos || []).map(c => ({
      nombre: c.nombre,
      usuarios: 0, // TODO: calcular
      mrr: mrrPorConjunto.get(c.id) || 0,
      plan: c.plan,
    })).sort((a, b) => b.mrr - a.mrr).slice(0, 10);

    // Alertas críticas
    const { data: alertasCriticas } = await supabase
      .from('alertas_bugs')
      .select('id, titulo, severidad, creado_en')
      .eq('severidad', 'critica')
      .in('estado', ['abierta', 'en_progreso'])
      .order('creado_en', { ascending: false })
      .limit(5);

    // Actividad agentes (mock por ahora - en producción consultar logs_auditoria)
    const actividadAgentes = {
      sentinel: { alertasHoy: 0, ipsBloqueadas: 0 },
      debug: { excepciones: 0, prsCreados: 0 },
      wald: { flujosTruncados: 0, conjuntosEnRiesgo: 0 },
      behavioral: { patrones: 0, recomendaciones: 0 },
    };

    const reportData: ReportData = {
      period,
      metricas: {
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
      },
      funnelTrial: funnelData || {
        visitantesLanding: 0,
        registrosIniciados: 0,
        trialsActivados: 0,
        trialsConvertidos: 0,
        conversionRate: 0,
      },
      topConjuntos: topConjuntosFormatted,
      alertasCriticas: (alertasCriticas || []).map(a => ({
        titulo: a.titulo,
        severidad: a.severidad,
        creadoEn: a.creado_en,
      })),
      actividadAgentes,
    };

    // Generar HTML
    const html = generateHTMLReport(reportData);

    // En producción: enviar por email (Resend/SendGrid) o guardar en storage
    // Por ahora retornamos el HTML
    return new Response(html, {
      status: 200,
      headers: { ...headers, 'Content-Type': 'text/html' },
    });

  } catch (error) {
    console.error('[scheduled-report] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers,
    });
  }
});