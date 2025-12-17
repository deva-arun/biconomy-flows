import { useState } from 'react';
import { useBiconomy } from '../context/BiconomyContext';
import { base } from 'viem/chains';
import { parseAbi, toFunctionSelector, getAbiItem, encodeFunctionData, parseUnits } from 'viem';
import { useLogger } from '../hooks/useLogger';
import { LogDisplay } from './LogDisplay';
import { getSudoPolicy } from '@biconomy/abstractjs';

export function SessionMultiStepBenchmark() {
    const { meeClient, sessionMeeClient, sessionSigner, account } = useBiconomy();
    const { logs, addLog, clearLogs } = useLogger();
    const { logs: execLogs, addLog: addExecLog, clearLogs: clearExecLogs } = useLogger();

    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [sessionDetails, setSessionDetails] = useState<any | null>(null);
    const [mode, setMode] = useState<'ENABLE_AND_USE' | 'USE'>('ENABLE_AND_USE');

    const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    const erc20Abi = parseAbi(['function transfer(address to, uint256 amount) returns (bool)']);

    const grantSessionPermission = async () => {
        clearLogs();
        setLoading(true);

        if (!meeClient || !sessionSigner || !account) {
            addLog('Error: Dependencies not initialized (MeeClient, SessionSigner, or Account)');
            setLoading(false);
            return;
        }

        try {
            addLog('Granting Permission to Session Signer with Sudo Policy...');
            addLog(`Session Signer: ${sessionSigner.address}`);

            const details = await meeClient.grantPermissionTypedDataSign({
                redeemer: sessionSigner.address,
                feeToken: {
                    address: usdcAddress,
                    chainId: base.id
                },
                actions: [
                    {
                        chainId: base.id,
                        actionTarget: account.address,
                        actionTargetSelector: toFunctionSelector(getAbiItem({ abi: erc20Abi, name: 'transfer' })),
                        actionPolicies: [getSudoPolicy()]
                    }
                ],
                maxPaymentAmount: parseUnits('1', 6) // 1 USDC max fee
            });

            addLog('Permission Granted!');
            console.log('Session Details:', details);
            setSessionDetails(details);
            setMode('ENABLE_AND_USE'); // Reset mode for new permission

        } catch (err: any) {
            addLog('Error granting permission:', err);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const executeSessionBatch = async () => {
        if (!sessionDetails || !sessionMeeClient) return;

        setExecuting(true);
        clearExecLogs();

        try {
            addExecLog(`Executing Multi-Step Transaction via Session (Mode: ${mode})...`);
            console.log('Session details during execution', sessionDetails);

            // Instruction 1: Transfer 0.0001 USDC (100 in units)
            const call1 = {
                to: usdcAddress,
                data: encodeFunctionData({
                    abi: erc20Abi,
                    functionName: 'transfer',
                    args: [account.address, 100n]
                })
            };

            // Instruction 2: Transfer 0.0002 USDC (200 in units)
            const call2 = {
                to: usdcAddress,
                data: encodeFunctionData({
                    abi: erc20Abi,
                    functionName: 'transfer',
                    args: [account.address, 200n]
                })
            };

            const executionPayload = await sessionMeeClient.usePermission({
                sessionDetails,
                mode: mode,
                feeToken: {
                    address: usdcAddress,
                    chainId: base.id
                },
                verificationGasLimit: 2_500_000n, // Optional
                instructions: [
                    {
                        calls: [call1],
                        chainId: base.id
                    },
                    {
                        calls: [call2],
                        chainId: base.id
                    }
                ],
                simulation: {
                    simulate: false
                }
            });

            addExecLog(`Execution Hash: ${executionPayload.hash}`);
            addExecLog('Waiting for receipt...');

            const receipt = await sessionMeeClient.waitForSupertransactionReceipt({ hash: executionPayload.hash });
            addExecLog('Transaction Receipt:', receipt);

            if (mode === 'ENABLE_AND_USE') {
                setMode('USE');
                addExecLog('Switched mode to USE for next execution.');
            }

        } catch (err: any) {
            addExecLog('Error executing session batch:', err);
            console.error(err);
        } finally {
            setExecuting(false);
        }
    };

    return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui', borderTop: '1px solid #ccc', marginTop: '20px' }}>
            <h1>Session Multi-Step Benchmark (Sudo Policy)</h1>
            <p style={{ fontSize: '14px', color: '#666' }}>
                Uses a Smart Session with Sudo Policy to execute a batch of USDC transfers.
            </p>

            <button
                onClick={grantSessionPermission}
                disabled={loading || !sessionSigner}
                style={{
                    padding: '10px 20px',
                    fontSize: '16px',
                    cursor: (loading || !sessionSigner) ? 'not-allowed' : 'pointer',
                    backgroundColor: (loading || !sessionSigner) ? '#ccc' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    marginRight: '10px'
                }}
            >
                {loading ? 'Granting...' : '1. Grant Session Permission'}
            </button>
            {!sessionSigner && <div style={{ color: 'orange', marginBottom: '10px' }}>Warning: Session Signer not initialized</div>}

            <LogDisplay logs={logs} emptyMessage="Permission logs will appear here..." />

            {sessionDetails && (
                <div style={{ marginTop: '20px', borderTop: '1px dashed #ccc', paddingTop: '20px' }}>
                    <h2>Execute Session Batch</h2>
                    <button
                        onClick={executeSessionBatch}
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
                        {executing ? 'Executing...' : '2. Execute Multi-Step via Session'}
                    </button>
                    <LogDisplay logs={execLogs} emptyMessage="Execution logs will appear here..." />
                </div>
            )}
        </div>
    );
}
