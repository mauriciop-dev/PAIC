import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import SearchBar from '../SearchBar';

describe('SearchBar', () => {
    it('renders with default placeholder', () => {
        render(<SearchBar value="" onChange={() => {}} />);
        expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
        render(<SearchBar value="" onChange={() => {}} placeholder="Filtrar..." />);
        expect(screen.getByPlaceholderText('Filtrar...')).toBeInTheDocument();
    });

    it('calls onChange when typing', async () => {
        const handleChange = vi.fn();
        render(<SearchBar value="" onChange={handleChange} />);
        const input = screen.getByPlaceholderText('Buscar...');
        await userEvent.type(input, 'a');
        expect(handleChange).toHaveBeenCalledWith('a');
    });

    it('shows clear button when value is not empty', () => {
        render(<SearchBar value="test" onChange={() => {}} />);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('does not show clear button when value is empty', () => {
        render(<SearchBar value="" onChange={() => {}} />);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('calls onChange with empty string on clear', async () => {
        const handleChange = vi.fn();
        render(<SearchBar value="test" onChange={handleChange} />);
        await userEvent.click(screen.getByRole('button'));
        expect(handleChange).toHaveBeenCalledWith('');
    });
});
