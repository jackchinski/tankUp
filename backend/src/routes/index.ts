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
import { CHAIN_CONFIGS } from "../config/chains";

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
    token: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid token address format"),
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
  status: z.enum(["DEPOSIT_CONFIRMED", "DISPERSE_QUEUED", "DISPERSE_IN_PROGRESS", "DISPERSED", "FAILED"]).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default("20"),
  cursor: z.string().optional(),
});

export function registerRoutes(fastify: FastifyInstance, store: IntentStore, dispersalService: DispersalService) {
  // GET /status/:intentId
  fastify.get<{ Params: { intentId: string } }>(
    "/status/:intentId",
    async (request: FastifyRequest<{ Params: { intentId: string } }>, reply: FastifyReply) => {
      const { intentId } = request.params;

      // Basic validation
      if (!intentId || intentId.length !== 66 || !intentId.startsWith("0x")) {
        const error: ApiError = {
          error: "Invalid intentId format. Expected a 0x-prefixed 64-character hex string.",
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

  fastify.post("/webhook", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload: any = request.body;
      console.log("Received webhook", JSON.stringify(payload, null, 2));

      // Webhook can be an array of events; take the first Deposited event
      const eventsArray: any[] = Array.isArray(payload) ? payload : [payload];
      const first = eventsArray.find((e) => e?.data?.event?.name === "Deposited") ?? eventsArray[0];
      if (!first || !first.data || !first.data.event) {
        const apiError: ApiError = { error: "Malformed webhook payload", code: "WEBHOOK_ERROR" };
        return reply.code(400).send(apiError);
      }

      const evt = first.data.event;
      const tx = first.data.transaction;

      // Extract txHash (prefer transaction, fallback to rawFields)
      let txHash: string | undefined = tx?.txHash;
      let blockNumber: number | undefined = tx?.blockNumber;
      let blockTimestamp: number | undefined;
      try {
        if (!txHash && typeof evt?.rawFields === "string") {
          const raw = JSON.parse(evt.rawFields);
          txHash = raw?.transactionHash || txHash;
          if (!blockNumber && raw?.blockNumber) {
            blockNumber =
              typeof raw.blockNumber === "string" && raw.blockNumber.startsWith("0x")
                ? parseInt(raw.blockNumber, 16)
                : Number(raw.blockNumber);
          }
          if (raw?.blockTimestamp) {
            blockTimestamp =
              typeof raw.blockTimestamp === "string" && raw.blockTimestamp.startsWith("0x")
                ? parseInt(raw.blockTimestamp, 16)
                : Number(raw.blockTimestamp);
          }
        }
      } catch (_) {
        // ignore rawFields parse errors
      }

      // Inputs can appear in either event.inputs or method.inputs
      const findInput = (name: string): any => {
        const fromEvent = Array.isArray(evt?.inputs) ? evt.inputs.find((i: any) => i?.name === name) : undefined;
        if (fromEvent && "value" in fromEvent) return fromEvent.value;
        const fromMethod = Array.isArray(tx?.method?.inputs)
          ? tx.method.inputs.find((i: any) => i?.name === name)
          : undefined;
        return fromMethod && "value" in fromMethod ? fromMethod.value : undefined;
      };

      const user: string | undefined = findInput("user");
      const totalAmountRawStr: string | undefined = findInput("totalAmount");
      const chainIdsRaw: any[] | undefined = findInput("chainIds");
      const chainAmountsRaw: any[] | undefined = findInput("chainAmounts");

      // Try to infer source chain by matching the contract address to our known configs
      const contractAddress: string | undefined = evt?.contract?.address;
      let inferredSourceChainId: number | undefined;
      if (contractAddress) {
        const lower = contractAddress.toLowerCase();
        for (const [idStr, cfg] of Object.entries(CHAIN_CONFIGS)) {
          const cfgAddr = cfg.contractAddress?.toLowerCase();
          if (cfgAddr && cfgAddr === lower) {
            inferredSourceChainId = Number(idStr);
            break;
          }
        }
      }

      // Build allocations (assume USDC 6 decimals; treat amounts as USD-equivalent)
      const allocations =
        Array.isArray(chainIdsRaw) && Array.isArray(chainAmountsRaw)
          ? chainIdsRaw.map((cid: any, idx: number) => {
              const amtRawStr = String(chainAmountsRaw[idx] ?? "0");
              const amountUsd = (Number(amtRawStr) / 1e6).toFixed(2);
              return {
                destChainId: Number(cid),
                amountUsd,
              };
            })
          : [];

      // Sum amountUsd
      const totalAmountUsd = allocations.reduce((acc, a) => acc + Number(a.amountUsd), 0);

      // Construct DepositEventPayload to reuse existing flow
      const converted: DepositEventPayload = {
        chainId: inferredSourceChainId ?? allocations[0]?.destChainId ?? 1,
        txHash: txHash && typeof txHash === "string" ? txHash : "0x" + "0".repeat(64),
        logIndex: Number(evt?.indexInLog ?? 0),
        blockNumber: Number(blockNumber ?? 0),
        blockTimestamp,
        eventName: "Deposited",
        data: {
          user: user && typeof user === "string" ? user : "0x" + "0".repeat(40),
          // Unknown at this layer; use zero address placeholder
          token: "0x0000000000000000000000000000000000000000",
          amountTokenRaw: String(totalAmountRawStr ?? "0"),
          amountUsd: totalAmountUsd.toFixed(2),
          allocations,
        },
      };

      // Idempotency check
      const existing = await store.getIntentById(converted.txHash);
      if (existing) {
        const response: PostEventResponse = {
          ok: true,
          intentId: existing.id,
          newStatus: existing.status,
        };
        return reply.code(200).send(response);
      }

      // Create intent and enqueue dispersal
      const intent = await store.upsertFromDepositEvent(converted);
      const updatedIntent = await dispersalService.enqueueDispersal(intent.id);

      const response: PostEventResponse = {
        ok: true,
        intentId: updatedIntent.id,
        newStatus: updatedIntent.status,
      };
      return reply.code(200).send(response);
    } catch (error: any) {
      const apiError: ApiError = {
        error: "Failed to process webhook payload",
        code: "WEBHOOK_ERROR",
        details: error?.message ?? String(error),
      };
      return reply.code(400).send(apiError);
    }
  });
  // GET /history
  fastify.get<{ Querystring: z.infer<typeof HistoryQuerySchema> }>(
    "/history",
    async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
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
        console.log("Received deposit event", payload);
        // Check if intent already exists (idempotent)
        const existing = await store.getIntentById(payload.txHash);
        console.log("Existing intent", existing);
        if (existing) {
          const response: PostEventResponse = {
            ok: true,
            intentId: existing.id,
            newStatus: existing.status,
          };
          return reply.code(200).send(response);
        }
        console.log("Creating new intent");
        // Create new intent from event
        const intent = await store.upsertFromDepositEvent(payload);
        console.log("Created new intent", intent);
        // Enqueue dispersal for all destination chains
        // This will transition status to DISPERSE_QUEUED and globalPhase to PREPARING_SWAP
        const updatedIntent = await dispersalService.enqueueDispersal(intent.id);
        console.log("Enqueued dispersal", updatedIntent);
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
