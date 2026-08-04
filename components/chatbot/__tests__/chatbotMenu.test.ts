import { describe, it, expect } from 'vitest';
import {
  MAIN_MENU,
  getMainMenuChips,
  getChipsForNode,
  getNodePrompt,
  findMenuItem,
  findSpecById,
} from '../chatbotMenu';

describe('chatbotMenu', () => {
  it('exposes the 7 main menu sections', () => {
    const chips = getMainMenuChips();
    expect(chips.map(c => c.label)).toEqual([
      'Datos', 'Reservas', 'Comunicaciones', 'Finanzas', 'Seguridad', 'Vencimientos', 'Tareas',
    ]);
    expect(chips.every(c => !c.action)).toBe(true);
  });

  it('returns entity chips for sections with sub-items', () => {
    const chips = getChipsForNode('datos');
    expect(chips.map(c => c.label)).toEqual(['Residentes', 'Proveedores', 'Personal interno']);
  });

  it('returns action chips for an entity', () => {
    const chips = getChipsForNode('resident');
    expect(chips.map(c => c.label)).toEqual(['Agregar', 'Modificar', 'Eliminar', 'Consultar']);
    expect(chips.map(c => c.action)).toEqual(['add', 'edit', 'delete', 'view']);
  });

  it('returns direct action chips for single-purpose sections', () => {
    const chips = getChipsForNode('vencimientos');
    expect(chips.map(c => c.label)).toEqual(['Agregar', 'Modificar', 'Eliminar', 'Consultar']);
  });

  it('reservas includes full CRUD including Modificar and Eliminar', () => {
    const chips = getChipsForNode('reservas');
    expect(chips.map(c => c.label)).toEqual(['Agendar', 'Modificar', 'Eliminar', 'Consultar']);
    const editSpec = findSpecById('reservation-edit') as any;
    const deleteSpec = findSpecById('reservation-delete') as any;
    expect(editSpec.submitKey).toBe('reservation-edit');
    expect(deleteSpec.submitKey).toBe('reservation-delete');
  });

  it('provides node prompts', () => {
    expect(getNodePrompt('datos')).toContain('Datos');
    expect(getNodePrompt('resident')).toContain('Residentes');
  });

  it('finds nested items', () => {
    const resident = findMenuItem(MAIN_MENU, 'resident');
    expect(resident?.label).toBe('Residentes');
  });

  it('finds a form spec by id with dynamic select loaders', () => {
    const spec = findSpecById('reservation-add') as any;
    expect(spec.submitKey).toBe('reservation-add');
    const areaField = spec.fields.find((f: any) => f.name === 'commonAreaName');
    expect(areaField.loadKey).toBe('areas-name');
  });

  it('finds a list spec by id', () => {
    const spec = findSpecById('residents');
    expect(spec).not.toBeNull();
    expect((spec as any).loadKey).toBe('residents');
  });
});
