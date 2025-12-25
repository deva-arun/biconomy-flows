import { useState, useEffect } from 'react';
import { useBiconomy } from '../context/BiconomyContext';
import { useLogger } from '../hooks/useLogger';
import { LogDisplay } from './LogDisplay';
import { base } from 'viem/chains';
import { USDC_ADDRESS, ZERO_ADDRESS, BenchmarkButton, BenchmarkContainer, WarningMessage } from '../lib';

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
            addLog('Getting quote for 0-value initialization transaction...');

            const quoteData = await meeClient.getQuote({
                instructions: [{
                    calls: [{
                        to: ZERO_ADDRESS,
                        value: 0n,
                        data: '0x'
                    }],
                    chainId: base.id
                }],
                delegate: true,
                authorization,
                feeToken: {
                    address: USDC_ADDRESS,
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
        <BenchmarkContainer>
            <h1>EIP-7702 Initialization</h1>
            <p>Connected Address: {account ? account.address : 'Not connected'}</p>

            <div className="flex-row-mb">
                <BenchmarkButton
                    onClick={handleSignAuthorization}
                    disabled={!!authorization}
                    variant={authorization ? 'primary' : 'success'}
                >
                    {authorization ? 'Authorized' : '1. Sign Authorization'}
                </BenchmarkButton>

                <BenchmarkButton
                    onClick={initializeNexus}
                    disabled={!authorization || initializing}
                    loading={initializing}
                    loadingText="Initializing..."
                    variant="primary"
                >
                    2. Initialize Nexus (0 Value Tx)
                </BenchmarkButton>
            </div>

            <LogDisplay logs={logs} emptyMessage="Logs will appear here..." />
        </BenchmarkContainer>
    );
}
