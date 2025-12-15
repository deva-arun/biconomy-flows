import { useState, useMemo } from 'react';
import { useBiconomy } from '../context/BiconomyContext';
import { base } from 'viem/chains';
import { parseAbi, createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { useLogger } from '../hooks/useLogger';
import { LogDisplay } from './LogDisplay';
import { runtimeERC20BalanceOf } from '@biconomy/abstractjs';

export function RuntimeInjectionBenchmark() {
    const { meeClient, authorization, account, orchestrator } = useBiconomy();
    const { logs, addLog, clearLogs } = useLogger();

    // Cleanup logs
    const { logs: cleanupLogs, addLog: addCleanupLog, clearLogs: clearCleanupLog } = useLogger();

    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [batchComplete, setBatchComplete] = useState(false);
    const [cleanupLoading, setCleanupLoading] = useState(false);
    const [quote, setQuote] = useState<any | null>(null);

    // EOA 2 Setup
    const eoa2 = useMemo(() => {
        const pk = import.meta.env.VITE_PK_TWO;
        if (!pk) return null;
        return privateKeyToAccount(pk);
    }, []);

    const getBatchQuote = async () => {
        clearLogs();
        setBatchComplete(false);
        setQuote(null);

        if (!meeClient || !orchestrator) {
            addLog('Error: MeeClient or Orchestrator not initialized');
            return;
        }
        if (!authorization) {
            addLog('Error: Authorization not present.');
            return;
        }
        if (!account) {
            addLog('Error: Account not present.');
            return;
        }
        if (!eoa2) {
            addLog('Error: PK_2 not found in env.');
            return;
        }

        setLoading(true);
        try {
            const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
            const abi = parseAbi(['function transfer(address to, uint256 amount) returns (bool)']);

            addLog(`Account 1 (Nexus): ${account.address}`);
            addLog(`Account 2 (EOA): ${eoa2.address}`);

            // Instruction 1: Transfer 10 USDC (10 * 10^6)
            addLog('Building Inst 1: Transfer 10 USDC to EOA2...');
            const instruction1 = await orchestrator.buildComposable({
                type: 'default',
                data: {
                    chainId: base.id,
                    abi,
                    to: usdcAddress,
                    functionName: 'transfer',
                    args: [eoa2.address, 10000000n] // 10 USDC
                }
            });

            // Instruction 2: Transfer Remaining Balance
            addLog('Building Inst 2: Sweep Remaining USDC to EOA2 (Runtime Injection)...');
            const instruction2 = await orchestrator.buildComposable({
                type: 'default',
                data: {
                    chainId: base.id,
                    abi,
                    to: usdcAddress,
                    functionName: 'transfer',
                    args: [
                        eoa2.address,
                        runtimeERC20BalanceOf({
                            targetAddress: account.address,
                            tokenAddress: usdcAddress
                        })
                    ]
                }
            });

            addLog('Getting Quote...');
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

        } catch (err: any) {
            addLog('Error getting quote:', err);
        } finally {
            setLoading(false);
        }
    };

    const executeBatch = async () => {
        if (!quote || !meeClient) return;

        setExecuting(true);
        try {
            addLog('Executing Quote...');
            const { hash } = await meeClient.executeQuote({ quote });
            addLog('Execution Hash:', hash);

            addLog('Waiting for receipt...');
            const receipt = await meeClient.waitForSupertransactionReceipt({ hash });
            addLog('Batch Complete:', receipt);
            setBatchComplete(true);
        } catch (err: any) {
            addLog('Error executing:', err);
        } finally {
            setExecuting(false);
        }
    }

    const runCleanup = async () => {
        if (!eoa2 || !account) return;
        setCleanupLoading(true);
        clearCleanupLog();

        try {
            addCleanupLog('Starting Cleanup...');
            const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

            const account1 = privateKeyToAccount(import.meta.env.VITE_PRIVATE_KEY as `0x${string}`);
            const client1 = createWalletClient({
                account: account1,
                chain: base,
                transport: http()
            });

            const publicClient = createPublicClient({
                chain: base,
                transport: http()
            });

            const client2 = createWalletClient({
                account: eoa2,
                chain: base,
                transport: http()
            });

            // 1. Transfer ETH for Gas
            addCleanupLog('1. Sending 0.0005 ETH to EOA2 for gas...');
            const hashEth = await client1.sendTransaction({
                to: eoa2.address,
                value: 500000000000000n, // 0.0005 ETH
                account: account1,
                chain: base
            });
            addCleanupLog(`ETH Sent: ${hashEth}`);

            // Wait for ETH to confirm loosely?
            await new Promise(r => setTimeout(r, 2000));

            // 2. Transfer USDC back
            addCleanupLog('Reading EOA2 USDC Balance...');
            const balance = await publicClient.readContract({
                address: usdcAddress,
                abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
                functionName: 'balanceOf',
                args: [eoa2.address]
            });
            addCleanupLog(`EOA2 Balance: ${balance.toString()}`);

            if (balance > 0n) {
                addCleanupLog('Sweeping USDC back to Account 1...');
                const hashUsdc = await client2.writeContract({
                    address: usdcAddress,
                    abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
                    functionName: 'transfer',
                    args: [account.address, balance],
                    chain: base,
                    account: eoa2
                });
                addCleanupLog(`USDC Return Hash: ${hashUsdc}`);
            } else {
                addCleanupLog('No USDC to return.');
            }

            // 3. Return Remaining ETH
            const ethBalance = await publicClient.getBalance({ address: eoa2.address });
            if (ethBalance > 21000n * 100000000n) { // Check if enough for gas
                // Calculate gas roughly
                const gasPrice = await publicClient.getGasPrice();
                const cost = 21000n * gasPrice;
                const valueToSend = ethBalance - cost - 1000n; // Buffer

                if (valueToSend > 0n) {
                    addCleanupLog(`Returning remaining ${valueToSend} ETH...`);
                    const hashReturnEth = await client2.sendTransaction({
                        to: account.address,
                        value: valueToSend,
                        chain: base,
                        account: eoa2
                    });
                    addCleanupLog(`ETH return hash: ${hashReturnEth}`);
                }
            }

        } catch (err: any) {
            addCleanupLog('Error in cleanup:', err);
        } finally {
            setCleanupLoading(false);
        }
    };

    return (
        <div style={{ padding: '10px' }}>
            <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
                <button
                    onClick={getBatchQuote}
                    disabled={loading || executing}
                    style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: (loading || executing) ? 'not-allowed' : 'pointer' }}
                >
                    {loading ? 'Getting Quote...' : 'Get Batch Quote'}
                </button>

                <button
                    onClick={executeBatch}
                    disabled={!quote || executing}
                    style={{ padding: '8px 16px', backgroundColor: (!quote || executing) ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: (!quote || executing) ? 'not-allowed' : 'pointer' }}
                >
                    {executing ? 'Executing...' : 'Execute Batch'}
                </button>
            </div>

            <LogDisplay logs={logs} />

            <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <h4>Cleanup</h4>
                <button
                    onClick={runCleanup}
                    disabled={!batchComplete || cleanupLoading}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: batchComplete ? '#28a745' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: (!batchComplete || cleanupLoading) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {cleanupLoading ? 'Cleaning up...' : 'Return All Funds'}
                </button>
                <div style={{ marginTop: '10px' }}>
                    <LogDisplay logs={cleanupLogs} />
                </div>
            </div>
        </div>
    );
}
