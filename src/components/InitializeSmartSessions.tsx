import { useState } from 'react';
import { useBiconomy } from '../context/BiconomyContext';
import { base } from 'viem/chains';
import { useLogger } from '../hooks/useLogger';
import { LogDisplay } from './LogDisplay';
import { toSmartSessionsModule } from '@biconomy/abstractjs';

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

            const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC

            addLog('Preparing SA for using Smart Sessions...');
            // prepareForPermissions checks if the module is installed. 
            // If not, it returns a payload to install it.
            const payload = await meeClient.prepareForPermissions({
                smartSessionsValidator: ssValidator,
                feeToken: {
                    address: usdcAddress,
                    chainId: base.id
                }
            });

            if (payload) {
                addLog('Module installation needed. Payload received. Waiting for transaction...');
                addLog(`Transaction Hash: ${payload.hash}`);

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
        <div style={{ padding: '2rem', fontFamily: 'system-ui', borderTop: '1px solid #ccc', marginTop: '20px' }}>
            <h1>Initialize Smart Sessions</h1>
            <p style={{ color: '#666', marginBottom: '20px' }}>
                This step installs the Smart Session module on your Smart Account if it is not already installed.
            </p>

            <button
                onClick={installSmartSession}
                disabled={loading || !sessionSigner}
                style={{
                    padding: '10px 20px',
                    fontSize: '16px',
                    cursor: (loading || !sessionSigner) ? 'not-allowed' : 'pointer',
                    backgroundColor: (loading || !sessionSigner) ? '#ccc' : '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    marginTop: '10px'
                }}
            >
                {loading ? 'Installing...' : 'Install Smart Session Module'}
            </button>

            {!sessionSigner && <div style={{ color: 'orange', marginBottom: '10px' }}>Warning: Session Signer not found. Check .env VITE_SESSION_PRIVATE_KEY</div>}

            <LogDisplay logs={logs} emptyMessage="Initialization logs will appear here..." />
        </div>
    );
}
