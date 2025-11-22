import {
  DepositIntent,
  ChainDispersal,
  ChainDispersalStatus,
  IntentStatus,
  GlobalPhase,
} from "../types";
import { IntentStore } from "../store";

/**
 * Service for managing dispersal status transitions and business logic
 */
export class DispersalService {
  constructor(private store: IntentStore) {}

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

    // TODO: Here we would kick off actual dispersal jobs
    // For example:
    // - Call a swap service to convert USDC -> native token
    // - For each destination chain, prepare and broadcast a transaction
    // - Use a job queue (Bull, BullMQ, etc.) to handle async processing
    // - Set up webhook listeners or polling to track tx confirmations

    // Stub: simulate starting dispersal (in real implementation, this would
    // trigger async jobs that call updateChainDispersalStatus)
    this.simulateDispersalStart(intentId).catch((err) => {
      console.error(`Error simulating dispersal for ${intentId}:`, err);
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
   * Stub method to simulate dispersal start
   * In real implementation, this would be replaced with actual blockchain calls
   */
  private async simulateDispersalStart(intentId: string): Promise<void> {
    // This is a stub - in real implementation:
    // 1. Call swap service to convert USDC -> native token on source chain
    // 2. For each destination chain:
    //    - Calculate native amount needed based on USD amount and current price
    //    - Build transaction to send native token to user address
    //    - Broadcast transaction
    //    - Call updateChainDispersalStatus with BROADCASTED status
    // 3. Set up listeners/polling to detect when transactions are confirmed
    // 4. Call updateChainDispersalStatus with CONFIRMED status when confirmed

    console.log(`[STUB] Would start dispersal for intent ${intentId}`);
    // Simulate async processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // In real implementation, you would:
    // - Use a service like Alchemy, Infura, or direct RPC calls
    // - Use ethers.js or viem to build and send transactions
    // - Track transaction hashes and poll for confirmations
    // - Handle errors and retries
  }
}
