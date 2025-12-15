import { useState, useEffect } from 'react';
import { useBiconomy } from '../context/BiconomyContext';

export function Eip7702Benchmark() {
    const { account, signAuthorization, authorization, error } = useBiconomy();
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string, data?: any) => {
        const logEntry = `${msg} ${data ? JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2) : ''}`;
        setLogs((prev) => [...prev, logEntry]);
        console.log(msg, data || '');
    };

    // React to changes in authorization from context
    useEffect(() => {
        if (authorization) {
            addLog('Authorization received from context:', authorization);
        }
    }, [authorization]);

    // React to errors from context
    useEffect(() => {
        if (error) {
            addLog('Error from context:', error.message);
        }
    }, [error]);

    const runBenchmark = async () => {
        setLogs([]); // Clear local logs
        if (!account) {
            addLog('Error: Account not initialized in context');
            return;
        }

        try {
            addLog('Account initialized:', account.address);
            addLog('Requesting signature via BiconomyContext...');

            await signAuthorization();

        } catch (err) {
            addLog('Error triggering signature:', err);
        }
    };

    return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
            <h1>Biconomy EIP-7702 Benchmark</h1>
            <span>Current connected address: {account ? account.address : 'Not connected'}</span><br />
            <button
                onClick={runBenchmark}
                style={{
                    padding: '10px 20px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    marginTop: '10px'
                }}
            >
                Sign Authorization
            </button>

            <div style={{
                backgroundColor: '#f5f5f5',
                padding: '1rem',
                borderRadius: '8px',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                minHeight: '200px',
                border: '1px solid #ddd'
            }}>
                <span style={{ color: '#000000ff' }}>
                    {logs.length === 0 ? 'Logs will appear here...' : logs.join('\n\n')}
                </span>
            </div>
        </div>
    );
}
