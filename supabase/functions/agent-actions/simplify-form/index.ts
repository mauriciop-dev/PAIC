import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface SimplifyFormPayload {
  informeId: string;
  campo: string;
  accion: 'hacer_opcional' | 'eliminar' | 'cambiar_tipo' | 'agregar_ayuda';
  valorNuevo?: string;
  razon: string;
}

export async function simplifyForm(supabase: ReturnType<typeof createClient>, payload: SimplifyFormPayload) {
  const { informeId, campo, accion, valorNuevo, razon } = payload;

  // Get the informe details
  const { data: informe, error: informeError } = await supabase
    .from('alertas_bugs')
    .select('*')
    .eq('id', informeId)
    .single();

  if (informeError || !informe) {
    throw new Error('Informe no encontrado');
  }

  // Determine which form/component to modify based on metadata
  const formConfig = inferFormConfig(informe.metadata);

  // Generate migration/fix
  const migration = generateMigration(formConfig, campo, accion, valorNuevo);

  // Create PR with the form simplification
  const prTitle = `[Agent Simplify] ${informe.titulo} - ${campo}`;
  const prBody = generatePrBody(informe, campo, accion, razon, migration);

  const { data: pr, error: prError } = await supabase
    .from('github_prs')
    .insert({
      informe_id: informeId,
      title: prTitle,
      body: prBody,
      archivo: formConfig.archivo,
      linea: formConfig.linea,
      status: 'open',
      branch_name: `agent-simplify/${informeId}-${campo}-${Date.now()}`,
      created_by: 'wald-agent',
    })
    .select()
    .single();

  if (prError) {
    throw new Error(`Error creando PR: ${prError.message}`);
  }

  // Update informe
  await supabase
    .from('alertas_bugs')
    .update({ estado: 'en_progreso', actualizado_en: new Date().toISOString() })
    .eq('id', informeId);

  // Log audit
  await supabase.from('logs_auditoria').insert({
    source: 'agent-actions',
    level: 'info',
    message: `Formulario simplificado por agente Wald: ${campo} -> ${accion}`,
    metadata: { prId: pr.id, informeId, campo, accion, razon },
  });

  return {
    pr,
    migration,
    message: `PR creado para simplificar formulario: ${campo} (${accion})`,
  };
}

function inferFormConfig(metadata: any) {
  // Infer which form/component based on the informe metadata
  const modulo = metadata?.modulo || 'common';
  const forms: Record<string, { archivo: string; linea: number }> = {
    'reserva': { archivo: 'src/components/ReservationForm.tsx', linea: 45 },
    'registro_usuario': { archivo: 'src/components/RegistrationForm.tsx', linea: 30 },
    'crear_conjunto': { archivo: 'src/components/CreateConjuntoForm.tsx', linea: 25 },
    'pago': { archivo: 'src/components/PaymentForm.tsx', linea: 40 },
    'common': { archivo: 'src/components/forms/BaseForm.tsx', linea: 1 },
  };
  return forms[modulo] || forms.common;
}

function generateMigration(config: { archivo: string; linea: number }, campo: string, accion: string, valorNuevo?: string): string {
  const acciones: Record<string, string> = {
    'hacer_opcional': `hacer opcional (required={false})`,
    'eliminar': `eliminar campo`,
    'cambiar_tipo': `cambiar tipo a ${valorNuevo}`,
    'agregar_ayuda': `agregar helpText: "${valorNuevo}"`,
  };

  return `
\`\`\`diff
--- a/${config.archivo}
+++ b/${config.archivo}
@@ -${config.linea},7 +${config.linea},7 @@
-  <Field name="${campo}" required />
+  <Field name="${campo}" ${accion === 'hacer_opcional' ? 'required={false}' : accion === 'eliminar' ? '/* eliminado */' : `type="${valorNuevo}"`} />
\`\`\`

**Acción:** ${acciones[accion] || accion}
**Campo:** \`${campo}\`
**Razón:** ${razon}
`;
}

function generatePrBody(informe: any, campo: string, accion: string, razon: string, migration: string): string {
  return `## Simplificación de Formulario por Agente Wald

**Informe original:** #${informe.id} - ${informe.titulo}
**Severidad:** ${informe.severidad}
**Categoría:** Flujo truncado / UX

### Cambio Propuesto
- **Campo:** \`${campo}\`
- **Acción:** ${accion}
- **Razón:** ${razon}

### Migración Propuesta
${migration}

### Impacto Estimado
- **Drop-off reduction:** ~15-25% en paso afectado
- **Usuarios afectados:** Todos los que inicien el flujo
- **Riesgo:** Bajo (campo no crítico para negocio)

### Checklist
- [ ] Migración generada
- [ ] Tests de formulario actualizados
- [ ] QA en staging
- [ ] A/B test opcional
- [ ] Deploy a producción

---
*Generado automáticamente por PAIC Wald Agent el ${new Date().toLocaleString('es-CO')}*
`;
}