import {
  DepositIntent,
  ChainDispersal,
  ChainDispersalStatus,
  IntentStatus,
  GlobalPhase,
} from "../types";
import { IntentStore } from "../store";
import { BlockchainService } from "./blockchain";
import { ethers } from "ethers";

/**
 * Service for managing dispersal status transitions and business logic
 */
export class DispersalService {
  private blockchainService: BlockchainService;

  constructor(private store: IntentStore) {
    this.blockchainService = new BlockchainService();
  }

  /**
   * Enqueue dispersal for all destination chains
   * This transitions the intent from DEPOSIT_CONFIRMED to DISPERSE_QUEUED
   */
  async enqueueDispersal(intentId: string): Promise<DepositIntent> {
    const intent = await this.store.getIntentById(intentId);
    if (!intent) {
      throw new Error(`Intent not found: ${intentId}`);
    }

    // Transition all chain statuses from NOT_STARTED to QUEUED
    const updatedChainStatuses: ChainDispersal[] = intent.chainStatuses.map(
      (chain) => ({
        ...chain,
        status: chain.status === "NOT_STARTED" ? "QUEUED" : chain.status,
        updatedAt: new Date().toISOString(),
      })
    );

    const updated = await this.store.updateIntent(intentId, {
      status: "DISPERSE_QUEUED",
      globalPhase: "PREPARING_SWAP",
      chainStatuses: updatedChainStatuses,
    });

    // Start actual dispersal for each destination chain
    this.startDispersal(intentId).catch((err) => {
      console.error(`Error starting dispersal for ${intentId}:`, err);
      // Update status to failed if we can't start dispersal
      this.store
        .updateIntent(intentId, {
          status: "FAILED",
          globalPhase: "FAILED",
          completedAt: new Date().toISOString(),
        })
        .catch((updateErr) => {
          console.error(`Error updating intent status:`, updateErr);
        });
    });

    return updated;
  }

  /**
   * Update the status of a specific chain's dispersal
   * This is called when a destination chain transaction is broadcast or confirmed
   */
  async updateChainDispersalStatus(
    intentId: string,
    chainId: number,
    update: {
      status: ChainDispersalStatus;
      txHash?: string;
      explorerUrl?: string;
      gasUsed?: string;
      errorMessage?: string;
    }
  ): Promise<DepositIntent> {
    const intent = await this.store.getIntentById(intentId);
    if (!intent) {
      throw new Error(`Intent not found: ${intentId}`);
    }

    const updatedChainStatuses = intent.chainStatuses.map((chain) => {
      if (chain.chainId === chainId) {
        return {
          ...chain,
          ...update,
          updatedAt: new Date().toISOString(),
        };
      }
      return chain;
    });

    // Determine new intent status and global phase based on chain statuses
    const allConfirmed = updatedChainStatuses.every(
      (chain) => chain.status === "CONFIRMED"
    );
    const anyFailed = updatedChainStatuses.some(
      (chain) => chain.status === "FAILED"
    );
    const anyBroadcasted = updatedChainStatuses.some(
      (chain) => chain.status === "BROADCASTED"
    );
    const anyInProgress = updatedChainStatuses.some(
      (chain) => chain.status === "BROADCASTED" || chain.status === "QUEUED"
    );

    let newStatus: IntentStatus = intent.status;
    let newGlobalPhase: GlobalPhase = intent.globalPhase;
    let completedAt: string | undefined = intent.completedAt;

    if (allConfirmed) {
      newStatus = "DISPERSED";
      newGlobalPhase = "COMPLETED";
      completedAt = new Date().toISOString();
    } else if (anyFailed) {
      newStatus = "FAILED";
      newGlobalPhase = "FAILED";
      completedAt = new Date().toISOString();
    } else if (anyBroadcasted) {
      newStatus = "DISPERSE_IN_PROGRESS";
      newGlobalPhase = "DISPERSING"; // or "SWAPPING" depending on where we are
    } else if (anyInProgress) {
      newStatus = "DISPERSE_IN_PROGRESS";
      newGlobalPhase = "PREPARING_SWAP";
    }

    return this.store.updateIntent(intentId, {
      status: newStatus,
      globalPhase: newGlobalPhase,
      chainStatuses: updatedChainStatuses,
      completedAt,
    });
  }

  /**
   * Start dispersal for all destination chains
   * Calls the drip function on each destination chain's escrow contract
   */
  private async startDispersal(intentId: string): Promise<void> {
    const intent = await this.store.getIntentById(intentId);
    if (!intent) {
      throw new Error(`Intent not found: ${intentId}`);
    }

    console.log(`🚀 Starting dispersal for intent ${intentId}`);

    // Process each destination chain in parallel
    const dispersalPromises = intent.chainStatuses.map((chain) =>
      this.disperseToChain(intentId, intent.userAddress, chain)
    );

    // Wait for all dispersals to start (they'll continue in background)
    await Promise.allSettled(dispersalPromises);
  }

  /**
   * Disperse tokens to a specific destination chain
   */
  private async disperseToChain(
    intentId: string,
    userAddress: string,
    chain: ChainDispersal
  ): Promise<void> {
    try {
      // Convert USD amount to USDC raw units (USDC has 6 decimals)
      // amountUsd is a decimal string like "20.00"
      const usdcAmountRaw = ethers.parseUnits(chain.amountUsd, 6).toString();

      console.log(
        `💧 Dispensing to chain ${chain.chainId}: ${chain.amountUsd} USD (${usdcAmountRaw} raw USDC)`
      );

      // Call the drip function on the destination chain
      const result = await this.blockchainService.drip(
        chain.chainId,
        usdcAmountRaw,
        userAddress
      );

      // Update status to BROADCASTED
      await this.updateChainDispersalStatus(intentId, chain.chainId, {
        status: "BROADCASTED",
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
      });

      // Start polling for confirmation in the background
      this.waitForChainConfirmation(intentId, chain.chainId, result.txHash).catch(
        (err) => {
          console.error(
            `Error waiting for confirmation on chain ${chain.chainId}:`,
            err
          );
          // Update status to failed
          this.updateChainDispersalStatus(intentId, chain.chainId, {
            status: "FAILED",
            errorMessage: err.message || "Transaction confirmation failed",
          }).catch((updateErr) => {
            console.error(`Error updating chain status:`, updateErr);
          });
        }
      );
    } catch (error: any) {
      console.error(
        `❌ Error dispersing to chain ${chain.chainId}:`,
        error
      );

      // Update status to failed
      await this.updateChainDispersalStatus(intentId, chain.chainId, {
        status: "FAILED",
        errorMessage: error.message || "Failed to broadcast transaction",
      });
    }
  }

  /**
   * Wait for a transaction to be confirmed and update status
   */
  private async waitForChainConfirmation(
    intentId: string,
    chainId: number,
    txHash: string
  ): Promise<void> {
    try {
      // Wait for confirmation (1 confirmation is usually enough for most chains)
      const receipt = await this.blockchainService.waitForConfirmation(
        chainId,
        txHash,
        1, // confirmations
        10 * 60 * 1000 // 10 minute timeout
      );

      if (receipt.status === 0) {
        // Transaction failed
        throw new Error("Transaction reverted");
      }

      // Update status to CONFIRMED
      await this.updateChainDispersalStatus(intentId, chainId, {
        status: "CONFIRMED",
        gasUsed: receipt.gasUsed.toString(),
      });

      console.log(
        `✅ Chain ${chainId} confirmed: ${txHash} (gas: ${receipt.gasUsed})`
      );
    } catch (error: any) {
      console.error(
        `❌ Confirmation failed for chain ${chainId}, tx ${txHash}:`,
        error
      );
      throw error;
    }
  }
}
