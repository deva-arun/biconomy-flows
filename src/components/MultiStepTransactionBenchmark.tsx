import { useState } from 'react';
import { useBiconomy } from '../context/BiconomyContext';
import { base } from 'viem/chains';
import { parseAbi } from 'viem';
import { useLogger } from '../hooks/useLogger';
import { LogDisplay } from './LogDisplay';

export function MultiStepTransactionBenchmark() {
    const { meeClient, authorization, account, orchestrator } = useBiconomy();
    const { logs, addLog, clearLogs } = useLogger();
    const { logs: execLogs, addLog: addExecLog, clearLogs: clearExecLogs } = useLogger();

    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [quote, setQuote] = useState<any | null>(null);

    const runTransaction = async () => {
        clearLogs();
        clearExecLogs();
        setQuote(null);

        if (!meeClient || !orchestrator) {
            addLog('Error: MeeClient or Orchestrator not initialized');
            return;
        }
        if (!authorization) {
            addLog('Error: Authorization not present. Please sign authorization first.');
            return;
        }
        if (!account) {
            addLog('Error: Account not present in context.');
            return;
        }

        setLoading(true);
        try {
            const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
            const abi = parseAbi(['function transfer(address to, uint256 amount) returns (bool)']);

            addLog('Building 2 separate Composable Calls (1x USDC each)...');

            // Build first instruction
            const instruction1 = await orchestrator.buildComposable({
                type: 'default',
                data: {
                    chainId: base.id,
                    abi,
                    to: usdcAddress,
                    functionName: 'transfer',
                    args: [account.address, 200n]
                }
            });
            console.log("Instruction 1:", instruction1);

            // Build second instruction
            const instruction2 = await orchestrator.buildComposable({
                type: 'default',
                data: {
                    chainId: base.id,
                    abi,
                    to: usdcAddress,
                    functionName: 'transfer',
                    args: [account.address, 100n]
                }
            });
            console.log("Instruction 2:", instruction2);

            addLog('Instructions built. Getting Quote with [instruction1, instruction2]...');

            const quoteData = await meeClient.getQuote({
                instructions: [instruction1, instruction2],
                delegate: true,
                authorization,
                feeToken: {
                    address: usdcAddress,
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
            addExecLog('Executing batch transaction...');
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
            <h1>Batch Transaction Benchmark (2x USDC Transfer)</h1>
            <p style={{ fontSize: '14px', color: '#666' }}>Sends two atomic 0 USDC transfers to your own address on Base.</p>
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
                {loading ? 'Processing...' : 'Get Batch Quote'}
            </button>
            {!authorization && <div style={{ color: 'orange', marginBottom: '10px' }}>Warning: Sign Authorization above first</div>}

            <LogDisplay logs={logs} emptyMessage="Quote logs will appear here..." />

            {quote && (
                <div style={{ marginTop: '20px', borderTop: '1px dashed #ccc', paddingTop: '20px' }}>
                    <h2>Execute Batch</h2>
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
                        {executing ? 'Executing...' : 'Execute Batch'}
                    </button>
                    <LogDisplay logs={execLogs} emptyMessage="Execution logs will appear here..." />
                </div>
            )}
        </div>
    );
}
