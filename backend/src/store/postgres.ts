import { Pool } from "pg";
import {
  DepositIntent,
  DepositEventPayload,
  IntentStatus,
  DestinationAllocation,
  ChainDispersal,
} from "../types";
import { IntentStore } from "./index";

interface DbIntentRow {
  id: string;
  user_address: string;
  source_chain_id: number;
  source_tx_hash: string;
  source_block_number: number | null;
  token_address: string;
  token_symbol: string | null;
  amount_in_token_raw: string;
  amount_in_usd: string;
  status: string;
  global_phase: string;
  allocations: DestinationAllocation[];
  chain_statuses: ChainDispersal[];
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

/**
 * PostgreSQL implementation of IntentStore
 */
export class PostgresIntentStore implements IntentStore {
  constructor(private db: Pool) {}

  async upsertFromDepositEvent(
    payload: DepositEventPayload
  ): Promise<DepositIntent> {
    // Check if intent already exists (idempotent)
    const existing = await this.getIntentById(payload.txHash);
    if (existing) {
      return existing;
    }

    // Create new intent from event payload
    const now = new Date().toISOString();
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
        updatedAt: now,
      })
    );

    const query = `
      INSERT INTO intents (
        id, user_address, source_chain_id, source_tx_hash, source_block_number,
        token_address, token_symbol, amount_in_token_raw, amount_in_usd,
        status, global_phase, allocations, chain_statuses,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      payload.txHash,
      payload.data.user,
      payload.chainId,
      payload.txHash,
      payload.blockNumber,
      payload.data.token,
      null, // tokenSymbol
      payload.data.amountTokenRaw,
      payload.data.amountUsd,
      "DEPOSIT_CONFIRMED",
      "DEPOSIT_CONFIRMED",
      JSON.stringify(allocations),
      JSON.stringify(chainStatuses),
      now,
      now,
    ];

    const result = await this.db.query<DbIntentRow>(query, values);
    return this.rowToIntent(result.rows[0]);
  }

  async getIntentById(id: string): Promise<DepositIntent | null> {
    const query = `SELECT * FROM intents WHERE id = $1`;
    const result = await this.db.query<DbIntentRow>(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.rowToIntent(result.rows[0]);
  }

  async listHistory(opts: {
    userAddress?: string;
    status?: IntentStatus;
    limit: number;
    cursor?: string;
  }): Promise<{ items: DepositIntent[]; nextCursor?: string }> {
    let query = `SELECT * FROM intents WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (opts.userAddress) {
      query += ` AND LOWER(user_address) = LOWER($${paramIndex})`;
      params.push(opts.userAddress);
      paramIndex++;
    }

    if (opts.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(opts.status);
      paramIndex++;
    }

    // Cursor-based pagination
    if (opts.cursor) {
      // Get the created_at of the cursor intent
      const cursorIntent = await this.getIntentById(opts.cursor);
      if (cursorIntent) {
        query += ` AND created_at < $${paramIndex}`;
        params.push(cursorIntent.createdAt);
        paramIndex++;
      }
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(opts.limit);
    paramIndex++;

    const result = await this.db.query<DbIntentRow>(query, params);
    const items = result.rows.map((row) => this.rowToIntent(row));

    // Determine next cursor
    const nextCursor =
      items.length === opts.limit && items.length > 0
        ? items[items.length - 1].id
        : undefined;

    return { items, nextCursor };
  }

  async updateIntent(
    id: string,
    patch: Partial<DepositIntent>
  ): Promise<DepositIntent> {
    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (patch.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(patch.status);
      paramIndex++;
    }

    if (patch.globalPhase !== undefined) {
      updates.push(`global_phase = $${paramIndex}`);
      values.push(patch.globalPhase);
      paramIndex++;
    }

    if (patch.chainStatuses !== undefined) {
      updates.push(`chain_statuses = $${paramIndex}`);
      values.push(JSON.stringify(patch.chainStatuses));
      paramIndex++;
    }

    if (patch.allocations !== undefined) {
      updates.push(`allocations = $${paramIndex}`);
      values.push(JSON.stringify(patch.allocations));
      paramIndex++;
    }

    if (patch.completedAt !== undefined) {
      updates.push(`completed_at = $${paramIndex}`);
      values.push(patch.completedAt || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      // No updates, just return existing
      const existing = await this.getIntentById(id);
      if (!existing) {
        throw new Error(`Intent not found: ${id}`);
      }
      return existing;
    }

    values.push(id);
    const query = `
      UPDATE intents
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query<DbIntentRow>(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Intent not found: ${id}`);
    }

    return this.rowToIntent(result.rows[0]);
  }

  /**
   * Convert database row to DepositIntent
   */
  private rowToIntent(row: DbIntentRow): DepositIntent {
    return {
      id: row.id,
      userAddress: row.user_address,
      sourceChainId: row.source_chain_id,
      sourceTxHash: row.source_tx_hash,
      sourceBlockNumber: row.source_block_number ?? undefined,
      tokenAddress: row.token_address,
      tokenSymbol: row.token_symbol ?? undefined,
      amountInTokenRaw: row.amount_in_token_raw,
      amountInUsd: row.amount_in_usd,
      status: row.status as IntentStatus,
      globalPhase: row.global_phase as any,
      allocations: Array.isArray(row.allocations)
        ? (row.allocations as DestinationAllocation[])
        : (JSON.parse(row.allocations as any) as DestinationAllocation[]),
      chainStatuses: Array.isArray(row.chain_statuses)
        ? (row.chain_statuses as ChainDispersal[])
        : (JSON.parse(row.chain_statuses as any) as ChainDispersal[]),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      completedAt: row.completed_at
        ? row.completed_at.toISOString()
        : undefined,
    };
  }
}
