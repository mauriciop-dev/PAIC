export interface DueDateLabelStatus {
  overdue: boolean;
  dueSoon: boolean;
}

export const humanizeDueDateLabel = (raw: string, status: DueDateLabelStatus): string => {
  let base = (raw || '').trim();
  if (/^pago\s+/i.test(base)) {
    base = 'Cuota de ' + base.replace(/^pago\s+/i, '');
  }

  if (status.overdue) return `Vencido: ${base || 'Pago'}`;
  if (status.dueSoon) return `Recordatorio: ${base || 'Pago'}`;
  return base ? `${base} Pendiente` : 'Pendiente';
};

export default humanizeDueDateLabel;
