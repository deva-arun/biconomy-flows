import { useState } from 'react';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { eip7702Actions } from 'viem/experimental';

// Nexus Implementation v1.3.1 Address
const NEXUS_IMPLEMENTATION_ADDRESS = '0x00000000561Dd60aEa485cDb26E4618B1E40Fd6E';

export function Eip7702Benchmark() {
    const privateKey = import.meta.env.VITE_PRIVATE_KEY;
    const account = privateKey ? privateKeyToAccount(privateKey as `0x${string}`) : null;

    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string, data?: any) => {
        const logEntry = `${msg} ${data ? JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2) : ''}`;
        setLogs((prev) => [...prev, logEntry]);
        console.log(msg, data || '');
    };

    const runBenchmark = async () => {
        setLogs([]); // Clear previous logs

        if (!account) {
            addLog('Error: VITE_PRIVATE_KEY is not set in .env');
            return;
        }

        try {
            addLog('Account initialized:', account.address);

            const walletClient = createWalletClient({
                chain: baseSepolia,
                transport: http(),
            });

            const nexus120Singleton = '0x000000004F43C49e93C970E84001853a70923B03';

            addLog('Signing Authorization for Nexus Singleton:', nexus120Singleton);

            const authorization = await walletClient.signAuthorization({
                account,
                contractAddress: nexus120Singleton,
                chainId: 0, // Valid across all chains
                nonce: 0,   // For fresh accounts
            });

            addLog('Authorization Signed Successfully!', authorization);

        } catch (err) {
            addLog('Error:', err);
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
                {logs.length === 0 ? <span style={{ color: '#000000ff' }}>Logs will appear here...</span> : logs.join('\n\n')}
            </div>
        </div>
    );
}
