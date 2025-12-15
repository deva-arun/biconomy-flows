import { useEffect } from 'react';
import { useBiconomy } from '../context/BiconomyContext';
import { useLogger } from '../hooks/useLogger';
import { LogDisplay } from './LogDisplay';

export function Eip7702Benchmark() {
    const { account, signAuthorization, authorization, error } = useBiconomy();
    const { logs, addLog, clearLogs } = useLogger();

    // React to changes in authorization from context
    useEffect(() => {
        if (authorization) {
            addLog('Authorization received from context:', authorization);
        }
    }, [authorization, addLog]);

    // React to errors from context
    useEffect(() => {
        if (error) {
            addLog('Error from context:', error.message);
        }
    }, [error, addLog]);

    const runBenchmark = async () => {
        clearLogs(); // Clear local logs
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

            <LogDisplay logs={logs} />
        </div>
    );
}
