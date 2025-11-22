import { PrismaClient } from "@prisma/client";
import {
  DepositIntent,
  DepositEventPayload,
  IntentStatus,
  DestinationAllocation,
  ChainDispersal,
} from "../types";
import { IntentStore } from "./index";

/**
 * Prisma-based implementation of IntentStore
 * Uses Prisma ORM for type-safe database operations
 */
export class PrismaIntentStore implements IntentStore {
  constructor(private prisma: PrismaClient) {}

  async upsertFromDepositEvent(
    payload: DepositEventPayload
  ): Promise<DepositIntent> {
    // Check if intent already exists (idempotent)
    const existing = await this.getIntentById(payload.txHash);
    if (existing) {
      return existing;
    }

    // Create new intent from event payload
    const now = new Date();
    const allocations: DestinationAllocation[] = payload.data.allocations.map(
      (alloc) => ({
        chainId: alloc.destChainId,
        chainName: undefined,
        nativeSymbol: undefined,
        amountUsd: alloc.amountUsd,
      })
    );

    const chainStatuses: ChainDispersal[] = payload.data.allocations.map(
      (alloc) => ({
        chainId: alloc.destChainId,
        chainName: undefined,
        nativeSymbol: undefined,
        amountUsd: alloc.amountUsd,
        status: "NOT_STARTED",
        updatedAt: now.toISOString(),
      })
    );

    const intent = await this.prisma.intent.create({
      data: {
        id: payload.txHash,
        userAddress: payload.data.user,
        sourceChainId: payload.chainId,
        sourceTxHash: payload.txHash,
        sourceBlockNumber: payload.blockNumber,
        tokenAddress: payload.data.token,
        tokenSymbol: null,
        amountInTokenRaw: payload.data.amountTokenRaw,
        amountInUsd: payload.data.amountUsd,
        status: "DEPOSIT_CONFIRMED",
        globalPhase: "DEPOSIT_CONFIRMED",
        allocations: allocations as any,
        chainStatuses: chainStatuses as any,
        createdAt: now,
        updatedAt: now,
      },
    });

    return this.prismaRowToIntent(intent);
  }

  async getIntentById(id: string): Promise<DepositIntent | null> {
    const intent = await this.prisma.intent.findUnique({
      where: { id },
    });

    if (!intent) {
      return null;
    }

    return this.prismaRowToIntent(intent);
  }

  async listHistory(opts: {
    userAddress?: string;
    status?: IntentStatus;
    limit: number;
    cursor?: string;
  }): Promise<{ items: DepositIntent[]; nextCursor?: string }> {
    // Build where clause
    const where: any = {};

    if (opts.userAddress) {
      where.userAddress = {
        equals: opts.userAddress,
        mode: "insensitive",
      };
    }

    if (opts.status) {
      where.status = opts.status;
    }

    // Cursor-based pagination
    if (opts.cursor) {
      const cursorIntent = await this.getIntentById(opts.cursor);
      if (cursorIntent) {
        where.createdAt = {
          lt: new Date(cursorIntent.createdAt),
        };
      }
    }

    const intents = await this.prisma.intent.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: opts.limit + 1, // Take one extra to check if there's a next page
    });

    const hasNextPage = intents.length > opts.limit;
    const items = hasNextPage ? intents.slice(0, opts.limit) : intents;

    return {
      items: items.map((intent) => this.prismaRowToIntent(intent)),
      nextCursor: hasNextPage ? items[items.length - 1].id : undefined,
    };
  }

  async updateIntent(
    id: string,
    patch: Partial<DepositIntent>
  ): Promise<DepositIntent> {
    // Build update data object
    const updateData: any = {};

    if (patch.status !== undefined) {
      updateData.status = patch.status;
    }

    if (patch.globalPhase !== undefined) {
      updateData.globalPhase = patch.globalPhase;
    }

    if (patch.chainStatuses !== undefined) {
      updateData.chainStatuses = patch.chainStatuses as any;
    }

    if (patch.allocations !== undefined) {
      updateData.allocations = patch.allocations as any;
    }

    if (patch.completedAt !== undefined) {
      updateData.completedAt = patch.completedAt
        ? new Date(patch.completedAt)
        : null;
    }

    // Always update updatedAt
    updateData.updatedAt = new Date();

    const intent = await this.prisma.intent.update({
      where: { id },
      data: updateData,
    });

    return this.prismaRowToIntent(intent);
  }

  /**
   * Convert Prisma Intent model to DepositIntent
   */
  private prismaRowToIntent(intent: any): DepositIntent {
    return {
      id: intent.id,
      userAddress: intent.userAddress,
      sourceChainId: intent.sourceChainId,
      sourceTxHash: intent.sourceTxHash,
      sourceBlockNumber: intent.sourceBlockNumber ?? undefined,
      tokenAddress: intent.tokenAddress,
      tokenSymbol: intent.tokenSymbol ?? undefined,
      amountInTokenRaw: intent.amountInTokenRaw,
      amountInUsd: intent.amountInUsd,
      status: intent.status as IntentStatus,
      globalPhase: intent.globalPhase as any,
      allocations: Array.isArray(intent.allocations)
        ? (intent.allocations as DestinationAllocation[])
        : (typeof intent.allocations === "string"
            ? JSON.parse(intent.allocations)
            : intent.allocations) as DestinationAllocation[],
      chainStatuses: Array.isArray(intent.chainStatuses)
        ? (intent.chainStatuses as ChainDispersal[])
        : (typeof intent.chainStatuses === "string"
            ? JSON.parse(intent.chainStatuses)
            : intent.chainStatuses) as ChainDispersal[],
      createdAt: intent.createdAt.toISOString(),
      updatedAt: intent.updatedAt.toISOString(),
      completedAt: intent.completedAt
        ? intent.completedAt.toISOString()
        : undefined,
    };
  }
}

