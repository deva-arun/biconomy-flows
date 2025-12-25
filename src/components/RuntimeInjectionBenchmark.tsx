import { useState, useMemo } from 'react';
import { useBiconomy } from '../context/BiconomyContext';
import { base } from 'viem/chains';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { useLogger } from '../hooks/useLogger';
import { LogDisplay } from './LogDisplay';
import { runtimeERC20BalanceOf } from '@biconomy/abstractjs';
import { USDC_ADDRESS, ERC20_ABI, BenchmarkButton, BenchmarkContainer } from '../lib';

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
        const pk = import.meta.env.VITE_SESSION_PRIVATE_KEY;
        if (!pk) return null;
        return privateKeyToAccount(pk as `0x${string}`);
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
            addLog(`Account 1 (Nexus): ${account.address}`);
            addLog(`Account 2 (EOA): ${eoa2.address}`);

            // Instruction 1: Transfer 10 USDC (10 * 10^6)
            addLog('Building Inst 1: Transfer 10 USDC to EOA2...');
            const instruction1 = await orchestrator.buildComposable({
                type: 'default',
                data: {
                    chainId: base.id,
                    abi: ERC20_ABI,
                    to: USDC_ADDRESS,
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
                    abi: ERC20_ABI,
                    to: USDC_ADDRESS,
                    functionName: 'transfer',
                    args: [
                        eoa2.address,
                        runtimeERC20BalanceOf({
                            targetAddress: account.address,
                            tokenAddress: USDC_ADDRESS
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
                    address: USDC_ADDRESS,
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
                address: USDC_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [eoa2.address]
            });
            addCleanupLog(`EOA2 Balance: ${balance.toString()}`);

            if (balance > 0n) {
                addCleanupLog('Sweeping USDC back to Account 1...');
                const hashUsdc = await client2.writeContract({
                    address: USDC_ADDRESS,
                    abi: ERC20_ABI,
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
        <BenchmarkContainer small>
            <div className="flex-row-mb">
                <BenchmarkButton
                    onClick={getBatchQuote}
                    disabled={loading || executing}
                    loading={loading}
                    loadingText="Getting Quote..."
                    variant="secondary"
                >
                    Get Batch Quote
                </BenchmarkButton>

                <BenchmarkButton
                    onClick={executeBatch}
                    disabled={!quote || executing}
                    loading={executing}
                    loadingText="Executing..."
                    variant="success"
                >
                    Execute Batch
                </BenchmarkButton>
            </div>

            <LogDisplay logs={logs} />

            <div className="section-divider-solid">
                <h4>Cleanup</h4>
                <BenchmarkButton
                    onClick={runCleanup}
                    disabled={!batchComplete || cleanupLoading}
                    loading={cleanupLoading}
                    loadingText="Cleaning up..."
                    variant="success"
                >
                    Return All Funds
                </BenchmarkButton>
                <div className="mt-sm">
                    <LogDisplay logs={cleanupLogs} />
                </div>
            </div>
        </BenchmarkContainer>
    );
}
