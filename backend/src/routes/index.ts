import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { IntentStore } from "../store";
import { DispersalService } from "../services/dispersal";
import {
  DepositEventPayload,
  GetStatusResponse,
  GetHistoryResponse,
  PostEventResponse,
  ApiError,
  HistoryEntry,
} from "../types";

// Validation schemas
const DepositEventSchema = z.object({
  chainId: z.number().int().positive(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid tx hash format"),
  logIndex: z.number().int().nonnegative(),
  blockNumber: z.number().int().positive(),
  blockTimestamp: z.number().int().nonnegative().optional(),
  eventName: z.literal("Deposited"),
  data: z.object({
    user: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format"),
    token: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid token address format"),
    amountTokenRaw: z.string(),
    amountUsd: z.string(),
    allocations: z
      .array(
        z.object({
          destChainId: z.number().int().positive(),
          amountUsd: z.string(),
        })
      )
      .min(1, "At least one allocation is required"),
  }),
});

const HistoryQuerySchema = z.object({
  userAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format")
    .optional(),
  status: z
    .enum([
      "DEPOSIT_CONFIRMED",
      "DISPERSE_QUEUED",
      "DISPERSE_IN_PROGRESS",
      "DISPERSED",
      "FAILED",
    ])
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .default("20"),
  cursor: z.string().optional(),
});

export function registerRoutes(
  fastify: FastifyInstance,
  store: IntentStore,
  dispersalService: DispersalService
) {
  // GET /status/:intentId
  fastify.get<{ Params: { intentId: string } }>(
    "/status/:intentId",
    async (
      request: FastifyRequest<{ Params: { intentId: string } }>,
      reply: FastifyReply
    ) => {
      const { intentId } = request.params;

      // Basic validation
      if (!intentId || intentId.length !== 66 || !intentId.startsWith("0x")) {
        const error: ApiError = {
          error:
            "Invalid intentId format. Expected a 0x-prefixed 64-character hex string.",
          code: "VALIDATION_ERROR",
        };
        return reply.code(400).send(error);
      }

      const intent = await store.getIntentById(intentId);

      if (!intent) {
        const error: ApiError = {
          error: `Intent not found: ${intentId}`,
          code: "NOT_FOUND",
        };
        return reply.code(404).send(error);
      }

      const response: GetStatusResponse = {
        intent,
      };

      return reply.code(200).send(response);
    }
  );

  // GET /history
  fastify.get<{ Querystring: z.infer<typeof HistoryQuerySchema> }>(
    "/history",
    async (
      request: FastifyRequest<{ Querystring: any }>,
      reply: FastifyReply
    ) => {
      try {
        const query = HistoryQuerySchema.parse(request.query);

        const result = await store.listHistory({
          userAddress: query.userAddress,
          status: query.status,
          limit: query.limit,
          cursor: query.cursor,
        });

        // Convert DepositIntent[] to HistoryEntry[]
        const items: HistoryEntry[] = result.items.map((intent) => ({
          id: intent.id,
          userAddress: intent.userAddress,
          sourceChainId: intent.sourceChainId,
          sourceTxHash: intent.sourceTxHash,
          tokenSymbol: intent.tokenSymbol,
          amountInUsd: intent.amountInUsd,
          status: intent.status,
          createdAt: intent.createdAt,
          completedAt: intent.completedAt,
          numChains: intent.chainStatuses.length,
          chains: intent.chainStatuses.map((chain) => ({
            chainId: chain.chainId,
            chainName: chain.chainName,
            amountUsd: chain.amountUsd,
            status: chain.status,
          })),
        }));
        console.log(items);

        const response: GetHistoryResponse = {
          items,
          nextCursor: result.nextCursor,
        };

        return reply.code(200).send(response);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const apiError: ApiError = {
            error: "Invalid query parameters",
            code: "VALIDATION_ERROR",
            details: error.errors,
          };
          return reply.code(400).send(apiError);
        }
        throw error;
      }
    }
  );

  // POST /event
  fastify.post<{ Body: DepositEventPayload }>(
    "/event",
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      // TODO: Validate X-Indexer-Secret header
      // const indexerSecret = request.headers['x-indexer-secret'];
      // if (indexerSecret !== process.env.INDEXER_SECRET) {
      //   const error: ApiError = {
      //     error: "Invalid or missing indexer secret",
      //     code: "UNAUTHORIZED",
      //   };
      //   return reply.code(401).send(error);
      // }

      try {
        const payload = DepositEventSchema.parse(request.body);

        // Check if intent already exists (idempotent)
        const existing = await store.getIntentById(payload.txHash);
        if (existing) {
          const response: PostEventResponse = {
            ok: true,
            intentId: existing.id,
            newStatus: existing.status,
          };
          return reply.code(200).send(response);
        }

        // Create new intent from event
        const intent = await store.upsertFromDepositEvent(payload);

        // Enqueue dispersal for all destination chains
        // This will transition status to DISPERSE_QUEUED and globalPhase to PREPARING_SWAP
        const updatedIntent = await dispersalService.enqueueDispersal(
          intent.id
        );

        const response: PostEventResponse = {
          ok: true,
          intentId: updatedIntent.id,
          newStatus: updatedIntent.status,
        };

        return reply.code(200).send(response);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const apiError: ApiError = {
            error: "Invalid event payload",
            code: "VALIDATION_ERROR",
            details: error.errors,
          };
          return reply.code(400).send(apiError);
        }

        // Re-throw unexpected errors
        throw error;
      }
    }
  );
}
