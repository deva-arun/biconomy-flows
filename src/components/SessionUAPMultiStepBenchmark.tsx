import { useState } from 'react';
import { useBiconomy } from '../context/BiconomyContext';
import { base } from 'viem/chains';
import { parseAbi, toFunctionSelector, getAbiItem, encodeFunctionData, parseUnits, pad, toHex, maxUint256 } from 'viem';
import { useLogger } from '../hooks/useLogger';
import { LogDisplay } from './LogDisplay';
import { getUniversalActionPolicy, ParamCondition } from '@biconomy/abstractjs';

export function SessionUAPMultiStepBenchmark() {
    const { meeClient, sessionMeeClient, sessionSigner, account } = useBiconomy();
    const { logs, addLog, clearLogs } = useLogger();
    const { logs: execLogs, addLog: addExecLog, clearLogs: clearExecLogs } = useLogger();

    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [sessionDetails, setSessionDetails] = useState<any | null>(null);
    const [mode, setMode] = useState<'ENABLE_AND_USE' | 'USE'>('ENABLE_AND_USE');

    const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    const erc20Abi = parseAbi(['function transfer(address to, uint256 amount) returns (bool)']);

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


            const EMPTY_RAW_RULE = {
                condition: ParamCondition.EQUAL,
                offset: 0n,
                isLimited: false,
                ref: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
                usage: { limit: 0n, used: 0n }
            }

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
                        EMPTY_RAW_RULE,
                        EMPTY_RAW_RULE,
                        EMPTY_RAW_RULE,
                        EMPTY_RAW_RULE,
                        EMPTY_RAW_RULE,
                        EMPTY_RAW_RULE,
                        EMPTY_RAW_RULE,
                        EMPTY_RAW_RULE,
                        EMPTY_RAW_RULE,
                        EMPTY_RAW_RULE,
                        EMPTY_RAW_RULE,
                        EMPTY_RAW_RULE,
                        EMPTY_RAW_RULE,
                        EMPTY_RAW_RULE,
                        EMPTY_RAW_RULE,

                    ]
                }
            });

            const details = await meeClient.grantPermissionTypedDataSign({
                redeemer: sessionSigner.address,
                feeToken: {
                    address: usdcAddress,
                    chainId: base.id
                },
                actions: [
                    {
                        chainId: base.id,
                        actionTarget: account.address, // USDC Contract
                        actionTargetSelector: toFunctionSelector(getAbiItem({ abi: erc20Abi, name: 'transfer' })),
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
                to: usdcAddress,
                data: encodeFunctionData({
                    abi: erc20Abi,
                    functionName: 'transfer',
                    args: [sessionSigner.address, parseUnits('5', 6)]
                })
            };

            const executionPayload = await sessionMeeClient.usePermission({
                sessionDetails,
                mode: mode,
                feeToken: {
                    address: usdcAddress,
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
        <div style={{ padding: '2rem', fontFamily: 'system-ui', borderTop: '1px solid #ccc', marginTop: '20px' }}>
            <h1>Session Multi-Step (UAP Limits)</h1>
            <p style={{ fontSize: '14px', color: '#666' }}>
                Universal Action Policy: Expires in 5 mins, Max 10 USDC cumulative spend.
            </p>

            <button
                onClick={grantUAPSessionPermission}
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
                {loading ? 'Granting...' : '1. Grant UAP Permission'}
            </button>
            {!sessionSigner && <div style={{ color: 'orange', marginBottom: '10px' }}>Warning: Session Signer not initialized</div>}

            <LogDisplay logs={logs} emptyMessage="Permission logs will appear here..." />

            {sessionDetails && (
                <div style={{ marginTop: '20px', borderTop: '1px dashed #ccc', paddingTop: '20px' }}>
                    <h2>Execute Session Transaction</h2>
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
                        {executing ? 'Executing...' : '2. Execute via UAP Session'}
                    </button>
                    <LogDisplay logs={execLogs} emptyMessage="Execution logs will appear here..." />
                </div>
            )}
        </div>
    );
}
