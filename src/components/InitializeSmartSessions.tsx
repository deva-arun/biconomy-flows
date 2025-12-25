import { useState } from 'react';
import { useBiconomy } from '../context/BiconomyContext';
import { base } from 'viem/chains';
import { useLogger } from '../hooks/useLogger';
import { LogDisplay } from './LogDisplay';
import { toSmartSessionsModule } from '@biconomy/abstractjs';
import { USDC_ADDRESS, BenchmarkButton, BenchmarkContainer, WarningMessage } from '../lib';

export function InitializeSmartSessions() {
    const { meeClient, sessionSigner } = useBiconomy();
    const { logs, addLog, clearLogs } = useLogger();

    const [loading, setLoading] = useState(false);

    const installSmartSession = async () => {
        clearLogs();
        setLoading(true);

        if (!meeClient) {
            addLog('Error: MeeClient not initialized');
            setLoading(false);
            return;
        }
        if (!sessionSigner) {
            addLog('Error: Session Signer not initialized in context');
            setLoading(false);
            return;
        }

        try {
            addLog('Creating SmartSessions Validator...');
            const ssValidator = toSmartSessionsModule({ signer: sessionSigner });

            addLog('Preparing SA for using Smart Sessions...');
            // prepareForPermissions checks if the module is installed. 
            // If not, it returns a payload to install it.
            const payload = await meeClient.prepareForPermissions({
                smartSessionsValidator: ssValidator,
                feeToken: {
                    address: USDC_ADDRESS,
                    chainId: base.id
                }
            });

            if (payload) {
                addLog('Module installation needed. Payload received. Waiting for transaction...');
                addLog(`Transaction Hash: ${payload.hash}`);

                // Nexus smart account must be installed on every chain defined in orchestrator or this call will return an error
                const receipt = await meeClient.waitForSupertransactionReceipt({ hash: payload.hash });

                if (receipt.transactionStatus === 'SUCCESS' || receipt.transactionStatus === 'MINED_SUCCESS') {
                    addLog('Smart Session installation successful!');
                } else {
                    addLog('Smart Session installation failed.');
                    console.error("Receipt status:", receipt.transactionStatus);
                }
            } else {
                addLog('No preparation needed (Smart Session module likely already installed).');
            }

        } catch (err: any) {
            addLog('Error setting up Smart Session:', err);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <BenchmarkContainer bordered>
            <h1>Initialize Smart Sessions</h1>
            <p className="section-description">
                This step installs the Smart Session module on your Smart Account if it is not already installed.
            </p>

            <BenchmarkButton
                onClick={installSmartSession}
                disabled={loading || !sessionSigner}
                loading={loading}
                loadingText="Installing..."
                variant="primary"
                className="mb-md mt-sm"
            >
                Install Smart Session Module
            </BenchmarkButton>

            <WarningMessage
                show={!sessionSigner}
                message="Warning: Session Signer not found. Check .env VITE_SESSION_PRIVATE_KEY"
            />

            <LogDisplay logs={logs} emptyMessage="Initialization logs will appear here..." />
        </BenchmarkContainer>
    );
}
