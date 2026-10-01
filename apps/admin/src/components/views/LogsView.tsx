import React, { useState } from 'react';
import { Card, Badge, Input, Select } from '@paic/ui';
import { Icon } from '@paic/ui';
import { LogEntry } from '../../types';

const mockLogs: LogEntry[] = [
  { id: '1', timestamp: '2024-12-19T10:30:15Z', level: 'error', source: 'payments', message: 'Webhook MercadoPago falló: timeout al procesar notificación', metadata: { paymentId: 'pay_123', retry: 3 }, conjuntoId: 'torres-norte' },
  { id: '2', timestamp: '2024-12-19T10:28:42Z', level: 'warn', source: 'auth', message: 'Múltiples intentos de login fallidos', metadata: { ip: '190.12.45.67', attempts: 5 }, userId: 'user_456' },
  { id: '3', timestamp: '2024-12-19T10:25:10Z', level: 'info', source: 'api', message: 'Nuevo conjunto creado: Residencial Los Andes', metadata: { plan: 'Trial' }, conjuntoId: 'los-andes' },
  { id: '4', timestamp: '2024-12-19T10:20:05Z', level: 'error', source: 'realtime', message: 'Canal de paquetes desconectado inesperadamente', metadata: { channel: 'package-updates', code: 'CHANNEL_ERROR' }, conjuntoId: 'el-prado' },
  { id: '5', timestamp: '2024-12-19T10:15:33Z', level: 'info', source: 'functions', message: 'Campaña de comunicaciones enviada: 245 destinatarios', metadata: { campaignId: 'camp_789', delivered: 242, failed: 3 } },
  { id: '6', timestamp: '2024-12-19T10:10:01Z', level: 'debug', source: 'storage', message: 'Archivo subido: reglamento-interno.pdf (2.3MB)', metadata: { bucket: 'documents', path: 'el-prado/reglamento.pdf' }, conjuntoId: 'el-prado' },
  { id: '7', timestamp: '2024-12-19T10:05:22Z', level: 'warn', source: 'payments', message: 'Suscripción por expirar en 3 días', metadata: { conjuntoId: 'torres-norte', plan: 'Pro', daysLeft: 3 }, conjuntoId: 'torres-norte' },
];

export function LogsView() {
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterSource, setFilterSource] = useState('all');

  const filtered = mockLogs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchesSource = filterSource === 'all' || log.source === filterSource;
    return matchesSearch && matchesLevel && matchesSource;
  });

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return { variant: 'danger' as const, color: 'bg-red-100 text-red-700' };
      case 'warn': return { variant: 'warning' as const, color: 'bg-amber-100 text-amber-700' };
      case 'info': return { variant: 'success' as const, color: 'bg-blue-100 text-blue-700' };
      default: return { variant: 'default' as const, color: 'bg-gray-100 text-gray-700' };
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
          <Badge variant="success" className="text-sm">LIVE</Badge>
          <Button variant="ghost" size="sm">
            <Icon name="refresh-cw" className="w-4 h-4" /> Actualizar
          </Button>
        </div>
      </div>

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
          <Select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="w-full sm:w-36">
            <option value="all">Todos los niveles</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </Select>
          <Select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="w-full sm:w-36">
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
      </Card>
    </div>
  );
}