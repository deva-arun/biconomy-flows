import type { ReactNode } from 'react';

interface BenchmarkContainerProps {
    children: ReactNode;
    bordered?: boolean;
    small?: boolean;
    className?: string;
}

/**
 * Wrapper container for benchmark sections with consistent styling
 */
export function BenchmarkContainer({
    children,
    bordered = false,
    small = false,
    className = ''
}: BenchmarkContainerProps) {
    let containerClass = 'benchmark-container';

    if (bordered) {
        containerClass = 'benchmark-container-bordered';
    } else if (small) {
        containerClass = 'benchmark-container-sm';
    }

    return (
        <div className={`${containerClass} ${className}`}>
            {children}
        </div>
    );
}
