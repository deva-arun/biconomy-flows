import { useState } from 'react';
import { useBiconomy } from '../context/BiconomyContext';
import { base } from 'viem/chains';
import { toFunctionSelector, getAbiItem, encodeFunctionData, parseUnits } from 'viem';
import { useLogger } from '../hooks/useLogger';
import { LogDisplay } from './LogDisplay';
import { getSudoPolicy } from '@biconomy/abstractjs';
import { getTimeFramePolicy } from '@rhinestone/module-sdk';
import { USDC_ADDRESS, ERC20_TRANSFER_ABI, BenchmarkButton, BenchmarkContainer, type SessionMode } from '../lib';

export function SessionUAPMultiStepBenchmark2() {
    const { meeClient, sessionMeeClient, sessionSigner, account } = useBiconomy();
    const { logs, addLog, clearLogs } = useLogger();
    const { logs: execLogs, addLog: addExecLog, clearLogs: clearExecLogs } = useLogger();

    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [sessionDetails, setSessionDetails] = useState<any | null>(null);
    const [mode, setMode] = useState<SessionMode>('ENABLE_AND_USE');

    const grantPermission = async () => {
        clearLogs();
        setLoading(true);

        if (!meeClient || !sessionSigner || !account) {
            addLog('Error: Dependencies not initialized');
            setLoading(false);
            return;
        }

        try {
            addLog('Permission 2: Sudo + 1 Minute Time Limit');

            const timeFramePolicy = getTimeFramePolicy({
                validUntil: Math.floor(Date.now() / 1000) + 60, // 1 minute
                validAfter: Math.floor(Date.now() / 1000)
            });

            const sudoPolicy = getSudoPolicy();

            const details = await meeClient.grantPermissionTypedDataSign({
                redeemer: sessionSigner.address,
                feeToken: { address: USDC_ADDRESS, chainId: base.id },
                actions: [{
                    chainId: base.id,
                    actionTarget: USDC_ADDRESS,
                    actionTargetSelector: toFunctionSelector(getAbiItem({ abi: ERC20_TRANSFER_ABI, name: 'transfer' })),
                    actionPolicies: [sudoPolicy, timeFramePolicy]
                }],
                maxPaymentAmount: parseUnits('1', 6)
            });

            addLog('Permission Granted! Exports in 1 minute.');
            setSessionDetails(details);
            setMode('ENABLE_AND_USE');

        } catch (err: any) {
            addLog('Error granting permission:', err);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const executeTransfer = async () => {
        if (!sessionDetails || !sessionMeeClient) return;
        setExecuting(true);
        clearExecLogs();

        try {
            addExecLog(`Executing Transfer (Mode: ${mode})...`);

            const executionPayload = await sessionMeeClient.usePermission({
                sessionDetails,
                mode,
                feeToken: { address: USDC_ADDRESS, chainId: base.id },
                instructions: [{
                    calls: [{
                        to: USDC_ADDRESS,
                        data: encodeFunctionData({
                            abi: ERC20_TRANSFER_ABI,
                            functionName: 'transfer',
                            args: [sessionSigner.address, 1n]
                        })
                    }],
                    chainId: base.id
                }]
            });

            addExecLog(`Hash: ${executionPayload.hash}`);
            const receipt = await sessionMeeClient.waitForSupertransactionReceipt({ hash: executionPayload.hash });
            addExecLog('Receipt:', receipt);

            if (mode === 'ENABLE_AND_USE') setMode('USE');

        } catch (err: any) {
            addExecLog('Error (Expected if > 1 min):', err);
        } finally {
            setExecuting(false);
        }
    };

    return (
        <BenchmarkContainer small bordered>
            <h2>Permission 2: Sudo + 1 Min Limit</h2>
            <BenchmarkButton
                onClick={grantPermission}
                disabled={loading || !sessionSigner}
                loading={loading}
                loadingText="Granting..."
                variant="primary"
            >
                Grant Permission
            </BenchmarkButton>
            <LogDisplay logs={logs} />

            {sessionDetails && (
                <div className="mt-sm">
                    <BenchmarkButton
                        onClick={executeTransfer}
                        disabled={executing}
                        loading={executing}
                        loadingText="Executing..."
                        variant="danger"
                    >
                        Execute Transfer
                    </BenchmarkButton>
                    <LogDisplay logs={execLogs} />
                </div>
            )}
        </BenchmarkContainer>
    );
}
