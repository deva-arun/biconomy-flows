import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { toMultichainNexusAccount, getMEEVersion, MEEVersion } from "@biconomy/abstractjs";
import { http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, arbitrum } from "viem/chains";

interface BiconomyContextType {
    orchestrator: any | null;
    loading: boolean;
    error: Error | null;
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

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
            } catch (err) {
                console.error("Failed to initialize orchestrator:", err);
                setError(err instanceof Error ? err : new Error('Unknown error initialization orchestrator'));
            } finally {
                setLoading(false);
            }
        };

        initOrchestrator();
    }, []);

    return (
        <BiconomyContext.Provider value={{ orchestrator, loading, error }}>
            {children}
        </BiconomyContext.Provider>
    );
}
