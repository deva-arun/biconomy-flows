interface LogDisplayProps {
    logs: string[];
    emptyMessage?: string;
}

export function LogDisplay({ logs, emptyMessage = 'Logs will appear here...' }: LogDisplayProps) {
    return (
        <div style={{
            backgroundColor: '#f5f5f5',
            padding: '1rem',
            borderRadius: '8px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            minHeight: '200px',
            maxHeight: '400px',
            maxWidth: '100%',
            overflowY: 'auto',
            border: '1px solid #ddd'
        }}>
            <span style={{ color: '#000000ff' }}>
                {logs.length === 0 ? emptyMessage : logs.join('\n\n')}
            </span>
        </div>
    );
}
