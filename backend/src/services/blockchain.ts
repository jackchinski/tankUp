import { ethers } from "ethers";
import { getChainConfig, getContractAddress } from "../config/chains";
import * as fs from "fs";
import * as path from "path";

// Load ABI from JSON file
const abiPath = path.join(__dirname, "../contracts/abi.json");
const contractAbi = JSON.parse(fs.readFileSync(abiPath, "utf-8"));

export interface DripResult {
  txHash: string;
  explorerUrl: string;
}

export interface TransactionReceipt {
  txHash: string;
  blockNumber: number;
  gasUsed: bigint;
  status: number; // 1 = success, 0 = failure
}

/**
 * Service for interacting with blockchain contracts
 */
export class BlockchainService {
  private providers: Map<number, ethers.JsonRpcProvider> = new Map();
  private signer: ethers.Wallet | null = null;

  constructor() {
    // Initialize signer from private key
    const privateKey = process.env.DISTRIBUTOR_PRIVATE_KEY;
    if (!privateKey) {
      console.warn("⚠️  DISTRIBUTOR_PRIVATE_KEY not set. Contract calls will fail.");
    } else {
      // We'll create signers per-chain when needed
      console.log("✅ Distributor private key loaded");
    }
  }

  /**
   * Get or create a provider for a specific chain
   */
  private getProvider(chainId: number): ethers.JsonRpcProvider {
    if (!this.providers.has(chainId)) {
      const config = getChainConfig(chainId);
      if (!config) {
        throw new Error(`Chain configuration not found for chainId: ${chainId}`);
      }

      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      this.providers.set(chainId, provider);
    }

    return this.providers.get(chainId)!;
  }

  /**
   * Get a signer for a specific chain
   */
  private getSigner(chainId: number): ethers.Wallet {
    const privateKey = process.env.DISTRIBUTOR_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("DISTRIBUTOR_PRIVATE_KEY not set in environment");
    }

    const provider = this.getProvider(chainId);
    return new ethers.Wallet(privateKey, provider);
  }

  /**
   * Call the drip function on the escrow contract
   * @param chainId Destination chain ID
   * @param usdcAmount Amount of USDC to swap (in raw units, e.g., 100000000 for 100 USDC with 6 decimals)
   * @param recipient Address to receive the native tokens
   * @returns Transaction hash and explorer URL
   */
  async drip(chainId: number, usdcAmount: string, recipient: string): Promise<DripResult> {
    const config = getChainConfig(chainId);
    if (!config) {
      throw new Error(`Chain configuration not found for chainId: ${chainId}`);
    }

    const contractAddress = getContractAddress(chainId);
    if (!contractAddress) {
      throw new Error(
        `Contract address not configured for chainId: ${chainId}. Set CONTRACT_ADDRESS_${chainId} in environment or update chain config.`
      );
    }

    const signer = this.getSigner(chainId);
    const contract = new ethers.Contract(contractAddress, contractAbi, signer);

    try {
      console.log(`📤 Calling drip on chain ${chainId} (${config.name}):`, {
        contractAddress,
        usdcAmount,
        recipient,
      });

      // Call the drip function
      // Convert usdcAmount string to BigInt for the contract call
      const usdcAmountBigInt = BigInt(usdcAmount);

      // Match fee args used in contracts/scripts/drip-op.ts
      const fee = await signer.provider!.getFeeData();
      const bumpPct = 25n;
      const bump = (v: bigint | null | undefined) => (v != null ? (v * (100n + bumpPct)) / 100n : undefined);
      const overrides: {
        gasLimit: bigint;
        maxFeePerGas?: bigint;
        maxPriorityFeePerGas?: bigint;
        gasPrice?: bigint;
      } = { gasLimit: 750000n };

      // Prefer EIP-1559 if both fields are available; otherwise use legacy gasPrice
      const suggestedMaxFee = bump(fee.maxFeePerGas);
      const suggestedPriority = bump(fee.maxPriorityFeePerGas);
      if (suggestedMaxFee != null && suggestedPriority != null) {
        // Clamp: priority must never exceed max fee
        const maxFeePerGas = suggestedMaxFee;
        const maxPriorityFeePerGas = suggestedPriority > maxFeePerGas ? maxFeePerGas : suggestedPriority;
        overrides.maxFeePerGas = maxFeePerGas;
        overrides.maxPriorityFeePerGas = maxPriorityFeePerGas;
      } else if (fee.gasPrice != null) {
        overrides.gasPrice = bump(fee.gasPrice)!;
      }

      const tx = await contract.drip(usdcAmountBigInt, recipient, overrides);

      console.log(`⏳ Transaction broadcast: ${tx.hash}`);

      const explorerUrl = `${config.explorerUrl}/tx/${tx.hash}`;

      return {
        txHash: tx.hash,
        explorerUrl,
      };
    } catch (error: any) {
      console.error(`❌ Error calling drip on chain ${chainId}:`, error);
      throw new Error(`Failed to call drip: ${error.message || "Unknown error"}`);
    }
  }

  /**
   * Wait for a transaction to be confirmed
   * @param chainId Chain ID
   * @param txHash Transaction hash
   * @param confirmations Number of confirmations to wait for (default: 1)
   * @param timeoutMs Timeout in milliseconds (default: 5 minutes)
   * @returns Transaction receipt
   */
  async waitForConfirmation(
    chainId: number,
    txHash: string,
    confirmations: number = 1,
    timeoutMs: number = 5 * 60 * 1000
  ): Promise<TransactionReceipt> {
    const provider = this.getProvider(chainId);

    try {
      console.log(`⏳ Waiting for confirmation of ${txHash} on chain ${chainId}...`);

      // Wait for transaction with timeout
      const receipt = await Promise.race([
        provider.waitForTransaction(txHash, confirmations),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Transaction confirmation timeout")), timeoutMs)
        ),
      ]);

      if (!receipt) {
        throw new Error("Transaction receipt not found");
      }

      console.log(`✅ Transaction confirmed: ${txHash} (block: ${receipt.blockNumber})`);

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        status: receipt.status || 0,
      };
    } catch (error: any) {
      console.error(`❌ Error waiting for confirmation of ${txHash}:`, error);
      throw error;
    }
  }

  /**
   * Poll for transaction confirmation (alternative to waitForConfirmation)
   * Useful for longer-running transactions or custom polling logic
   */
  async pollForConfirmation(
    chainId: number,
    txHash: string,
    intervalMs: number = 5000,
    maxAttempts: number = 60
  ): Promise<TransactionReceipt> {
    const provider = this.getProvider(chainId);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const receipt = await provider.getTransactionReceipt(txHash);

        if (receipt) {
          console.log(`✅ Transaction confirmed: ${txHash} (block: ${receipt.blockNumber})`);

          return {
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
            status: receipt.status || 0,
          };
        }

        // Wait before next attempt
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      } catch (error: any) {
        console.error(`Error polling for transaction ${txHash}:`, error);
        throw error;
      }
    }

    throw new Error(`Transaction ${txHash} not confirmed after ${maxAttempts} attempts`);
  }

  /**
   * Get the current balance of the distributor wallet on a chain
   */
  async getBalance(chainId: number): Promise<bigint> {
    const signer = this.getSigner(chainId);
    const address = await signer.getAddress();
    const provider = this.getProvider(chainId);
    return provider.getBalance(address);
  }
}
