import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface BlockIpPayload {
  ip: string;
  duration?: string; // e.g., '24h', '7d', '30d'
  reason?: string;
  informeId?: string;
}

export async function blockIp(supabase: ReturnType<typeof createClient>, payload: BlockIpPayload) {
  const { ip, duration = '24h', reason = 'Bloqueo automático por agente Sentinel', informeId } = payload;

  // Validate IP format
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ip)) {
    throw new Error('Formato de IP inválido');
  }

  // Parse duration to seconds
  const durationMs = parseDuration(duration);
  const expiresAt = new Date(Date.now() + durationMs).toISOString();

  // Insert into blocked_ips table
  const { data: blockedIp, error: insertError } = await supabase
    .from('blocked_ips')
    .insert({
      ip,
      reason,
      expires_at: expiresAt,
      created_by: 'sentinel-agent',
      informe_id: informeId,
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Error bloqueando IP: ${insertError.message}`);
  }

  // Log audit
  await supabase.from('logs_auditoria').insert({
    source: 'agent-actions',
    level: 'info',
    message: `IP bloqueada por agente Sentinel: ${ip} por ${duration}`,
    metadata: { ip, duration, reason, informeId, blockedIpId: blockedIp.id },
  });

  return {
    blockedIp,
    message: `IP ${ip} bloqueada por ${duration}`,
  };
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([hdw])$/);
  if (!match) return 24 * 60 * 60 * 1000; // default 24h

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}