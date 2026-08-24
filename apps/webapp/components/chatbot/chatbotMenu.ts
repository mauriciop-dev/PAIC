import { ExpenseCategory, IncomeCategory } from '../../types';

export type ChatAction = 'add' | 'edit' | 'delete' | 'view';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'time' | 'select' | 'textarea';
  options?: string[];
  loadKey?: string;
  required?: boolean;
}

export interface RecordOption {
  value: string | number;
  label: string;
  record: any;
}

export interface FormSpec {
  id: string;
  action: ChatAction;
  title: string;
  fields: FormField[];
  loadKey?: string;
  submitKey: string;
  successMessage: string;
}

export interface ListSpec {
  id: string;
  title: string;
  loadKey: string;
}

export interface ChatActionDef {
  action: ChatAction;
  label: string;
  form?: FormSpec;
  list?: ListSpec;
}

export interface ChatMenuItem {
  id: string;
  label: string;
  prompt?: string;
  items?: ChatMenuItem[];
  actions?: ChatActionDef[];
}

const text = (name: string, label: string, required = false): FormField => ({ name, label, type: 'text', required });
const number = (name: string, label: string, required = false): FormField => ({ name, label, type: 'number', required });
const date = (name: string, label: string, required = false): FormField => ({ name, label, type: 'date', required });
const time = (name: string, label: string, required = false): FormField => ({ name, label, type: 'time', required });
const textarea = (name: string, label: string, required = false): FormField => ({ name, label, type: 'textarea', required });
const select = (name: string, label: string, options: string[], required = false, loadKey?: string): FormField => ({ name, label, type: 'select', options, required, loadKey });

const action = (
  act: ChatAction,
  label: string,
  formOrList?: FormSpec | ListSpec,
): ChatActionDef => {
  if (formOrList && 'submitKey' in formOrList) {
    return { action: act, label, form: formOrList as FormSpec };
  }
  return { action: act, label, list: formOrList as ListSpec };
};

const add = (id: string, title: string, fields: FormField[], successMessage: string, label = 'Agregar'): ChatActionDef =>
  action('add', label, { id: `${id}-add`, action: 'add', title, fields, submitKey: `${id}-add`, successMessage });

const edit = (id: string, title: string, fields: FormField[], loadKey: string, successMessage: string): ChatActionDef =>
  action('edit', 'Modificar', { id: `${id}-edit`, action: 'edit', title, fields, loadKey, submitKey: `${id}-edit`, successMessage });

const del = (id: string, title: string, loadKey: string, successMessage: string): ChatActionDef =>
  action('delete', 'Eliminar', { id: `${id}-delete`, action: 'delete', title, fields: [], loadKey, submitKey: `${id}-delete`, successMessage });

const view = (id: string, title: string): ChatActionDef =>
  action('view', 'Consultar', { id, title, loadKey: id });

// --- Form specs ---

const residentAdd: FormSpec = { id: 'resident-add', action: 'add', title: 'Agregar residente', fields: [
  text('apartment', 'Apartamento', true), text('name', 'Nombre', true), text('email', 'Email'), text('phone', 'Teléfono'),
], submitKey: 'resident-add', successMessage: 'Residente agregado correctamente.' };

const residentEdit: FormSpec = { id: 'resident-edit', action: 'edit', title: 'Modificar residente', fields: [
  text('name', 'Nombre', true), text('email', 'Email'), text('phone', 'Teléfono'),
], loadKey: 'residents', submitKey: 'resident-edit', successMessage: 'Residente actualizado correctamente.' };

const residentDelete: FormSpec = { id: 'resident-delete', action: 'delete', title: 'Eliminar residente', fields: [],
  loadKey: 'residents', submitKey: 'resident-delete', successMessage: 'Residente eliminado.' };

const providerAdd: FormSpec = { id: 'provider-add', action: 'add', title: 'Agregar proveedor', fields: [
  text('company', 'Empresa', true), text('specialty', 'Especialidad'), text('email', 'Email'), text('phone', 'Teléfono'),
], submitKey: 'provider-add', successMessage: 'Proveedor agregado correctamente.' };

const providerEdit: FormSpec = { id: 'provider-edit', action: 'edit', title: 'Modificar proveedor', fields: [
  text('company', 'Empresa', true), text('specialty', 'Especialidad'), text('email', 'Email'), text('phone', 'Teléfono'),
], loadKey: 'providers', submitKey: 'provider-edit', successMessage: 'Proveedor actualizado correctamente.' };

const providerDelete: FormSpec = { id: 'provider-delete', action: 'delete', title: 'Eliminar proveedor', fields: [],
  loadKey: 'providers', submitKey: 'provider-delete', successMessage: 'Proveedor eliminado.' };

const staffAdd: FormSpec = { id: 'staff-add', action: 'add', title: 'Agregar personal interno', fields: [
  text('name', 'Nombre', true), text('position', 'Cargo'), text('email', 'Email'), text('phone', 'Teléfono'),
], submitKey: 'staff-add', successMessage: 'Personal agregado correctamente.' };

const staffEdit: FormSpec = { id: 'staff-edit', action: 'edit', title: 'Modificar personal', fields: [
  text('name', 'Nombre', true), text('position', 'Cargo'), text('email', 'Email'), text('phone', 'Teléfono'),
], loadKey: 'staff', submitKey: 'staff-edit', successMessage: 'Personal actualizado correctamente.' };

const staffDelete: FormSpec = { id: 'staff-delete', action: 'delete', title: 'Eliminar personal', fields: [],
  loadKey: 'staff', submitKey: 'staff-delete', successMessage: 'Personal eliminado.' };

const reservationAdd: FormSpec = { id: 'reservation-add', action: 'add', title: 'Agendar reserva', fields: [
  select('commonAreaName', 'Área común', [], true, 'areas-name'), text('apartment', 'Apartamento', true),
  date('date', 'Fecha', true), time('startTime', 'Hora inicio', true), time('endTime', 'Hora fin', true),
], loadKey: 'areas', submitKey: 'reservation-add', successMessage: 'Reserva agendada correctamente.' };

const reservationEdit: FormSpec = { id: 'reservation-edit', action: 'edit', title: 'Modificar reserva', fields: [
  select('commonAreaId', 'Área común', [], true, 'areas'), text('apartment', 'Apartamento', true),
  date('date', 'Fecha', true), time('startTime', 'Hora inicio', true), time('endTime', 'Hora fin', true),
], loadKey: 'reservations', submitKey: 'reservation-edit', successMessage: 'Reserva actualizada correctamente.' };

const reservationDelete: FormSpec = { id: 'reservation-delete', action: 'delete', title: 'Eliminar reserva', fields: [],
  loadKey: 'reservations', submitKey: 'reservation-delete', successMessage: 'Reserva eliminada.' };

const emailForm: FormSpec = { id: 'email-add', action: 'add', title: 'Enviar correo masivo', fields: [
  select('group', 'Destinatarios', ['Todos los residentes', 'Solo residentes en mora', 'Proveedores', 'Personal interno'], true),
  text('subject', 'Asunto', true), textarea('body', 'Mensaje', true),
], submitKey: 'email-add', successMessage: 'Correo masivo enviado.' };

const incomeAdd: FormSpec = { id: 'income-add', action: 'add', title: 'Registrar ingreso', fields: [
  text('description', 'Descripción', true), number('amount', 'Monto', true),
  select('category', 'Categoría', Object.values(IncomeCategory), true), date('date', 'Fecha', true),
], submitKey: 'income-add', successMessage: 'Ingreso registrado correctamente.' };

const expenseAdd: FormSpec = { id: 'expense-add', action: 'add', title: 'Registrar gasto', fields: [
  text('description', 'Descripción', true), number('amount', 'Monto', true),
  select('category', 'Categoría', Object.values(ExpenseCategory), true), date('date', 'Fecha', true),
], submitKey: 'expense-add', successMessage: 'Gasto registrado correctamente.' };

const visitorAdd: FormSpec = { id: 'visitor-add', action: 'add', title: 'Autorizar visitante', fields: [
  text('apartment', 'Apartamento', true), text('visitorName', 'Nombre del visitante', true), date('date', 'Fecha', true),
], submitKey: 'visitor-add', successMessage: 'Visitante autorizado.' };

const visitorEdit: FormSpec = { id: 'visitor-edit', action: 'edit', title: 'Cambiar estado del visitante', fields: [
  select('status', 'Nuevo estado', ['Autorizado', 'Ingresó', 'Salió'], true),
], loadKey: 'visitors', submitKey: 'visitor-edit', successMessage: 'Estado del visitante actualizado.' };

const packageAdd: FormSpec = { id: 'package-add', action: 'add', title: 'Registrar paquete', fields: [
  text('apartment', 'Apartamento', true), text('courier', 'Mensajería', true),
  text('trackingNumber', 'Número de guía'), date('receivedDate', 'Fecha de recepción', true),
], submitKey: 'package-add', successMessage: 'Paquete registrado.' };

const dueDateAdd: FormSpec = { id: 'duedate-add', action: 'add', title: 'Agregar vencimiento', fields: [
  text('item', 'Concepto', true), select('category', 'Categoría', ['Servicios', 'Mantenimiento', 'Seguros', 'Nómina', 'Otros'], true),
  date('dueDate', 'Fecha de vencimiento', true), select('status', 'Estado', ['Pendiente', 'Vencido', 'Pagado'], true),
], submitKey: 'duedate-add', successMessage: 'Vencimiento agregado.' };

const dueDateEdit: FormSpec = { id: 'duedate-edit', action: 'edit', title: 'Modificar vencimiento', fields: [
  text('item', 'Concepto', true), select('category', 'Categoría', ['Servicios', 'Mantenimiento', 'Seguros', 'Nómina', 'Otros'], true),
  date('dueDate', 'Fecha de vencimiento', true), select('status', 'Estado', ['Pendiente', 'Vencido', 'Pagado'], true),
], loadKey: 'duedates', submitKey: 'duedate-edit', successMessage: 'Vencimiento actualizado.' };

const dueDateDelete: FormSpec = { id: 'duedate-delete', action: 'delete', title: 'Eliminar vencimiento', fields: [],
  loadKey: 'duedates', submitKey: 'duedate-delete', successMessage: 'Vencimiento eliminado.' };

const taskAdd: FormSpec = { id: 'task-add', action: 'add', title: 'Agregar tarea', fields: [
  text('text', 'Tarea', true), date('dueDate', 'Fecha límite'), select('completed', 'Estado', ['No', 'Sí']),
], submitKey: 'task-add', successMessage: 'Tarea agregada.' };

const taskEdit: FormSpec = { id: 'task-edit', action: 'edit', title: 'Modificar tarea', fields: [
  text('text', 'Tarea', true), date('dueDate', 'Fecha límite'), select('completed', 'Estado', ['No', 'Sí']),
], loadKey: 'tasks', submitKey: 'task-edit', successMessage: 'Tarea actualizada.' };

const taskDelete: FormSpec = { id: 'task-delete', action: 'delete', title: 'Eliminar tarea', fields: [],
  loadKey: 'tasks', submitKey: 'task-delete', successMessage: 'Tarea eliminada.' };

// --- List specs ---

const listSpec = (id: string, title: string): ChatActionDef =>
  view(id, title);

// --- Menu tree ---

export const MAIN_MENU: ChatMenuItem[] = [
  {
    id: 'datos', label: 'Datos',
    prompt: 'Has seleccionado **Datos**. Elige qué gestionar.',
    items: [
      { id: 'resident', label: 'Residentes', prompt: 'Has seleccionado **Residentes**. Elige una acción.', actions: [
        add('resident', 'Agregar residente', residentAdd.fields, residentAdd.successMessage),
        edit('resident', 'Modificar residente', residentEdit.fields, 'residents', residentEdit.successMessage),
        del('resident', 'Eliminar residente', 'residents', residentDelete.successMessage),
        listSpec('residents', 'Consultar residentes'),
      ] },
      { id: 'provider', label: 'Proveedores', prompt: 'Has seleccionado **Proveedores**. Elige una acción.', actions: [
        add('provider', 'Agregar proveedor', providerAdd.fields, providerAdd.successMessage),
        edit('provider', 'Modificar proveedor', providerEdit.fields, 'providers', providerEdit.successMessage),
        del('provider', 'Eliminar proveedor', 'providers', providerDelete.successMessage),
        listSpec('providers', 'Consultar proveedores'),
      ] },
      { id: 'staff', label: 'Personal interno', prompt: 'Has seleccionado **Personal interno**. Elige una acción.', actions: [
        add('staff', 'Agregar personal', staffAdd.fields, staffAdd.successMessage),
        edit('staff', 'Modificar personal', staffEdit.fields, 'staff', staffEdit.successMessage),
        del('staff', 'Eliminar personal', 'staff', staffDelete.successMessage),
        listSpec('staff', 'Consultar personal'),
      ] },
    ],
  },
  {
    id: 'reservas', label: 'Reservas',
    prompt: 'Has seleccionado **Reservas**. Elige una acción.',
    actions: [
      add('reservation', 'Agendar reserva', reservationAdd.fields, reservationAdd.successMessage, 'Agendar'),
      edit('reservation', 'Modificar reserva', reservationEdit.fields, 'reservations', reservationEdit.successMessage),
      del('reservation', 'Eliminar reserva', 'reservations', reservationDelete.successMessage),
      listSpec('reservations', 'Consultar reservas'),
    ],
  },
  {
    id: 'comunicaciones', label: 'Comunicaciones',
    prompt: 'Has seleccionado **Comunicaciones**. Puedo enviar un correo masivo.',
    actions: [ { action: 'add', label: 'Enviar correo masivo', form: emailForm } ],
  },
  {
    id: 'finanzas', label: 'Finanzas',
    prompt: 'Has seleccionado **Finanzas**. Elige qué gestionar.',
    items: [
      { id: 'income', label: 'Ingresos', prompt: 'Has seleccionado **Ingresos**. Elige una acción.', actions: [
        add('income', 'Registrar ingreso', incomeAdd.fields, incomeAdd.successMessage),
        listSpec('incomes', 'Consultar ingresos'),
      ] },
      { id: 'expense', label: 'Gastos', prompt: 'Has seleccionado **Gastos**. Elige una acción.', actions: [
        add('expense', 'Registrar gasto', expenseAdd.fields, expenseAdd.successMessage),
        listSpec('expenses', 'Consultar gastos'),
      ] },
      { id: 'debtors', label: 'Residentes en mora', prompt: 'Has seleccionado **Residentes en mora**.', actions: [
        listSpec('debtors', 'Consultar mora'),
      ] },
    ],
  },
  {
    id: 'seguridad', label: 'Seguridad',
    prompt: 'Has seleccionado **Seguridad**. Elige qué gestionar.',
    items: [
      { id: 'visitor', label: 'Visitantes', prompt: 'Has seleccionado **Visitantes**. Elige una acción.', actions: [
        add('visitor', 'Autorizar visitante', visitorAdd.fields, visitorAdd.successMessage),
        edit('visitor', 'Cambiar estado', visitorEdit.fields, 'visitors', visitorEdit.successMessage),
        listSpec('visitors', 'Consultar visitantes'),
      ] },
      { id: 'package', label: 'Paquetes', prompt: 'Has seleccionado **Paquetes**. Elige una acción.', actions: [
        add('package', 'Registrar paquete', packageAdd.fields, packageAdd.successMessage),
        listSpec('packages', 'Consultar paquetes'),
      ] },
    ],
  },
  {
    id: 'vencimientos', label: 'Vencimientos',
    prompt: 'Has seleccionado **Vencimientos**. Elige una acción.',
    actions: [
      add('duedate', 'Agregar vencimiento', dueDateAdd.fields, dueDateAdd.successMessage),
      edit('duedate', 'Modificar vencimiento', dueDateEdit.fields, 'duedates', dueDateEdit.successMessage),
      del('duedate', 'Eliminar vencimiento', 'duedates', dueDateDelete.successMessage),
      listSpec('duedates', 'Consultar vencimientos'),
    ],
  },
  {
    id: 'tareas', label: 'Tareas',
    prompt: 'Has seleccionado **Tareas**. Elige una acción.',
    actions: [
      add('task', 'Agregar tarea', taskAdd.fields, taskAdd.successMessage),
      edit('task', 'Modificar tarea', taskEdit.fields, 'tasks', taskEdit.successMessage),
      del('task', 'Eliminar tarea', 'tasks', taskDelete.successMessage),
      listSpec('tasks', 'Consultar tareas'),
    ],
  },
];

export const findMenuItem = (items: ChatMenuItem[], id: string): ChatMenuItem | null => {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.items) {
      const found = findMenuItem(item.items, id);
      if (found) return found;
    }
  }
  return null;
};

export interface ChipDef {
  id: string;
  label: string;
  action?: ChatAction;
}

export const getMainMenuChips = (): ChipDef[] =>
  MAIN_MENU.map(item => ({ id: item.id, label: item.label }));

// Returns the next-level chips for a node: entity chips if it has items, action chips otherwise.
export const getChipsForNode = (nodeId: string): ChipDef[] => {
  const node = findMenuItem(MAIN_MENU, nodeId);
  if (!node) return [];
  if (node.items) return node.items.map(it => ({ id: it.id, label: it.label }));
  if (node.actions) return node.actions.map(a => ({ id: a.form?.id || a.list?.id || '', label: a.label, action: a.action }));
  return [];
};

export const getNodePrompt = (nodeId: string): string | null => {
  const node = findMenuItem(MAIN_MENU, nodeId);
  return node?.prompt || null;
};

const findSpecInItems = (items: ChatMenuItem[], specId: string): FormSpec | ListSpec | null => {
  for (const item of items) {
    for (const a of item.actions || []) {
      if (a.form?.id === specId) return a.form;
      if (a.list?.id === specId) return a.list;
    }
    if (item.items) {
      const found = findSpecInItems(item.items, specId);
      if (found) return found;
    }
  }
  return null;
};

export const findSpecById = (specId: string): FormSpec | ListSpec | null =>
  findSpecInItems(MAIN_MENU, specId);
