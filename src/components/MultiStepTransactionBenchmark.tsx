import { useState } from 'react';
import { useBiconomy } from '../context/BiconomyContext';
import { base } from 'viem/chains';
import { useLogger } from '../hooks/useLogger';
import { LogDisplay } from './LogDisplay';
import { USDC_ADDRESS, ERC20_TRANSFER_ABI, BenchmarkButton, BenchmarkContainer, WarningMessage } from '../lib';

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
            addLog('Building 2 separate Composable Calls (1x USDC each)...');

            // Build first instruction
            const instruction1 = await orchestrator.buildComposable({
                type: 'default',
                data: {
                    chainId: base.id,
                    abi: ERC20_TRANSFER_ABI,
                    to: USDC_ADDRESS,
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
                    abi: ERC20_TRANSFER_ABI,
                    to: USDC_ADDRESS,
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
                    address: USDC_ADDRESS,
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
        <BenchmarkContainer bordered>
            <h1>Batch Transaction Benchmark (2x USDC Transfer)</h1>
            <p className="section-description">Sends two atomic 0 USDC transfers to your own address on Base.</p>

            <BenchmarkButton
                onClick={runTransaction}
                disabled={loading || !authorization}
                loading={loading}
                loadingText="Processing..."
                variant="primary"
                className="mb-md mt-sm"
            >
                Get Batch Quote
            </BenchmarkButton>

            <WarningMessage show={!authorization} message="Warning: Sign Authorization above first" />

            <LogDisplay logs={logs} emptyMessage="Quote logs will appear here..." />

            {quote && (
                <div className="section-divider">
                    <h2>Execute Batch</h2>
                    <BenchmarkButton
                        onClick={executeTransaction}
                        disabled={executing}
                        loading={executing}
                        loadingText="Executing..."
                        variant="danger"
                        className="mb-md"
                    >
                        Execute Batch
                    </BenchmarkButton>
                    <LogDisplay logs={execLogs} emptyMessage="Execution logs will appear here..." />
                </div>
            )}
        </BenchmarkContainer>
    );
}
