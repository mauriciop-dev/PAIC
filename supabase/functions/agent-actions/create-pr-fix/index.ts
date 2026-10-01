import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface CreatePrFixPayload {
  informeId: string;
  archivo: string;
  linea: number;
  errorMessage: string;
  stackTrace?: string;
  suggestedFix?: string;
}

export async function createPrFix(supabase: ReturnType<typeof createClient>, payload: CreatePrFixPayload) {
  const { informeId, archivo, linea, errorMessage, stackTrace, suggestedFix } = payload;

  // Get the informe details
  const { data: informe, error: informeError } = await supabase
    .from('alertas_bugs')
    .select('*')
    .eq('id', informeId)
    .single();

  if (informeError || !informe) {
    throw new Error('Informe no encontrado');
  }

  // Generate PR title and body
  const prTitle = `[Agent Fix] ${informe.titulo}`;
  const prBody = generatePrBody(informe, archivo, linea, errorMessage, stackTrace, suggestedFix);

  // In production: call GitHub API to create PR
  // For now, simulate by creating a record in a 'github_prs' table
  const { data: pr, error: prError } = await supabase
    .from('github_prs')
    .insert({
      informe_id: informeId,
      title: prTitle,
      body: prBody,
      archivo,
      linea,
      status: 'open',
      branch_name: `agent-fix/${informeId}-${Date.now()}`,
      created_by: 'debug-agent',
    })
    .select()
    .single();

  if (prError) {
    throw new Error(`Error creando PR: ${prError.message}`);
  }

  // Update informe status
  await supabase
    .from('alertas_bugs')
    .update({ estado: 'en_progreso', actualizado_en: new Date().toISOString() })
    .eq('id', informeId);

  // Log audit
  await supabase.from('logs_auditoria').insert({
    source: 'agent-actions',
    level: 'info',
    message: `PR creado por agente Debug: ${prTitle}`,
    metadata: { prId: pr.id, informeId, archivo, linea },
  });

  return {
    pr,
    message: `PR creado: ${prTitle}`,
    githubUrl: `https://github.com/mauriciop-dev/PAIC/pull/${pr.id}`, // simulado
  };
}

function generatePrBody(informe: any, archivo: string, linea: number, errorMessage: string, stackTrace?: string, suggestedFix?: string): string {
  return `## Fix Automático por Agente Debug & Patch

**Informe original:** #${informe.id} - ${informe.titulo}
**Severidad:** ${informe.severidad}
**Categoría:** ${informe.categoria}

### Detalles del Error
- **Archivo:** \`${archivo}\`
- **Línea:** ${linea}
- **Error:** ${errorMessage}

${stackTrace ? `### Stack Trace
\`\`\`
${stackTrace}
\`\`\`
` : ''}

### Fix Sugerido
${suggestedFix ? `
\`\`\`diff
${suggestedFix}
\`\`\`
` : '_El agente generará el fix basado en el análisis del código._'}

### Checklist
- [ ] Fix implementado
- [ ] Tests actualizados
- [ ] Code review aprobado
- [ ] Deploy a staging
- [ ] Verificación en producción

---
*Generado automáticamente por PAIC Debug Agent el ${new Date().toLocaleString('es-CO')}*
`;
}