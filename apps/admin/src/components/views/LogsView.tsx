import React, { useState, useEffect, useCallback } from 'react';
import { Card, Badge, Input, Select, Button } from '@paic/ui';
import { Icon } from '@paic/ui';
import { LogEntry } from '../../types';
import { useLogsHistoricos, useLogsRealtime } from '../../hooks/useAdminData';

export function LogsView() {
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<LogEntry['level'] | 'all'>('all');
  const [filterSource, setFilterSource] = useState<LogEntry['source'] | 'all'>('all');

  const { data: logsHistoricos, loading, error, refetch } = useLogsHistoricos({
    level: filterLevel === 'all' ? undefined : filterLevel,
    source: filterSource === 'all' ? undefined : filterSource,
    limite: 200,
  });

  const { logs: logsRealtime, connected } = useLogsRealtime({
    level: filterLevel === 'all' ? undefined : filterLevel,
    source: filterSource === 'all' ? undefined : filterSource,
  });

  // Combinar logs históricos + tiempo real (evitar duplicados por ID)
  const allLogs = useCallback(() => {
    const historicos = logsHistoricos || [];
    const realtime = logsRealtime || [];
    const map = new Map<string, LogEntry>();
    [...historicos, ...realtime].forEach(log => map.set(log.id, log));
    return Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logsHistoricos, logsRealtime]);

  const filtered = allLogs().filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchesSource = filterSource === 'all' || log.source === filterSource;
    return matchesSearch && matchesLevel && matchesSource;
  });

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return { color: 'bg-red-100 text-red-700' };
      case 'warn': return { color: 'bg-amber-100 text-amber-700' };
      case 'info': return { color: 'bg-blue-100 text-blue-700' };
      default: return { color: 'bg-gray-100 text-gray-700' };
    }
  };

  const getSourceIcon = (source: LogEntry['source']) => {
    switch (source) {
      case 'auth': return 'shield';
      case 'payments': return 'credit-card';
      case 'api': return 'globe';
      case 'realtime': return 'wifi';
      case 'storage': return 'database';
      default: return 'terminal';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs de Plataforma</h1>
          <p className="text-gray-500 mt-1">Monitoreo y debugging en tiempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connected ? 'success' : 'default'} className="text-sm">
            {connected ? 'LIVE' : 'OFFLINE'}
          </Badge>
          <Button variant="ghost" size="sm" onClick={refetch}>
            <Icon name="refresh-cw" className="w-4 h-4" /> Actualizar
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-3 border-red-200 bg-red-50 mb-4">
          <div className="flex items-center gap-3">
            <Icon name="alert-triangle" className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={refetch}>
              Reintentar
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar en logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Icon name="search" className="w-4 h-4 text-gray-400" />}
            />
          </div>
          <Select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value as any)} className="w-full sm:w-36">
            <option value="all">Todos los niveles</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </Select>
          <Select value={filterSource} onChange={(e) => setFilterSource(e.target.value as any)} className="w-full sm:w-36">
            <option value="all">Todas las fuentes</option>
            <option value="auth">Auth</option>
            <option value="payments">Payments</option>
            <option value="api">API</option>
            <option value="realtime">Realtime</option>
            <option value="storage">Storage</option>
            <option value="functions">Functions</option>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading && (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-gray-500">Cargando logs...</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nivel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fuente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mensaje</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contexto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono text-xs">
              {filtered.map((log) => {
                const level = getLevelBadge(log.level);
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('es-CO', { hour12: false })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${level.color}`}>
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        <Icon name={getSourceIcon(log.source)} className="w-3 h-3" />
                        {log.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 max-w-md truncate">{log.message}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {log.conjuntoId && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">{log.conjuntoId}</span>}
                      {log.userId && <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] ml-1">{log.userId}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(filtered.length === 0 && !loading) && (
          <div className="p-8 text-center text-gray-500">
            <Icon name="filter" className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p>No se encontraron logs con los filtros actuales</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function getLevelBadge(level: LogEntry['level']) {
  switch (level) {
    case 'error': return { color: 'bg-red-100 text-red-700' };
    case 'warn': return { color: 'bg-amber-100 text-amber-700' };
    case 'info': return { color: 'bg-blue-100 text-blue-700' };
    default: return { color: 'bg-gray-100 text-gray-700' };
  }
}

function getSourceIcon(source: LogEntry['source']) {
  switch (source) {
    case 'auth': return 'shield';
    case 'payments': return 'credit-card';
    case 'api': return 'globe';
    case 'realtime': return 'wifi';
    case 'storage': return 'database';
    default: return 'terminal';
  }
}