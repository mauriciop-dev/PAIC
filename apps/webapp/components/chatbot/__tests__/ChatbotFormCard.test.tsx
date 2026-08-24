import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatbotFormCard from '../ChatbotFormCard';
import type { FormSpec } from '../chatbotMenu';
import type { RecordOption } from '../chatbotMenu';
import { loadOptionsForKey } from '../../../utils/chatActions';

vi.mock('../../../utils/chatActions', () => ({
  loadOptionsForKey: vi.fn(),
}));

const mockedLoadOptions = vi.mocked(loadOptionsForKey);

const editForm: FormSpec = {
  id: 'resident-edit',
  action: 'edit',
  title: 'Modificar residente',
  fields: [
    { name: 'name', label: 'Nombre', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'text' },
  ],
  loadKey: 'residents',
  submitKey: 'resident-edit',
  successMessage: 'ok',
};

const addForm: FormSpec = {
  id: 'resident-add',
  action: 'add',
  title: 'Agregar residente',
  fields: [
    { name: 'apartment', label: 'Apartamento', type: 'text', required: true },
  ],
  submitKey: 'resident-add',
  successMessage: 'ok',
};

describe('ChatbotFormCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedLoadOptions.mockResolvedValue([]);
  });
  it('renders the form title', () => {
    render(<ChatbotFormCard form={addForm} conjuntoId="c1" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Agregar residente')).toBeInTheDocument();
  });

  it('loads and renders record options for edit forms', async () => {
    mockedLoadOptions.mockResolvedValue([
      { value: '101', label: 'Apto 101 · Ana', record: { apartment: '101', name: 'Ana' } },
    ] as RecordOption[]);
    render(<ChatbotFormCard form={editForm} conjuntoId="c1" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(mockedLoadOptions).toHaveBeenCalledWith('c1', 'residents');
    const select = await screen.findByTestId('form-record-select');
    expect(select.querySelectorAll('option')).toHaveLength(2);
    expect(select.textContent).toContain('Apto 101 · Ana');
  });

  it('validates required fields before submitting', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ChatbotFormCard form={addForm} conjuntoId="c1" onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByTestId('form-submit'));
    expect(screen.getByText(/obligatorio/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits with the entered values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ChatbotFormCard form={addForm} conjuntoId="c1" onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByTestId('form-field-apartment'), { target: { value: '105' } });
    fireEvent.click(screen.getByTestId('form-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ apartment: '105' }, undefined));
  });

  it('calls onCancel when cancel is pressed', () => {
    const onCancel = vi.fn();
    render(<ChatbotFormCard form={addForm} conjuntoId="c1" onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('form-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
