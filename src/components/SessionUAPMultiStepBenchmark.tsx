import { useState } from 'react';
import { useBiconomy } from '../context/BiconomyContext';
import { base } from 'viem/chains';
import { toFunctionSelector, getAbiItem, encodeFunctionData, parseUnits, pad, toHex, maxUint256 } from 'viem';
import { useLogger } from '../hooks/useLogger';
import { LogDisplay } from './LogDisplay';
import { getUniversalActionPolicy, ParamCondition } from '@biconomy/abstractjs';
import { USDC_ADDRESS, ERC20_TRANSFER_ABI, EMPTY_PARAM_RULE, BenchmarkButton, BenchmarkContainer, WarningMessage, type SessionMode } from '../lib';

export function SessionUAPMultiStepBenchmark() {
    const { meeClient, sessionMeeClient, sessionSigner, account } = useBiconomy();
    const { logs, addLog, clearLogs } = useLogger();
    const { logs: execLogs, addLog: addExecLog, clearLogs: clearExecLogs } = useLogger();

    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [sessionDetails, setSessionDetails] = useState<any | null>(null);
    const [mode, setMode] = useState<SessionMode>('ENABLE_AND_USE');

    const grantUAPSessionPermission = async () => {
        clearLogs();
        setLoading(true);

        if (!meeClient || !sessionSigner || !account) {
            addLog('Error: Dependencies not initialized (MeeClient, SessionSigner, or Account)');
            setLoading(false);
            return;
        }

        try {
            addLog('Granting Permission to Session Signer with Universal Action Policy...');
            addLog(`Session Signer: ${sessionSigner.address}`);

            // 1. Time Limit: 5 minutes from now
            const sessionValidUntil = Math.round(Date.now() / 1000) + 300;
            addLog(`Session Valid Until: ${new Date(sessionValidUntil * 1000).toLocaleTimeString()}`);

            // 2. Spend Limit: 10 USDC
            const limitAmount = parseUnits('10', 6);
            addLog(`Spend Limit: 10 USDC (${limitAmount.toString()})`);

            const emptyRule = {
                condition: ParamCondition.EQUAL,
                offset: 0n,
                isLimited: false,
                ref: EMPTY_PARAM_RULE.ref,
                usage: { limit: 0n, used: 0n }
            };

            // Construct UAP
            const uapPolicy = getUniversalActionPolicy({
                valueLimitPerUse: maxUint256,
                paramRules: {
                    length: 1n,
                    rules: [
                        // Rule 1 'amount' (offset 32) - Limit per tx < 10 USDC (just as an example rule)
                        // AND we set a global usage limit of 10 USDC
                        {
                            condition: ParamCondition.LESS_THAN_OR_EQUAL,
                            offset: 32n,
                            isLimited: true,
                            ref: pad(toHex(limitAmount)),
                            usage: { limit: limitAmount, used: 0n }

                        },
                        emptyRule,
                        emptyRule,
                        emptyRule,
                        emptyRule,
                        emptyRule,
                        emptyRule,
                        emptyRule,
                        emptyRule,
                        emptyRule,
                        emptyRule,
                        emptyRule,
                        emptyRule,
                        emptyRule,
                        emptyRule,
                        emptyRule,

                    ]
                }
            });

            const details = await meeClient.grantPermissionTypedDataSign({
                redeemer: sessionSigner.address,
                feeToken: {
                    address: USDC_ADDRESS,
                    chainId: base.id
                },
                actions: [
                    {
                        chainId: base.id,
                        actionTarget: USDC_ADDRESS,
                        actionTargetSelector: toFunctionSelector(getAbiItem({ abi: ERC20_TRANSFER_ABI, name: 'transfer' })),
                        actionPolicies: [uapPolicy]
                    }
                ],
                sessionValidUntil, // Enforce time limit on the session itself
                maxPaymentAmount: parseUnits('1', 6) // 1 USDC max fee
            });

            addLog('Permission Granted!');
            console.log('Session Details:', details);
            setSessionDetails(details);
            setMode('ENABLE_AND_USE');

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
            addExecLog(`Executing UAP Session Transaction (Mode: ${mode})...`);
            console.log('Session details during execution', sessionDetails);

            // Instruction 1: Transfer 5 USDC
            const call1 = {
                to: USDC_ADDRESS,
                data: encodeFunctionData({
                    abi: ERC20_TRANSFER_ABI,
                    functionName: 'transfer',
                    args: [sessionSigner.address, parseUnits('5', 6)]
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
            <h1>Session Multi-Step (UAP Limits)</h1>
            <p className="section-description">
                Universal Action Policy: Expires in 5 mins, Max 10 USDC cumulative spend.
            </p>

            <BenchmarkButton
                onClick={grantUAPSessionPermission}
                disabled={loading || !sessionSigner}
                loading={loading}
                loadingText="Granting..."
                variant="success"
                className="mb-md mr-sm"
            >
                1. Grant UAP Permission
            </BenchmarkButton>

            <WarningMessage show={!sessionSigner} message="Warning: Session Signer not initialized" />

            <LogDisplay logs={logs} emptyMessage="Permission logs will appear here..." />

            {sessionDetails && (
                <div className="section-divider">
                    <h2>Execute Session Transaction</h2>
                    <BenchmarkButton
                        onClick={executeSessionBatch}
                        disabled={executing}
                        loading={executing}
                        loadingText="Executing..."
                        variant="danger"
                        className="mb-md"
                    >
                        2. Execute via UAP Session
                    </BenchmarkButton>
                    <LogDisplay logs={execLogs} emptyMessage="Execution logs will appear here..." />
                </div>
            )}
        </BenchmarkContainer>
    );
}
