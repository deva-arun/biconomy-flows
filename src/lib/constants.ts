/**
 * Shared constants for the Biconomy Benchmark Suite
 */

// Contract Addresses
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
export const NEXUS_SINGLETON = '0x000000004F43C49e93C970E84001853a70923B03' as const;

// Empty rule template for UAP policies
export const EMPTY_PARAM_RULE = {
    condition: 0, // ParamCondition.EQUAL
    offset: 0n,
    isLimited: false,
    ref: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
    usage: { limit: 0n, used: 0n }
} as const;
