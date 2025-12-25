import '../styles/benchmark.css';

interface LogDisplayProps {
    logs: string[];
    emptyMessage?: string;
}

export function LogDisplay({ logs, emptyMessage = 'Logs will appear here...' }: LogDisplayProps) {
    return (
        <div className="log-display">
            <span className="log-display-text">
                {logs.length === 0 ? emptyMessage : logs.join('\n\n')}
            </span>
        </div>
    );
}
