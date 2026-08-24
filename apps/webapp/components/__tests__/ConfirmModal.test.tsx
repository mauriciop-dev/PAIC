import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ConfirmModal from '../ConfirmModal';

describe('ConfirmModal', () => {
    it('renders nothing when closed', () => {
        render(<ConfirmModal isOpen={false} title="Test" message="Hello" onConfirm={() => {}} onCancel={() => {}} />);
        expect(screen.queryByText('Test')).not.toBeInTheDocument();
    });

    it('renders title and message when open', () => {
        render(<ConfirmModal isOpen={true} title="Confirma" message="¿Estás seguro?" onConfirm={() => {}} onCancel={() => {}} />);
        expect(screen.getByText('Confirma')).toBeInTheDocument();
        expect(screen.getByText('¿Estás seguro?')).toBeInTheDocument();
    });

    it('calls onConfirm when confirm button clicked', async () => {
        const handleConfirm = vi.fn();
        render(<ConfirmModal isOpen={true} title="Test" message="Msg" onConfirm={handleConfirm} onCancel={() => {}} />);
        await userEvent.click(screen.getByText('Eliminar'));
        expect(handleConfirm).toHaveBeenCalledOnce();
    });

    it('calls onCancel when cancel button clicked', async () => {
        const handleCancel = vi.fn();
        render(<ConfirmModal isOpen={true} title="Test" message="Msg" onConfirm={() => {}} onCancel={handleCancel} />);
        await userEvent.click(screen.getByText('Cancelar'));
        expect(handleCancel).toHaveBeenCalledOnce();
    });

    it('uses custom button labels', () => {
        render(<ConfirmModal isOpen={true} title="T" message="M" confirmLabel="Sí" cancelLabel="No" onConfirm={() => {}} onCancel={() => {}} />);
        expect(screen.getByText('Sí')).toBeInTheDocument();
        expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('applies danger variant styles', () => {
        render(<ConfirmModal isOpen={true} title="T" message="M" variant="danger" onConfirm={() => {}} onCancel={() => {}} />);
        const btn = screen.getByText('Eliminar');
        expect(btn.className).toContain('bg-red-600');
    });

    it('applies warning variant styles', () => {
        render(<ConfirmModal isOpen={true} title="T" message="M" variant="warning" onConfirm={() => {}} onCancel={() => {}} />);
        const btn = screen.getByText('Eliminar');
        expect(btn.className).toContain('bg-yellow-600');
    });
});
