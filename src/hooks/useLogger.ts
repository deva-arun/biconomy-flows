import { useState, useCallback } from 'react';

export function useLogger() {
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = useCallback((msg: string, data?: any) => {
        const logEntry = `${msg} ${data ? JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2) : ''}`;
        setLogs((prev) => [...prev, logEntry]);
        console.log(msg, data || '');
    }, []);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    return { logs, addLog, clearLogs };
}
