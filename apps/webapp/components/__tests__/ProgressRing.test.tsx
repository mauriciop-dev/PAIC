import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProgressRing from '../ProgressRing';

describe('ProgressRing', () => {
    it('renders with the progress ring testid', () => {
        render(<ProgressRing percentage={50} />);
        expect(screen.getByTestId('progress-ring')).toBeInTheDocument();
    });

    it('renders children content', () => {
        render(<ProgressRing percentage={50}>50%</ProgressRing>);
        expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('clamps percentage to 100', () => {
        const { container } = render(<ProgressRing percentage={150} />);
        const progressCircle = container.querySelector('circle[stroke="#2563eb"]');
        expect(progressCircle).toBeInTheDocument();
        expect(progressCircle.getAttribute('stroke-dashoffset')).toBe('0');
    });
});
