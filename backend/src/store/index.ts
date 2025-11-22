import {
  DepositIntent,
  DepositEventPayload,
  IntentStatus,
} from "../types";

export interface IntentStore {
  upsertFromDepositEvent(payload: DepositEventPayload): Promise<DepositIntent>;
  getIntentById(id: string): Promise<DepositIntent | null>;
  listHistory(opts: {
    userAddress?: string;
    status?: IntentStatus;
    limit: number;
    cursor?: string;
  }): Promise<{ items: DepositIntent[]; nextCursor?: string }>;
  updateIntent(id: string, patch: Partial<DepositIntent>): Promise<DepositIntent>;
}

// In-memory implementation
// TODO: Replace with real database (PostgreSQL, MongoDB, etc.)
export class InMemoryIntentStore implements IntentStore {
  private intents: Map<string, DepositIntent> = new Map();

  async upsertFromDepositEvent(payload: DepositEventPayload): Promise<DepositIntent> {
    const existing = this.intents.get(payload.txHash);
    if (existing) {
      // Idempotent: return existing intent
      return existing;
    }

    // Create new intent from event payload
    const now = new Date().toISOString();
    const intent: DepositIntent = {
      id: payload.txHash,
      userAddress: payload.data.user,
      sourceChainId: payload.chainId,
      sourceTxHash: payload.txHash,
      sourceBlockNumber: payload.blockNumber,
      tokenAddress: payload.data.token,
      tokenSymbol: undefined, // Could be enriched from a token registry
      amountInTokenRaw: payload.data.amountTokenRaw,
      amountInUsd: payload.data.amountUsd,
      status: "DEPOSIT_CONFIRMED",
      globalPhase: "DEPOSIT_CONFIRMED",
      allocations: payload.data.allocations.map((alloc) => ({
        chainId: alloc.destChainId,
        chainName: undefined, // Could be enriched from a chain registry
        nativeSymbol: undefined, // Could be enriched from a chain registry
        amountUsd: alloc.amountUsd,
      })),
      chainStatuses: payload.data.allocations.map((alloc) => ({
        chainId: alloc.destChainId,
        chainName: undefined,
        nativeSymbol: undefined,
        amountUsd: alloc.amountUsd,
        status: "NOT_STARTED",
        updatedAt: now,
      })),
      createdAt: now,
      updatedAt: now,
    };

    this.intents.set(payload.txHash, intent);
    return intent;
  }

  async getIntentById(id: string): Promise<DepositIntent | null> {
    return this.intents.get(id) || null;
  }

  async listHistory(opts: {
    userAddress?: string;
    status?: IntentStatus;
    limit: number;
    cursor?: string;
  }): Promise<{ items: DepositIntent[]; nextCursor?: string }> {
    let items = Array.from(this.intents.values());

    // Filter by userAddress if provided
    if (opts.userAddress) {
      items = items.filter((intent) => intent.userAddress.toLowerCase() === opts.userAddress!.toLowerCase());
    }

    // Filter by status if provided
    if (opts.status) {
      items = items.filter((intent) => intent.status === opts.status);
    }

    // Sort by createdAt descending (most recent first)
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Simple cursor-based pagination (using createdAt as cursor)
    let startIndex = 0;
    if (opts.cursor) {
      const cursorIndex = items.findIndex((item) => item.id === opts.cursor);
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      }
    }

    const paginatedItems = items.slice(startIndex, startIndex + opts.limit);
    const nextCursor =
      startIndex + opts.limit < items.length ? paginatedItems[paginatedItems.length - 1]?.id : undefined;

    return {
      items: paginatedItems,
      nextCursor,
    };
  }

  async updateIntent(id: string, patch: Partial<DepositIntent>): Promise<DepositIntent> {
    const existing = this.intents.get(id);
    if (!existing) {
      throw new Error(`Intent not found: ${id}`);
    }

    const updated: DepositIntent = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    this.intents.set(id, updated);
    return updated;
  }
}

