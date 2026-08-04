import { apiService } from '../services/apiService';
import type { RecordOption } from '../components/chatbot/chatbotMenu';

export interface ListPayload {
  columns: string[];
  rows: (string | number)[][];
}

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

const loaders: Record<string, (conjuntoId: string) => Promise<RecordOption[]>> = {
  'residents': async (c) =>
    (await apiService.fetchResidents(c)).map(r => ({ value: r.apartment, label: `Apto ${r.apartment} · ${r.name}`, record: r })),
  'providers': async (c) =>
    (await apiService.fetchProviders(c)).map(p => ({ value: p.id, label: p.company, record: p })),
  'staff': async (c) =>
    (await apiService.fetchInternalStaff(c)).map(s => ({ value: s.name, label: s.name, record: s })),
  'reservations': async (c) =>
    (await apiService.fetchReservations(c)).map(r => ({
      value: r.id,
      label: `${r.commonAreaId} · ${r.date} ${r.startTime} · Apto ${r.apartment}`,
      record: r,
    })),
  'visitors': async (c) =>
    (await apiService.fetchVisitorLogs(c)).map(v => ({
      value: v.id,
      label: `${v.visitorName} · Apto ${v.apartment} · ${v.date}`,
      record: v,
    })),
  'duedates': async (c) =>
    (await apiService.fetchDueDates(c)).map(d => ({ value: d.id, label: `${d.item} · ${d.dueDate}`, record: d })),
  'tasks': async (c) =>
    (await apiService.fetchTasks(c)).map(t => ({ value: t.id, label: t.text, record: t })),
  'areas': async (c) =>
    (await apiService.fetchCommonAreas(c)).map(a => ({ value: a.id, label: a.name, record: a })),
  'areas-name': async (c) =>
    (await apiService.fetchCommonAreas(c)).map(a => ({ value: a.name, label: a.name, record: a })),
};

const executors: Record<
  string,
  (conjuntoId: string, values: Record<string, any>, record?: RecordOption) => Promise<string>
> = {
  'resident-add': async (c, v) => {
    await apiService.addResident(c, { apartment: v.apartment, name: v.name, email: v.email, phone: v.phone });
    return 'Residente agregado correctamente.';
  },
  'resident-edit': async (c, v, r) => {
    await apiService.updateResident(c, { ...r!.record, name: v.name, email: v.email, phone: v.phone });
    return 'Residente actualizado correctamente.';
  },
  'resident-delete': async (c, _v, r) => {
    await apiService.deleteResident(c, r!.record.apartment);
    return 'Residente eliminado.';
  },
  'provider-add': async (c, v) => {
    await apiService.addProvider(c, { company: v.company, specialty: v.specialty, email: v.email, phone: v.phone });
    return 'Proveedor agregado correctamente.';
  },
  'provider-edit': async (c, v, r) => {
    await apiService.updateProvider(c, { ...r!.record, company: v.company, specialty: v.specialty, email: v.email, phone: v.phone });
    return 'Proveedor actualizado correctamente.';
  },
  'provider-delete': async (c, _v, r) => {
    await apiService.deleteProvider(c, r!.record.id);
    return 'Proveedor eliminado.';
  },
  'staff-add': async (c, v) => {
    await apiService.addInternalStaff(c, { name: v.name, position: v.position, email: v.email, phone: v.phone });
    return 'Personal agregado correctamente.';
  },
  'staff-edit': async (c, v, r) => {
    await apiService.updateInternalStaff(c, { ...r!.record, name: v.name, position: v.position, email: v.email, phone: v.phone });
    return 'Personal actualizado correctamente.';
  },
  'staff-delete': async (c, _v, r) => {
    await apiService.deleteInternalStaff(c, r!.record.name);
    return 'Personal eliminado.';
  },
  'reservation-add': async (c, v) => {
    await apiService.createReservationFromChat(c, {
      commonAreaName: v.commonAreaName,
      apartment: v.apartment,
      date: v.date,
      startTime: v.startTime,
      endTime: v.endTime,
    });
    return 'Reserva agendada correctamente.';
  },
  'reservation-edit': async (c, v, r) => {
    await apiService.updateReservation(c, {
      ...r!.record,
      commonAreaId: v.commonAreaId,
      apartment: v.apartment,
      date: v.date,
      startTime: v.startTime,
      endTime: v.endTime,
    });
    return 'Reserva actualizada correctamente.';
  },
  'reservation-delete': async (c, _v, r) => {
    await apiService.deleteReservation(c, r!.record.id);
    return 'Reserva eliminada.';
  },
  'email-add': async (c, v) => {
    const res = await apiService.sendMassEmail(c, v.group, v.subject, v.body);
    return res.message;
  },
  'income-add': async (c, v) => {
    await apiService.addIncome(c, { description: v.description, amount: Number(v.amount), category: v.category, date: v.date });
    return 'Ingreso registrado correctamente.';
  },
  'expense-add': async (c, v) => {
    await apiService.addExpense(c, { description: v.description, amount: Number(v.amount), category: v.category, date: v.date });
    return 'Gasto registrado correctamente.';
  },
  'visitor-add': async (c, v) => {
    await apiService.addVisitorLog(c, { apartment: v.apartment, visitorName: v.visitorName, date: v.date, status: 'Autorizado' });
    return 'Visitante autorizado.';
  },
  'visitor-edit': async (c, v, r) => {
    await apiService.updateVisitorLog(c, r!.record.id, { status: v.status });
    return 'Estado del visitante actualizado.';
  },
  'package-add': async (c, v) => {
    await apiService.addPackageLog(c, {
      apartment: v.apartment,
      courier: v.courier,
      trackingNumber: v.trackingNumber,
      receivedDate: v.receivedDate,
    });
    return 'Paquete registrado.';
  },
  'duedate-add': async (c, v) => {
    await apiService.addDueDate(c, { item: v.item, category: v.category, dueDate: v.dueDate, status: v.status });
    return 'Vencimiento agregado.';
  },
  'duedate-edit': async (c, v, r) => {
    await apiService.updateDueDate(c, { ...r!.record, item: v.item, category: v.category, dueDate: v.dueDate, status: v.status });
    return 'Vencimiento actualizado.';
  },
  'duedate-delete': async (c, _v, r) => {
    await apiService.deleteDueDate(c, r!.record.id);
    return 'Vencimiento eliminado.';
  },
  'task-add': async (c, v) => {
    await apiService.addTask(c, { text: v.text, dueDate: v.dueDate, completed: v.completed === 'Sí' });
    return 'Tarea agregada.';
  },
  'task-edit': async (c, v, r) => {
    await apiService.updateTask(c, { ...r!.record, text: v.text, dueDate: v.dueDate, completed: v.completed === 'Sí' });
    return 'Tarea actualizada.';
  },
  'task-delete': async (c, _v, r) => {
    await apiService.deleteTask(c, r!.record.id);
    return 'Tarea eliminada.';
  },
};

const lists: Record<string, (conjuntoId: string) => Promise<ListPayload>> = {
  'residents': async (c) => ({
    columns: ['Apto', 'Nombre', 'Email', 'Teléfono'],
    rows: (await apiService.fetchResidents(c)).map(r => [r.apartment, r.name, r.email, r.phone]),
  }),
  'providers': async (c) => ({
    columns: ['Empresa', 'Especialidad', 'Email', 'Teléfono'],
    rows: (await apiService.fetchProviders(c)).map(p => [p.company, p.specialty, p.email, p.phone]),
  }),
  'staff': async (c) => ({
    columns: ['Nombre', 'Cargo', 'Email', 'Teléfono'],
    rows: (await apiService.fetchInternalStaff(c)).map(s => [s.name, s.position, s.email, s.phone]),
  }),
  'reservations': async (c) => ({
    columns: ['Área', 'Fecha', 'Hora', 'Apto'],
    rows: (await apiService.fetchReservations(c)).map(r => [r.commonAreaId, r.date, `${r.startTime}-${r.endTime}`, r.apartment]),
  }),
  'incomes': async (c) => ({
    columns: ['Descripción', 'Monto', 'Categoría', 'Fecha'],
    rows: (await apiService.fetchIncomes(c)).map(i => [i.description, `$${i.amount.toLocaleString()}`, i.category, i.date]),
  }),
  'expenses': async (c) => ({
    columns: ['Descripción', 'Monto', 'Categoría', 'Fecha'],
    rows: (await apiService.fetchExpenses(c)).map(e => [e.description, `$${e.amount.toLocaleString()}`, e.category, e.date]),
  }),
  'debtors': async (c) => ({
    columns: ['Apto', 'Nombre', 'Saldo'],
    rows: (await apiService.fetchDebtors(c)).map(d => [d.apartment, d.name, `$${d.balance.toLocaleString('es-CO')}`]),
  }),
  'visitors': async (c) => ({
    columns: ['Visitante', 'Apto', 'Fecha', 'Estado'],
    rows: (await apiService.fetchVisitorLogs(c)).map(v => [v.visitorName, v.apartment, v.date, v.status]),
  }),
  'packages': async (c) => ({
    columns: ['Apto', 'Mensajería', 'Fecha', 'Estado'],
    rows: (await apiService.fetchPackageLogs(c)).map(p => [p.apartment, p.courier, p.receivedDate, p.status]),
  }),
  'duedates': async (c) => ({
    columns: ['Concepto', 'Fecha', 'Estado'],
    rows: (await apiService.fetchDueDates(c)).map(d => [d.item, d.dueDate, d.status]),
  }),
  'tasks': async (c) => ({
    columns: ['Tarea', 'Fecha límite', 'Estado'],
    rows: (await apiService.fetchTasks(c)).map(t => [t.text, t.dueDate, t.completed ? 'Completada' : 'Pendiente']),
  }),
};

export const loadOptionsForKey = (conjuntoId: string, loadKey: string): Promise<RecordOption[]> => {
  const loader = loaders[loadKey];
  if (!loader) return Promise.resolve([]);
  return loader(conjuntoId);
};

export const loadListForKey = (conjuntoId: string, loadKey: string): Promise<ListPayload> => {
  const loader = lists[loadKey];
  if (!loader) return Promise.resolve({ columns: [], rows: [] });
  return loader(conjuntoId);
};

export const executeAction = (
  conjuntoId: string,
  submitKey: string,
  values: Record<string, any>,
  record?: RecordOption,
): Promise<string> => {
  const executor = executors[submitKey];
  if (!executor) return Promise.reject(new Error('Acción no reconocida.'));
  return executor(conjuntoId, values, record);
};

export const getListEmptyMessage = (loadKey: string): string => {
  const messages: Record<string, string> = {
    residents: 'No hay residentes registrados.',
    providers: 'No hay proveedores registrados.',
    staff: 'No hay personal interno registrado.',
    reservations: 'No hay reservas registradas.',
    incomes: 'No hay ingresos registrados.',
    expenses: 'No hay gastos registrados.',
    debtors: 'No hay residentes en mora.',
    visitors: 'No hay visitantes registrados.',
    packages: 'No hay paquetes registrados.',
    duedates: 'No hay vencimientos registrados.',
    tasks: 'No hay tareas registradas.',
  };
  return messages[loadKey] || 'No se encontraron resultados.';
};

export const getRecordLabel = (record: RecordOption): string =>
  str(record.label);
