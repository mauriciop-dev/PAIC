import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Icon } from '../ui/Icon';

describe('Icon', () => {
    it('renders SVG for known icon name', () => {
        const { container } = render(<Icon name="search" />);
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });

    it('returns null for unknown icon name', () => {
        const { container } = render(<Icon name="nonexistent" />);
        expect(container.innerHTML).toBe('');
    });

    it('passes additional props to SVG', () => {
        const { container } = render(<Icon name="x" className="w-6 h-6 text-red-500" />);
        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('class');
        expect(svg!.getAttribute('class')).toContain('w-6');
    });
});
