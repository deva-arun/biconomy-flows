import { parseAbi } from 'viem';

/**
 * Shared ABI definitions for the Biconomy Benchmark Suite
 */

// ERC-20 Transfer ABI
export const ERC20_TRANSFER_ABI = parseAbi([
    'function transfer(address to, uint256 amount) returns (bool)'
]);

// ERC-20 Full ABI (includes balanceOf)
export const ERC20_ABI = parseAbi([
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address) view returns (uint256)'
]);
