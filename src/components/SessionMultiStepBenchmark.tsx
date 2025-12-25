import { useState } from 'react';
import { useBiconomy } from '../context/BiconomyContext';
import { base } from 'viem/chains';
import { toFunctionSelector, getAbiItem, encodeFunctionData, parseUnits } from 'viem';
import { useLogger } from '../hooks/useLogger';
import { LogDisplay } from './LogDisplay';
import { getSudoPolicy } from '@biconomy/abstractjs';
import { USDC_ADDRESS, ERC20_TRANSFER_ABI, BenchmarkButton, BenchmarkContainer, WarningMessage, type SessionMode } from '../lib';

export function SessionMultiStepBenchmark() {
    const { meeClient, sessionMeeClient, sessionSigner, account } = useBiconomy();
    const { logs, addLog, clearLogs } = useLogger();
    const { logs: execLogs, addLog: addExecLog, clearLogs: clearExecLogs } = useLogger();

    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [sessionDetails, setSessionDetails] = useState<any | null>(null);
    const [mode, setMode] = useState<SessionMode>('ENABLE_AND_USE');

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
                    address: USDC_ADDRESS,
                    chainId: base.id
                },
                actions: [
                    {
                        chainId: base.id,
                        actionTarget: account.address,
                        actionTargetSelector: toFunctionSelector(getAbiItem({ abi: ERC20_TRANSFER_ABI, name: 'transfer' })),
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
                to: USDC_ADDRESS,
                data: encodeFunctionData({
                    abi: ERC20_TRANSFER_ABI,
                    functionName: 'transfer',
                    args: [account.address, 100n]
                })
            };

            // Instruction 2: Transfer 0.0002 USDC (200 in units)
            const call2 = {
                to: USDC_ADDRESS,
                data: encodeFunctionData({
                    abi: ERC20_TRANSFER_ABI,
                    functionName: 'transfer',
                    args: [account.address, 200n]
                })
            };

            const executionPayload = await sessionMeeClient.usePermission({
                sessionDetails,
                mode: mode,
                feeToken: {
                    address: USDC_ADDRESS,
                    chainId: base.id
                },
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
        <BenchmarkContainer bordered>
            <h1>Session Multi-Step Benchmark (Sudo Policy)</h1>
            <p className="section-description">
                Uses a Smart Session with Sudo Policy to execute a batch of USDC transfers.
            </p>

            <BenchmarkButton
                onClick={grantSessionPermission}
                disabled={loading || !sessionSigner}
                loading={loading}
                loadingText="Granting..."
                variant="success"
                className="mb-md mr-sm"
            >
                1. Grant Session Permission
            </BenchmarkButton>

            <WarningMessage show={!sessionSigner} message="Warning: Session Signer not initialized" />

            <LogDisplay logs={logs} emptyMessage="Permission logs will appear here..." />

            {sessionDetails && (
                <div className="section-divider">
                    <h2>Execute Session Batch</h2>
                    <BenchmarkButton
                        onClick={executeSessionBatch}
                        disabled={executing}
                        loading={executing}
                        loadingText="Executing..."
                        variant="danger"
                        className="mb-md"
                    >
                        2. Execute Multi-Step via Session
                    </BenchmarkButton>
                    <LogDisplay logs={execLogs} emptyMessage="Execution logs will appear here..." />
                </div>
            )}
        </BenchmarkContainer>
    );
}
