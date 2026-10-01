import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface RevokeSessionsPayload {
  userId?: string; // If not provided, revokes ALL sessions
  excludeCurrentUser?: boolean;
  reason?: string;
  informeId?: string;
}

export async function revokeSessions(supabase: ReturnType<typeof createClient>, payload: RevokeSessionsPayload) {
  const { userId, excludeCurrentUser = true, reason = 'Revocación masiva por incidente de seguridad', informeId } = payload;

  let targetUserIds: string[] = [];

  if (userId) {
    targetUserIds = [userId];
  } else {
    // Get all active users (with sessions in last 24h)
    const { data: activeUsers } = await supabase
      .from('user_sessions')
      .select('user_id')
      .gte('last_activity', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    targetUserIds = [...new Set(activeUsers?.map(u => u.user_id) || [])];
  }

  if (excludeCurrentUser) {
    // We would need to know the current user - for now skip
    // In production, get from auth context
  }

  const results = {
    revoked: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Revoke sessions using Supabase Auth Admin
  for (const uid of targetUserIds) {
    try {
      const { error } = await supabase.auth.admin.signOut(uid);
      if (error) {
        results.failed++;
        results.errors.push(`${uid}: ${error.message}`);
      } else {
        results.revoked++;
      }
    } catch (e) {
      results.failed++;
      results.errors.push(`${uid}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // Also clean up user_sessions table
  if (targetUserIds.length > 0) {
    await supabase
      .from('user_sessions')
      .delete()
      .in('user_id', targetUserIds);
  }

  // Log audit
  await supabase.from('logs_auditoria').insert({
    source: 'agent-actions',
    level: 'warn',
    message: `Sesiones revocadas masivamente: ${results.revoked} exitosas, ${results.failed} fallidas`,
    metadata: { reason, informeId, targetUserIds, results },
  });

  return {
    revoked: results.revoked,
    failed: results.failed,
    errors: results.errors,
    message: `${results.revoked} sesiones revocadas, ${results.failed} fallidas`,
  };
}