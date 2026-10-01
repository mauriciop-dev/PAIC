import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/adminApi';
import { MetricasPlataforma, ConjuntoAdmin, UsuarioPlataforma, LogEntry, AlertaBug } from '../types';

export function useMetricasPlataforma() {
  const [data, setData] = useState<MetricasPlataforma | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const metricas = await adminApi.getMetricasPlataforma();
      setData(metricas);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando métricas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useFunnelTrial() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const funnel = await adminApi.getFunnelTrial();
      setData(funnel);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando funnel');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useAnalisisPerfilAdmin() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const analisis = await adminApi.getAnalisisPerfilAdmin();
      setData(analisis);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando análisis de perfiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useAdopcionPWA() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const adopcion = await adminApi.getAdopcionPWA();
      setData(adopcion);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando adopción PWA');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useConjuntos(filtros: { busqueda?: string; plan?: string; estado?: string; pagina?: number; porPagina?: number } = {}) {
  const [data, setData] = useState<{ data: ConjuntoAdmin[]; total: number }>({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getConjuntos(filtros);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando conjuntos');
    } finally {
      setLoading(false);
    }
  }, [filtros.busqueda, filtros.plan, filtros.estado, filtros.pagina]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useUsuarios(filtros: { busqueda?: string; rol?: string; estado?: string; pagina?: number; porPagina?: number } = {}) {
  const [data, setData] = useState<{ data: UsuarioPlataforma[]; total: number }>({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getUsuarios(filtros);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  }, [filtros.busqueda, filtros.rol, filtros.estado, filtros.pagina]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useLogsRealtime(filtros?: { source?: string; level?: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsub = adminApi.suscribirLogs((log) => {
      setLogs(prev => [log, ...prev].slice(0, 200));
    }, filtros);
    setConnected(true);
    return () => { unsub(); setConnected(false); };
  }, [filtros?.source, filtros?.level]);

  return { logs, connected };
}

export function useLogsHistoricos(filtros: { source?: string; level?: string; conjuntoId?: string; desde?: string; hasta?: string; limite?: number } = {}) {
  const [data, setData] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const logs = await adminApi.getLogsHistoricos(filtros);
      setData(logs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando logs');
    } finally {
      setLoading(false);
    }
  }, [filtros.source, filtros.level, filtros.conjuntoId, filtros.desde, filtros.hasta, filtros.limite]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useSuscripcionesProximas(dias: number = 30) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const subs = await adminApi.getSuscripcionesProximasVencer(dias);
      setData(subs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando suscripciones');
    } finally {
      setLoading(false);
    }
  }, [dias]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useAlertasBugs() {
  const [data, setData] = useState<AlertaBug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const alertas = await adminApi.getAlertasBugs();
      setData(alertas);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando alertas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}