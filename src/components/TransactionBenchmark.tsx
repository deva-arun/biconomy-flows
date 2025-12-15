import { useState } from 'react';
import { useBiconomy } from '../context/BiconomyContext';
import { base } from 'viem/chains';
import { useLogger } from '../hooks/useLogger';
import { LogDisplay } from './LogDisplay';

export function TransactionBenchmark() {
    const { meeClient, authorization } = useBiconomy();
    const { logs, addLog, clearLogs } = useLogger();
    const { logs: execLogs, addLog: addExecLog, clearLogs: clearExecLogs } = useLogger();

    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [quote, setQuote] = useState<any | null>(null);

    const runTransaction = async () => {
        clearLogs();
        clearExecLogs();
        setQuote(null);

        if (!meeClient) {
            addLog('Error: MeeClient not initialized');
            return;
        }
        if (!authorization) {
            addLog('Error: Authorization not present. Please sign authorization first.');
            return;
        }

        setLoading(true);
        try {
            const zeroAddress = '0x0000000000000000000000000000000000000000';
            const usdcAddresses: Record<number, string> = {
                [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
            };

            addLog('Getting quote from MeeClient...');

            // Using base.id as per user request to "send on Base"
            const quoteData = await meeClient.getQuote({
                instructions: [{
                    calls: [{
                        to: zeroAddress,
                        value: 0n, // 0 ETH/Native
                        data: '0x'
                    }],
                    chainId: base.id
                }],
                delegate: true,
                authorization,
                feeToken: {
                    address: usdcAddresses[base.id],
                    chainId: base.id
                },
            });

            addLog('Quote received:', quoteData);
            setQuote(quoteData);

            if (quoteData.paymentInfo) {
                addLog('Payment Info Token Amount:', quoteData.paymentInfo.tokenAmount);
            }

        } catch (err: any) {
            addLog('Error fetching quote:', err);
        } finally {
            setLoading(false);
        }
    };

    const executeTransaction = async () => {
        if (!quote || !meeClient) return;

        setExecuting(true);
        clearExecLogs();
        try {
            addExecLog('Executing quote...');
            const { hash } = await meeClient.executeQuote({ quote });
            addExecLog('Execution Hash:', hash);

            addExecLog('Waiting for receipt...');
            const receipt = await meeClient.waitForSupertransactionReceipt({ hash });
            addExecLog('Transaction Receipt:', receipt);

        } catch (err: any) {
            addExecLog('Error executing transaction:', err);
        } finally {
            setExecuting(false);
        }
    }

    return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui', borderTop: '1px solid #ccc', marginTop: '20px' }}>
            <h1>Transaction Benchmark (Get Quote)</h1>
            <button
                onClick={runTransaction}
                disabled={loading || !authorization}
                style={{
                    padding: '10px 20px',
                    fontSize: '16px',
                    cursor: loading || !authorization ? 'not-allowed' : 'pointer',
                    backgroundColor: loading || !authorization ? '#ccc' : '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    marginTop: '10px'
                }}
            >
                {loading ? 'Processing...' : 'Get Quote'}
            </button>
            {!authorization && <div style={{ color: 'orange', marginBottom: '10px' }}>Warning: Sign Authorization above first</div>}

            <LogDisplay logs={logs} emptyMessage="Transaction logs will appear here..." />

            {quote && (
                <div style={{ marginTop: '20px', borderTop: '1px dashed #ccc', paddingTop: '20px' }}>
                    <h2>Execute Quote</h2>
                    <button
                        onClick={executeTransaction}
                        disabled={executing}
                        style={{
                            padding: '10px 20px',
                            fontSize: '16px',
                            cursor: executing ? 'not-allowed' : 'pointer',
                            backgroundColor: executing ? '#ccc' : '#E91E63',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            marginBottom: '20px',
                        }}
                    >
                        {executing ? 'Executing...' : 'Execute Transaction'}
                    </button>
                    <LogDisplay logs={execLogs} emptyMessage="Execution logs will appear here..." />
                </div>
            )}
        </div>
    );
}
