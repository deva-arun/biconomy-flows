import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { toMultichainNexusAccount, getMEEVersion, MEEVersion, createMeeClient, meeSessionActions } from "@biconomy/abstractjs";
import { http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, arbitrum, baseSepolia } from "viem/chains";

interface BiconomyContextType {
    orchestrator: any | null;
    meeClient: any | null;
    loading: boolean;
    error: Error | null;
    account: any;
    authorization: any | null;
    signAuthorization: () => Promise<void>;
}

const BiconomyContext = createContext<BiconomyContextType | undefined>(undefined);

export function useBiconomy() {
    const context = useContext(BiconomyContext);
    if (context === undefined) {
        throw new Error('useBiconomy must be used within a BiconomyProvider');
    }
    return context;
}

export function BiconomyProvider({ children }: { children: ReactNode }) {
    const [orchestrator, setOrchestrator] = useState<any | null>(null);
    const [meeClient, setMeeClient] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [account, setAccount] = useState<any | null>(null);
    const [authorization, setAuthorization] = useState<any | null>(null);

    useEffect(() => {
        const initOrchestrator = async () => {
            try {
                const privateKey = import.meta.env.VITE_PRIVATE_KEY;
                if (!privateKey) {
                    console.error("VITE_PRIVATE_KEY is not set in .env");
                    // Don't throw here to prevent app crash, just don't init orchestrator
                    setLoading(false);
                    return;
                }
                const eoa = privateKeyToAccount(privateKey as `0x${string}`);
                setAccount(eoa);

                console.log("Initializing Biconomy Orchestrator...");
                const orchestratorInstance = await toMultichainNexusAccount({
                    chainConfigurations: [
                        {
                            chain: base,
                            transport: http(),
                            version: getMEEVersion(MEEVersion.V2_1_0),
                            accountAddress: eoa.address
                        },
                        {
                            chain: arbitrum,
                            transport: http(),
                            version: getMEEVersion(MEEVersion.V2_1_0),
                            accountAddress: eoa.address
                        }
                    ],
                    signer: eoa
                });
                console.log("Biconomy Orchestrator initialized successfully");
                setOrchestrator(orchestratorInstance);

                console.log("Initializing MeeClient...");
                const meeClientInstance = await createMeeClient({ account: orchestratorInstance });
                const meeClient = meeClientInstance.extend(meeSessionActions)
                console.log("MeeClient initialized successfully");
                setMeeClient(meeClient);

            } catch (err) {
                console.error("Failed to initialize orchestrator:", err);
                setError(err instanceof Error ? err : new Error('Unknown error initialization orchestrator'));
            } finally {
                setLoading(false);
            }
        };

        initOrchestrator();
    }, []);

    const signAuthorization = async () => {
        if (!account) {
            console.error("Cannot sign authorization: Account not present");
            return;
        }

        try {
            console.log("Signing Authorization for Nexus Singleton...");
            const walletClient = createWalletClient({
                chain: baseSepolia,
                transport: http(),
            });

            const nexus120Singleton = '0x000000004F43C49e93C970E84001853a70923B03';

            const auth = await walletClient.signAuthorization({
                account,
                contractAddress: nexus120Singleton,
                chainId: 0, // Valid across all chains
                nonce: 0,   // For fresh accounts
            });
            console.log("Authorization Signed Successfully!", auth);
            setAuthorization(auth);

        } catch (err) {
            console.error("Error signing authorization:", err);
            setError(err instanceof Error ? err : new Error('Failed to sign authorization'));
        }
    }

    return (
        <BiconomyContext.Provider value={{ orchestrator, meeClient, loading, error, account, authorization, signAuthorization }}>
            {children}
        </BiconomyContext.Provider>
    );
}
