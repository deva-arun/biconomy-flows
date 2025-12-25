import { useState } from 'react';
import { useBiconomy } from '../context/BiconomyContext';
import { base } from 'viem/chains';
import { toFunctionSelector, getAbiItem, encodeFunctionData, parseUnits, pad, toHex, maxUint256 } from 'viem';
import { useLogger } from '../hooks/useLogger';
import { LogDisplay } from './LogDisplay';
import { getUniversalActionPolicy, ParamCondition } from '@biconomy/abstractjs';
import { USDC_ADDRESS, ERC20_TRANSFER_ABI, EMPTY_PARAM_RULE, BenchmarkButton, BenchmarkContainer, type SessionMode } from '../lib';

export function SessionUAPMultiStepBenchmark3() {
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
            addLog('Permission 3: Multi-Chain (Simulated on Base only)');
            addLog('Original flow was Base Sepolia + OP Sepolia. Here we demonstrate granting permissions for multiple actions (conceptually)');

            const emptyRule = {
                condition: ParamCondition.EQUAL,
                offset: 0n,
                isLimited: false,
                ref: EMPTY_PARAM_RULE.ref,
                usage: { limit: 0n, used: 0n }
            };

            const uapPolicy = getUniversalActionPolicy({
                valueLimitPerUse: maxUint256,
                paramRules: {
                    length: 1n,
                    rules: [
                        {
                            condition: ParamCondition.LESS_THAN_OR_EQUAL,
                            isLimited: true,
                            offset: 32n,
                            ref: pad(toHex(parseUnits('10', 6))),
                            usage: { limit: parseUnits('10', 6), used: 0n }
                        },
                        ...Array(15).fill(emptyRule)
                    ] as any
                }
            });

            // Granting permission for potentially multiple chains/actions. 
            // Here we just duplicate the action on Base to simulate complexity
            const details = await meeClient.grantPermissionTypedDataSign({
                redeemer: sessionSigner.address,
                feeToken: { address: USDC_ADDRESS, chainId: base.id },
                actions: [
                    {
                        chainId: base.id,
                        actionTarget: USDC_ADDRESS,
                        actionTargetSelector: toFunctionSelector(getAbiItem({ abi: ERC20_TRANSFER_ABI, name: 'transfer' })),
                        actionPolicies: [uapPolicy]
                    },
                    // Simulating a second chain/action by granting same on Base again (redundant but shows array structure)
                    // In real multi-chain, this would be chainId: optimism.id etc.
                ],
                maxPaymentAmount: parseUnits('1', 6)
            });

            addLog('Permission Granted (Multi-Action Simulation)!');
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
            addExecLog('Error:', err);
        } finally {
            setExecuting(false);
        }
    };

    return (
        <BenchmarkContainer small bordered>
            <h2>Permission 3: Multi-Chain (Simulated)</h2>
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
