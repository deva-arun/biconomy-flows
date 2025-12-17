import { useState, useEffect } from 'react';
import { useBiconomy } from '../context/BiconomyContext';
import { useLogger } from '../hooks/useLogger';
import { LogDisplay } from './LogDisplay';
import { base } from 'viem/chains';

export function Eip7702Initialization() {
    const { account, signAuthorization, authorization, error, meeClient } = useBiconomy();
    const { logs, addLog, clearLogs } = useLogger();

    const [initializing, setInitializing] = useState(false);

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

    const handleSignAuthorization = async () => {
        clearLogs();
        if (!account) {
            addLog('Error: Account not initialized in context');
            return;
        }
        try {
            addLog('Requesting signature via BiconomyContext...');
            await signAuthorization();
        } catch (err) {
            addLog('Error triggering signature:', err);
        }
    };

    const initializeNexus = async () => {
        clearLogs();
        if (!meeClient || !authorization) {
            addLog('Error: Client or Authorization missing');
            return;
        }

        setInitializing(true);
        try {
            const zeroAddress = '0x0000000000000000000000000000000000000000';
            const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

            addLog('Getting quote for 0-value initialization transaction...');

            const quoteData = await meeClient.getQuote({
                instructions: [{
                    calls: [{
                        to: zeroAddress,
                        value: 0n,
                        data: '0x'
                    }],
                    chainId: base.id
                }],
                delegate: true,
                authorization,
                feeToken: {
                    address: usdcAddress,
                    chainId: base.id
                },
            });

            addLog('Quote received. Executing...');
            const { hash } = await meeClient.executeQuote({ quote: quoteData });
            addLog(`Execution Hash: ${hash}`);

            addLog('Waiting for receipt...');
            const receipt = await meeClient.waitForSupertransactionReceipt({ hash });
            addLog('Transaction Receipt:', receipt);

        } catch (err: any) {
            addLog('Error initializing Nexus:', err);
        } finally {
            setInitializing(false);
        }
    };

    return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
            <h1>EIP-7702 Initialization</h1>
            <p>Connected Address: {account ? account.address : 'Not connected'}</p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button
                    onClick={handleSignAuthorization}
                    disabled={!!authorization}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        cursor: authorization ? 'not-allowed' : 'pointer',
                        backgroundColor: authorization ? '#ccc' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px'
                    }}
                >
                    {authorization ? 'Authorized' : '1. Sign Authorization'}
                </button>

                <button
                    onClick={initializeNexus}
                    disabled={!authorization || initializing}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        cursor: (!authorization || initializing) ? 'not-allowed' : 'pointer',
                        backgroundColor: (!authorization || initializing) ? '#ccc' : '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px'
                    }}
                >
                    {initializing ? 'Initializing...' : '2. Initialize Nexus (0 Value Tx)'}
                </button>
            </div>

            <LogDisplay logs={logs} emptyMessage="Logs will appear here..." />
        </div>
    );
}
