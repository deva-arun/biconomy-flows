interface WarningMessageProps {
    message: string;
    show?: boolean;
    className?: string;
}

/**
 * Standardized warning message component
 */
export function WarningMessage({ message, show = true, className = '' }: WarningMessageProps) {
    if (!show) return null;

    return (
        <div className={`warning-text ${className}`}>
            {message}
        </div>
    );
}
