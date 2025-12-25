import type { ReactNode, ButtonHTMLAttributes } from 'react';
import type { ButtonVariant } from '../types';

interface BenchmarkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    loading?: boolean;
    loadingText?: string;
    children: ReactNode;
}

/**
 * Reusable button component with consistent styling for benchmarks
 */
export function BenchmarkButton({
    variant = 'primary',
    loading = false,
    loadingText,
    disabled,
    className = '',
    children,
    ...props
}: BenchmarkButtonProps) {
    const variantClass = `btn-${variant}`;
    const isDisabled = disabled || loading;

    return (
        <button
            className={`btn ${variantClass} ${className}`}
            disabled={isDisabled}
            {...props}
        >
            {loading ? (loadingText || 'Loading...') : children}
        </button>
    );
}
